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
  const deviceRef = useRef(null);

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
          });

          newDevice.on("incoming", (incomingCall) => {
            console.log("Incoming Call:", incomingCall);
            console.log("Incoming call parameters:", incomingCall.parameters);
            setIncomingCallVisible(true);
            setIncomingCall(incomingCall);
          });
        }
      } catch (error) {
        console.error("Error setting up device:", error);
      }
    };

    setupDevice();

    return () => {
      if (deviceRef.current) {
        console.log("Destroying device...");
        deviceRef.current.destroy(); // Clean up when component unmounts
      }
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
      throw error; // Re-throw to handle error
    }
  };

  // Handle phone number digit input
  const handleDigitClick = (digit) => {
    setPhoneNumber((prev) => prev + digit);
  };

  // Handle initiating a call
  const handleCall = async () => {
    if (phoneNumber) {
      try {
        console.log("Initiating call to:", phoneNumber);
        const params = { To: phoneNumber }; // Twilio uses 'To' for outgoing calls
        const call = await deviceRef.current.connect(params);
        setCall(call);
        setCallActive(true);
        console.log("Call initiated successfully!");
      } catch (error) {
        console.error("Error initiating call:", error);
      }
    }
  };

  // Handle hanging up the call
  const handleHangup = () => {
    if (call) {
      call.disconnect();
      setCallActive(false);
      console.log("Call disconnected");
    }
  };

  // Accept incoming call
  const acceptCall = () => {
    if (incomingCall) {
      console.log("Accepting incoming call...");
      incomingCall.accept().then((call) => {
        console.log("Call accepted!");
        setCallActive(true);
        setCall(call);
        setIncomingCallVisible(false); // Hide the popup
      });
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

  return (
    <div className="call-container">
      <div className="dialpad-container">
        <div className="phone-number-display">{phoneNumber}</div>
        <div className="dialpad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, "*", 0, "#"].map((digit) => (
            <button
              key={digit}
              className="digit-button"
              onClick={() => handleDigitClick(digit.toString())}
            >
              {digit}
            </button>
          ))}
        </div>
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
                onClick={() => setPhoneNumber("")}
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

      {!incomingCallVisible && !callActive && (
        <div>Waiting for incoming calls...</div>
      )}
    </div>
  );
};

export default Voice;
