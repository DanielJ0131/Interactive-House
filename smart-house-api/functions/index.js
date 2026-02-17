import dotenv from 'dotenv';
dotenv.config();

import { https } from 'firebase-functions';
import admin  from 'firebase-admin';
import express, { json } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(json());

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET not defined in environment variables");
}

const DEFAULT_DEVICES = {
  light: "off",
  door: "closed",
  window: "closed",
  fan: "off",
  speaker: "off",
  ledTextDisplay: "Welcome Home"
};

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.username) {
      return res.status(401).json({ error: "Invalid token payload" });
    }
    req.username = decoded.username;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// -------- REGISTER USER --------
app.post('/users/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

    const userRef = db.collection('users').doc(username);
    const existingUser = await userRef.get();

    if (existingUser.exists) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUserData = {
      password: hashedPassword,
      ...DEFAULT_DEVICES
    };

    await userRef.set(newUserData);

    res.status(201).json({
      message: "User created successfully",
      devices: DEFAULT_DEVICES
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export const api = https.onRequest(app);
