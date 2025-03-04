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
const multer = require("multer"); // For handling multipart form-data (file uploads)
const { google } = require("googleapis"); // For Gmail API (if receiving Gmail)

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS Configuration (Allow requests from localhost:3000)
app.use(
  cors({
    origin: "http://localhost:3000", // Update for production
  })
);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // Ensure this matches your frontend URL
    methods: ["GET", "POST"],
  },
});

// MongoDB setup
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/chat", chatRoutes);

// Routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// Twilio Setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = new twilio(accountSid, authToken);

// Message Storage (could be replaced with MongoDB for persistence)
let smsMessages = [];

// Twilio SMS Routes - Sending SMS
app.post("/send-sms", async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).send({
        success: false,
        error: "Phone number and message are required.",
      });
    }

    // Send the SMS using Twilio API
    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to,
    });

    res.send({ success: true, messageSid: result.sid });
  } catch (error) {
    console.error("Error sending SMS:", error); // Log the full error object
    res.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Twilio SMS Routes - Receiving SMS
app.post("/incoming-sms", (req, res) => {
  const { From, Body } = req.body;

  if (!From || !Body) {
    return res.status(400).send("Invalid SMS request");
  }

  smsMessages.push({ from: From, message: Body });
  io.emit("receiveSMS", { from: From, message: Body });

  res.sendStatus(200);
});

// Get SMS messages (for fetching inbox)
app.get("/sms-messages", (req, res) => {
  res.send(smsMessages);
});

// Nodemailer Setup for Sending Emails
const emailTransporter = nodemailer.createTransport({
  service: "gmail", // Use Gmail or another email service
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS, // Use App Password here
  },
});

// File upload configuration (using multer for handling multipart form-data)
const upload = multer({ dest: "uploads/" }); // Temporarily save files to 'uploads' folder

// Email Routes - Sending Emails (with file attachment support)
app.post("/send-email", upload.single("file"), async (req, res) => {
  const { to, subject, message } = req.body;
  const file = req.file; // The file that was uploaded

  if (!to || !subject || !message) {
    return res.status(400).send({
      success: false,
      error: "All fields (to, subject, message) are required.",
    });
  }

  // Log the file upload details for debugging
  console.log("File uploaded:", file);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: subject,
    text: message,
    attachments: file
      ? [
          {
            filename: file.originalname,
            path: file.path, // The path to the file in the uploads folder
          },
        ]
      : [], // Only attach if there's a file
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info); // Log email send success
    res.send({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Error sending email:", error); // Log error details
    res.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Receiving Emails: Gmail API or IMAP Setup Here
// Fetching emails using Gmail API

app.get("/receive-emails", async (req, res) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.REDIRECT_URI // Make sure this matches your OAuth setup
    );

    // Set credentials (you would need to implement OAuth2 flow first to get tokens)
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN, // Refresh token from your OAuth flow
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Fetch the latest 10 messages from the inbox
    const result = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX"],
      maxResults: 10, // Limit to 10 emails
    });

    const messages = result.data.messages || [];
    res.send(messages);
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Server Port Configuration
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
