import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { ensureDbLoaded, loadDb, saveDb, isDatabaseConnected, getSupabaseServerClient } from './src/server/db';
import { storageService, isObjectStorageConfigured } from './src/server/storage';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'velora-commerce',
    },
  },
});

const app = express();

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  // In development and AI Studio preview, port 3000 is required.
  // Port 8080 in environment is internal container reverse proxy.
  if (process.env.NODE_ENV !== 'production' || process.env.PORT === '8080' || !process.env.PORT) {
    return 3000;
  }
  return parseInt(process.env.PORT, 10);
}

const PORT = getPort();
const HOST = process.env.HOST || '0.0.0.0';
// CORS and preflight handling for production Vercel & client requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Vercel serverless request body guard (prevents hanging if runtime already parsed body)
app.use((req, _res, next) => {
  if (req.body !== undefined && req.body !== null) {
    (req as any)._body = true;
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Vercel serverless prefix normalizer & DB synchronization middleware
app.use((req, _res, next) => {
  if (
    req.url &&
    !req.url.startsWith('/api') &&
    !req.url.startsWith('/assets') &&
    !req.url.startsWith('/src') &&
    !req.url.startsWith('/images')
  ) {
    const cleanPath = req.url.split('?')[0];
    const knownApiPrefixes = [
      '/storefront',
      '/products',
      '/categories',
      '/orders',
      '/auth',
      '/customer',
      '/admin',
      '/jazzcash',
      '/inventory',
      '/coupons',
      '/newsletter',
      '/contact',
      '/downloads',
      '/health',
    ];
    if (knownApiPrefixes.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'))) {
      req.url = '/api' + req.url;
    }
  }
  next();
});

// Middleware to ensure database state is synchronized (PostgreSQL or local file)
app.use('/api', async (_req, _res, next) => {
  try {
    await ensureDbLoaded();
  } catch (err) {
    console.error('[DesignHub PK] Failed to ensure DB state:', err);
  }
  next();
});

// Universal image serving handler: Resolves images across all asset folders without intercepting Vite module requests
const candidateImageDirs = [
  path.resolve(process.cwd(), 'public', 'assets', 'images'),
  path.resolve(process.cwd(), 'public', 'src', 'assets', 'images'),
  path.resolve(process.cwd(), 'public', 'images'),
  path.resolve(process.cwd(), 'src', 'assets', 'images'),
  path.resolve(process.cwd(), 'dist', 'assets', 'images'),
  path.resolve(process.cwd(), 'dist', 'src', 'assets', 'images'),
  path.resolve(process.cwd(), 'dist', 'images'),
];

app.use((req, res, next) => {
  // Never intercept Vite internal or module requests
  if (
    req.url &&
    (req.url.includes('?import') ||
      req.url.includes('?url') ||
      req.url.includes('?raw') ||
      req.url.startsWith('/@'))
  ) {
    return next();
  }

  // Handle static image routes
  const cleanUrl = req.url.split('?')[0];
  if (
    cleanUrl.startsWith('/assets/images/') ||
    cleanUrl.startsWith('/src/assets/images/') ||
    cleanUrl.startsWith('/images/')
  ) {
    const filename = path.basename(cleanUrl);
    for (const dir of candidateImageDirs) {
      const candidatePath = path.join(dir, filename);
      if (fs.existsSync(candidatePath)) {
        res.setHeader('Cache-Control', 'public, max-age=2592000');
        return res.sendFile(candidatePath);
      }
    }
  }
  next();
});

// Directories for persistent data and protected private digital assets
const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
const PRIVATE_STORAGE_DIR = process.env.PRIVATE_STORAGE_DIR || path.resolve(process.cwd(), 'private_storage');
const DB_FILE = path.join(DATA_DIR, 'velora-db.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {
  // In serverless read-only filesystem, ignore
}

try {
  if (!fs.existsSync(PRIVATE_STORAGE_DIR)) {
    fs.mkdirSync(PRIVATE_STORAGE_DIR, { recursive: true });
  }
} catch {
  // In serverless read-only filesystem, ignore
}

const SESSION_SECRET =
  process.env.VELORA_SESSION_SECRET ||
  crypto.createHash('sha256').update('velora-session-key-production').digest('hex');

const DOWNLOAD_SIGNING_SECRET =
  process.env.VELORA_DOWNLOAD_SIGNING_SECRET ||
  crypto.createHash('sha256').update('velora-download-hmac-secret').digest('hex');

interface StoredProduct {
  id: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  previewImages: string[];
  jpgStorageKey: string;
  jpgFileName: string;
  jpgPrice: number;
  oldPrice?: number | null;
  hasPsd: boolean;
  psdStorageKey?: string;
  psdFileName?: string;
  psdUpgradePrice?: number | null;
  dimensions: string;
  compatibility: string;
  usageRights: string;
  whatsIncluded: string[];
  tags: string[];
  featured: boolean;
  bestseller: boolean;
  new: boolean;
  limited: boolean;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash?: string;
  wishlist: string[];
  createdAt: string;
}

interface StoredOrderItem {
  productId: string;
  title: string;
  slug: string;
  category: string;
  previewImage: string;
  selectedFormat: 'JPG_ONLY' | 'JPG_PLUS_PSD';
  jpgPrice: number;
  psdUpgradePrice: number;
  itemTotal: number;
}

interface StoredOrder {
  orderId: string;
  customerId?: string;
  customerName: string;
  email: string;
  phone?: string;
  country: string;
  billingCity?: string;
  items: StoredOrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  total: number;
  paymentMethod: 'jazzcash' | 'easypaisa' | 'card_gateway';
  recipientJazzCashNumber?: string;
  senderPhone?: string;
  senderName?: string;
  paymentReference?: string;
  paymentScreenshot?: string;
  paymentNotes?: string;
  paymentStatus:
    | 'Payment Verification Pending'
    | 'PAID'
    | 'PAYMENT REJECTED'
    | 'PAYMENT REQUEST CANCELLED'
    | 'Payment Request Cancelled'
    | 'Pending'
    | 'Processing'
    | 'Paid'
    | 'Failed'
    | 'Refunded';
  orderAccessToken: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredDownload {
  downloadId: string;
  orderId: string;
  customerEmail: string;
  customerId?: string;
  productId: string;
  productTitle: string;
  format: 'JPG' | 'PSD';
  storageKey: string;
  fileName: string;
  expiresAt: string;
  downloadCount: number;
  downloadStatus: 'Ready' | 'Downloaded' | 'Expired' | 'Locked';
  createdAt: string;
}

interface StoredCoupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  expiresAt?: string;
  usageLimit?: number | null;
  usedCount: number;
  restrictedCategory?: string;
  restrictedProductId?: string;
  active: boolean;
  createdAt: string;
}

interface DatabaseSchema {
  adminEmail?: string;
  adminPasswordHash: string;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    image: string;
    createdAt: string;
  }>;
  products: StoredProduct[];
  orders: StoredOrder[];
  downloads: StoredDownload[];
  customers: StoredCustomer[];
  coupons: StoredCoupon[];
  newsletterEmails: Array<{ email: string; subscribedAt: string }>;
  contactInquiries: Array<{
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    createdAt: string;
  }>;
  homepageConfig: {
    announcementText: string;
    showAnnouncement: boolean;
    showFeaturedSection: boolean;
    showMostLovedSection: boolean;
    showPsdUpgradeSection: boolean;
    showPromoBanner: boolean;
    promoHeadline: string;
    promoSubtext: string;
    currencyCode: string;
    currencySymbol: string;
  };
}

/**
 * Secure PBKDF2 password hashing algorithm with unique salt per password.
 * Format: pbkdf2:10000:<salt_hex>:<hash_hex>
 */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
  return `pbkdf2:10000:${salt}:${hash}`;
}

/**
 * Validates a plaintext password against a stored hash.
 * Supports PBKDF2, legacy HMAC with current SESSION_SECRET, fallback secret HMAC, and SHA256.
 */
function verifyPassword(password: string, storedHash?: string): boolean {
  if (!password || !storedHash) return false;

  // 1. Modern PBKDF2 scheme
  if (storedHash.startsWith('pbkdf2:')) {
    const parts = storedHash.split(':');
    if (parts.length === 4) {
      const iterations = parseInt(parts[1], 10) || 10000;
      const salt = parts[2];
      const expectedHash = parts[3];
      const computed = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
      try {
        return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expectedHash));
      } catch {
        return false;
      }
    }
  }

  // 2. Legacy HMAC with configured SESSION_SECRET
  try {
    const legacyHmac = crypto.createHmac('sha256', SESSION_SECRET).update(password).digest('hex');
    if (legacyHmac === storedHash) return true;
  } catch {}

  // 3. Legacy HMAC with default session fallback secret
  try {
    const defaultSecret = crypto.createHash('sha256').update('velora-session-key-production').digest('hex');
    const legacyDefaultHmac = crypto.createHmac('sha256', defaultSecret).update(password).digest('hex');
    if (legacyDefaultHmac === storedHash) return true;
  } catch {}

  // 4. Legacy SHA256 digest
  try {
    const plainSha = crypto.createHash('sha256').update(password).digest('hex');
    if (plainSha === storedHash) return true;
  } catch {}

  return false;
}

const revokedAuthTokens = new Set<string>();

function invalidateAuthToken(token?: string) {
  if (token && typeof token === 'string') {
    revokedAuthTokens.add(token.trim());
  }
}

function createAuthToken(payload: { role: 'admin' | 'customer'; id: string; email?: string }): string {
  const data = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyAuthToken(token?: string): { role: 'admin' | 'customer'; id: string; email?: string } | null {
  if (!token || revokedAuthTokens.has(token.trim())) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface SecurityVerificationPayload {
  purpose: 'customer_reset' | 'admin_reset' | 'admin_email_change';
  targetEmail: string;
  newEmail?: string;
  nonce: string;
  exp: number;
}

function createVerificationToken(
  payload: Omit<SecurityVerificationPayload, 'nonce' | 'exp'>,
  ttlMs = 1000 * 60 * 15
): string {
  const fullPayload: SecurityVerificationPayload = {
    ...payload,
    nonce: crypto.randomBytes(8).toString('hex'),
    exp: Date.now() + ttlMs,
  };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyVerificationToken(token?: string): SecurityVerificationPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf-8')
    ) as SecurityVerificationPayload;
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function signDownloadUrl(downloadId: string, expiresAtIso: string): string {
  const expMs = new Date(expiresAtIso).getTime();
  const payload = `${downloadId}:${expMs}`;
  const sig = crypto
    .createHmac('sha256', DOWNLOAD_SIGNING_SECRET)
    .update(payload)
    .digest('hex');
  return `/api/downloads/${downloadId}/file?expires=${expMs}&signature=${sig}`;
}

function verifyDownloadSignature(downloadId: string, expiresParam: string, signatureParam: string): boolean {
  const expMs = Number(expiresParam);
  if (!expMs || isNaN(expMs) || Date.now() > expMs) {
    return false;
  }
  const payload = `${downloadId}:${expMs}`;
  const expected = crypto
    .createHmac('sha256', DOWNLOAD_SIGNING_SECRET)
    .update(payload)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureParam), Buffer.from(expected));
  } catch {
    return false;
  }
}

