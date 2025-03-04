// backend/models/Chat.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chatSchema = new Schema({
  sender: { type: String, required: true },
  message: { type: String, required: true },
  user: { type: String, required: true }, // Add user field to distinguish between admin and client
  timestamp: { type: Date, default: Date.now },
});

const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat;
