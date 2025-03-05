const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const Chat = require("./models/Chat");
const chatRoutes = require("./routes/chatRoutes");
const dotenv = require("dotenv");
const cors = require("cors");
const twilio = require("twilio");
const nodemailer = require("nodemailer");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Imap = require("imap");
const quotedPrintable = require("quoted-printable");

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/chat", chatRoutes);

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = new twilio(accountSid, authToken);

let smsMessages = [];

app.post("/send-sms", async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).send({
        success: false,
        error: "Phone number and message are required.",
      });
    }

    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to,
    });

    res.send({ success: true, messageSid: result.sid });
  } catch (error) {
    console.error("Error sending SMS:", error);
    res.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

app.post("/incoming-sms", (req, res) => {
  const { From, Body } = req.body;

  if (!From || !Body) {
    return res.status(400).send("Invalid SMS request");
  }

  smsMessages.push({ from: From, message: Body });
  io.emit("receiveSMS", { from: From, message: Body });

  res.sendStatus(200);
});

app.get("/sms-messages", (req, res) => {
  res.send(smsMessages);
});

const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const upload = multer({ dest: "uploads/" });

app.post("/send-email", upload.single("file"), async (req, res) => {
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
});

const imap = new Imap({
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: "imap.gmail.com",
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
});

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

app.get("/receive-emails-imap", async (req, res) => {
  let limit = parseInt(req.query.limit, 10) || 10; // Parse limit with radix 10, default to 10
  let offset = parseInt(req.query.offset, 10) || 0; // Parse offset with radix 10, default to 0

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

      // Validate box.messages.total
      if (typeof box.messages.total !== "number") {
        console.error(
          "box.messages.total is not a number:",
          box.messages.total
        );
        return res
          .status(500)
          .send({ success: false, error: "Invalid total message count" });
      }

      const fetchLimit = Math.min(limit, box.messages.total - offset);
      if (fetchLimit <= 0) {
        return res.send({ success: true, emails: [] });
      }

      const start = box.messages.total - offset - fetchLimit + 1;
      const end = box.messages.total - offset;

      // Log variables for debugging
      console.log(
        "limit:",
        limit,
        "offset:",
        offset,
        "box.messages.total:",
        box.messages.total,
        "fetchLimit:",
        fetchLimit,
        "start:",
        start,
        "end:",
        end
      );

      // Check for NaN in start or end
      if (isNaN(start) || isNaN(end)) {
        console.error("NaN detected in start or end calculation");
        return res
          .status(500)
          .send({ success: false, error: "Invalid start or end calculation" });
      }

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
            //decode the body.
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
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