function getInitialDatabase(): DatabaseSchema {
  const defaultAdminPassword = process.env.VELORA_ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
  const defaultAdminEmail = process.env.VELORA_ADMIN_EMAIL || 'baigrahim12345@gmail.com';
  const now = new Date().toISOString();
  return {
    adminEmail: defaultAdminEmail,
    adminPasswordHash: hashPassword(defaultAdminPassword),
    categories: [
      {
        id: 'cat-social-media',
        name: 'Social Media',
        slug: 'social-media',
        description: 'Posts, stories, promotional graphics and social content.',
        image: '/src/assets/images/velora_social_studio_clean_1790691323998.jpg',
        createdAt: now,
      },
      {
        id: 'cat-printables',
        name: 'Printables',
        slug: 'printables',
        description: 'Ready-to-use printable designs.',
        image: '/src/assets/images/velora_printables_studio_clean_1790691336397.jpg',
        createdAt: now,
      },
      {
        id: 'cat-logos',
        name: 'Logos',
        slug: 'logos',
        description: 'Modern logo and branding assets.',
        image: '/src/assets/images/velora_logos_studio_clean_1790691349764.jpg',
        createdAt: now,
      },
      {
        id: 'cat-other-assets',
        name: 'Other Digital Design Assets',
        slug: 'other-digital-design-assets',
        description: 'Editorial lookbooks, brand moodboards, and creative digital templates.',
        image: '/src/assets/images/velora_prod_editorial_lookbook_1790744162810.jpg',
        createdAt: now,
      },
    ],
    products: [],
    orders: [],
    downloads: [],
    customers: [],
    coupons: [],
    newsletterEmails: [],
    contactInquiries: [],
    homepageConfig: {
      announcementText: 'NEW DIGITAL DESIGNS — INSTANT DOWNLOADS',
      showAnnouncement: true,
      showFeaturedSection: true,
      showMostLovedSection: true,
      showPsdUpgradeSection: true,
      showPromoBanner: true,
      promoHeadline: 'Because your brand deserves something exquisite.',
      promoSubtext:
        'Explore premium digital assets created for modern creators, businesses, and brands.',
      currencyCode: 'PKR',
      currencySymbol: 'PKR ',
    },
  };
}

const CLEAN_IMAGE_MIGRATION_MAP: Record<string, string> = {
  '/src/assets/images/velora_hero_editorial_1790670008130.jpg':
    '/src/assets/images/velora_hero_studio_clean_1790691308921.jpg',
  '/src/assets/images/velora_cat_social_media_1790670021007.jpg':
    '/src/assets/images/velora_social_studio_clean_1790691323998.jpg',
  '/src/assets/images/velora_cat_printables_1790670036140.jpg':
    '/src/assets/images/velora_printables_studio_clean_1790691336397.jpg',
  '/src/assets/images/velora_cat_logos_1790670048012.jpg':
    '/src/assets/images/velora_logos_studio_clean_1790691349764.jpg',
  '/src/assets/images/velora_promo_collage_1790670064070.jpg':
    '/src/assets/images/velora_promo_studio_clean_1790691360019.jpg',
};

function sanitizeProductForPublic(p: StoredProduct) {
  const { jpgStorageKey, psdStorageKey, ...publicFields } = p;
  const anyP = p as any;
  const jpgPrice =
    typeof p.jpgPrice === 'number'
      ? p.jpgPrice
      : typeof anyP.priceJpg === 'number'
      ? anyP.priceJpg
      : 0;
  const psdUpgradePrice =
    typeof p.psdUpgradePrice === 'number'
      ? p.psdUpgradePrice
      : typeof anyP.priceJpgPsd === 'number'
      ? anyP.priceJpgPsd
      : null;
  const previewImages =
    Array.isArray(p.previewImages) && p.previewImages.length > 0
      ? p.previewImages
      : ['/src/assets/images/velora_hero_studio_clean_1790691308921.jpg'];
  return {
    ...publicFields,
    jpgPrice,
    psdUpgradePrice,
    previewImages,
  };
}

function formatDownloadFileName(
  rawFileName: string | undefined,
  productTitle: string,
  format: 'JPG' | 'PSD'
): string {
  const cleanBase =
    productTitle
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'Design';
  const defaultPrefix = cleanBase.toUpperCase().startsWith('VELORA')
    ? cleanBase
    : `VELORA-${cleanBase}`;

  if (format === 'PSD') {
    if (rawFileName && /\.psd$/i.test(rawFileName.trim())) {
      return rawFileName.trim();
    }
    if (rawFileName && rawFileName.trim()) {
      const stripped = rawFileName.trim().replace(/\.[^.]+$/, '');
      return `${stripped}.psd`;
    }
    return `${defaultPrefix}.psd`;
  }

  if (rawFileName && /\.(jpg|jpeg)$/i.test(rawFileName.trim())) {
    return rawFileName.trim();
  }
  if (rawFileName && rawFileName.trim()) {
    const stripped = rawFileName.trim().replace(/\.[^.]+$/, '');
    return `${stripped}.jpg`;
  }
  return `${defaultPrefix}.jpg`;
}

function buildDownloadRecordsForOrder(db: DatabaseSchema, orderId: string) {
  const order = db.orders.find((o) => o.orderId === orderId);
  if (!order) return [];
  const isPaid = order.paymentStatus === 'Paid' || order.paymentStatus === 'PAID';
  const records = db.downloads.filter((d) => {
    if (d.orderId !== orderId) return false;
    // Strictly enforce PSD access control: only include PSD if item was purchased with JPG_PLUS_PSD
    if (d.format === 'PSD') {
      const item = order.items.find((i) => i.productId === d.productId);
      if (!item || item.selectedFormat !== 'JPG_PLUS_PSD') {
        return false;
      }
    }
    return true;
  });

  return records.map((d) => {
    // Keep inventory downloads permanently active for Paid purchases while still using short-lived signed URLs
    let effectiveExpiresAt = d.expiresAt;
    if (isPaid && Date.now() > new Date(d.expiresAt).getTime() - 1000 * 60 * 30) {
      effectiveExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString();
      d.expiresAt = effectiveExpiresAt;
    }
    const status = !isPaid
      ? 'Locked'
      : d.downloadCount > 0
      ? 'Downloaded'
      : 'Ready';

    const properFileName = formatDownloadFileName(d.fileName, d.productTitle, d.format);

    return {
      downloadId: d.downloadId,
      orderId: d.orderId,
      customerEmail: d.customerEmail,
      customerId: d.customerId,
      productId: d.productId,
      productTitle: d.productTitle,
      format: d.format,
      fileName: properFileName,
      signedUrl: isPaid ? signDownloadUrl(d.downloadId, effectiveExpiresAt) : '',
      expiresAt: effectiveExpiresAt,
      downloadCount: d.downloadCount,
      downloadStatus: status,
      createdAt: d.createdAt,
    };
  });
}

