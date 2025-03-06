const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const Chat = require("./models/Chat");
const chatRoutes = require("./routes/chatRoutes");
const dotenv = require("dotenv");
const cors = require("cors");
const twilio = require("twilio");
const morgan = require("morgan");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

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
app.use(cors()); // Place cors first
app.use(express.json()); // Only use express.json once.
app.use(morgan("combined")); // Logging middleware

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
    outgoingApplicationSid: TWILIO_APP_SID,
    incomingAllow: true, // Allow incoming calls
  });

  const token = new AccessToken(
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
    {
      identity: identity,
    }
  );

  // Add the voice grant to the token
  token.addGrant(voiceGrant);

  // Send the token back to the frontend
  res.json({ token: token.toJwt() });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
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

// Make a Call Endpoint (Optional)
app.post("/make_call", async (req, res) => {
  const { to } = req.body;

  if (!to) {
    res.status(400).json({ success: false, message: "Missing 'to' parameter" });
    return;
  }

  try {
    const call = await client.calls.create({
      from: twilioPhoneNumber, // Use your Twilio number
      to: to, // The number you wish to dial
      url: "http://demo.twilio.com/docs/voice.xml", // TwiML instructions for the call
    });

    console.log(`Call initiated: ${call.sid}`);
    res.json({ success: true, message: "Call initiated", callSid: call.sid });
  } catch (error) {
    console.error("Error making call:", error);
    res.status(500).json({ success: false, message: "Error making call" });
  }
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
io.on("connection", (socket) => {
  console.log("User connected: " + socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected: " + socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
