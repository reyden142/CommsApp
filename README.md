# 📱 CommsApp - Omni-Channel Communication Platform

A full-stack, real-time communication application that integrates multiple communication channels including chat, email, SMS, voice, and video calls into a single unified platform.

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![React](https://img.shields.io/badge/React-19.0-blue.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-6.14-green.svg)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black.svg)
![License](https://img.shields.io/badge/License-ISC-blue.svg)

## ✨ Features

### 💬 Real-Time Chat
- Instant messaging with Socket.IO
- File attachments support (images, documents, PDFs)
- Message history persistence
- User role-based messaging
- Real-time message broadcasting

### 📧 Email Integration
- Send emails with attachments via Gmail SMTP
- Receive emails via IMAP
- Email inbox management
- Support for multiple file formats

### 📱 SMS Messaging
- Send SMS messages via Twilio
- Receive incoming SMS messages
- Real-time SMS notifications
- SMS message history storage
- Inbox management

### 📞 Voice Calls
- Make and receive voice calls using Twilio
- WebRTC integration for browser-based calls
- Call management and routing
- Access token generation for secure connections

### 🎥 Video Calls
- Video conferencing capabilities
- Real-time video streaming
- Browser-based video communication

### 🔐 Authentication & Authorization
- User registration and login
- JWT-based authentication
- Role-based access control (Admin/User)
- Session management
- Protected routes

## 🛠️ Tech Stack

### Frontend
- **React 19.0** - UI framework
- **React Router DOM 7.2** - Routing
- **Socket.IO Client 4.8** - Real-time communication
- **Styled Components 6.1** - Styling
- **Axios 1.8** - HTTP client
- **React Toastify** - Notifications
- **Twilio Voice SDK** - Voice calling

### Backend
- **Node.js** - Runtime environment
- **Express 5.1** - Web framework
- **Socket.IO 4.8** - WebSocket server
- **MongoDB 6.14** - Database
- **Mongoose 8.12** - ODM
- **Twilio 5.4** - SMS and Voice API
- **Nodemailer 6.10** - Email service
- **IMAP Simple 5.1** - Email retrieval
- **Multer 1.4** - File upload handling
- **AWS SDK 2.169** - Cloud storage (optional)
- **JWT 9.0** - Authentication tokens
- **Bcryptjs 3.0** - Password hashing

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** (local or cloud instance)
- **Twilio Account** (for SMS and Voice features)
- **Gmail Account** (for Email features)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/CommsApp.git
   cd CommsApp
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# Server Configuration
PORT=5000

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/commsapp
# Or use MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/commsapp

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_API_KEY=your_twilio_api_key
TWILIO_API_SECRET=your_twilio_api_secret
TWIML_APP_SID=your_twiml_app_sid

# Email Configuration (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Session Secret
SESSION_SECRET=your_secret_key_here

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://192.168.1.15:3000
```

### Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```env
REACT_APP_API_URL=http://localhost:5000
```

### Twilio Setup

1. Sign up for a [Twilio account](https://www.twilio.com/)
2. Get your Account SID and Auth Token from the Twilio Console
3. Purchase a phone number or use a trial number
4. Create a TwiML App for voice calls
5. Configure webhook URLs for incoming SMS: `http://your-server-url/incoming-sms`

### Gmail Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an [App Password](https://support.google.com/accounts/answer/185833)
3. Use the app password in your `EMAIL_PASS` environment variable

## 🏃 Running the Application

### Development Mode

1. **Start the backend server**
   ```bash
   cd backend
   npm start
   # Or use nodemon for auto-restart:
   # npx nodemon app.js
   ```
   The backend will run on `http://localhost:5000`

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm start
   ```
   The frontend will run on `http://localhost:3000`

3. **Open your browser**
   Navigate to `http://localhost:3000`

### Production Build

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Serve the production build**
   ```bash
   # Option 1: Serve with Express
   # Add this to your backend app.js:
   app.use(express.static(path.join(__dirname, '../frontend/build')));
   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
   });

   # Option 2: Use a static file server like serve
   npm install -g serve
   serve -s frontend/build
   ```

## 📁 Project Structure

```
CommsApp/
├── backend/
│   ├── config/
│   │   └── db.js              # Database configuration
│   ├── models/
│   │   ├── Chat.js            # Chat message model
│   │   └── SmsMessage.js      # SMS message model
│   ├── routes/
│   │   └── chatRoutes.js      # Chat API routes
│   ├── uploads/               # File uploads directory
│   ├── app.js                 # Main Express application
│   ├── index.js               # Alternative entry point
│   ├── Email.js               # Email service functions
│   ├── SMS.js                 # SMS service functions
│   ├── hashPassword.js        # Password hashing utilities
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat.js        # Chat component
│   │   │   ├── Email.js       # Email component
│   │   │   ├── SMS.js         # SMS component
│   │   │   ├── Voice.js       # Voice call component
│   │   │   ├── Video.js       # Video call component
│   │   │   ├── Login.js       # Login component
│   │   │   ├── Register.js    # Registration component
│   │   │   └── ...
│   │   ├── context/
│   │   │   └── UserContext.js # User context provider
│   │   ├── App.js             # Main App component
│   │   └── index.js           # Entry point
│   └── package.json
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Chat
- `GET /chat/messages` - Get all chat messages
- `POST /chat/messages` - Send a chat message
- `WebSocket: sendMessage` - Real-time message sending
- `WebSocket: receiveMessage` - Real-time message receiving

### Email
- `POST /send-email` - Send an email with optional attachment
- `GET /receive-emails-imap` - Fetch emails from IMAP server

### SMS
- `POST /send-sms` - Send an SMS message
- `POST /incoming-sms` - Webhook for receiving SMS (Twilio)
- `GET /sms-messages` - Get all SMS messages
- `GET /received-sms` - Get received SMS messages
- `WebSocket: receiveSMS` - Real-time SMS notifications

### Voice
- `GET /api/token` - Get Twilio access token for voice calls
- `POST /voice` - Handle incoming voice calls
- `POST /make_call` - Initiate a voice call

### File Upload
- `POST /upload` - Upload a file (returns file URL)

## 🎯 Usage

### Chat
1. Navigate to the Chat section
2. Type your message in the input field
3. Optionally attach files (images, documents)
4. Send messages in real-time

### Email
1. Go to the Email section
2. **Send Email**: Fill in recipient, subject, message, and optionally attach files
3. **Receive Email**: Click "Fetch Emails" to retrieve emails from your inbox

### SMS
1. Navigate to the SMS section
2. **Send SMS**: Enter phone number and message, then click send
3. **Inbox**: View received SMS messages in real-time

### Voice Calls
1. Go to the Voice section
2. Click "Make Call" and enter the phone number
3. Answer incoming calls through the web interface

### Video Calls
1. Navigate to the Video section
2. Start a video call session
3. Share your camera and microphone

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Session management
- CORS configuration
- Protected API routes
- Input validation
- File upload restrictions

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check your `MONGO_URI` in `.env`
   - Verify network connectivity

2. **Twilio SMS Not Working**
   - Verify Twilio credentials in `.env`
   - Check phone number format (E.164 format: +1234567890)
   - Ensure webhook URL is configured in Twilio Console

3. **Email Not Sending**
   - Verify Gmail app password is correct
   - Check if 2FA is enabled on Gmail account
   - Ensure IMAP is enabled in Gmail settings

4. **Socket.IO Connection Issues**
   - Check CORS configuration
   - Verify frontend API URL matches backend
   - Check firewall/network settings

5. **File Upload Errors**
   - Ensure `uploads/` directory exists
   - Check file size limits
   - Verify multer configuration

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Add comments for complex logic
- Update documentation for new features
- Write tests for new functionality

## 📝 License

This project is licensed under the ISC License.

## 👤 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

## 🙏 Acknowledgments

- [Twilio](https://www.twilio.com/) for SMS and Voice API
- [Socket.IO](https://socket.io/) for real-time communication
- [MongoDB](https://www.mongodb.com/) for database
- [React](https://reactjs.org/) team for the amazing framework

## 📞 Support

For support, email your.email@example.com or open an issue in the repository.

## 🔮 Future Enhancements

- [ ] End-to-end encryption for messages
- [ ] Group chat functionality
- [ ] Message search and filtering
- [ ] Push notifications
- [ ] Mobile app (React Native)
- [ ] Video recording
- [ ] Screen sharing
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Message reactions and replies

---

⭐ If you find this project helpful, please consider giving it a star!