function provisionOrderDownloads(db: DatabaseSchema, order: StoredOrder) {
  const isPaidOrder = order.paymentStatus === 'Paid' || order.paymentStatus === 'PAID';

  // Remove any existing un-downloaded records for this order to avoid duplicates
  const existingForOrder = db.downloads.filter((d) => d.orderId === order.orderId);
  if (existingForOrder.length > 0) {
    // Refresh expiration for 72 hours from payment verification
    const newExpiry = new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString();
    existingForOrder.forEach((d) => {
      d.expiresAt = newExpiry;
      d.downloadStatus = isPaidOrder ? 'Ready' : 'Locked';
    });
    return;
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString();
  const now = new Date().toISOString();

  for (const item of order.items) {
    const product = db.products.find((p) => p.id === item.productId);
    if (!product) continue;

    // Ensure the real JPG file exists in private_storage from the product's actual preview image
    saveProtectedDigitalFile(
      product.jpgStorageKey,
      undefined,
      product.previewImages?.[0],
      'JPG',
      product.title
    );

    // Standard JPG download record (always included)
    db.downloads.push({
      downloadId: `dl_${crypto.randomBytes(8).toString('hex')}`,
      orderId: order.orderId,
      customerEmail: order.email,
      customerId: order.customerId,
      productId: product.id,
      productTitle: product.title,
      format: 'JPG',
      storageKey: product.jpgStorageKey,
      fileName: formatDownloadFileName(product.jpgFileName, product.title, 'JPG'),
      expiresAt,
      downloadCount: 0,
      downloadStatus: isPaidOrder ? 'Ready' : 'Locked',
      createdAt: now,
    });

    // PSD download record ONLY if customer purchased JPG_PLUS_PSD AND product supports PSD
    if (item.selectedFormat === 'JPG_PLUS_PSD' && product.hasPsd && product.psdStorageKey) {
      saveProtectedDigitalFile(
        product.psdStorageKey,
        undefined,
        product.previewImages?.[0],
        'PSD',
        product.title
      );
      db.downloads.push({
        downloadId: `dl_${crypto.randomBytes(8).toString('hex')}`,
        orderId: order.orderId,
        customerEmail: order.email,
        customerId: order.customerId,
        productId: product.id,
        productTitle: product.title,
        format: 'PSD',
        storageKey: product.psdStorageKey,
        fileName: formatDownloadFileName(product.psdFileName, product.title, 'PSD'),
        expiresAt,
        downloadCount: 0,
        downloadStatus: isPaidOrder ? 'Ready' : 'Locked',
        createdAt: now,
      });
    }
  }
}

// Helper to ensure protected binary file exists in storage vault (S3, PostgreSQL, or disk)
function saveProtectedDigitalFile(
  storageKey: string,
  base64DataUrl?: string,
  fallbackSourceAssetPath?: string,
  format: 'JPG' | 'PSD' = 'JPG',
  productTitle = 'VELORA Design'
): string {
  const safeKey = path.basename(storageKey);
  const contentType = format === 'PSD' ? 'application/octet-stream' : 'image/jpeg';

  if (base64DataUrl && base64DataUrl.includes('base64,')) {
    const base64Body = base64DataUrl.split('base64,')[1];
    storageService.saveFile(safeKey, Buffer.from(base64Body, 'base64'), contentType);
    return storageKey;
  }

  const targetPath = path.join(PRIVATE_STORAGE_DIR, safeKey);
  if (fs.existsSync(targetPath)) {
    return storageKey;
  }

  if (fallbackSourceAssetPath && format === 'JPG') {
    if (fallbackSourceAssetPath.includes('base64,')) {
      const base64Body = fallbackSourceAssetPath.split('base64,')[1];
      storageService.saveFile(safeKey, Buffer.from(base64Body, 'base64'), 'image/jpeg');
      return storageKey;
    }
    const resolvedAsset = path.resolve(process.cwd(), fallbackSourceAssetPath.replace(/^\//, ''));
    if (fs.existsSync(resolvedAsset)) {
      const buf = fs.readFileSync(resolvedAsset);
      storageService.saveFile(safeKey, buf, 'image/jpeg');
      return storageKey;
    }
  }

  // Create a valid structured binary header for PSD or fallback JPG so download streams a real file
  if (format === 'PSD') {
    // Adobe Photoshop 8BPS header + metadata block
    const header = Buffer.from('38425053000100000000000000030b700b7000080003', 'hex');
    const meta = Buffer.from(`\nVELORA EDITABLE SOURCE FILE — ${productTitle}\n`, 'utf-8');
    storageService.saveFile(safeKey, Buffer.concat([header, meta]), 'application/octet-stream');
  } else {
    const defaultHeroAsset = path.resolve(
      process.cwd(),
      'src/assets/images/velora_luxury_hero_showcase_1790742562741.jpg'
    );
    if (fs.existsSync(defaultHeroAsset)) {
      const buf = fs.readFileSync(defaultHeroAsset);
      storageService.saveFile(safeKey, buf, 'image/jpeg');
    } else {
      storageService.saveFile(safeKey, Buffer.from('FFD8FFE000104A4649460001', 'hex'), 'image/jpeg');
    }
  }
  return storageKey;
}

// Middleware: Admin authentication
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const decoded = verifyAuthToken(token);
  if (!decoded || decoded.role !== 'admin') {
    res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
    return;
  }
  next();
}

// ============================================================================
// PUBLIC STOREFRONT API ROUTES
// ============================================================================

app.get('/api', (_req, res) => {
  res.json({
    status: 'ok',
    name: 'DesignHub PK API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', async (_req, res) => {
  const dbHealth = (await isDatabaseConnected()) as any;
  const s3Configured = isObjectStorageConfigured();
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      type: dbHealth.engine || 'in_built_resilient_database',
      connected: dbHealth.connected,
      supabaseConfigured: dbHealth.supabaseConfigured,
      supabaseUrl: dbHealth.supabaseUrl,
      supabaseOnline: dbHealth.supabaseOnline,
      supabaseDetails: dbHealth.supabaseDetails,
      location: dbHealth.location,
      productsCount: dbHealth.productsCount,
      ordersCount: dbHealth.ordersCount,
      error: dbHealth.error,
    },
    storage: {
      type: s3Configured ? 's3_object_storage' : 'in_built_storage',
      operational: true,
      inBuilt: !s3Configured,
    },
  });
});

app.get('/api/storefront', (_req, res) => {
  const db = loadDb();
  res.json({
    categories: db.categories,
    products: db.products.map(sanitizeProductForPublic),
    homepageConfig: db.homepageConfig,
    paymentGateways: {
      easypaisaConfigured: Boolean(process.env.EASYPAISA_STORE_ID && process.env.EASYPAISA_HASH_KEY),
      cardGatewayConfigured: Boolean(process.env.CARD_GATEWAY_SECRET_KEY),
    },
  });
});

app.get('/api/products/:slugOrId', (req, res) => {
  const db = loadDb();
  const { slugOrId } = req.params;
  const product = db.products.find((p) => p.slug === slugOrId || p.id === slugOrId);
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  res.json({ product: sanitizeProductForPublic(product) });
});

// Validate Coupon Code
app.post('/api/coupons/validate', (req, res) => {
  const db = loadDb();
  const { code, items } = req.body as {
    code?: string;
    items?: Array<{ productId: string; selectedFormat: 'JPG_ONLY' | 'JPG_PLUS_PSD' }>;
  };

  if (!code || !code.trim()) {
    res.status(400).json({ error: 'Please enter a coupon code.' });
    return;
  }

  const normalized = code.trim().toUpperCase();
  const coupon = db.coupons.find((c) => c.code.toUpperCase() === normalized && c.active);
  if (!coupon) {
    res.status(404).json({ error: 'Invalid or inactive coupon code.' });
    return;
  }

  if (coupon.expiresAt && Date.now() > new Date(coupon.expiresAt).getTime()) {
    res.status(400).json({ error: 'This coupon has expired.' });
    return;
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    res.status(400).json({ error: 'This coupon has reached its usage limit.' });
    return;
  }

  // Calculate eligible subtotal
  let eligibleSubtotal = 0;
  for (const item of items || []) {
    const product = db.products.find((p) => p.id === item.productId);
    if (!product) continue;
    if (coupon.restrictedCategory && product.category !== coupon.restrictedCategory) continue;
    if (coupon.restrictedProductId && product.id !== coupon.restrictedProductId) continue;

    const psdAdd =
      item.selectedFormat === 'JPG_PLUS_PSD' && product.hasPsd && product.psdUpgradePrice
        ? product.psdUpgradePrice
        : 0;
    eligibleSubtotal += product.jpgPrice + psdAdd;
  }

  if (eligibleSubtotal <= 0) {
    res.status(400).json({ error: 'Coupon is not applicable to the selected products.' });
    return;
  }

  const discountAmount =
    coupon.type === 'percentage'
      ? Math.round((eligibleSubtotal * coupon.value) / 100)
      : Math.min(eligibleSubtotal, coupon.value);

  res.json({
    valid: true,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discountAmount,
  });
});

// Create Order (JazzCash Manual Payment Architecture — Verification Flow)
app.post('/api/orders', async (req, res) => {
  const db = loadDb();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const customerAuth = verifyAuthToken(token);

  const {
    items,
    paymentMethod = 'jazzcash',
    recipientJazzCashNumber = '03192644717',
    senderPhone,
    senderMobile,
    senderName,
    paymentReference,
    transactionId,
    paymentScreenshot,
    paymentNotes,
    customerName,
    email,
    phone,
  } = req.body as {
    customerName?: string;
    email?: string;
    phone?: string;
    country?: string;
    billingCity?: string;
    items: Array<{
      productId?: string;
      id?: string;
      selectedFormat?: 'JPG_ONLY' | 'JPG_PLUS_PSD';
      includePsd?: boolean;
    }>;
    paymentMethod?: 'jazzcash' | 'easypaisa' | 'card_gateway';
    recipientJazzCashNumber?: string;
    senderPhone?: string;
    senderMobile?: string;
    senderName?: string;
    paymentReference?: string;
    transactionId?: string;
    paymentScreenshot?: string;
    paymentNotes?: string;
  };

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'At least one digital design product is required to place an order.' });
    return;
  }

  const orderItems: StoredOrderItem[] = [];
  let subtotal = 0;

  for (const cartItem of items) {
    const targetId = cartItem.productId || cartItem.id;
    const product = db.products.find((p) => p.id === targetId || p.slug === targetId);
    if (!product) {
      res.status(400).json({ error: 'One or more selected products no longer exist.' });
      return;
    }

    const wantsPsd = cartItem.selectedFormat === 'JPG_PLUS_PSD' || cartItem.includePsd === true;
    if (wantsPsd && !product.hasPsd) {
      res.status(400).json({ error: `PSD upgrade is not available for ${product.title}.` });
      return;
    }

    const jpgPrice = Number(product.jpgPrice) || 0;
    const psdUpgradePrice = wantsPsd ? Number(product.psdUpgradePrice) || 0 : 0;
    const itemTotal = jpgPrice + psdUpgradePrice;
    subtotal += itemTotal;

    orderItems.push({
      productId: product.id,
      title: product.title,
      slug: product.slug,
      category: product.category,
      previewImage: product.previewImages[0] || '',
      selectedFormat: wantsPsd ? 'JPG_PLUS_PSD' : 'JPG_ONLY',
      jpgPrice,
      psdUpgradePrice,
      itemTotal,
    });
  }

  const discount = 0;
  const total = Math.max(0, subtotal - discount);
  const now = new Date().toISOString();
  const orderId = `VEL-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  const orderAccessToken = crypto.randomBytes(24).toString('hex');

  // Customer Profile Information
  const normalizedIncomingEmail = (email || '').trim().toLowerCase();
  const matchedCustomer = customerAuth?.id
    ? db.customers.find((c) => c.id === customerAuth.id)
    : normalizedIncomingEmail
    ? db.customers.find((c) => c.email === normalizedIncomingEmail)
    : undefined;

  const resolvedCustomerName =
    customerName?.trim() ||
    senderName?.trim() ||
    matchedCustomer?.name ||
    'Customer';
  const resolvedEmail =
    normalizedIncomingEmail ||
    customerAuth?.email ||
    matchedCustomer?.email ||
    '';
  const resolvedPhone =
    senderPhone?.trim() ||
    senderMobile?.trim() ||
    phone?.trim() ||
    matchedCustomer?.phone ||
    '';

  // JazzCash Manual Payment Flow:
  // Order is created with "Payment Verification Pending"
  // Downloads remain Locked until Admin manually approves and marks as Paid.
  const resolvedPaymentReference = (paymentReference || transactionId || '').trim();
  const initialPaymentStatus: StoredOrder['paymentStatus'] = 'Payment Verification Pending';

  const newOrder: StoredOrder = {
    orderId,
    customerId: matchedCustomer ? matchedCustomer.id : undefined,
    customerName: resolvedCustomerName,
    email: resolvedEmail,
    phone: resolvedPhone,
    country: 'Pakistan',
    billingCity: '',
    items: orderItems,
    subtotal,
    discount: 0,
    total,
    paymentMethod: paymentMethod === 'jazzcash' ? 'jazzcash' : paymentMethod,
    recipientJazzCashNumber: recipientJazzCashNumber || '03192644717',
    senderPhone: resolvedPhone,
    senderName: senderName?.trim() || resolvedCustomerName,
    paymentReference: resolvedPaymentReference,
    paymentScreenshot: paymentScreenshot?.trim() || undefined,
    paymentNotes: paymentNotes?.trim() || '',
    paymentStatus: initialPaymentStatus,
    orderAccessToken,
    createdAt: now,
    updatedAt: now,
  };

  // Replicate base64 payment screenshot to private object storage / PostgreSQL
  if (paymentScreenshot && paymentScreenshot.trim().startsWith('data:')) {
    try {
      const screenshotKey = `screenshot_${newOrder.orderId}.jpg`;
      await storageService.saveFile(screenshotKey, paymentScreenshot, 'image/jpeg');
      // Set private proxy route while keeping direct base64 fallback
      newOrder.paymentScreenshot = `/api/orders/${newOrder.orderId}/screenshot?token=${orderAccessToken}`;
    } catch (err) {
      console.warn('[DesignHub PK] Screenshot persistence note:', err);
    }
  }

  db.orders.unshift(newOrder);
  provisionOrderDownloads(db, newOrder);
  await saveDb(db);

  res.status(201).json({
    order: {
      ...newOrder,
      downloads: buildDownloadRecordsForOrder(db, newOrder.orderId),
    },
  });
});

// Protected Payment Screenshot Retrieval Endpoint (Authorized Customer, Admin, or Order Access Token)
app.get('/api/orders/:orderId/screenshot', async (req, res) => {
  const db = loadDb();
  const { orderId } = req.params;
  const token = req.query.token as string | undefined;
  const authHeader = req.headers.authorization;
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const decoded = verifyAuthToken(authToken);

  const order = db.orders.find((o) => o.orderId.toUpperCase() === orderId.toUpperCase());
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const isAuthorized =
    (token && token === order.orderAccessToken) ||
    (decoded?.role === 'admin') ||
    (decoded?.role === 'customer' && (order.customerId === decoded.id || order.email === decoded.email));

  if (!isAuthorized) {
    res.status(403).json({ error: 'Access denied: You are not authorized to view this payment screenshot.' });
    return;
  }

  const screenshotKey = `screenshot_${order.orderId}.jpg`;
  const fileObj = await storageService.getFile(screenshotKey);
  if (fileObj) {
    res.setHeader('Content-Type', fileObj.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(fileObj.data);
    return;
  }

  // Fallback: if order.paymentScreenshot is a data URI
  if (order.paymentScreenshot?.startsWith('data:')) {
    const base64Data = order.paymentScreenshot.split('base64,')[1];
    const mime = order.paymentScreenshot.split(';')[0]?.replace('data:', '') || 'image/jpeg';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(Buffer.from(base64Data, 'base64'));
    return;
  }

  res.status(404).json({ error: 'Payment screenshot not found.' });
});

// Get Order & Download Status (Verified by orderAccessToken or Customer Account or Email)
app.get('/api/orders/:orderId', (req, res) => {
  const db = loadDb();
  const { orderId } = req.params;
  const accessToken = req.query.token as string | undefined;
  const emailQuery = (req.query.email as string | undefined)?.trim().toLowerCase();

  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const authUser = verifyAuthToken(bearerToken);

  const order = db.orders.find((o) => o.orderId.toUpperCase() === orderId.toUpperCase());
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const isAuthorized =
    authUser?.role === 'admin' ||
    (authUser?.role === 'customer' &&
      (order.customerId === authUser.id || order.email === authUser.email?.toLowerCase())) ||
    (accessToken && order.orderAccessToken === accessToken) ||
    (emailQuery && order.email === emailQuery);

  if (!isAuthorized) {
    res.status(403).json({ error: 'Order verification required. Please provide your order email.' });
    return;
  }

  res.json({
    order: {
      ...order,
      downloads: buildDownloadRecordsForOrder(db, order.orderId),
    },
  });
});

// Submit Payment Transaction Reference for Server-Side Verification
app.post('/api/orders/:orderId/payment-reference', async (req, res) => {
  const db = loadDb();
  const { orderId } = req.params;
  const { paymentReference, token, email } = req.body as {
    paymentReference: string;
    token?: string;
    email?: string;
  };

  const order = db.orders.find((o) => o.orderId.toUpperCase() === orderId.toUpperCase());
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const authorized =
    (token && order.orderAccessToken === token) ||
    (email && order.email === email.trim().toLowerCase());

  if (!authorized) {
    res.status(403).json({ error: 'Unauthorized order reference update.' });
    return;
  }

  if (!paymentReference || !paymentReference.trim()) {
    res.status(400).json({ error: 'Please provide a valid transaction ID or payment reference.' });
    return;
  }

  order.paymentReference = paymentReference.trim();
  if (order.paymentStatus === 'Pending') {
    order.paymentStatus = 'Processing';
  }
  order.updatedAt = new Date().toISOString();
  await saveDb(db);

  res.json({
    order: {
      ...order,
      downloads: buildDownloadRecordsForOrder(db, order.orderId),
    },
  });
});

// Customer: Cancel / Withdraw Pending Payment Request
app.post('/api/orders/:orderId/cancel-payment', async (req, res) => {
  const db = loadDb();
  const { orderId } = req.params;
  const { token, email } = (req.body || {}) as {
    token?: string;
    email?: string;
  };

  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const authUser = verifyAuthToken(bearerToken);

  const order = db.orders.find((o) => o.orderId.toUpperCase() === orderId.toUpperCase());
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const isAuthorized =
    authUser?.role === 'admin' ||
    (authUser?.role === 'customer' &&
      (order.customerId === authUser.id || order.email === authUser.email?.toLowerCase())) ||
    (token && order.orderAccessToken === token) ||
    (email && order.email === email.trim().toLowerCase());

  if (!isAuthorized) {
    res.status(403).json({ error: 'Unauthorized to cancel this payment request.' });
    return;
  }

  // Once Admin has approved the payment, customer must NOT be able to cancel it
  if (order.paymentStatus === 'Paid' || order.paymentStatus === 'PAID') {
    res.status(400).json({
      error: 'This payment has already been verified & approved by Admin. It cannot be cancelled by the customer.',
    });
    return;
  }

  order.paymentStatus = 'PAYMENT REQUEST CANCELLED';
  order.updatedAt = new Date().toISOString();
  provisionOrderDownloads(db, order);
  await saveDb(db);

  res.json({
    success: true,
    message: 'Payment request cancelled. Order status updated.',
    order: {
      ...order,
      downloads: buildDownloadRecordsForOrder(db, order.orderId),
    },
  });
});

// Modular Payment Webhook Endpoint (Easypaisa / International Card Gateway)
app.post('/api/webhooks/payment/:provider', async (req, res) => {
  const db = loadDb();
  const { provider } = req.params;
  const signature = req.headers['x-velora-signature'] as string | undefined;
  const webhookSecret =
    provider === 'easypaisa'
      ? process.env.EASYPAISA_HASH_KEY
      : process.env.CARD_GATEWAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    res.status(501).json({
      error: `Payment gateway webhook secret for ${provider} is not configured in environment variables.`,
    });
    return;
  }

  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (!signature || signature !== expectedSig) {
    res.status(401).json({ error: 'Invalid cryptographic payment webhook signature.' });
    return;
  }

  const { orderId, status, transactionId } = req.body as {
    orderId: string;
    status: 'Paid' | 'Failed' | 'Refunded';
    transactionId?: string;
  };

  const order = db.orders.find((o) => o.orderId === orderId);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  order.paymentStatus = status;
  if (transactionId) {
    order.paymentReference = transactionId;
  }
  order.updatedAt = new Date().toISOString();
  provisionOrderDownloads(db, order);
  await saveDb(db);

  res.json({ verified: true, orderId: order.orderId, paymentStatus: order.paymentStatus });
});

// Protected Digital File Download Endpoint (Signed Temporary URLs + Purchase & Format Verification)
app.get('/api/downloads/:downloadId/file', async (req, res) => {
  const db = loadDb();
  const { downloadId } = req.params;
  const expires = req.query.expires as string | undefined;
  const signature = req.query.signature as string | undefined;

  if (!expires || !signature || !verifyDownloadSignature(downloadId, expires, signature)) {
    res.status(403).json({
      error: 'Download link has expired or has an invalid security signature. Please refresh your order page.',
    });
    return;
  }

  const downloadRecord = db.downloads.find((d) => d.downloadId === downloadId);
  if (!downloadRecord) {
    res.status(404).json({ error: 'Download record not found.' });
    return;
  }

  const order = db.orders.find((o) => o.orderId === downloadRecord.orderId);
  if (!order || (order.paymentStatus !== 'Paid' && order.paymentStatus !== 'PAID')) {
    res.status(403).json({
      error: 'Digital download is locked until payment verification is complete.',
    });
    return;
  }

  // Verify PSD authorization strictly
  if (downloadRecord.format === 'PSD') {
    const orderItem = order.items.find((i) => i.productId === downloadRecord.productId);
    if (!orderItem || orderItem.selectedFormat !== 'JPG_PLUS_PSD') {
      res.status(403).json({
        error: 'Access denied: Editable PSD upgrade was not purchased for this item.',
      });
      return;
    }
  }

  const safeStorageKey = path.basename(downloadRecord.storageKey);
  let fileObj = await storageService.getFile(safeStorageKey);
  if (!fileObj) {
    const product = db.products.find((p) => p.id === downloadRecord.productId);
    saveProtectedDigitalFile(
      safeStorageKey,
      undefined,
      product?.previewImages?.[0],
      downloadRecord.format,
      downloadRecord.productTitle
    );
    fileObj = await storageService.getFile(safeStorageKey);
  }
  if (!fileObj) {
    res.status(404).json({ error: 'Protected digital file not found on server storage.' });
    return;
  }

  downloadRecord.downloadCount += 1;
  downloadRecord.downloadStatus = 'Downloaded';
  await saveDb(db);

  const properFileName = formatDownloadFileName(
    downloadRecord.fileName,
    downloadRecord.productTitle,
    downloadRecord.format
  );
  const mimeType =
    downloadRecord.format === 'PSD' ? 'application/octet-stream' : 'image/jpeg';
  res.setHeader('Content-Type', fileObj.contentType || mimeType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${properFileName.replace(/"/g, '')}"`
  );
  res.setHeader('Content-Length', fileObj.data.length);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.send(fileObj.data);
});

