const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chatSchema = new Schema({
  user: { type: String, required: true },
  sender: { type: String, required: true },
  message: { type: String, required: false },
  attachmentUrl: { type: String, required: false },
  fileName: { type: String, required: false },
  role: { type: String, required: false },
  timestamp: { type: Date, default: Date.now },
  listIds: { type: Array, required: false },
});

const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat;
