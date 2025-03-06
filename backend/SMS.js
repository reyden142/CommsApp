// SMS.js
const express = require("express");
const { SmsMessage } = require("./models/SmsMessage"); // Assuming you have a model for SMS messages
const dotenv = require("dotenv");
const twilio = require("twilio");

dotenv.config();

// Twilio Setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = new twilio(accountSid, authToken);

const router = express.Router();

// Message Storage (if using in-memory, otherwise comment this out)
let smsMessages = [];

// Sending SMS
router.post("/send-sms", async (req, res) => {
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
      return res.status(400).send({
        success: false,
        error: "Message too long.",
      });
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

// Receiving SMS (from Twilio)
router.post("/incoming-sms", async (req, res) => {
  try {
    console.log("Incoming SMS request headers:", req.headers);
    console.log("Incoming SMS request body:", req.body);

    const { From, Body } = req.body;

    // Validate the incoming request from Twilio
    if (!From || !Body) {
      console.error("Invalid incoming SMS request:", req.body);
      return res.status(400).send("Invalid SMS request");
    }

    // Save the incoming message to MongoDB (if you're using MongoDB)
    const smsMessage = new SmsMessage({ from: From, message: Body });
    await smsMessage.save();

    console.log(`Received message from ${From}: ${Body}`);

    // Emit the incoming message to connected clients via Socket.IO
    req.io.emit("receiveSMS", { from: From, message: Body });

    res.set("Content-Type", "text/plain"); // Explicitly set Content-Type
    res.sendStatus(200); // Respond back with HTTP 200 to acknowledge successful handling
  } catch (error) {
    console.error("Error handling incoming SMS:", error);
    res.status(500).send("Error processing incoming SMS");
  }
});

// Get SMS messages (for fetching inbox)
router.get("/sms-messages", async (req, res) => {
  try {
    const messages = await SmsMessage.find().exec();
    res.send(messages);
  } catch (error) {
    console.error("Error fetching SMS messages:", error);
    res.status(500).send("Error fetching messages");
  }
});

module.exports = router;
