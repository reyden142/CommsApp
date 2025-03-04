// src/components/Chat.js
import React, { useState, useEffect } from "react";
import io from "socket.io-client";
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
  const user = "client"; // Default to client, change as needed
  const sender = "User"; // Replace with dynamic user name if needed

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to server");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    // Listen for chat messages from the server
    socket.on("chatMessage", (msg) => {
      console.log("Received message:", msg); // Log the message received
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    // Listen for chat history from the server
    socket.on("chatHistory", (msgs) => {
      console.log("Received chat history:", msgs); // Log the chat history received
      setMessages(msgs);
    });

    // Clean up the socket event listeners on component unmount
    return () => {
      socket.off("chatMessage");
      socket.off("chatHistory");
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const msg = { text: message, user, sender };
    console.log("Sending message:", msg); // Log the message being sent
    socket.emit("chatMessage", msg);
    setMessage("");
  };

  return (
    <div className="chat-container">
      <h2>Chat Room</h2>
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.user}`}>
            <div className="message-sender">{msg.sender}</div>
            <div className="message-text">{msg.text}</div>
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
