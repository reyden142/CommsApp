const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const Chat = require("./models/Chat");
const chatRoutes = require("./routes/chatRoutes");
const dotenv = require("dotenv");
const cors = require("cors");
const twilio = require("twilio");

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS Configuration (Allow requests from localhost:3000)
app.use(
  cors({
    origin: "http://localhost:3000", // Make sure to update if you're deploying to production
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
app.post("/incoming-sms", (req, res) => {
  console.log("Incoming SMS body:", req.body); // Log the incoming body to check what Twilio is sending

  const { From, Body } = req.body;

  // Validate the incoming request from Twilio
  if (!From || !Body) {
    console.error("Invalid incoming SMS request:", req.body);
    return res.status(400).send("Invalid SMS request");
  }

  // Store the incoming message (could be saved in DB)
  smsMessages.push({ from: From, message: Body });
  console.log(`Received message from ${From}: ${Body}`);

  // Emit the incoming message to connected clients via Socket.IO
  io.emit("receiveSMS", { from: From, message: Body });

  res.sendStatus(200); // Respond back with HTTP 200 to acknowledge successful handling
});

// Get SMS messages (for fetching inbox)
app.get("/sms-messages", (req, res) => {
  console.log("Fetching SMS messages. Current messages:", smsMessages); // Log the stored messages
  res.send(smsMessages); // Send back the array of stored messages
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
