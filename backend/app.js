const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Chat = require("./models/Chat");
const User = require("@tmq-reyden/auth/models/User");
const chatRoutes = require("./routes/chatRoutes");
const dotenv = require("dotenv");
const cors = require("cors");
const twilio = require("twilio");
const nodemailer = require("nodemailer");
const morgan = require("morgan");
const Imap = require("imap");
const quotedPrintable = require("quoted-printable");
const { sendEmail, receiveEmails, upload2 } = require("./Email");

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS Configuration (Allow requests from localhost:3000)
app.use(
  cors({
    origin: ["http://localhost:3000", "http://192.168.1.15:3000"],
    credentials: true,
  })
);

// Socket.IO setup
const io = require("socket.io")(server, {
  cors: {
    origin: "*", // Replace with your frontend's actual URL for security
    methods: ["GET", "POST"],
  },
  transports: ["websocket"], // Enforce WebSocket transport
});

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// MongoDB setup
// MongoDB setup
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");

    // 🔍 Log all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("📁 Collections in the database:");
    collections.forEach((col) => console.log(` - ${col.name}`));

    // 👥 Log existing users
    const users = await mongoose.connection.db.collection("users").find().toArray();
    console.log("👥 Users in database:");
    users.forEach((user, i) => {
      console.log(`User ${i + 1}:`, user);
    });

    // 👤 Insert admin user if not exists
    const existingUser = await User.findOne({ email: "admin@gmail.com" });
    if (!existingUser) {
      const newUser = new User({
        username: "admin",
        email: "admin@gmail.com",
        password: "12345678",
        role: "admin"
      });

      await newUser.save();
      console.log("✅ Inserted new admin user.");
    } else {
      console.log("ℹ️ Admin user already exists.");
    }

  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });


// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route to send email
app.post("/send-email", upload2.single("file"), sendEmail);

// Route to receive emails via IMAP
app.get("/receive-emails-imap", receiveEmails);

// Check for essential environment variables
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  throw new Error("Missing Twilio credentials");
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/chat", chatRoutes);

// Routes
const authRoutes = require("@tmq-reyden/auth/routes/authRoutes"); // adjust this to the actual path
app.use("/api/auth", authRoutes);

// Twilio Setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = new twilio(accountSid, authToken);

// Message Storage (could be replaced with MongoDB for persistence)
let smsMessages = [];

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

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

    // Ensure the message is not too long
    if (message.length > 1600) {
      return res
        .status(400)
        .send({ success: false, error: "Message too long." });
    }

    // Send the SMS using Twilio API
    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to,
    });

    console.log("Twilio send result:", result.sid); // Log the message SID for reference
    res.send({ success: true, messageSid: result.sid });
  } catch (error) {
    console.error("Error sending SMS:", error);
    res.status(500).send({
      success: false,
      error: error.message,
      code: error.code, // Include error code from Twilio if available
      status: error.status, // Include status from Twilio if available
    });
  }
});

// Twilio SMS Routes - Receiving SMS
app.post("/incoming-sms", async (req, res) => {
  try {
    console.log("Incoming SMS request headers:", req.headers);
    console.log("Incoming SMS request body:", req.body);

    const { From, Body } = req.body;

    // Validate the incoming request from Twilio
    if (!From || !Body) {
      console.error("Invalid incoming SMS request:", req.body);
      return res.status(400).send("Invalid SMS request");
    }

    // Save the incoming message to MongoDB
    const smsMessage = new SmsMessage({ from: From, message: Body });
    await smsMessage.save();

    console.log(`Received message from ${From}: ${Body}`);

    // Emit the incoming message to connected clients via Socket.IO
    io.emit("receiveSMS", { from: From, message: Body });

    res.set("Content-Type", "text/plain"); // Explicitly set Content-Type
    res.sendStatus(200); // Respond back with HTTP 200 to acknowledge successful handling
  } catch (error) {
    console.error("Error handling incoming SMS:", error);
    res.status(500).send("Error processing incoming SMS");
  }
});

// Get SMS messages (for fetching inbox)
app.get("/sms-messages", async (req, res) => {
  try {
    const messages = await SmsMessage.find().exec();
    res.send(messages);
  } catch (error) {
    console.error("Error fetching SMS messages:", error);
    res.status(500).send("Error fetching messages");
  }
});

// Get received SMS messages
app.get("/received-sms", async (req, res) => {
  try {
    const messages = await SmsMessage.find({ status: "received" })
      .limit(5)
      .exec();
    res.send(messages);
  } catch (error) {
    console.error("Error fetching received SMS messages:", error);
    res.status(500).send("Error fetching messages");
  }
});

// Middleware
//app.use(cors());
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
const upload = multer({ storage: storage });

// Authorization middleware
const checkAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(403).send("Forbidden");
  }
};

// Socket.io connection
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on(
    "sendMessage",
    async ({ sender, message, attachmentUrl, fileName, listIds }) => {
      try {
        if (!sender) {
          console.error("Invalid message data: sender missing");
          socket.emit("errorMessage", { message: "Invalid message data" });
          return;
        }

        console.log("Received message from client:", {
          sender,
          message: message || "No message provided",
          attachmentUrl: attachmentUrl || "No attachment",
          fileName: fileName || "No file name",
          listIds: listIds || "No listIds",
        });

        // Retrieve user role from MongoDB
        const user = await User.findOne({ email: sender });
        const userRole = user?.role || "user";

        // Create a new chat message with the file's attachmentUrl and fileName
        const chatMessage = new Chat({
          user: sender,
          sender,
          message: message, // Remove the default message
          attachmentUrl: attachmentUrl || "", // Store attachmentUrl
          fileName: fileName || "",
          role: userRole,
          timestamp: new Date(),
          listIds: listIds || [], // Store listIds
        });

        // Save the message to the database
        await chatMessage.save();
        console.log("Message saved to database:", chatMessage);

        // Emit the message to all connected clients
        io.emit("receiveMessage", {
          sender: chatMessage.sender,
          message: chatMessage.message,
          attachmentUrl: chatMessage.attachmentUrl, // Use stored attachmentUrl
          fileName: chatMessage.fileName,
          role: chatMessage.role,
          timestamp: chatMessage.timestamp,
          listIds: chatMessage.listIds,
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

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  console.log("File uploaded:", req.file);

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const attachmentUrl = `${baseUrl}/uploads/${req.file.filename}`;

  console.log("Raw listIds:", req.body.listIds);

  // Extract and parse listIds
  let listIds = [];
  if (req.body.listIds) {
    try {
      listIds = JSON.parse(req.body.listIds);
      console.log("Parsed listIds:", listIds);
    } catch (error) {
      console.error("Error parsing listIds:", error);
      return res.status(400).send("Invalid listIds format.");
    }
  }

  res.send({
    filePath: attachmentUrl,
    listIds: listIds,
  });
});

// Serve static files from the uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const smsMessageSchema = new mongoose.Schema({
  from: String,
  message: String,
  status: String, // Added status field
});

const SmsMessage = mongoose.model("SmsMessage", smsMessageSchema);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/chat", chatRoutes);

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

let userCount = 0; // Track the number of users connected
const logFrequency = 100; // Log every 100th user connection

io.on("connection", (socket) => {
  userCount++; // Increment user count on new connection

  // Log every 'logFrequency' number of connections
  if (userCount % logFrequency === 0) {
    console.log(`User connected! Total users: ${userCount}`);
  }

  socket.on("disconnect", () => {
    userCount--; // Decrease user count on disconnect
  });
});

// Server Port Configuration
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
