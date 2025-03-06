const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Chat = require("./models/Chat");
const User = require("./models/User");
const chatRoutes = require("./routes/chatRoutes");
const dotenv = require("dotenv");
const cors = require("cors");
const twilio = require("twilio");
const nodemailer = require("nodemailer");
const multer = require("multer"); // For handling multipart form-data (file uploads)
const { google } = require("googleapis"); // For Gmail API (OAuth2)
const twilio = require("twilio");
const morgan = require("morgan");

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

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Check for essential environment variables
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  throw new Error("Missing Twilio credentials");
}

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = "+16015899930"; // Your permanent Twilio number
const client = twilio(accountSid, authToken);

// Middleware
app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined")); // Logging middleware

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage }); // Define the upload variable

// Authorization middleware
const checkAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(403).send("Forbidden");
  }
};

// File upload route
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  console.log("File uploaded:", req.file); // Log the uploaded file details
  const attachmentUrl = `/uploads/${req.file.filename}`;
  res.send({ filePath: attachmentUrl }); // Send the filePath back to the frontend
});

// Serve files with authorization
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/chat", chatRoutes);
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// Twilio Setup
// Generate Access Token with Incoming Call Permissions
app.get("/api/token", (req, res) => {
  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const identity = "alice"; // You can assign this dynamically if needed

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWIML_APP_SID,
    incomingAllow: true, // Allow incoming calls
  });

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET,
    {
      identity: identity,
    }
  );

  // Add the voice grant to the token
  token.addGrant(voiceGrant);

  // Send the token back to the frontend
  res.json({ token: token.toJwt() });
});

// Handle Incoming Calls
app.post("/voice", async (req, res) => {
  try {
    const twiml = new twilio.twiml.VoiceResponse();

    // Optionally greet the caller
    twiml.say("Hello! Connecting your call.");

    // Instead of dialing a phone number, connect to the Twilio Client (frontend)
    const dial = twiml.dial();
    dial.client("alice"); // The identity "alice" must match the identity in your frontend Device

    console.log("TwiML response:", twiml.toString());
    res.set("Content-Type", "text/xml");
    res.send(twiml.toString());
  } catch (error) {
    console.error("Error handling call:", error);
    res.status(500).send("Error handling call");
  }
});

// Make a Call Endpoint (Updated)
app.post("/make_call", async (req, res) => {
  console.log("Making a call...");

  const { to } = req.body;

  if (!to) {
    return res
      .status(400)
      .json({ success: false, message: "Missing 'to' parameter" });
  }

  try {
    // Log the phone number to check if it's being passed correctly
    console.log(`Dialing phone number: ${to}`);

    // Dial a non-Twilio number (e.g., a personal mobile phone number)
    const call = await client.calls.create({
      from: twilioPhoneNumber, // Your verified Twilio number
      to: to, // The phone number you want to call (e.g., a SIM number)
      url: "http://your-server-url.com/your-twiml-url", // This should return TwiML instructions
    });

    console.log(`Call initiated: ${call.sid}`);
    res.json({ success: true, message: "Call initiated", callSid: call.sid });
  } catch (error) {
    console.error("Error making call:", error);
    res.status(500).json({ success: false, message: "Error making call" });
  }
});

// TwiML URL - Handle the call response
app.get("/your-twiml-url", (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();

  // Use the 'to' number dynamically in the dial number
  const dial = twiml.dial();
  dial.number(req.query.to); // Use the 'to' parameter from the query string

  twiml.say("Hello, your call is connected!");

  res.type("text/xml");
  res.send(twiml.toString());
});

// Error Handling for Unknown Routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// Socket.IO
// Socket.io connection
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on(
    "sendMessage",
    async ({ sender, message, attachmentUrl, fileName }) => {
      try {
        if (!sender || !message) {
          console.error("Invalid message data: sender or message missing");
          socket.emit("errorMessage", { message: "Invalid message data" });
          return;
        }

        console.log("Received message from client:", {
          sender,
          message: message || "No message provided", // Handle empty messages
          attachmentUrl: attachmentUrl || "No attachment",
          fileName: fileName || "No file name", // Log fileName as well
        });

        // Retrieve user role from MongoDB
        const user = await User.findOne({ email: sender });
        const userRole = user?.role || "user"; // Default to "user" if no role found
        console.log(`User role for ${sender}: ${userRole}`);

        // Create a new chat message with the file's attachmentUrl and fileName
        const chatMessage = new Chat({
          user: sender,
          sender,
          message: message || "No message provided", // Handle empty messages
          attachment: attachmentUrl || "", // Ensure attachmentUrl is stored properly
          fileName: fileName || "", // Ensure fileName is stored
          role: userRole,
          timestamp: new Date(), // Add timestamp for when the message is saved
        });

        // Save the message to the database
        await chatMessage.save();
        console.log("Message saved to database:", chatMessage);

        // Emit the message to all connected clients
        io.emit("receiveMessage", {
          sender: chatMessage.sender,
          message: chatMessage.message,
          attachmentUrl: chatMessage.attachment, // Use the stored attachment field as attachmentUrl
          fileName: chatMessage.fileName, // Use fileName from the saved message
          role: chatMessage.role,
          timestamp: chatMessage.timestamp,
        });
        console.log("Message broadcasted to clients:", chatMessage);
      } catch (error) {
        console.error("Error processing message:", error.message);
        socket.emit("errorMessage", { message: "Error saving message" });
      }
    }
  );

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});
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
const upload2 = multer({ dest: "uploads/" }); // Temporarily save files to 'uploads' folder

// Email Routes - Sending Emails (with file attachment support)
app.post("/send-email", upload2.single("file"), async (req, res) => {
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
// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
