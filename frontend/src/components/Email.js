import React, { useState, useEffect, useRef } from "react";
import parse from "html-react-parser";
import DOMPurify from "dompurify";
import { Base64 } from "js-base64";
import "./Email.css";

const Email = () => {
  const [showCompose, setShowCompose] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [emails, setEmails] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isFetchingEmails, setIsFetchingEmails] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showEmailDetails, setShowEmailDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const emailDetailsRef = useRef(null); // Ref for email details container

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
      const response = await fetch("http://192.168.1.15:5000/send-email", {
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
      setErrorMessage("");
      console.log("Starting email fetch.");
      try {
        const apiUrl = "http://192.168.1.15:5000";

        const response = await fetch(
          `${apiUrl}/receive-emails-imap?limit=${limit}&offset=${offset}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${
              errorData?.message || "Unknown Error"
            }`
          );
        }
        const data = await response.json();
        if (isMounted) {
          setEmails(data.emails);

          if (!data.emails || data.emails.length === 0) {
            console.log("No emails received from the server.");
          }
        }
      } catch (error) {
        console.error("Error fetching emails:", error);
        setErrorMessage("Failed to load emails.");
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

    const attachments = [];

    if (contentType.includes("multipart/mixed")) {
      const boundaryMatch = rawEmail.match(/boundary\s*=\s*"?(.+?)"?/i);
      if (boundaryMatch) {
        const boundary = boundaryMatch[1];
        const boundaryRegex = new RegExp(`--${boundary}(--)?\\s*`, "g");
        const parts = body
          .split(boundaryRegex)
          .filter((part) => part && !part.startsWith("--"));

        let emailBody = "";

        parts.forEach((part) => {
          if (part.includes("Content-Disposition: attachment")) {
            const filenameMatch = part.match(/filename="(.+?)"/i);
            const attachmentName = filenameMatch ? filenameMatch[1] : "unknown";

            let attachmentData = part
              .substring(part.indexOf("\r\n\r\n") + 4)
              .trim();

            const contentTypeAttachmentMatch = part.match(
              /Content-Type:\s*([^\s;]+)/i
            );
            const attachmentMimeType = contentTypeAttachmentMatch
              ? contentTypeAttachmentMatch[1]
              : "application/octet-stream";

            attachments.push({
              name: attachmentName,
              data: attachmentData,
              mimeType: attachmentMimeType,
            });
          } else if (
            part.includes("Content-Type: text/html") ||
            part.includes("Content-Type: text/plain")
          ) {
            if (part.includes("Content-Type: text/html")) {
              let content = part.substring(part.indexOf("\r\n\r\n") + 4).trim();
              const htmlBodyMatch = content.match(/<body[^>]*>(.*?)<\/body>/is);
              content = htmlBodyMatch ? htmlBodyMatch[1].trim() : content;
              emailBody = content;
            } else {
              emailBody = part.substring(part.indexOf("\r\n\r\n") + 4).trim();
            }
          }
        });

        console.log("Attachments:", attachments);

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
    );
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
      default:
        return "application/octet-stream";
    }
  }

  const AttachmentLink = ({ attachment }) => {
    if (attachment.data.startsWith("http")) {
      return (
        <a href={attachment.data} download={attachment.name}>
          {attachment.name}
        </a>
      );
    }

    const handleDownload = () => {
      try {
        const byteCharacters = Base64.decode(attachment.data);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        const blob = new Blob(byteArrays, { type: attachment.mimeType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error creating or triggering download:", error);
      }
    };

    return <button onClick={handleDownload}> {attachment.name}</button>;
  };

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
          <div className="email-details-page" ref={emailDetailsRef}>
            <button onClick={handleBackToList}>Back to List</button>
            <h2>{selectedEmail.headers.subject[0]}</h2>
            <p>From: {selectedEmail.headers.from[0]}</p>
            <p>
              Date: {new Date(selectedEmail.headers.date[0]).toLocaleString()}
            </p>
            <div className="email-content">
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
                                  "application/octet-stream";

                                if (!attachment.data) {
                                  console.warn(
                                    "Attachment data is missing for:",
                                    fileName
                                  );
                                  return null;
                                }

                                if (attachment.data.startsWith("http")) {
                                  return (
                                    <li key={index}>
                                      <a
                                        href={attachment.data}
                                        download={fileName}
                                      >
                                        Download {fileName}
                                      </a>
                                    </li>
                                  );
                                }
                                return (
                                  <li key={index}>
                                    <AttachmentLink attachment={attachment} />
                                  </li>
                                );
                              } catch (attachmentError) {
                                console.error(
                                  "Error processing attachment:",
                                  attachmentError
                                );
                                return null;
                              }
                            })}
                          </ul>
                        </div>
                      )}
                    </>
                  );
                } catch (emailBodyError) {
                  console.error("Error extracting email body:", emailBodyError);
                  return <p>Error displaying email body.</p>;
                }
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Email;
