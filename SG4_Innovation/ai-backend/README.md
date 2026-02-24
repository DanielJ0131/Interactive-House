AI Backend – SG4 Innovation

This backend provides a proxy server for AI chat functionality in the Interactive House mobile application. It connects the mobile app to the Gemini API securely by keeping the API key server-side.

Purpose

-Prevent exposing API keys in the mobile app
-Handle AI requests securely
-Provide a simple /api/ai-chat endpoint
-Enable future AI-based automation features

📂 Location
SG4_Innovation/ai-backend

⚙️ Setup Instructions
1️⃣ Install Dependencies

Navigate to the backend folder:

cd SG4_Innovation/ai-backend
npm install
2️⃣ Create Environment File (Backend)

Create a .env file in the ai-backend folder:

GEMINI_API_KEY=your_api_key_here
PORT=3000
3️⃣ Start Backend Server
node server.js

If successful, you should see:

AI backend running on http://localhost:3000
📱 Mobile App Configuration (IMPORTANT)

Each developer must configure their own local IP address in the mobile app project.

Go to:

SG2_Interactive-House-Mobile/.env

Add:

EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000

Example:

EXPO_PUBLIC_API_URL=http://192.168.0.33:3000

⚠️ Replace YOUR_LOCAL_IP with your own computer’s IPv4 address.
⚠️ Make sure your phone and computer are on the same Wi-Fi network.
⚠️ After editing the .env file, restart Expo with:

npx expo start -c
🔗 API Endpoint
POST /api/ai-chat
🔐 Security

Gemini API key is stored in backend .env

.env is ignored via .gitignore

Only .env.example is committed

The API key is never exposed to the mobile app