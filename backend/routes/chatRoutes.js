// backend/routes/chatRoutes.js
const express = require("express");
const Chat = require("../models/Chat");
const router = express.Router();

// Route to get all chat messages
router.get("/messages", async (req, res) => {
  try {
    const messages = await Chat.find().sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving messages", error });
  }
});

// Route to save a chat message
router.post("/send", async (req, res) => {
  const { sender, message, user } = req.body;
  try {
    const newMessage = new Chat({ sender, message, user });
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: "Error saving message", error });
  }
});

module.exports = router;