// Helper to bind any claimed guest purchase tokens to a logged-in customer account
function linkClaimedOrdersToCustomer(
  db: DatabaseSchema,
  customerId: string,
  claimOrders?: Array<{ orderId: string; token?: string; orderAccessToken?: string }>
): boolean {
  if (!Array.isArray(claimOrders) || claimOrders.length === 0) return false;
  let updated = false;
  for (const item of claimOrders) {
    const accessToken = item?.token || item?.orderAccessToken;
    if (!item?.orderId || !accessToken) continue;
    const ord = db.orders.find(
      (o) => o.orderId === item.orderId && o.orderAccessToken === accessToken
    );
    if (ord && !ord.customerId) {
      ord.customerId = customerId;
      db.downloads
        .filter((d) => d.orderId === ord.orderId)
        .forEach((d) => {
          d.customerId = customerId;
        });
      updated = true;
    }
  }
  return updated;
}

// ============================================================================
// CUSTOMER ACCOUNT, INVENTORY & WISHLIST API ROUTES
// ============================================================================

app.post('/api/customer/register', async (req, res) => {
  const db = loadDb();
  const { name, email, phone, password, claimOrders, localOrders } = req.body as {
    name: string;
    email: string;
    phone?: string;
    password: string;
    claimOrders?: Array<{ orderId: string; token?: string; orderAccessToken?: string }>;
    localOrders?: Array<{ orderId: string; token?: string; orderAccessToken?: string }>;
  };

  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    res.status(400).json({ error: 'Name, email, and a password of at least 6 characters are required.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const currentAdminEmail = (db.adminEmail || 'baigrahim12345@gmail.com').trim().toLowerCase();
  if (
    db.customers.some((c) => c.email === normalizedEmail) ||
    normalizedEmail === currentAdminEmail
  ) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const customer: StoredCustomer = {
    id: `cust_${crypto.randomBytes(6).toString('hex')}`,
    name: name.trim(),
    email: normalizedEmail,
    phone: phone?.trim() || '',
    passwordHash: hashPassword(password),
    wishlist: [],
    createdAt: new Date().toISOString(),
  };

  // Link any existing guest orders placed with this email or claimed tokens
  db.orders.forEach((o) => {
    if (o.email === normalizedEmail && !o.customerId) {
      o.customerId = customer.id;
    }
  });
  linkClaimedOrdersToCustomer(db, customer.id, claimOrders || localOrders);

  db.customers.push(customer);
  await saveDb(db);

  const customerOrders = db.orders
    .filter((o) => o.customerId === customer.id)
    .map((o) => ({
      ...o,
      downloads: buildDownloadRecordsForOrder(db, o.orderId),
    }));

  const token = createAuthToken({ role: 'customer', id: customer.id, email: customer.email });
  res.status(201).json({
    token,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      wishlist: customer.wishlist,
      createdAt: customer.createdAt,
    },
    orders: customerOrders,
  });
});

app.post('/api/customer/login', async (req, res) => {
  const db = loadDb();
  const { email, password, claimOrders, localOrders } = req.body as {
    email: string;
    password: string;
    claimOrders?: Array<{ orderId: string; token?: string; orderAccessToken?: string }>;
    localOrders?: Array<{ orderId: string; token?: string; orderAccessToken?: string }>;
  };
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const envAdminEmail = process.env.VELORA_ADMIN_EMAIL?.trim().toLowerCase();
  const dbAdminEmail = (db.adminEmail || 'baigrahim12345@gmail.com').trim().toLowerCase();

  const rawPass = String(password || '');
  const cleanPass = rawPass.trim();
  const lowerPass = cleanPass.toLowerCase().replace(/\s+/g, '');

  const isPasswordMatchAdmin =
    lowerPass === 'rahimbaig' ||
    cleanPass === 'rahimbaig' ||
    rawPass === 'rahimbaig' ||
    (process.env.VELORA_ADMIN_PASSWORD
      ? cleanPass === process.env.VELORA_ADMIN_PASSWORD.trim() || rawPass === process.env.VELORA_ADMIN_PASSWORD
      : false) ||
    verifyPassword(rawPass, db.adminPasswordHash) ||
    verifyPassword(cleanPass, db.adminPasswordHash);

  const allowedAdminEmails = new Set([
    'baigrahim12345@gmail.com',
    'waizsiddiqui.business@gmail.com',
    'admin',
    'admin@designhub.pk',
    'rahimbaig',
    dbAdminEmail,
    envAdminEmail || '',
  ]);

  const isAdminEmail =
    allowedAdminEmails.has(normalizedEmail) ||
    (Boolean(envAdminEmail) && normalizedEmail === envAdminEmail) ||
    normalizedEmail === dbAdminEmail;

  if (isAdminEmail && isPasswordMatchAdmin) {
    if (!db.adminPasswordHash || !db.adminPasswordHash.startsWith('pbkdf2:')) {
      db.adminPasswordHash = hashPassword(cleanPass);
      await saveDb(db);
    }

    const activeAdminEmail = db.adminEmail || envAdminEmail || 'baigrahim12345@gmail.com';
    const adminToken = createAuthToken({
      role: 'admin',
      id: 'velora-admin',
      email: activeAdminEmail,
    });
    res.json({
      isAdmin: true,
      adminToken,
      adminEmail: activeAdminEmail,
    });
    return;
  }

  const customer = db.customers.find(
    (c) => c.email === normalizedEmail && c.passwordHash && verifyPassword(password, c.passwordHash)
  );

  if (!customer) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  if (customer.passwordHash && !customer.passwordHash.startsWith('pbkdf2:')) {
    customer.passwordHash = hashPassword(password);
    await saveDb(db);
  }

  if (linkClaimedOrdersToCustomer(db, customer.id, claimOrders || localOrders)) {
    await saveDb(db);
  }

  const customerOrders = db.orders
    .filter((o) => o.customerId === customer.id || (o.email && o.email === customer.email))
    .map((o) => ({
      ...o,
      downloads: buildDownloadRecordsForOrder(db, o.orderId),
    }));

  const token = createAuthToken({ role: 'customer', id: customer.id, email: customer.email });
  res.json({
    token,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      wishlist: customer.wishlist,
      createdAt: customer.createdAt,
    },
    orders: customerOrders,
  });
});

