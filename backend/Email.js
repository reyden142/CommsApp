// Email.js
const nodemailer = require("nodemailer");
const multer = require("multer");
const Imap = require("imap");
const quotedPrintable = require("quoted-printable");
const dotenv = require("dotenv");

dotenv.config();

// Create an email transporter for sending emails
const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Multer setup for file upload (for attachments)
const upload2 = multer({ dest: "uploads/" });

// Setup IMAP connection
const imap = new Imap({
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: "imap.gmail.com",
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
});

// Function to send email
async function sendEmail(req, res) {
  const { to, subject, message } = req.body;
  const file = req.file;

  if (!to || !subject || !message) {
    return res.status(400).send({
      success: false,
      error: "All fields (to, subject, message) are required.",
    });
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: subject,
    text: message,
    attachments: file
      ? [
          {
            filename: file.originalname,
            path: file.path,
          },
        ]
      : [],
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info);
    res.send({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

// Function to receive emails via IMAP
async function receiveEmails(req, res) {
  const limit = parseInt(req.query.limit, 10) || 10; // Default to 10
  const offset = parseInt(req.query.offset, 10) || 0; // Default to 0

  console.log("Received request for /receive-emails-imap");

  try {
    imap.openBox("INBOX", true, function (err, box) {
      if (err) {
        console.error("Error opening INBOX:", err);
        return res
          .status(500)
          .send({ success: false, error: "Error opening INBOX" });
      }

      console.log(
        "INBOX opened successfully. Total messages:",
        box.messages.total
      );

      const fetchLimit = Math.min(limit, box.messages.total - offset);
      if (fetchLimit <= 0) {
        return res.send({ success: true, emails: [] });
      }

      const start = box.messages.total - offset - fetchLimit + 1;
      const end = box.messages.total - offset;

      console.log(`Fetching messages from ${start} to ${end}`);
      const fetchRange = `${start}:${end}`;

      const f = imap.seq.fetch(fetchRange, { bodies: "" });
      const emails = [];
      let messageCount = 0;

      f.on("message", function (msg, seqno) {
        console.log("Processing message #%d", seqno);
        messageCount++;

        let email = { headers: {}, body: "", attributes: {} };

        msg.on("body", function (stream, info) {
          stream.on("data", function (chunk) {
            email.body += chunk.toString("utf8");
          });

          stream.once("end", function () {
            email.headers = Imap.parseHeader(email.body);
            email.body = quotedPrintable.decode(email.body);
          });
        });

        msg.once("attributes", function (attrs) {
          email.attributes = attrs;
        });

        msg.once("end", function () {
          emails.push(email);
          console.log("Finished processing message #%d", seqno);
        });
      });

      f.once("error", function (err) {
        console.error("Fetch error:", err);
        res.status(500).send({ success: false, error: "Fetch error" });
      });

      f.once("end", function () {
        console.log(
          "Done fetching messages. Processed",
          messageCount,
          "messages."
        );
        res.send({ success: true, emails: emails });
      });
    });
  } catch (error) {
    console.error("General error:", error);
    res.status(500).send({ success: false, error: "General error" });
  }
}

// Connect to IMAP
imap.once("ready", function () {
  imap.openBox("INBOX", true, function (err, box) {
    if (err) {
      console.error("Error opening INBOX:", err);
    } else {
      console.log("INBOX opened successfully.");
    }
  });
});

imap.once("error", function (err) {
  console.error("IMAP connection error:", err);
});

imap.connect();

// Export functions for use in other files
module.exports = { sendEmail, receiveEmails, upload2 };
