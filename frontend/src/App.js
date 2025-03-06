// src/App.js
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  Link,
} from "react-router-dom";
import { UserProvider, useUser } from "./context/UserContext";
import Login from "./components/Login";
import Logout from "./components/Logout";
import Dashboard from "./components/Dashboard";
import Home from "./components/Home";
import Chat from "./components/Chat"; // No changes needed here, still the main chat component
import Voice from "./components/Voice";
import Video from "./components/Video";
import Email from "./components/Email";
import SMS from "./components/SMS";
import "./App.css";
import ErrorBoundary from "./components/ErrorBoundary"; // Import ErrorBoundary

const PrivateRoute = ({ children }) => {
  const contextValue = useUser();
  const user = contextValue?.user; // Safely access user

  return user ? children : <Navigate to="/login" replace />;
};

const App = () => {
  // State to store any email-related information
  const [emails, setEmails] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Function to handle sending email
  const handleSendEmail = async (emailData) => {
    try {
      setIsLoading(true); // Indicate loading while sending email
      const response = await fetch("http://192.168.1.15:5000/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      const result = await response.json();
      if (result.success) {
        alert("Email sent successfully!");
      } else {
        alert("Failed to send email");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert("An error occurred while sending the email.");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch emails (inbox)
  const fetchEmails = async () => {
    try {
      setIsLoading(true); // Indicate loading while fetching emails
      const response = await fetch(
        "http://192.168.1.15:5000/receive-emails-imap"
      ); // Use your IMAP route
      const emailData = await response.json();
      setEmails(emailData); // Store emails in state
    } catch (error) {
      console.error("Error fetching emails:", error);
      alert("An error occurred while fetching the emails.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <UserProvider>
      <Router>
        <div className="app-container">
          <nav className="navbar">
            <ul className="nav-links">
              <li>
                <Link to="/home">Home</Link>
              </li>
              <li>
                <Link to="/chat">Chat</Link>
              </li>
              <li>
                <Link to="/voice">Voice</Link>
              </li>
              <li>
                <Link to="/video">Video</Link>
              </li>
              <li>
                <Link to="/email">Email</Link>
              </li>
              <li>
                <Link to="/sms">SMS</Link>
              </li>
              <li>
                <Link to="/logout">Logout</Link>
              </li>
            </ul>
          </nav>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/voice" element={<Voice />} />
            <Route path="/video" element={<Video />} />
            <Route
              path="/email"
              element={
                <ErrorBoundary>
                  {" "}
                  {/* Wrap Email with ErrorBoundary */}
                  <Email
                    emails={emails}
                    fetchEmails={fetchEmails}
                    handleSendEmail={handleSendEmail}
                    isLoading={isLoading}
                  />
                </ErrorBoundary>
              }
            />
            <Route
              path="/sms"
              element={
                <ErrorBoundary>
                  <SMS />{" "}
                </ErrorBoundary>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </UserProvider>
  );
};

export default App;
