const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const session = require("express-session");
const Chat = require("./models/Chat");
const User = require("./models/User");
const chatRoutes = require("./routes/chatRoutes");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);
app.use("/chat", chatRoutes);

// Test route
app.get("/test", (req, res) => {
  res.send("Backend is running");
});

// Routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

io.on("connection", (socket) => {
  console.log("User connected: " + socket.id);

  socket.on("sendMessage", async ({ sender, message, attachmentUrl }) => {
    try {
      console.log("Received message from client:", {
        sender,
        message,
        attachmentUrl,
      }); // Log the received message

      // Retrieve user role from MongoDB
      const user = await User.findOne({ email: sender });
      const userRole = user ? user.role : "user"; // Default to "user" if role not found
      console.log("User role:", userRole); // Log the user role

      const chatMessage = new Chat({
        user: sender,
        sender,
        message,
        attachment: attachmentUrl,
        role: userRole, // Include user role
      });
      await chatMessage.save();
      console.log("Saved message to database:", chatMessage); // Log the saved message
      io.emit("receiveMessage", chatMessage); // Emit the message to all connected clients
      console.log("Emitted message to clients:", chatMessage); // Log the emitted message
    } catch (error) {
      console.error("Error saving message:", error);
      socket.emit("errorMessage", { message: "Error saving message" });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected: " + socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
