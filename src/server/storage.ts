// ==============================================================================
// VELORA — Self-Contained In-Built Digital Asset Storage Service
// Secure local filesystem, in-built database binary file storage, and
// optional standard S3 fallback. Supabase access is completely revoked.
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PRIVATE_STORAGE_DIR } from './config';
import { saveInBuiltFile, getInBuiltFile } from './db';

// S3-Compatible Object Storage Configuration (Optional non-Supabase S3)
const S3_BUCKET = process.env.S3_BUCKET || process.env.STORAGE_BUCKET || '';

function normalizeEndpoint(raw?: string): string {
  if (!raw) return '';
  let endpoint = raw.trim();
  const mdMatch = endpoint.match(/\((https?:\/\/[^\s)]+)\)/);
  if (mdMatch) {
    endpoint = mdMatch[1];
  } else {
    endpoint = endpoint.replace(/[\[\]]/g, '').replace(/^"+|"+$/g, '');
  }
  return endpoint;
}

const rawEndpoint = process.env.S3_ENDPOINT || process.env.STORAGE_ENDPOINT || '';
const S3_ENDPOINT = normalizeEndpoint(rawEndpoint);
const S3_REGION = process.env.S3_REGION || 'auto';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';

let s3Client: S3Client | null = null;

if (S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY) {
  try {
    s3Client = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: Boolean(S3_ENDPOINT),
    });
    console.log(`[VELORA STORAGE] Object storage configured with bucket "${S3_BUCKET}"`);
  } catch (err) {
    console.error('[VELORA STORAGE] Failed to initialize S3 client:', err);
    s3Client = null;
  }
}

export function isObjectStorageConfigured(): boolean {
  return Boolean(s3Client && S3_BUCKET);
}

export const storageService = {
  /**
   * Save a file: writes immediately to local disk/tmp and in-built database file store.
   */
  async saveFile(
    storageKey: string,
    data: Buffer | string,
    contentType = 'application/octet-stream'
  ): Promise<string> {
    const cleanKey = path.basename(storageKey);
    const buffer = Buffer.isBuffer(data)
      ? data
      : typeof data === 'string' && data.startsWith('data:')
      ? Buffer.from(data.split('base64,')[1] || data, 'base64')
      : Buffer.from(data, 'utf-8');

    // 1. Write to local filesystem or /tmp immediately
    try {
      if (!fs.existsSync(PRIVATE_STORAGE_DIR)) {
        fs.mkdirSync(PRIVATE_STORAGE_DIR, { recursive: true });
      }
      fs.writeFileSync(path.join(PRIVATE_STORAGE_DIR, cleanKey), buffer);
    } catch {
      try {
        fs.writeFileSync(path.join('/tmp', cleanKey), buffer);
      } catch {
        // ignore
      }
    }

    // 2. Persist in in-built database file store
    try {
      await saveInBuiltFile(cleanKey, contentType, buffer);
    } catch (err) {
      console.warn('[VELORA STORAGE] Warning saving to in-built file store:', err);
    }

    // 3. Replicate to standard non-Supabase S3 if explicitly configured
    if (s3Client && S3_BUCKET) {
      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: cleanKey,
            Body: buffer,
            ContentType: contentType,
          })
        );
      } catch (err) {
        console.error(`[VELORA STORAGE] S3 upload error for ${cleanKey}:`, err);
      }
    }

    return cleanKey;
  },

  /**
   * Retrieve a file from local disk, /tmp, in-built file store, or S3.
   */
  async getFile(storageKey: string): Promise<{ data: Buffer; contentType: string } | null> {
    const cleanKey = path.basename(storageKey);

    // 1. Try local filesystem first (fastest)
    const localPath = path.join(PRIVATE_STORAGE_DIR, cleanKey);
    if (fs.existsSync(localPath)) {
      try {
        const buffer = fs.readFileSync(localPath);
        const ext = path.extname(cleanKey).toLowerCase();
        const contentType =
          ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : ext === '.psd'
            ? 'application/octet-stream'
            : ext === '.png'
            ? 'image/png'
            : 'application/octet-stream';
        return { data: buffer, contentType };
      } catch {
        // fall through
      }
    }

    // 2. Try /tmp filesystem
    const tmpPath = path.join('/tmp', cleanKey);
    if (fs.existsSync(tmpPath)) {
      try {
        const buffer = fs.readFileSync(tmpPath);
        const ext = path.extname(cleanKey).toLowerCase();
        const contentType =
          ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : ext === '.psd'
            ? 'application/octet-stream'
            : 'application/octet-stream';
        return { data: buffer, contentType };
      } catch {
        // fall through
      }
    }

    // 3. Try in-built database file store
    const inBuilt = getInBuiltFile(cleanKey);
    if (inBuilt) {
      return inBuilt;
    }

    // 4. Try standard non-Supabase S3 if configured
    if (s3Client && S3_BUCKET) {
      try {
        const response = await s3Client.send(
          new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: cleanKey,
          })
        );
        if (response.Body) {
          const chunks: Uint8Array[] = [];
          for await (const chunk of response.Body as any) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);
          return {
            data: buffer,
            contentType: response.ContentType || 'application/octet-stream',
          };
        }
      } catch {
        // not in S3
      }
    }

    return null;
  },

  /**
   * Check if a file exists across in-built stores.
   */
  async hasFile(storageKey: string): Promise<boolean> {
    const cleanKey = path.basename(storageKey);

    const localPath = path.join(PRIVATE_STORAGE_DIR, cleanKey);
    if (fs.existsSync(localPath)) return true;

    const tmpPath = path.join('/tmp', cleanKey);
    if (fs.existsSync(tmpPath)) return true;

    if (getInBuiltFile(cleanKey)) return true;

    if (s3Client && S3_BUCKET) {
      try {
        await s3Client.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: cleanKey }));
        return true;
      } catch {
        // ignore
      }
    }

    return false;
  },

  /**
   * Generate an authenticated presigned URL if non-Supabase S3 is configured.
   */
  async getSignedDownloadUrl(storageKey: string, expiresInSeconds = 3600): Promise<string | null> {
    if (!s3Client || !S3_BUCKET) return null;
    try {
      const cleanKey = path.basename(storageKey);
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: cleanKey,
      });
      return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    } catch (err) {
      console.error('[VELORA STORAGE] Error generating presigned URL:', err);
      return null;
    }
  },
};
