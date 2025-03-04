// backend/index.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const chatRoutes = require("./routes/chatRoutes");
const Chat = require("./models/Chat");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // Replace with your frontend URL
    methods: ["GET", "POST"],
  },
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(
  cors({
    origin: "http://localhost:3000", // Replace with your frontend URL
  })
);

app.use(express.json()); // Middleware to parse JSON bodies
app.use("/api/chat", chatRoutes); // Use chat routes

io.on("connection", (socket) => {
  console.log("A user connected");

  // Send existing messages to the client when they connect
  Chat.find()
    .sort({ timestamp: 1 })
    .then((messages) => {
      socket.emit("chatHistory", messages);
    });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });

  socket.on("chatMessage", async (msg) => {
    console.log("Received message from client:", msg); // Log the message received from the client
    const newMessage = new Chat(msg);
    await newMessage.save();
    io.emit("chatMessage", msg); // Emit the chat message to all connected clients
  });
});

server.listen(5000, () => {
  console.log("Server is running on port 5000");
});
