import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import axios from "axios";
import { useUser } from "../context/UserContext";
import "./Chat.css";

// Socket connection
const socket = io("http://192.168.1.15:5000", {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

socket.on("connect_error", (err) => {
  console.error("Connection Error:", err.message);
});

socket.on("connect_timeout", (err) => {
  console.error("Connection Timeout:", err.message);
});

socket.on("reconnect_attempt", () => {
  console.log("Reconnection Attempt");
});

socket.on("reconnect_failed", () => {
  console.error("Reconnection Failed");
});

const Chat = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState(""); // Store original file name
  const { user } = useUser(); // Get the logged-in user information

  useEffect(() => {
    if (user) {
      socket.on("connect", () => {
        console.log("Connected to server");

        // Send a test message when connected
        const testMessage = {
          sender: user.email,
          message: "Test message from frontend",
          attachmentUrl: "",
          fileName: "",
        };
        console.log("Sending test message:", testMessage);
        socket.emit("sendMessage", testMessage);
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from server");
      });

      // Listen for received messages
      socket.on("receiveMessage", (msg) => {
        console.log("Received message:", msg); // Log the received message
        setMessages((prevMessages) => [...prevMessages, msg]);
      });

      // Clean up the socket event listeners on component unmount
      return () => {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("receiveMessage");
      };
    }
  }, [user]);

  // Handle file change (upload)
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name); // Store original file name
      console.log("File selected:", selectedFile.name);
    }
  };

  // Handle message submission (including file upload)
  const handleSubmit = async (e) => {
    e.preventDefault();
    let attachmentUrl = "";

    // Handle file upload if file exists
    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        // Send file to backend for uploading
        const response = await axios.post(
          "http://192.168.1.15:5000/upload",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        // Check for the response from backend
        console.log("File uploaded successfully:", response); // Log the full response

        // Get the file path from the response and assign it to attachmentUrl
        attachmentUrl = response.data.filePath;
      } catch (err) {
        console.error("File upload failed", err);
      }
    }

    // Construct message object with attachmentUrl and fileName
    if (user) {
      const msg = {
        sender: user.email,
        message: message || fileName || "No message", // Use message or fileName
        attachmentUrl, // URL from backend
        fileName, // Send the original file name
      };

      console.log("Sending message:", msg); // Log message before sending
      socket.emit("sendMessage", msg); // Emit the message through socket

      // Reset form after sending
      setMessage("");
      setFile(null);
      setFileName(""); // Clear file name after sending
    } else {
      console.error("User is not logged in");
    }
  };

  // Get username from email
  const getUsername = (email) => {
    return email.split("@")[0];
  };

  return (
    <div className="chat-container">
      <h2>Chat Room</h2>
      <div className="messages">
        {messages.map((msg, index) => {
          console.log(`Rendering message #${index}:`, msg); // Check each message object

          // Log details about the sender and message content
          console.log(`Sender: ${msg.sender}`);
          console.log(`Message: ${msg.message}`);
          console.log(`Attachment URL: ${msg.attachmentUrl}`);
          console.log(`File Name: ${msg.fileName}`);

          return (
            <div
              key={index}
              className={`message ${
                msg.sender === user?.email ? "client" : "admin"
              }`}
            >
              <div className="message-sender">
                {getUsername(msg.sender)} {msg.role ? `(${msg.role})` : ""}
              </div>
              <div className="message-text">{msg.message}</div>
              {msg.attachmentUrl && (
                <div className="message-attachment">
                  {/* Check if the attachmentUrl exists before rendering the link */}
                  <a
                    href={msg.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    Download {msg.fileName || "Attachment"}
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="message-form">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message"
          className="message-input"
        />
        <div className="attachment-container">
          <input
            type="file"
            onChange={handleFileChange}
            className="file-input"
          />
        </div>
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
