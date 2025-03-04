const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chatSchema = new Schema({
  sender: { type: String, required: true },
  message: { type: String, required: false }, // Make message optional
  user: { type: String, required: true }, // Add user field to distinguish between admin and client
  timestamp: { type: Date, default: Date.now },
  attachmentUrl: { type: String, required: false }, // Add attachment URL
  fileName: { type: String, required: false }, // Add file name
});

const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat;
