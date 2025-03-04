// src/components/AttachmentUploader.js
import React, { useState } from "react";
import axios from "axios";

const AttachmentUploader = ({ user, socket, onFileUploaded }) => {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      alert("No file selected.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "http://192.168.1.15:5000/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      onFileUploaded(response.data.filePath);
      setFile(null); // Reset file input after successful upload
    } catch (err) {
      console.error("File upload failed", err);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleFileUpload}>Upload Attachment</button>
    </div>
  );
};

export default AttachmentUploader;