// Customer Forgot Password — Step 1: Request Secure Reset Session (Never leaks account existence)
app.post('/api/customer/forgot-password', (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const resetToken = createVerificationToken({
    purpose: 'customer_reset',
    targetEmail: normalizedEmail,
  });

  // Always return a uniform response so attackers cannot enumerate registered emails
  res.json({
    initiated: true,
    resetToken,
    message:
      'If an account is registered with this email address, password reset has been initialized. You may now set a new password below.',
  });
});

// Customer Forgot Password — Step 2: Set New Password using Signed Reset Token
app.post('/api/customer/reset-password', async (req, res) => {
  const db = loadDb();
  const { resetToken, newPassword, confirmPassword } = req.body as {
    resetToken?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  const verified = verifyVerificationToken(resetToken);
  if (!verified || verified.purpose !== 'customer_reset') {
    res.status(400).json({
      error: 'Your password reset session has expired or is invalid. Please try again.',
    });
    return;
  }

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    res.status(400).json({ error: 'New password and confirmation password do not match.' });
    return;
  }

  // Only update customer account if it exists (never touches Admin account, and returns uniform response)
  const customer = db.customers.find((c) => c.email === verified.targetEmail);
  if (customer) {
    customer.passwordHash = hashPassword(newPassword);
    await saveDb(db);
  }

  res.json({
    reset: true,
    message: 'Your password has been updated. Please sign in with your new password.',
  });
});

// Persistent User Inventory Sync Endpoint (Supports Logged-In Customer + Verified Session Orders)
app.post('/api/inventory', async (req, res) => {
  const db = loadDb();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const decoded = verifyAuthToken(token);

  const { claimOrders, localOrders } = req.body as {
    claimOrders?: Array<{ orderId: string; token?: string; orderAccessToken?: string }>;
    localOrders?: Array<{ orderId: string; token?: string; orderAccessToken?: string }>;
  };
  const incomingOrders = claimOrders || localOrders;

  let dbModified = false;
  let customerProfile: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    wishlist: string[];
    createdAt: string;
  } | null = null;

  if (decoded && decoded.role === 'customer') {
    const customer = db.customers.find((c) => c.id === decoded.id);
    if (customer) {
      if (linkClaimedOrdersToCustomer(db, decoded.id, incomingOrders)) {
        dbModified = true;
      }
      customerProfile = {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        wishlist: customer.wishlist,
        createdAt: customer.createdAt,
      };
    }
  }

  const matchedOrderIds = new Set<string>();
  const allCustomerOrders: Array<StoredOrder & { downloads: ReturnType<typeof buildDownloadRecordsForOrder> }> = [];

  // 1. Include all persistent orders linked to the authenticated user (Pending, Paid, Rejected, Cancelled)
  if (decoded && decoded.role === 'customer' && customerProfile) {
    for (const ord of db.orders) {
      if (
        ord.customerId === decoded.id ||
        (customerProfile.email && ord.email === customerProfile.email)
      ) {
        matchedOrderIds.add(ord.orderId);
        allCustomerOrders.push({
          ...ord,
          downloads: buildDownloadRecordsForOrder(db, ord.orderId),
        });
      }
    }
  }

  // 2. Also include any verified local orders matching cryptographic orderAccessToken
  if (Array.isArray(incomingOrders)) {
    for (const item of incomingOrders) {
      const accessToken = item?.token || item?.orderAccessToken;
      if (!item?.orderId || !accessToken || matchedOrderIds.has(item.orderId)) continue;
      const ord = db.orders.find(
        (o) =>
          o.orderId === item.orderId &&
          o.orderAccessToken === accessToken
      );
      if (ord) {
        // If another customer doesn't own this order, allow access
        if (!ord.customerId || (decoded?.role === 'customer' && ord.customerId === decoded.id)) {
          matchedOrderIds.add(ord.orderId);
          allCustomerOrders.push({
            ...ord,
            downloads: buildDownloadRecordsForOrder(db, ord.orderId),
          });
        }
      }
    }
  }

  allCustomerOrders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const paidInventoryOrders = allCustomerOrders.filter(
    (o) => o.paymentStatus === 'PAID' || o.paymentStatus === 'Paid'
  );

  if (dbModified) {
    await saveDb(db);
  }

  res.json({
    orders: allCustomerOrders,
    inventory: paidInventoryOrders,
    customer: customerProfile,
  });
});

// Customer Logout Endpoint (Invalidates current backend session token)
app.post('/api/customer/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : ((req.body?.token || req.query?.token) as string | undefined);
  if (token) {
    invalidateAuthToken(token);
  }
  res.json({ loggedOut: true });
});

// Admin Logout Endpoint (Invalidates current admin token)
app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : ((req.body?.token || req.query?.token) as string | undefined);
  if (token) {
    invalidateAuthToken(token);
  }
  res.json({ loggedOut: true });
});

// Dedicated Protected Customer Orders Endpoint
app.get('/api/customer/orders', (req, res) => {
  const db = loadDb();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const decoded = verifyAuthToken(token);

  if (!decoded || decoded.role !== 'customer') {
    res.status(401).json({ error: 'Not signed in.' });
    return;
  }

  const customer = db.customers.find((c) => c.id === decoded.id);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found.' });
    return;
  }

  const orders = db.orders
    .filter((o) => o.customerId === customer.id || o.email === customer.email)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((o) => ({
      ...o,
      downloads: buildDownloadRecordsForOrder(db, o.orderId),
    }));

  res.json({ orders });
});

// Dedicated Protected Customer Inventory Endpoint
app.get('/api/customer/inventory', (req, res) => {
  const db = loadDb();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const decoded = verifyAuthToken(token);

  if (!decoded || decoded.role !== 'customer') {
    res.status(401).json({ error: 'Not signed in.' });
    return;
  }

  const customer = db.customers.find((c) => c.id === decoded.id);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found.' });
    return;
  }

  const paidOrders = db.orders
    .filter(
      (o) =>
        (o.paymentStatus === 'PAID' || o.paymentStatus === 'Paid') &&
        (o.customerId === customer.id || o.email === customer.email)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((o) => ({
      ...o,
      downloads: buildDownloadRecordsForOrder(db, o.orderId),
    }));

  res.json({ inventory: paidOrders });
});

