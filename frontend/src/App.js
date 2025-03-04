// src/App.js
import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  Link,
} from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import Login from "./components/Login";
import Logout from "./components/Logout";
import Dashboard from "./components/Dashboard";
import Home from "./components/Home";
import Chat from "./components/Chat";
import Voice from "./components/Voice";
import Video from "./components/Video";
import Email from "./components/Email";
import SMS from "./components/SMS";
import "./App.css";

const PrivateRoute = ({ children }) => {
  const isAuthenticated = true; // Replace this with your actual authentication logic
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const App = () => {
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
            <Route path="/email" element={<Email />} />
            <Route path="/sms" element={<SMS />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
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
