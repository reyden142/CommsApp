import React, { useState, useEffect, useRef } from "react";
import "./Voice.css";
import { FaPhone, FaPhoneSlash, FaBackspace } from "react-icons/fa";
import { Device } from "twilio-client";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Voice = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callActive, setCallActive] = useState(false);
  const [call, setCall] = useState(null);
  const [incomingCallVisible, setIncomingCallVisible] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [error, setError] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const deviceRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const setupDevice = async () => {
      try {
        console.log("Fetching token...");
        const token = await fetchToken();
        if (token) {
          console.log("Token received. Setting up device...");
          const newDevice = new Device(token);
          deviceRef.current = newDevice;

          newDevice.on("ready", () => {
            console.log("Twilio Device Ready!");
          });

          newDevice.on("error", (error) => {
            console.error("Twilio Device Error:", error);
            setError("Error setting up device.");
          });

          newDevice.on("incoming", (incomingCall) => {
            console.log("Incoming Call:", incomingCall);
            setIncomingCallVisible(true);
            setIncomingCall(incomingCall);
          });

          newDevice.on("disconnect", () => {
            console.log("Call disconnected.");
            setCallActive(false);
            setCall(null);
            clearInterval(timerRef.current); // Clean up timer
            setCallDuration(0); // Reset call duration
          });
        }
      } catch (error) {
        console.error("Error setting up device:", error);
        //setError("Error initializing Twilio device.");
      }
    };

    setupDevice();

    return () => {
      if (deviceRef.current) {
        console.log("Destroying device...");
        deviceRef.current.destroy(); // Clean up when component unmounts
      }
      clearInterval(timerRef.current); // Clean up timer on unmount
    };
  }, []);

  // Fetch Twilio token from the backend
  const fetchToken = async () => {
    try {
      console.log("Fetching token...");
      const response = await fetch(`${API_URL}/api/token`);
      if (!response.ok) {
        console.error("Error fetching token:", response.statusText);
        throw new Error(`Failed to fetch token: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.token) {
        console.log("Token received:", data.token);
        return data.token;
      } else {
        console.error("Token is undefined:", data);
        throw new Error("Token is undefined");
      }
    } catch (error) {
      console.error("Error fetching token:", error);
      setError("Error fetching token from the backend.");
      throw error; // Re-throw to handle error
    }
  };

  // Handle phone number digit input
  const handleDigitClick = (digit) => {
    setPhoneNumber((prev) => prev + digit);
  };

  // Validate phone number format (E.164 format)
  const validatePhoneNumber = (number) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format validation
    return phoneRegex.test(number);
  };

  // Handle initiating a call
  const handleCall = async () => {
    if (!phoneNumber) {
      setError("Please enter a phone number.");
      return;
    }

    // Check if the phone number is valid and in the correct format
    if (!validatePhoneNumber(phoneNumber)) {
      setError("Invalid phone number format. Use E.164 format.");
      return;
    }

    try {
      console.log("Initiating call to:", phoneNumber);

      // Make a request to the backend to initiate the call
      const response = await fetch(`${API_URL}/make_call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: phoneNumber }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Call initiated successfully!", data);
        setCallActive(true);
        setCall(data.call); // Set call data to be used for hangup
        setError(null); // Clear any errors
        startCallTimer(); // Start timer for outgoing calls
      } else {
        setError(data.message || "Failed to initiate call");
        console.error("Failed to initiate call:", data.message);
      }
    } catch (error) {
      console.error("Error initiating call:", error);
      setError("Failed to initiate call. Check if the number is verified.");
    }
  };

  // Handle hanging up the call
  const handleHangup = () => {
    console.log("Attempting to hang up the call...");
    if (call) {
      console.log("Call object exists. Disconnecting...");
      call.disconnect(); // Disconnecting the active call
      setCallActive(false);
      setCall(null); // Reset the call object after disconnecting
      clearInterval(timerRef.current); // Clean up timer
      setCallDuration(0); // Reset call duration
      setError(null); // Clear any errors
      console.log("Call disconnected");
    } else {
      console.error("No active call to hang up.");
      // Optionally, you can retry after a short delay if you suspect a race condition
      setTimeout(() => handleHangup(), 500); // Retry after 500ms
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    if (incomingCall) {
      console.log("Accepting incoming call...");
      try {
        const acceptedCall = await incomingCall.accept();
        console.log("Call accepted!", acceptedCall);
        setCallActive(true);
        setCall(acceptedCall); // Ensure this line updates the call state correctly
        setIncomingCallVisible(false); // Hide the popup
        setError(null); // Clear any errors
      } catch (error) {
        console.error("Error accepting call:", error);
        setError("Error accepting incoming call.");
      }
    }
  };

  // Reject incoming call
  const rejectCall = () => {
    if (incomingCall) {
      console.log("Rejecting incoming call...");
      incomingCall.reject();
      setIncomingCallVisible(false); // Hide the popup
    }
  };

  // Handle deleting one digit at a time
  const handleDelete = () => {
    setPhoneNumber((prev) => prev.slice(0, -1)); // Removes one character from the end
  };

  // Function to start the call timer
  const startCallTimer = () => {
    timerRef.current = setInterval(() => {
      setCallDuration((prevDuration) => prevDuration + 1);
    }, 1000); // Increment every second
  };

  // Helper function to format duration
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secondsRemaining = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secondsRemaining.toString().padStart(2, "0")}`;
  };

  return (
    <div className="call-container">
      <div className="dialpad-container">
        {callActive && (
          <p className="call-duration">
            Call Duration: {formatDuration(callDuration)}
          </p>
        )}
        <div className="phone-number-display">{phoneNumber}</div>
        <div className="dialpad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, "+", 0, "#"].map((digit) => (
            <button
              key={digit}
              className="digit-button"
              onClick={() => handleDigitClick(digit.toString())}
            >
              {digit}
            </button>
          ))}
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="call-actions">
          {callActive ? (
            <button className="hangup-button" onClick={handleHangup}>
              <FaPhoneSlash />
            </button>
          ) : (
            <div className="action-buttons">
              <button className="call-button" onClick={handleCall}>
                <FaPhone />
              </button>
              <button
                className="delete-button"
                onClick={handleDelete} // Update to use handleDelete
              >
                <FaBackspace />
              </button>
            </div>
          )}
        </div>
      </div>

      {incomingCallVisible && (
        <div className="incoming-call-popup">
          <h2>Incoming Call</h2>
          <button className="accept-button" onClick={acceptCall}>
            Accept
          </button>
          <button className="reject-button" onClick={rejectCall}>
            Reject
          </button>
        </div>
      )}
    </div>
  );
};

export default Voice;