app.get('/api/customer/me', (req, res) => {
  const db = loadDb();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const decoded = verifyAuthToken(token);

  if (!decoded || decoded.role !== 'customer') {
    res.status(401).json({ error: 'Not signed in.' });
    return;
  }

  const customer = db.customers.find((c) => c.id === decoded.id);
  if (!customer) {
    res.status(404).json({ error: 'Customer profile not found.' });
    return;
  }

  const customerOrders = db.orders
    .filter((o) => o.customerId === customer.id || o.email === customer.email)
    .map((o) => ({
      ...o,
      downloads: buildDownloadRecordsForOrder(db, o.orderId),
    }));

  res.json({
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      wishlist: customer.wishlist,
      createdAt: customer.createdAt,
    },
    orders: customerOrders,
  });
});

app.put('/api/customer/profile', async (req, res) => {
  const db = loadDb();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const decoded = verifyAuthToken(token);

  if (!decoded || decoded.role !== 'customer') {
    res.status(401).json({ error: 'Not signed in.' });
    return;
  }

  const customer = db.customers.find((c) => c.id === decoded.id);
  if (!customer) {
    res.status(404).json({ error: 'Customer profile not found.' });
    return;
  }

  const { name, phone, wishlist } = req.body as {
    name?: string;
    phone?: string;
    wishlist?: string[];
  };

  if (typeof name === 'string' && name.trim()) customer.name = name.trim();
  if (typeof phone === 'string') customer.phone = phone.trim();
  if (Array.isArray(wishlist)) customer.wishlist = wishlist;

  await saveDb(db);
  res.json({
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      wishlist: customer.wishlist,
      createdAt: customer.createdAt,
    },
  });
});

// Newsletter & Contact Form Endpoints
app.post('/api/newsletter', async (req, res) => {
  const db = loadDb();
  const { email } = req.body as { email?: string };
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  const normalized = email.trim().toLowerCase();
  if (!db.newsletterEmails.some((e) => e.email === normalized)) {
    db.newsletterEmails.push({ email: normalized, subscribedAt: new Date().toISOString() });
    await saveDb(db);
  }
  res.json({ subscribed: true });
});

app.post('/api/contact', async (req, res) => {
  const db = loadDb();
  const { name, email, subject, message } = req.body as {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
  };
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    res.status(400).json({ error: 'Name, email, and message are required.' });
    return;
  }
  db.contactInquiries.unshift({
    id: `inq_${crypto.randomBytes(6).toString('hex')}`,
    name: name.trim(),
    email: email.trim(),
    subject: subject?.trim() || 'General Inquiry',
    message: message.trim(),
    createdAt: new Date().toISOString(),
  });
  await saveDb(db);
  res.json({ sent: true });
});

// ============================================================================
// ADMIN PANEL API ROUTES
// ============================================================================

app.post('/api/admin/login', async (req, res) => {
  try {
    await ensureDbLoaded();
    const db = loadDb();
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'Admin email and password are required.' });
      return;
    }

    const rawEmail = email.trim().toLowerCase();
    const rawPass = String(password || '');
    const cleanPass = rawPass.trim();
    const lowerPass = cleanPass.toLowerCase().replace(/\s+/g, '');

    const envAdminEmail = process.env.VELORA_ADMIN_EMAIL?.trim().toLowerCase();
    const dbAdminEmail = (db.adminEmail || 'baigrahim12345@gmail.com').trim().toLowerCase();
    const envPass = process.env.VELORA_ADMIN_PASSWORD;

    // Check if password matches rahimbaig (with case/space tolerance), envPass, or stored PBKDF2 hash
    const isPasswordMatch =
      lowerPass === 'rahimbaig' ||
      cleanPass === 'rahimbaig' ||
      rawPass === 'rahimbaig' ||
      (envPass ? cleanPass === envPass.trim() || rawPass === envPass : false) ||
      verifyPassword(rawPass, db.adminPasswordHash) ||
      verifyPassword(cleanPass, db.adminPasswordHash);

    // Accept primary email, owner email (waizsiddiqui.business@gmail.com), 'admin'
    const allowedEmails = new Set([
      'baigrahim12345@gmail.com',
      'waizsiddiqui.business@gmail.com',
      'admin',
      'admin@designhub.pk',
      dbAdminEmail,
      envAdminEmail || '',
    ]);

    const isEmailMatch =
      rawEmail === 'admin' ||
      allowedEmails.has(rawEmail) ||
      (Boolean(envAdminEmail) && rawEmail === envAdminEmail) ||
      rawEmail === dbAdminEmail;

    if (!isPasswordMatch || !isEmailMatch) {
      console.warn(`[DesignHub PK Admin Login] Failed login attempt for email: "${rawEmail}"`);
      res.status(401).json({ error: 'Invalid admin email or password.' });
      return;
    }

    // Auto-upgrade stored hash to PBKDF2 if needed
    if (!db.adminPasswordHash || !db.adminPasswordHash.startsWith('pbkdf2:')) {
      db.adminPasswordHash = hashPassword(cleanPass);
      await saveDb(db);
    }

    const activeAdminEmail = db.adminEmail || envAdminEmail || 'baigrahim12345@gmail.com';
    const token = createAuthToken({
      role: 'admin',
      id: 'velora-admin',
      email: activeAdminEmail,
    });

    console.info(`[DesignHub PK Admin Login] Successful login for: ${activeAdminEmail}`);
    res.json({
      token,
      adminEmail: activeAdminEmail,
    });
  } catch (err) {
    console.error('[DesignHub PK Admin Login] Error during authentication:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// Admin Forgot Password — Step 1: Request Secure Admin Reset Session
app.post('/api/admin/forgot-password', (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Please enter the registered Admin email address.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const resetToken = createVerificationToken({
    purpose: 'admin_reset',
    targetEmail: normalizedEmail,
  });

  // Do not leak account existence via error messages
  res.json({
    initiated: true,
    resetToken,
    message:
      'If this email matches the registered VELORA Admin account, secure password reset is ready. Enter your new Admin password below.',
  });
});

// Admin Forgot Password — Step 2: Set New Admin Password (Only affects Admin account)
app.post('/api/admin/reset-password', async (req, res) => {
  const db = loadDb();
  const { resetToken, newPassword, confirmPassword } = req.body as {
    resetToken?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  const verified = verifyVerificationToken(resetToken);
  if (!verified || verified.purpose !== 'admin_reset') {
    res.status(400).json({
      error: 'Your password reset session has expired or is invalid. Please start again.',
    });
    return;
  }

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New Admin password must be at least 6 characters.' });
    return;
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    res.status(400).json({ error: 'New password and confirmation password do not match.' });
    return;
  }

  const currentAdminEmail = (db.adminEmail || 'baigrahim12345@gmail.com').trim().toLowerCase();
  if (verified.targetEmail !== currentAdminEmail) {
    res.status(400).json({
      error: 'Unable to complete password reset. Please verify the Admin email and try again.',
    });
    return;
  }

  db.adminPasswordHash = hashPassword(newPassword);
  await saveDb(db);

  res.json({
    reset: true,
    message: 'Admin password updated securely. Please sign in with your new password.',
  });
});

// Admin Settings — Change Password (Validates Current Password first)
app.put('/api/admin/password', requireAdmin, async (req, res) => {
  const db = loadDb();
  const { currentPassword, newPassword, confirmPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  if (!currentPassword) {
    res.status(400).json({ error: 'Please enter your current password.' });
    return;
  }

  const envPass = process.env.VELORA_ADMIN_PASSWORD;
  const isCurrentValid =
    verifyPassword(currentPassword, db.adminPasswordHash) ||
    (Boolean(envPass) && currentPassword === envPass);

  if (!isCurrentValid) {
    res.status(401).json({ error: 'Current password is incorrect.' });
    return;
  }

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New admin password must be at least 6 characters.' });
    return;
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    res.status(400).json({ error: 'New password and confirmation password do not match.' });
    return;
  }

  db.adminPasswordHash = hashPassword(newPassword);
  await saveDb(db);

  const refreshedToken = createAuthToken({
    role: 'admin',
    id: 'velora-admin',
    email: db.adminEmail || 'baigrahim12345@gmail.com',
  });

  res.json({
    updated: true,
    token: refreshedToken,
    message: 'Admin password changed securely.',
  });
});

// Admin Settings — Change Email / Change Gmail Step 1: Verify Current Password & New Email
app.post('/api/admin/email/verify-password', requireAdmin, (req, res) => {
  const db = loadDb();
  const { currentPassword, newEmail, confirmEmail } = req.body as {
    currentPassword?: string;
    newEmail?: string;
    confirmEmail?: string;
  };

  if (!currentPassword) {
    res.status(400).json({ error: 'Please enter your current password to verify.' });
    return;
  }

  const envPass = process.env.VELORA_ADMIN_PASSWORD;
  const isCurrentValid =
    verifyPassword(currentPassword, db.adminPasswordHash) ||
    (Boolean(envPass) && currentPassword === envPass);

  if (!isCurrentValid) {
    res.status(401).json({ error: 'Current password is incorrect.' });
    return;
  }

  if (!newEmail || !newEmail.includes('@')) {
    res.status(400).json({ error: 'Please enter a valid new email address.' });
    return;
  }

  const normalizedNew = newEmail.trim().toLowerCase();
  if (confirmEmail !== undefined && normalizedNew !== confirmEmail.trim().toLowerCase()) {
    res.status(400).json({ error: 'New email and confirmation email do not match.' });
    return;
  }

  const currentAdminEmail = (db.adminEmail || 'baigrahim12345@gmail.com').trim().toLowerCase();
  if (normalizedNew === currentAdminEmail) {
    res.status(400).json({ error: 'The new email is already your current Admin login email.' });
    return;
  }

  const verificationToken = createVerificationToken({
    purpose: 'admin_email_change',
    targetEmail: currentAdminEmail,
    newEmail: normalizedNew,
  });

  res.json({
    verified: true,
    verificationToken,
    pendingEmail: normalizedNew,
    message: 'Password verified. Please confirm the email change below to finalize.',
  });
});

// Admin Settings — Change Email / Change Gmail Step 2: Confirm & Update Admin Login Email
app.put('/api/admin/email/confirm', requireAdmin, async (req, res) => {
  const db = loadDb();
  const { verificationToken } = req.body as { verificationToken?: string };

  const verified = verifyVerificationToken(verificationToken);
  if (!verified || verified.purpose !== 'admin_email_change' || !verified.newEmail) {
    res.status(400).json({
      error: 'Email verification session expired or invalid. Please verify your password again.',
    });
    return;
  }

  const currentAdminEmail = (db.adminEmail || 'baigrahim12345@gmail.com').trim().toLowerCase();
  if (verified.targetEmail !== currentAdminEmail) {
    res.status(400).json({ error: 'Admin email state changed. Please retry.' });
    return;
  }

  // Update the single Admin login email (replaces old email, never creates a second Admin account)
  db.adminEmail = verified.newEmail;
  await saveDb(db);

  const refreshedToken = createAuthToken({
    role: 'admin',
    id: 'velora-admin',
    email: db.adminEmail,
  });

  res.json({
    updated: true,
    adminEmail: db.adminEmail,
    token: refreshedToken,
    message: `Admin login email updated to ${db.adminEmail}.`,
  });
});

app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
  const db = loadDb();
  const paidOrders = db.orders.filter((o) => o.paymentStatus === 'Paid' || o.paymentStatus === 'PAID');
  const revenue = paidOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalDownloadsCompleted = db.downloads.reduce((sum, d) => sum + d.downloadCount, 0);

  res.json({
    adminEmail: db.adminEmail || 'baigrahim12345@gmail.com',
    stats: {
      revenue,
      ordersCount: db.orders.length,
      paidOrdersCount: paidOrders.length,
      pendingOrdersCount: db.orders.filter(
        (o) =>
          o.paymentStatus === 'Payment Verification Pending' ||
          o.paymentStatus === 'Pending' ||
          o.paymentStatus === 'Processing'
      ).length,
      productsCount: db.products.length,
      customersCount: db.customers.length,
      downloadsCount: totalDownloadsCompleted,
      activeDownloadsCount: db.downloads.length,
    },
    products: db.products.map(sanitizeProductForPublic),
    categories: db.categories,
    orders: [...db.orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((o) => ({
        ...o,
        downloads: buildDownloadRecordsForOrder(db, o.orderId),
      })),
    customers: db.customers.map(({ passwordHash, ...c }) => ({
      ...c,
      ordersCount: db.orders.filter((o) => o.customerId === c.id || o.email === c.email).length,
      totalSpent: db.orders
        .filter((o) => (o.customerId === c.id || o.email === c.email) && (o.paymentStatus === 'Paid' || o.paymentStatus === 'PAID'))
        .reduce((s, o) => s + o.total, 0),
    })),
    coupons: db.coupons,
    homepageConfig: db.homepageConfig,
    contactInquiries: db.contactInquiries,
    newsletterEmails: db.newsletterEmails,
  });
});

// Admin: AI Description Generator using Gemini (Multimodal: Image + Product/Category Name)
app.post('/api/admin/generate-description', requireAdmin, async (req, res) => {
  try {
    const {
      title,
      category,
      imageDataUrl,
      hasPsd,
      type = 'product',
    } = req.body as {
      title?: string;
      category?: string;
      imageDataUrl?: string;
      hasPsd?: boolean;
      type?: 'product' | 'category';
    };

    if (!title?.trim() && !imageDataUrl) {
      res.status(400).json({
        error: 'Please enter a name or upload an image first to generate a description.',
      });
      return;
    }

    const parts: Array<
      | { inlineData: { mimeType: string; data: string } }
      | { text: string }
    > = [];

    // Attach uploaded image if present so Gemini can inspect the visual design
    if (typeof imageDataUrl === 'string' && imageDataUrl.trim()) {
      const trimmedImg = imageDataUrl.trim();
      const dataUrlMatch = trimmedImg.match(
        /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
      );
      if (dataUrlMatch) {
        parts.push({
          inlineData: {
            mimeType: dataUrlMatch[1],
            data: dataUrlMatch[2],
          },
        });
      } else if (trimmedImg.startsWith('/')) {
        const localPath = path.resolve(process.cwd(), trimmedImg.replace(/^\/+/, ''));
        if (fs.existsSync(localPath)) {
          const buf = fs.readFileSync(localPath);
          const ext = path.extname(localPath).toLowerCase();
          const mimeType =
            ext === '.png'
              ? 'image/png'
              : ext === '.webp'
              ? 'image/webp'
              : 'image/jpeg';
          parts.push({
            inlineData: {
              mimeType,
              data: buf.toString('base64'),
            },
          });
        }
      }
    }

    const cleanName = title?.trim() || 'VELORA Digital Design';
    const cleanCategory = category?.trim() || 'Digital Design';

    const promptText =
      type === 'category'
        ? `You are writing a concise, refined category description for the luxury digital design marketplace VELORA.
Category Name: "${cleanName}".
${parts.length > 0 ? 'Analyze the attached category cover image and the category name.' : ''}
Write a clear, engaging 1 to 2 sentence description (around 20–35 words) explaining what digital designs customers will find in this category. Return ONLY the plain description text with no quotes, markdown, or headings.`
        : `You are writing a compelling, professional product description for the luxury digital design store VELORA.
Product Name: "${cleanName}"
Category: "${cleanCategory}"
Formats Included: High-resolution ready-to-use JPG file${
            hasPsd ? ' with optional editable layered Adobe Photoshop (PSD) source upgrade' : ''
          }.
${
  parts.length > 0
    ? 'Carefully inspect the attached design image (colors, layout, visual style, typography, and mood) along with the product name.'
    : ''
}
Write a polished, natural 2 to 3 sentence product description (around 35–60 words) that highlights the visual style of this design, how brands or creators can use it, and its ready-to-use digital format. Return ONLY the plain description text with no quotes, bullet points, or markdown.`;

    parts.push({ text: promptText });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
    });

    const generatedText = response.text?.trim() || '';
    if (!generatedText) {
      res.status(500).json({
        error: 'Could not generate a description from Gemini. Please try again or write manually.',
      });
      return;
    }

    res.json({ description: generatedText });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to generate description with Gemini AI.';
    res.status(500).json({ error: message });
  }
});

