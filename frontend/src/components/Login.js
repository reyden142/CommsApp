import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useUser } from "../context/UserContext";
import "./Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    console.log("🔐 Submitting login form");
    console.log("Email:", username);
    console.log("Password:", password);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        {
          email: username,
          password: password,
        }
      );

      console.log("✅ Login success response:", response.data);
      localStorage.setItem("token", response.data.token);
      console.log("📦 Token saved to localStorage:", localStorage.getItem("token"));

      const user = { email: username, role: response.data.role };
      console.log("👤 Setting user context:", user);
      setUser(user);

      navigate("/dashboard");
    } catch (err) {
      console.error("❌ Login failed. Full error object:", err);

      if (err.response) {
        console.error("❗ Backend returned:", err.response.status, err.response.data);
        if (err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setError("Login failed. Please try again.");
        }
      } else {
        setError("No response from server.");
      }
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
      <p className="signup-link">
        Don't have an account?{" "}
        <Link to="/register">Sign up</Link>
      </p>
    </div>
  );
};

export default Login;
