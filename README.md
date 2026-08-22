# StreamSync — Video Calling & Real-time Chat Application

A full-stack real-time communication platform built with React, Node.js, and Stream. Users can sign up, find language partners, chat in real time, and start video calls — all in one place.

## 🚀 Quick Demo

Two guest accounts are pre-configured so you can instantly test the app without signing up.

Just click **"Login as Guest 1"** or **"Login as Guest 2"** on the login page. Both accounts are already friends with each other, so you can immediately test messaging and video calls.

> *Guest accounts are shared demo accounts. Messages may persist between sessions.*

## 🛠️ Tech Stack

- **Frontend:** React, Vite, DaisyUI, Stream Chat React, Stream Video React
- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Real-time:** Stream Chat & Video APIs
- **Auth:** JWT + HTTP-only cookies

## 🚀 Performance & Benchmarks

I recently optimized the backend to improve concurrency and latency by introducing auth caching and connection pooling. See the detailed breakdown here:
👉 [Load Test & Performance Results](benchmarks/load-test-results.md)

## ⚙️ Setup

1. Clone the repo
2. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. Create a `.env` file in `/backend` with:
   ```
   PORT=5001
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET_KEY=your_jwt_secret
   STREAM_API_KEY=your_stream_api_key
   STREAM_SECRET_KEY=your_stream_secret_key
   NODE_ENV=development
   ```
4. Create a `.env` file in `/frontend` with:
   ```
   VITE_STREAM_API_KEY=your_stream_api_key
   ```
5. Seed guest accounts (optional):
   ```bash
   cd backend && node seed-guests.js
   ```
6. Start the app:
   ```bash
   # Terminal 1
   cd backend && npm run dev
   # Terminal 2
   cd frontend && npm run dev
   ```
