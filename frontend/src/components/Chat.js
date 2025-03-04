// src/components/Chat.js
import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import { useUser } from "../context/UserContext";
import "./Chat.css";

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
  const { user } = useUser(); // Get the logged-in user information

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to server");

      // Send a test message when connected
      const testMessage = {
        sender: user.email,
        message: "Test message from frontend",
        attachmentUrl: "",
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
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const msg = { sender: user.email, message, attachmentUrl: "" }; // Use logged-in user's email
    console.log("Sending message:", msg); // Log the message being sent
    socket.emit("sendMessage", msg); // Ensure event name matches backend
    setMessage("");
  };

  const getUsername = (email) => {
    return email.split("@")[0];
  };

  return (
    <div className="chat-container">
      <h2>Chat Room</h2>
      <div className="messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${
              msg.sender === user.email ? "client" : "admin"
            }`}
          >
            <div className="message-sender">
              {getUsername(msg.sender)} {msg.role ? `(${msg.role})` : ""}
            </div>{" "}
            {/* Display username and role */}
            <div className="message-text">{msg.message}</div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="message-form">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message"
          className="message-input"
        />
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
