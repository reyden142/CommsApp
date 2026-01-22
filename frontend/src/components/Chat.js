import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
import { useUser } from "../context/UserContext";
import "./Chat.css";

// Socket connection
const socket = io("http://localhost:5000", {
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
  const fileInputRef = useRef(null); // Create a ref for the file input
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const { user } = useUser();
  const [listIds, setListIds] = useState([1, 2, 3]); // Example listIds

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = null; // Reset the file input value
    }
  };

  useEffect(() => {
    if (user) {
      socket.on("connect", () => {
        console.log("Connected to server");
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from server");
      });

      socket.on("receiveMessage", (msg) => {
        console.log("Received message:", msg);
        setMessages((prevMessages) => [...prevMessages, msg]);
      });

      return () => {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("receiveMessage");
      };
    }
  }, [user]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      console.log("File selected:", selectedFile.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let attachmentUrl = "";
    let serverListIds = [];

    if (file) {
      console.log("File selected:", file); // Check if file is selected

      const formData = new FormData();
      formData.append("file", file);
      formData.append("listIds", JSON.stringify(listIds));

      try {
        const response = await axios.post(
          "http://localhost:5000/upload",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        console.log("Frontend Response:", response);
        attachmentUrl = response.data.filePath;
        serverListIds = response.data.listIds;
        console.log("File uploaded successfully:", response);
        console.log("listIds from server:", serverListIds);
      } catch (err) {
        console.error("File upload failed", err);
      }
    }

    if (user) {
      let messageToSend = message;

      const msg = {
        sender: user.email,
        message: messageToSend,
        attachmentUrl,
        fileName: file ? file.name : "",
        listIds: serverListIds,
      };

      console.log("Sending message:", msg); // Check the msg object

      socket.emit("sendMessage", msg);

      setMessage("");
      setFile(null);
      setFileName("");
      resetFileInput(); // Reset the file input after sending
    } else {
      console.error("User is not logged in");
    }
  };

  const getUsername = (email) => {
    return email.split("@")[0];
  };

  return (
    <div className="chat-container">
      <h2>Chat Room</h2>
      <div className="messages">
        {messages.map((msg, index) => {
          return (
            <div
              key={index}
              className={`message ${msg.sender === user?.email ? "client" : "admin"
                }`}
            >
              <div className="message-sender">{getUsername(msg.sender)}</div>
              {msg.message && <div className="message-text">{msg.message}</div>}
              {msg.attachmentUrl && msg.fileName && (
                <div className="message-attachment">
                  <a
                    href={msg.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={msg.fileName}
                  >
                    {msg.fileName || "Attachment"}
                  </a>
                  {/* Display image preview */}
                  {[".jpg", ".png", ".jpeg", ".gif", ".bmp"].includes(
                    msg.fileName.split(".").pop().toLowerCase()
                  ) ? (
                    <img
                      src={msg.attachmentUrl}
                      alt={msg.fileName}
                      style={{ maxWidth: "100px" }}
                    />
                  ) : (
                    // Display a placeholder for non-image files
                    <i
                      className="fas fa-file"
                      style={{ fontSize: "24px", marginLeft: "10px" }}
                    />
                  )}
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
            ref={fileInputRef} // Assign the ref to the file input
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
