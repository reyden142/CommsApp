import React, { useState, useEffect } from "react";
import parse from "html-react-parser";
import DOMPurify from "dompurify";
import { Base64 } from "js-base64"; // Import js-base64 for robust encoding
import "./Email.css";

const Email = () => {
  const [showCompose, setShowCompose] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [emails, setEmails] = useState([]); // Initialize as empty array
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isFetchingEmails, setIsFetchingEmails] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showEmailDetails, setShowEmailDetails] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSend = async () => {
    setLoading(true);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchEmails = async () => {
      setIsFetchingEmails(true);
      setLoadingEmails(true);
      console.log("Starting email fetch.");
      try {
        const response = await fetch(
          `http://localhost:5000/receive-emails-imap?limit=${limit}&offset=${offset}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (isMounted) {
          setEmails(data.emails);
        }
      } catch (error) {
        console.error("Error fetching emails:", error);
      } finally {
        if (isMounted) {
          setIsFetchingEmails(false);
          setLoadingEmails(false);
          console.log("Email fetch complete.");
        }
      }
    };
    fetchEmails();
    return () => {
      isMounted = false;
    };
  }, [refresh, offset, limit]);

  const handleRefresh = () => {
    setOffset(0);
    setIsFetchingEmails(false);
    setRefresh((prev) => prev + 1);
  };

  const handleLoadMore = () => {
    console.log("Loading more emails...");
    setOffset(offset + limit);
    console.log("Offset updated to:", offset + limit);
  };

  const handleLimitChange = (event) => {
    console.log("Changing limit to:", event.target.value);
    setLimit(parseInt(event.target.value, 10));
    setOffset(0);
    console.log("Limit updated to:", event.target.value);
  };

  const handleEmailClick = (email) => {
    setSelectedEmail(email);
    setShowEmailDetails(true);
  };

  const handleBackToList = () => {
    setShowEmailDetails(false);
    setSelectedEmail(null);
  };

  const renderEmailItem = (email, index) => {
    if (
      !email ||
      !email.headers ||
      !email.headers.from ||
      !email.headers.subject ||
      !email.headers.date
    ) {
      console.error("Incomplete email data:", email);
      return null;
    }

    const { headers } = email;
    const from = headers.from[0];
    const subject = headers.subject[0];
    const date = new Date(headers.date[0]).toLocaleString();

    return (
      <button
        className="email-link"
        key={index}
        onClick={(e) => {
          e.preventDefault();
          handleEmailClick(email);
        }}
      >
        {from} | {subject} | {date}
      </button>
    );
  };

  function extractMessageBody(rawEmail) {
    const contentTypeMatch = rawEmail.match(/Content-Type: (.+?)(;|$)/i);
    const contentType = contentTypeMatch
      ? contentTypeMatch[1].toLowerCase()
      : "text/plain";

    console.log("Content-Type:", contentType);

    let body = rawEmail.substring(rawEmail.indexOf("\r\n\r\n") + 4);

    const attachments = []; // Initialize attachments array here

    if (contentType.includes("multipart/mixed")) {
      // Handle multipart/mixed which can contain attachments
      const boundaryMatch = rawEmail.match(/boundary\s*=\s*"?(.+?)"?/i);
      if (boundaryMatch) {
        const boundary = boundaryMatch[1];
        const boundaryRegex = new RegExp(`--${boundary}(--)?\\s*`, "g");
        const parts = body
          .split(boundaryRegex)
          .filter((part) => part && !part.startsWith("--"));

        // Extract attachments and email content
        let emailBody = "";

        parts.forEach((part) => {
          if (part.includes("Content-Disposition: attachment")) {
            // It's an attachment part
            const filenameMatch = part.match(/filename="(.+?)"/i);
            const attachmentName = filenameMatch ? filenameMatch[1] : "unknown";

            // Extract the attachment data
            let attachmentData = part
              .substring(part.indexOf("\r\n\r\n") + 4)
              .trim();

            // Extract the Content-Type of the attachment
            const contentTypeAttachmentMatch = part.match(
              /Content-Type:\s*([^\s;]+)/i
            );
            const attachmentMimeType = contentTypeAttachmentMatch
              ? contentTypeAttachmentMatch[1]
              : "application/octet-stream";

            attachments.push({
              name: attachmentName,
              data: attachmentData,
              mimeType: attachmentMimeType, // Store the MIME type
            });
          } else if (
            part.includes("Content-Type: text/html") ||
            part.includes("Content-Type: text/plain")
          ) {
            // It's the email content (html or text)
            if (part.includes("Content-Type: text/html")) {
              let content = part.substring(part.indexOf("\r\n\r\n") + 4).trim();
              const htmlBodyMatch = content.match(/<body[^>]*>(.*?)<\/body>/is);
              content = htmlBodyMatch ? htmlBodyMatch[1].trim() : content;
              emailBody = content;
            } else {
              // Text/plain fallback
              emailBody = part.substring(part.indexOf("\r\n\r\n") + 4).trim();
            }
          }
        });

        console.log("Attachments:", attachments); // Debugging purpose

        return {
          body: emailBody,
          attachments,
        };
      }
    } else if (contentType.includes("multipart/alternative")) {
      const boundaryMatch = rawEmail.match(/boundary\s*=\s*"?(.+?)"?/i);
      if (boundaryMatch) {
        const boundary = boundaryMatch[1];
        const boundaryRegex = new RegExp(`--${boundary}(--)?\\s*`, "g");
        const parts = body
          .split(boundaryRegex)
          .filter((part) => part && !part.startsWith("--"));

        // Look for HTML part first
        let htmlPart = parts.find((part) =>
          part.includes("Content-Type: text/html")
        );
        if (htmlPart) {
          let content = htmlPart
            .substring(htmlPart.indexOf("\r\n\r\n") + 4)
            .trim();
          const htmlBodyMatch = content.match(/<body[^>]*>(.*?)<\/body>/is);
          content = htmlBodyMatch ? htmlBodyMatch[1].trim() : content;
          return { body: content, attachments: [] };
        }

        // If HTML not found, fallback to text/plain
        let textPart = parts.find((part) =>
          part.includes("Content-Type: text/plain")
        );
        if (textPart) {
          let content = textPart
            .substring(textPart.indexOf("\r\n\r\n") + 4)
            .trim();
          return { body: content, attachments: [] };
        }
      }
    } else if (contentType.includes("text/html")) {
      let content = body.trim();
      const htmlBodyMatch = content.match(/<body[^>]*>(.*?)<\/body>/is);
      content = htmlBodyMatch ? htmlBodyMatch[1].trim() : content;
      return { body: content, attachments: [] };
    } else if (contentType.includes("text/plain")) {
      return { body: body.trim(), attachments: [] };
    }

    return { body: body.trim(), attachments: [] };
  }

  function getMimeTypeFromFileName(fileName) {
    const extension = fileName.slice(
      ((fileName.lastIndexOf(".") - 1) >>> 0) + 2
    ); // Extract extension
    switch (extension.toLowerCase()) {
      case "pdf":
        return "application/pdf";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "gif":
        return "image/gif";
      case "txt":
        return "text/plain";
      case "html":
        return "text/html";
      // Add more cases as needed
      default:
        return "application/octet-stream"; // Default MIME type
    }
  }

  return (
    <div className="email-app-container">
      <div className="header">
        <div className="header-left">
          <button className="btn" onClick={handleRefresh}>
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
        {!showEmailDetails && !showCompose && (
          <>
            <h2>Inbox</h2>
            <div className="email-list">
              {loadingEmails ? (
                <p>Loading emails...</p>
              ) : emails === undefined ? (
                <p>Emails are undefined!</p>
              ) : !Array.isArray(emails) ? (
                <p>Emails is not an array!</p>
              ) : emails.length === 0 ? (
                <p>No emails found</p>
              ) : (
                [...emails]
                  .reverse()
                  .map((email, index) => renderEmailItem(email, index))
              )}
            </div>
            <div className="pagination">
              <button onClick={handleLoadMore} disabled={isFetchingEmails}>
                Load More
              </button>
              <label htmlFor="limitSelect">Emails per page:</label>
              <select
                id="limitSelect"
                value={limit}
                onChange={handleLimitChange}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
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
              <button className="btn" onClick={handleSend} disabled={loading}>
                {loading ? "Sending..." : "Send"}
              </button>
            </div>
            {loading && (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Sending email, please wait...</p>
              </div>
            )}
          </>
        )}
        {showEmailDetails && selectedEmail && (
          <div className="email-details-page">
            <button onClick={handleBackToList}>Back to List</button>
            <h2>{selectedEmail.headers.subject[0]}</h2>
            <p>From: {selectedEmail.headers.from[0]}</p>

            {(() => {
              try {
                const { body, attachments } = extractMessageBody(
                  selectedEmail.body
                );

                console.log("Attachments:", attachments);

                return (
                  <>
                    <div className="email-body-content">
                      {parse(DOMPurify.sanitize(body))}
                    </div>
                    {attachments && attachments.length > 0 && (
                      <div className="attachments">
                        <h3>Attachments:</h3>
                        <ul>
                          {attachments.map((attachment, index) => {
                            try {
                              const fileName = attachment.name;
                              const fileType =
                                attachment.mimeType ||
                                getMimeTypeFromFileName(fileName) ||
                                "application/octet-stream"; // Use helper function

                              // Ensure attachment.data exists
                              if (!attachment.data) {
                                console.warn(
                                  "Attachment data is missing for:",
                                  fileName
                                );
                                return null; // Skip this attachment
                              }

                              // Base64 encode the attachment data if it's not already
                              let base64Data = attachment.data;

                              // Create the download link
                              const downloadLink = `data:${fileType};base64,${Base64.encode(
                                base64Data
                              )}`; // Use js-base64

                              return (
                                <li key={index}>
                                  <a href={downloadLink} download={fileName}>
                                    {fileName}
                                  </a>
                                </li>
                              );
                            } catch (attachmentError) {
                              console.error(
                                "Error processing attachment:",
                                attachment,
                                attachmentError
                              );
                              return (
                                <li key={index}>
                                  Error displaying attachment: {attachment.name}
                                </li>
                              );
                            }
                          })}
                        </ul>
                      </div>
                    )}
                  </>
                );
              } catch (emailDetailsError) {
                console.error(
                  "Error rendering email details:",
                  emailDetailsError
                );
                return <p>Error displaying email details.</p>;
              }
            })()}

            <p>
              Date: {new Date(selectedEmail.headers.date[0]).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Email;
