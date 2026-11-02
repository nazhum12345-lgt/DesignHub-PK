import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const PORT = parseInt(process.env.PORT || '3000', 10);
export const HOST = process.env.HOST || '0.0.0.0';
export const NODE_ENV = process.env.NODE_ENV || 'development';

export const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
export const PRIVATE_STORAGE_DIR = process.env.PRIVATE_STORAGE_DIR || path.resolve(process.cwd(), 'private_storage');
export const DB_FILE = path.join(DATA_DIR, 'velora-db.json');

export const SESSION_SECRET =
  process.env.VELORA_SESSION_SECRET ||
  crypto.createHash('sha256').update('velora-session-key-production').digest('hex');

export const DOWNLOAD_SIGNING_SECRET =
  process.env.VELORA_DOWNLOAD_SIGNING_SECRET ||
  crypto.createHash('sha256').update('velora-download-hmac-secret').digest('hex');

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
