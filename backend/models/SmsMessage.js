const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SmsMessageSchema = new Schema({
  from: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: "received", // Default status for incoming SMS
  },
  timestamp: {
    type: Date,
    default: Date.now, // Automatically set the timestamp
  },
});

const SmsMessage = mongoose.model("SmsMessage", SmsMessageSchema);

module.exports = SmsMessage;
