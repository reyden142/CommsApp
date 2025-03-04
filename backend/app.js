const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage }); // Define the upload variable

// Authorization middleware
const checkAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(403).send("Forbidden");
  }
};

// File upload route
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  console.log("File uploaded:", req.file); // Log the uploaded file details
  const attachmentUrl = `/uploads/${req.file.filename}`;
  res.send({ filePath: attachmentUrl }); // Send the filePath back to the frontend
});

// Serve files with authorization
app.use("/uploads", express.static("uploads"));

// Routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// Socket.io connection
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on(
    "sendMessage",
    async ({ sender, message, attachmentUrl, fileName }) => {
      try {
        if (!sender || !message) {
          console.error("Invalid message data: sender or message missing");
          socket.emit("errorMessage", { message: "Invalid message data" });
          return;
        }

        console.log("Received message from client:", {
          sender,
          message: message || "No message provided", // Handle empty messages
          attachmentUrl: attachmentUrl || "No attachment",
          fileName: fileName || "No file name", // Log fileName as well
        });

        // Retrieve user role from MongoDB
        const user = await User.findOne({ email: sender });
        const userRole = user?.role || "user"; // Default to "user" if no role found
        console.log(`User role for ${sender}: ${userRole}`);

        // Create a new chat message with the file's attachmentUrl and fileName
        const chatMessage = new Chat({
          user: sender,
          sender,
          message: message || "No message provided", // Handle empty messages
          attachment: attachmentUrl || "", // Ensure attachmentUrl is stored properly
          fileName: fileName || "", // Ensure fileName is stored
          role: userRole,
          timestamp: new Date(), // Add timestamp for when the message is saved
        });

        // Save the message to the database
        await chatMessage.save();
        console.log("Message saved to database:", chatMessage);

        // Emit the message to all connected clients
        io.emit("receiveMessage", {
          sender: chatMessage.sender,
          message: chatMessage.message,
          attachmentUrl: chatMessage.attachment, // Use the stored attachment field as attachmentUrl
          fileName: chatMessage.fileName, // Use fileName from the saved message
          role: chatMessage.role,
          timestamp: chatMessage.timestamp,
        });
        console.log("Message broadcasted to clients:", chatMessage);
      } catch (error) {
        console.error("Error processing message:", error.message);
        socket.emit("errorMessage", { message: "Error saving message" });
      }
    }
  );

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
