// src/components/Home.js
import React from "react";
import "./Home.css";
import { useUser } from "../context/UserContext";

const Home = () => {
  const { user } = useUser(); // Get user from context

  // Dummy message data (replace with your actual data)
  const messages = [
    { sender: "Chat", subject: "With Attachment" },
    { sender: "Email", subject: "With Attachment" },
    { sender: "Voice", subject: "Receive and Send" },
    { sender: "SMS", subject: "Receive and Sent" },
  ];

  const getUsername = (email) => {
    // Extract username from email address
    if (!email) return "Unknown Sender";
    return email.split("@")[0];
  };

  return (
    <div className="home-container minimal-text">
      <header className="top-bar">
        <h1>Hi!</h1>
      </header>

      <section className="message-list">
        <h2>Task</h2>
        <ul>
          {messages.map((msg, index) => (
            <li key={index} className="message-item">
              <span className="message-sender">{getUsername(msg.sender)}</span>
              <span className="message-subject">{msg.subject}</span>
              <span className="symbol">➔</span> {/* Right arrow symbol */}
            </li>
          ))}
        </ul>
      </section>

      <footer className="footer">
        <p>&copy; 2024 Omni-Channel Communication App</p>
      </footer>
    </div>
  );
};

export default Home;
