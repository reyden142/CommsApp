import React, { useState, useEffect } from "react";
import "./Email.css";

const Email = () => {
  const [showCompose, setShowCompose] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [emails, setEmails] = useState([]); // Store received emails

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSend = async () => {
    const emailData = new FormData();
    emailData.append("to", to);
    emailData.append("subject", subject);
    emailData.append("message", message);
    if (file) emailData.append("file", file);

    try {
      const response = await fetch("http://localhost:5000/send-email", {
        method: "POST",
        body: emailData,
      });

      if (response.ok) {
        alert("Email sent successfully!");
        setTo("");
        setSubject("");
        setMessage("");
        setFile(null);
      } else {
        const errorData = await response.json();
        alert(`Failed to send email: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Error sending email");
    }
  };

  const fetchEmails = async () => {
    try {
      // Get the access token from localStorage, state, or any other storage
      const accessToken = localStorage.getItem("accessToken"); // Or wherever you store it

      if (!accessToken) {
        throw new Error("Access token not found");
      }

      const response = await fetch("http://localhost:5000/receive-emails", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`, // Use the actual access token here
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch emails");
      }

      const data = await response.json();
      console.log("Emails fetched successfully:", data);
      setEmails(data); // Store the fetched emails in the state
    } catch (error) {
      console.error("Error fetching emails:", error); // Log the error
      alert("Error fetching emails: " + error.message); // Optionally alert the user
    }
  };

  // Fetch emails when the component mounts
  useEffect(() => {
    fetchEmails();
  }, []);

  return (
    <div className="email-app-container">
      <div className="header">
        <div className="header-left">
          <button className="btn" onClick={fetchEmails}>
            Refresh
          </button>
        </div>
        <div className="header-right">
          <button className="btn" onClick={() => setShowCompose(!showCompose)}>
            Compose
          </button>
        </div>
      </div>

      <div className="email-body">
        {!showCompose && (
          <>
            <h2>Inbox</h2>
            <div className="email-list">
              {emails.length === 0 ? (
                <p>No emails found</p>
              ) : (
                emails.map((email, index) => (
                  <div className="email-item" key={index}>
                    <p>Email #{index + 1}</p>
                    <p>Subject: {email.snippet}</p>{" "}
                    {/* Adjust this based on the structure of the fetched email */}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {showCompose && (
          <>
            <h2>Compose Email</h2>
            <div className="compose-field">
              <label>To</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Recipient's email"
              />
            </div>
            <div className="compose-field">
              <label>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject of the email"
              />
            </div>
            <div className="compose-field">
              <label>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message here"
              />
            </div>
            <div className="compose-field">
              <label>Choose File</label>
              <input type="file" onChange={handleFileChange} />
              {file && <span>{file.name}</span>}
            </div>
            <div className="compose-actions">
              <button className="btn" onClick={handleSend}>
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Email;