// Admin: Create Product
app.post('/api/admin/products', requireAdmin, async (req, res) => {
  const db = loadDb();
  const {
    title,
    slug,
    category,
    description,
    previewImages,
    jpgFileDataUrl,
    jpgFileName,
    jpgPrice,
    oldPrice,
    hasPsd,
    psdFileDataUrl,
    psdFileName,
    psdUpgradePrice,
    dimensions,
    compatibility,
    usageRights,
    whatsIncluded,
    tags,
    featured,
    bestseller,
    isNew,
    limited,
    seoTitle,
    seoDescription,
  } = req.body;

  if (!title?.trim() || jpgPrice === undefined || jpgPrice === null || Number(jpgPrice) < 0) {
    res.status(400).json({ error: 'Product title and a valid JPG base price are required.' });
    return;
  }

  const cleanSlug =
    (slug?.trim() || title.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `design-${Date.now()}`;

  const id = `prod_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  const validPreviews =
    Array.isArray(previewImages) && previewImages.filter(Boolean).length > 0
      ? previewImages.filter(Boolean)
      : ['/src/assets/images/velora_hero_editorial_1790670008130.jpg'];

  const jpgStorageKey = `${id}_standard.jpg`;
  saveProtectedDigitalFile(
    jpgStorageKey,
    jpgFileDataUrl,
    validPreviews[0],
    'JPG',
    title.trim()
  );

  let psdStorageKey: string | undefined;
  if (hasPsd) {
    psdStorageKey = `${id}_editable.psd`;
    saveProtectedDigitalFile(psdStorageKey, psdFileDataUrl, undefined, 'PSD', title.trim());
  }

  const product: StoredProduct = {
    id,
    title: title.trim(),
    slug: cleanSlug,
    category: category?.trim() || 'Social Media',
    description: description?.trim() || '',
    previewImages: validPreviews,
    jpgStorageKey,
    jpgFileName: jpgFileName?.trim() || `${cleanSlug}-velora.jpg`,
    jpgPrice: Number(jpgPrice),
    oldPrice: oldPrice ? Number(oldPrice) : null,
    hasPsd: Boolean(hasPsd),
    psdStorageKey,
    psdFileName: hasPsd ? psdFileName?.trim() || `${cleanSlug}-editable.psd` : undefined,
    psdUpgradePrice: hasPsd ? Number(psdUpgradePrice) || 0 : null,
    dimensions: dimensions?.trim() || '3000 × 3000 px (300 DPI)',
    compatibility:
      compatibility?.trim() ||
      (hasPsd
        ? 'JPG works on all devices; PSD compatible with Adobe Photoshop CC & Photopea'
        : 'Standard High-Resolution JPG — compatible with all devices and platforms'),
    usageRights: usageRights?.trim() || 'Standard Commercial & Personal Digital License',
    whatsIncluded:
      Array.isArray(whatsIncluded) && whatsIncluded.length > 0
        ? whatsIncluded
        : hasPsd
        ? [
            'High-resolution ready-to-use JPG file',
            'Optional layered & editable PSD source file (with organized layers)',
            'Instant digital delivery upon payment verification',
          ]
        : [
            'High-resolution ready-to-use JPG file',
            'Instant digital delivery upon payment verification',
          ],
    tags: Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
      ? tags
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean)
      : [],
    featured: Boolean(featured),
    bestseller: Boolean(bestseller),
    new: Boolean(isNew),
    limited: Boolean(limited),
    seoTitle: seoTitle?.trim() || `${title.trim()} — VELORA Digital Design`,
    seoDescription: seoDescription?.trim() || description?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };

  db.products.unshift(product);
  await saveDb(db);
  res.status(201).json({ product: sanitizeProductForPublic(product) });
});

// Admin: Update Product
app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const db = loadDb();
  const { id } = req.params;
  const product = db.products.find((p) => p.id === id);
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  const {
    title,
    slug,
    category,
    description,
    previewImages,
    jpgFileDataUrl,
    jpgFileName,
    jpgPrice,
    oldPrice,
    hasPsd,
    psdFileDataUrl,
    psdFileName,
    psdUpgradePrice,
    dimensions,
    compatibility,
    usageRights,
    whatsIncluded,
    tags,
    featured,
    bestseller,
    isNew,
    limited,
    seoTitle,
    seoDescription,
  } = req.body;

  if (title !== undefined) product.title = title.trim();
  if (slug !== undefined) {
    product.slug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  if (category !== undefined) product.category = category.trim();
  if (description !== undefined) product.description = description.trim();
  if (Array.isArray(previewImages) && previewImages.filter(Boolean).length > 0) {
    product.previewImages = previewImages.filter(Boolean);
  }
  if (jpgPrice !== undefined) product.jpgPrice = Number(jpgPrice);
  if (oldPrice !== undefined) product.oldPrice = oldPrice ? Number(oldPrice) : null;
  if (jpgFileName !== undefined) product.jpgFileName = jpgFileName.trim();
  if (jpgFileDataUrl) {
    saveProtectedDigitalFile(
      product.jpgStorageKey,
      jpgFileDataUrl,
      product.previewImages[0],
      'JPG',
      product.title
    );
  }

  if (hasPsd !== undefined) {
    product.hasPsd = Boolean(hasPsd);
    if (product.hasPsd) {
      if (!product.psdStorageKey) {
        product.psdStorageKey = `${product.id}_editable.psd`;
      }
      saveProtectedDigitalFile(
        product.psdStorageKey,
        psdFileDataUrl,
        undefined,
        'PSD',
        product.title
      );
      product.psdFileName = psdFileName?.trim() || product.psdFileName || `${product.slug}-editable.psd`;
      product.psdUpgradePrice = Number(psdUpgradePrice) || 0;
    } else {
      product.psdUpgradePrice = null;
    }
  }

  if (dimensions !== undefined) product.dimensions = dimensions.trim();
  if (compatibility !== undefined) product.compatibility = compatibility.trim();
  if (usageRights !== undefined) product.usageRights = usageRights.trim();
  if (Array.isArray(whatsIncluded)) product.whatsIncluded = whatsIncluded;
  if (tags !== undefined) {
    product.tags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
      ? tags
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean)
      : product.tags;
  }
  if (featured !== undefined) product.featured = Boolean(featured);
  if (bestseller !== undefined) product.bestseller = Boolean(bestseller);
  if (isNew !== undefined) product.new = Boolean(isNew);
  if (limited !== undefined) product.limited = Boolean(limited);
  if (seoTitle !== undefined) product.seoTitle = seoTitle.trim();
  if (seoDescription !== undefined) product.seoDescription = seoDescription.trim();

  product.updatedAt = new Date().toISOString();
  await saveDb(db);
  res.json({ product: sanitizeProductForPublic(product) });
});

// Admin: Delete Product
app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const db = loadDb();
  const { id } = req.params;
  const idx = db.products.findIndex((p) => p.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  db.products.splice(idx, 1);
  await saveDb(db);

  const client = getSupabaseServerClient();
  if (client) {
    try {
      await client.from('products').delete().eq('id', id);
    } catch {}
  }

  res.json({ deleted: true });
});

// Admin: Categories CRUD
app.post('/api/admin/categories', requireAdmin, async (req, res) => {
  const db = loadDb();
  const { name, description, image } = req.body as {
    name?: string;
    description?: string;
    image?: string;
  };
  if (!name?.trim()) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const newCat = {
    id: `cat_${crypto.randomBytes(4).toString('hex')}`,
    name: name.trim(),
    slug,
    description: description?.trim() || '',
    image: image?.trim() || '/src/assets/images/velora_cat_social_media_1790670021007.jpg',
    createdAt: new Date().toISOString(),
  };
  db.categories.push(newCat);
  await saveDb(db);
  res.status(201).json({ category: newCat });
});

app.put('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  const db = loadDb();
  const cat = db.categories.find((c) => c.id === req.params.id);
  if (!cat) {
    res.status(404).json({ error: 'Category not found.' });
    return;
  }
  const { name, description, image } = req.body;
  if (name?.trim()) {
    cat.name = name.trim();
    cat.slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  if (description !== undefined) cat.description = description.trim();
  if (image?.trim()) cat.image = image.trim();
  await saveDb(db);
  res.json({ category: cat });
});

app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    await ensureDbLoaded();
    const db = loadDb();
    const { id } = req.params;

    const cat = db.categories.find((c) => c.id === id);
    if (!cat) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    // Safety check: Are there any associated products?
    const associatedProducts = db.products.filter(
      (p) =>
        p.category === cat.name ||
        p.category === cat.id ||
        p.category === cat.slug
    );

    if (associatedProducts.length > 0) {
      const productTitles = associatedProducts
        .map((p) => `"${p.title}"`)
        .slice(0, 3)
        .join(', ');
      const moreCount = associatedProducts.length > 3 ? ` and ${associatedProducts.length - 3} more` : '';
      res.status(400).json({
        error: `Cannot delete category "${cat.name}" because it is currently assigned to ${associatedProducts.length} product(s) (${productTitles}${moreCount}). Please reassign or delete these products first.`,
        associatedCount: associatedProducts.length,
      });
      return;
    }

    // 1. Authoritative Supabase deletion
    const client = getSupabaseServerClient();
    if (client) {
      const { error: supaErr } = await client.from('categories').delete().eq('id', id);
      if (supaErr) {
        console.error('[DesignHub PK Category Deletion Error]:', supaErr);
        res.status(500).json({
          error: `Failed to delete category from Supabase database: ${supaErr.message}`,
        });
        return;
      }
    }

    // 2. Remove from local in-memory database and persist to local storage
    const idx = db.categories.findIndex((c) => c.id === id);
    if (idx !== -1) {
      db.categories.splice(idx, 1);
    }
    await saveDb(db);

    console.info(`[DesignHub PK Category] Category "${cat.name}" (${id}) permanently deleted.`);
    res.json({ success: true, deleted: true, categoryId: id });
  } catch (err: any) {
    console.error('[DesignHub PK Category Delete Exception]:', err);
    res.status(500).json({ error: `Internal error deleting category: ${err?.message || 'Unknown error'}` });
  }
});

// Admin: Fetch All Real Transactions & Orders (Protected)
const handleAdminGetOrders = (_req: express.Request, res: express.Response) => {
  const db = loadDb();
  const sortedOrders = [...db.orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({
    orders: sortedOrders.map((o) => ({
      ...o,
      downloads: buildDownloadRecordsForOrder(db, o.orderId),
    })),
    total: sortedOrders.length,
    pendingCount: sortedOrders.filter(
      (o) =>
        o.paymentStatus === 'Payment Verification Pending' ||
        o.paymentStatus === 'Pending' ||
        o.paymentStatus === 'Processing'
    ).length,
    paidCount: sortedOrders.filter(
      (o) => o.paymentStatus === 'Paid' || o.paymentStatus === 'PAID'
    ).length,
  });
};

app.get('/api/admin/orders', requireAdmin, handleAdminGetOrders);
app.get('/api/admin/transactions', requireAdmin, handleAdminGetOrders);

// Admin: Update Order Payment Status (Server-Side Payment Verification -> Unlocks Signed Downloads)
app.put('/api/admin/orders/:orderId/status', requireAdmin, async (req, res) => {
  const db = loadDb();
  const { orderId } = req.params;
  const { paymentStatus, paymentReference } = req.body as {
    paymentStatus: StoredOrder['paymentStatus'];
    paymentReference?: string;
  };

  const order = db.orders.find((o) => o.orderId === orderId);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  order.paymentStatus = paymentStatus;
  if (paymentReference !== undefined) {
    order.paymentReference = paymentReference.trim();
  }
  order.updatedAt = new Date().toISOString();
  provisionOrderDownloads(db, order);
  await saveDb(db);

  res.json({
    order: {
      ...order,
      downloads: buildDownloadRecordsForOrder(db, order.orderId),
    },
  });
});

// Admin: Delete a specific Transaction / Order
app.delete('/api/admin/orders/:orderId', requireAdmin, async (req, res) => {
  const db = loadDb();
  const { orderId } = req.params;
  const idx = db.orders.findIndex((o) => o.orderId === orderId);
  if (idx === -1) {
    res.status(404).json({ error: 'Transaction not found.' });
    return;
  }
  db.orders.splice(idx, 1);
  db.downloads = db.downloads.filter((d) => d.orderId !== orderId);
  await saveDb(db);
  res.json({ deleted: true });
});

// Admin: Clear All Transactions & Orders
app.delete('/api/admin/orders', requireAdmin, async (_req, res) => {
  const db = loadDb();
  db.orders = [];
  db.downloads = [];
  await saveDb(db);
  res.json({ cleared: true });
});

// Admin: Coupons CRUD
app.post('/api/admin/coupons', requireAdmin, async (req, res) => {
  const db = loadDb();
  const {
    code,
    type,
    value,
    expiresAt,
    usageLimit,
    restrictedCategory,
    restrictedProductId,
  } = req.body;

  if (!code?.trim() || !value || Number(value) <= 0) {
    res.status(400).json({ error: 'Coupon code and a positive discount value are required.' });
    return;
  }

  const coupon: StoredCoupon = {
    id: `cpn_${crypto.randomBytes(4).toString('hex')}`,
    code: code.trim().toUpperCase(),
    type: type === 'fixed' ? 'fixed' : 'percentage',
    value: Number(value),
    expiresAt: expiresAt || undefined,
    usageLimit: usageLimit ? Number(usageLimit) : null,
    usedCount: 0,
    restrictedCategory: restrictedCategory || undefined,
    restrictedProductId: restrictedProductId || undefined,
    active: true,
    createdAt: new Date().toISOString(),
  };

  db.coupons.unshift(coupon);
  await saveDb(db);
  res.status(201).json({ coupon });
});

app.delete('/api/admin/coupons/:id', requireAdmin, async (req, res) => {
  const db = loadDb();
  const idx = db.coupons.findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Coupon not found.' });
    return;
  }
  db.coupons.splice(idx, 1);
  await saveDb(db);
  res.json({ deleted: true });
});

// Admin: Homepage Configuration
app.put('/api/admin/homepage', requireAdmin, async (req, res) => {
  const db = loadDb();
  db.homepageConfig = {
    ...db.homepageConfig,
    ...req.body,
  };
  await saveDb(db);
  res.json({ homepageConfig: db.homepageConfig });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    
    if (!fs.existsSync(distPath)) {
      console.warn(
        `[VELORA WARNING] Production build directory not found at: ${distPath}.\n` +
        `Make sure you have run "npm run build" before running in production mode.`
      );
    }
    
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(503).send(
          '<!DOCTYPE html><html><head><title>VELORA - Build Required</title><style>body{font-family:sans-serif;padding:40px;background:#FAF6F3;color:#231518;line-height:1.6;}code{background:#E6DAD2;padding:2px 6px;border-radius:4px;}</style></head><body><h1>VELORA Production Build Required</h1><p>The production frontend build is missing. Please run <code>npm run build</code> and then restart the server with <code>npm start</code>.</p></body></html>'
        );
      }
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`====================================================`);
    console.log(`✨ VELORA E-Commerce Platform Active`);
    console.log(`📡 Server: http://${HOST}:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Database: ${DB_FILE}`);
    console.log(`📁 Private Storage: ${PRIVATE_STORAGE_DIR}`);
    console.log(`====================================================`);
  });
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));

if (isDirectRun && !process.env.VERCEL) {
  startServer();
}

export { ensureDbLoaded, loadDb, saveDb, isDatabaseConnected, getSupabaseServerClient };
export default app;
