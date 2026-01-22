import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import "./SMS.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function SMS() {
  const [activeSection, setActiveSection] = useState("inbox");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [inboxMessages, setInboxMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io(API_URL);

    fetchMessages();

    socketRef.current.on("receiveSMS", (sms) => {
      console.log("Received SMS:", sms);
      setInboxMessages((prevMessages) => {
        const newMessages = [...prevMessages, sms];
        console.log("Updated inbox messages:", newMessages);
        return newMessages;
      });
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });

    socketRef.current.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("receiveSMS");
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/sms-messages`);
      const data = await response.json();
      setInboxMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInboxClick = () => {
    setActiveSection("inbox");
    fetchMessages(); // Fetch messages when switching to inbox
  };

  const handleNewMessageClick = () => {
    setActiveSection("newMessage");
  };

  const handleSend = async () => {
    if (!phoneNumber || !message) {
      return toast.error("Phone number and message cannot be empty.");
    }

    try {
      setLoading(true);
      await fetch(`${API_URL}/send-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phoneNumber, message }),
      });
      setPhoneNumber("");
      setMessage("");
      setActiveSection("inbox");
      fetchMessages();
      toast.success("Message sent!"); // Display a success toast
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Error sending message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sms-container">
      <h2 className="sms-title">SMS</h2>
      <div className="sms-buttons">
        <button
          className={`sms-button ${activeSection === "inbox" ? "active" : ""}`}
          onClick={handleInboxClick}
        >
          Inbox
        </button>
        <button
          className={`sms-button ${activeSection === "newMessage" ? "active" : ""
            }`}
          onClick={handleNewMessageClick}
        >
          New Message
        </button>
      </div>

      {activeSection === "inbox" && (
        <div className="sms-inbox">
          <h3 className="inbox-title">Inbox</h3>
          {loading ? (
            <p>Loading messages...</p>
          ) : inboxMessages.length === 0 ? (
            <p>No messages in inbox.</p>
          ) : (
            inboxMessages.map((sms, index) => (
              <div key={index} className="inbox-message">
                <p className="message-from">From: {sms.from}</p>
                <p className="message-text">Message: {sms.message}</p>
              </div>
            ))
          )}
        </div>
      )}

      {activeSection === "newMessage" && (
        <div className="sms-new-message">
          <h3 className="new-message-title">New Message</h3>
          <div className="form-group">
            <label htmlFor="phoneNumber">To: Phone Number</label>
            <input
              type="text"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="textarea-field"
            />
          </div>
          <button
            className="send-button"
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}

export default SMS;
