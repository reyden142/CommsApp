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
const { google } = require("googleapis"); // For Gmail API (OAuth2)

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
    console.error("Error sending SMS:", error);
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

// OAuth2 Authorization URL Route
app.get("/auth-url", (req, res) => {
  // Load the client credentials from the credentials.json file
  const credentials = JSON.parse(
    fs.readFileSync(path.join(__dirname, "credentials.json"))
  );

  const { client_id, client_secret, redirect_uris } = credentials.installed;

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });

  res.send({ url: authUrl });
});

// OAuth2 Callback Route
app.get("/oauth2callback", async (req, res) => {
  // Load the client credentials from the credentials.json file
  const credentials = JSON.parse(
    fs.readFileSync(path.join(__dirname, "credentials.json"))
  );
  const { client_id, client_secret, redirect_uris } = credentials.installed;

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  const { code } = req.query;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Save the refresh token in a file for future use
    fs.writeFileSync(
      path.join(__dirname, "tokens.json"),
      JSON.stringify(tokens)
    );

    console.log("Tokens:", tokens);
    res.send("Authentication successful! You can close this window.");
  } catch (error) {
    console.error("Error getting tokens:", error);
    res.status(500).send("Error during authentication");
  }
});

// Fetching emails using Gmail API
app.get("/receive-emails", async (req, res) => {
  try {
    // Check for the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log("Authorization header not found.");
      return res.status(401).json({ error: "Authorization header missing" });
    }

    // Extract the token
    const token = authHeader.split(" ")[1]; // Assuming "Bearer <token>" format

    if (!token) {
      console.log("Access token not found in Authorization header.");
      return res.status(401).json({ error: "Access token not found" });
    }

    console.log("Received access token:", token);

    // Load the client credentials and tokens from their respective files
    const credentials = JSON.parse(
      fs.readFileSync(path.join(__dirname, "credentials.json"))
    );
    const { client_id, client_secret, redirect_uris } = credentials.installed;

    const oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Set the access token received from the frontend
    oauth2Client.setCredentials({ access_token: token });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Fetch the latest 10 messages from the inbox
    const result = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX"],
      maxResults: 10,
    });

    const messages = result.data.messages || [];
    if (messages.length === 0) {
      console.log("No new messages.");
      return res.status(200).send({ success: true, messages: [] }); // or messages if you want to send the empty array.
    }

    console.log("Fetched messages:", messages);
    res.send({ success: true, messages });
  } catch (error) {
    console.error("Error fetching emails:", error);

    if (
      error.response &&
      error.response.data &&
      error.response.data.error === "invalid_grant"
    ) {
      console.error(
        "Invalid or expired refresh token. Please re-authenticate."
      );
    }

    res.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Server Port Configuration
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
