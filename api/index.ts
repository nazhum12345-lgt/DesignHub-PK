// ==============================================================================
// DesignHub PK — Vercel Serverless Function API Entry Point
// Routes /api requests to the Express application with bulletproof URL reconstruction
// and awaits full HTTP response completion before resolving.
// ==============================================================================

import app, { ensureDbLoaded } from '../server.js';
import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    // 1. Ensure persistent database is synchronized on cold start
    await ensureDbLoaded();

    // 2. Inspect Vercel edge/proxy headers for the original client URI
    const forwardedUri = (
      req.headers['x-forwarded-uri'] ||
      req.headers['x-matched-path'] ||
      req.headers['x-original-uri']
    ) as string | undefined;

    if (forwardedUri && forwardedUri !== '/api' && forwardedUri !== '/api/') {
      req.url = forwardedUri.startsWith('/api') ? forwardedUri : '/api' + forwardedUri;
    } else if (req.query && req.query.path) {
      // 3. Handle catch-all parameter from [...path]
      const pathParam = Array.isArray(req.query.path)
        ? req.query.path.join('/')
        : String(req.query.path);

      // Preserve query params
      const qParams = new URLSearchParams();
      for (const [k, v] of Object.entries(req.query)) {
        if (k !== 'path' && typeof v === 'string') {
          qParams.set(k, v);
        }
      }
      const qs = qParams.toString();
      req.url = `/api/${pathParam}${qs ? '?' + qs : ''}`;
    } else if (req.url) {
      // 4. Fallback to direct req.url
      if (!req.url.startsWith('/api')) {
        req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
      }
    }
  } catch (err) {
    console.warn('[Vercel API Handler] Normalization or DB sync warning:', err);
  }

  // 5. CRITICAL FOR VERCEL SERVERLESS: Return a Promise that awaits Express response completion.
  // Express's app(req, res) returns undefined synchronously. Without awaiting res.finish/close,
  // Vercel immediately terminates the lambda container before Express sends headers/data,
  // resulting in premature socket hangup / 502 Bad Gateway / Network Error in the browser!
  return new Promise<void>((resolve, reject) => {
    res.on('finish', () => resolve());
    res.on('close', () => resolve());
    res.on('error', (err: any) => reject(err));
    try {
      app(req, res, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
}
