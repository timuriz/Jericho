import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// API key is sent in the request body, not the Authorization header.
export const fonioClient = axios.create({
  baseURL: process.env.FONIO_BASE_URL ?? 'https://app.fonio.ai',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});
