// ==============================================================================
// VELORA & DESIGNHUB PK — Supabase-Integrated Database & Repository Engine
// Integrates with Supabase (PostgreSQL & Storage) with resilient local/tmp fallback.
// Zero demo products: No JPGs or PSDs are purchasable until the admin adds them.
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DB_FILE, DATA_DIR } from './config';

export interface StoredProduct {
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
  isPublished?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoredCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash?: string;
  wishlist: string[];
  createdAt: string;
}

export interface StoredOrderItem {
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

export interface StoredOrder {
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

export interface StoredDownload {
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

export interface StoredCoupon {
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

export interface DatabaseSchema {
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
  deletedCategoryIds?: string[];
  deletedProductIds?: string[];
  deletedOrderIds?: string[];
  deletedCouponIds?: string[];
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
    studioFeaturedProductIds?: string[];
  };
}

export interface InBuiltFileRecord {
  storageKey: string;
  contentType: string;
  base64Data: string;
  sizeBytes: number;
  createdAt: string;
}

// Supabase Configuration
export const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://vrmopkszhyotytfknjrw.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_Yz4NZvZ2vl6Yi1MoYH1kgA_g-HX1d54';

export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return null;
  try {
    supabaseClient = createClient(SUPABASE_URL, key, {
      auth: { persistSession: false },
    });
    return supabaseClient;
  } catch (err) {
    console.warn('[SUPABASE] Server client initialization error:', err);
    return null;
  }
}

// In-memory runtime cache for sub-millisecond access
let dbCache: DatabaseSchema | null = null;
const inBuiltFileStore = new Map<string, InBuiltFileRecord>();

const TMP_DATA_DIR = '/tmp';
const TMP_DB_FILE = path.join(TMP_DATA_DIR, 'velora-db.json');
const FILES_DB_FILE = path.join(DATA_DIR, 'velora-files.json');
const TMP_FILES_DB_FILE = path.join(TMP_DATA_DIR, 'velora-files.json');

let writeQueuePromise: Promise<any> = Promise.resolve();

// Standard Category Definitions (Design disciplines)
export const INITIAL_CATEGORIES = [
  {
    id: 'cat_social_media',
    name: 'Social Media',
    slug: 'social-media',
    description: 'Editorial Instagram post templates, story packs, and high-converting carousel designs.',
    image: '/src/assets/images/velora_cat_social_media_1790670021007.jpg',
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'cat_printables',
    name: 'Printables',
    slug: 'printables',
    description: 'Fine art wedding suites, stationery paper goods, and museum-grade printable artboards.',
    image: '/src/assets/images/velora_cat_printables_1790670036140.jpg',
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'cat_logos',
    name: 'Logos',
    slug: 'logos',
    description: 'Minimalist monograms, bespoke emblems, and timeless brand identity kits.',
    image: '/src/assets/images/velora_cat_logos_1790670048012.jpg',
    createdAt: '2026-10-01T00:00:00.000Z',
  },
];

// ZERO DEMO PRODUCTS: Products array begins empty.
// No JPG or PSD is purchasable until the admin publishes products in the Admin Panel.
export const INITIAL_PRODUCTS: StoredProduct[] = [];

export const INITIAL_DATABASE: DatabaseSchema = {
  adminEmail: 'baigrahim12345@gmail.com',
  adminPasswordHash: 'pbkdf2:10000:d32b3747b7c9ff0b218ed72a8a897f6d:e77cc2be277d5753992696e8fe03cde9eaea2360f0f5f1b68f1b8c6bd283c0a6',
  categories: INITIAL_CATEGORIES,
  products: [],
  orders: [],
  downloads: [],
  customers: [],
  coupons: [
    {
      id: 'coup_velora10',
      code: 'VELORA10',
      type: 'percentage',
      value: 10,
      active: true,
      usedCount: 0,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  newsletterEmails: [],
  contactInquiries: [],
  homepageConfig: {
    announcementText: 'Complimentary High-Res JPG Included With Every Suite · Optional Layered PSD Upgrades',
    showAnnouncement: true,
    showFeaturedSection: true,
    showMostLovedSection: true,
    showPsdUpgradeSection: true,
    showPromoBanner: true,
    promoHeadline: 'Because your brand deserves something exquisite.',
    promoSubtext: 'Curated editorial social packs, fine stationery printables, and bespoke brand identity marks.',
    currencyCode: 'PKR',
    currencySymbol: 'Rs. ',
    studioFeaturedProductIds: [],
  },
};

/**
 * Filter out any automated test products or test orders so production data remains pristine.
 */
function cleanTestData(data: DatabaseSchema): boolean {
  let changed = false;

  if (Array.isArray(data.products)) {
    const originalCount = data.products.length;
    data.products = data.products.filter((p) => {
      const isTest =
        p.id.toLowerCase().includes('test') ||
        p.title.toLowerCase().includes('automated test') ||
        p.title.toLowerCase().includes('temporary verification') ||
        p.slug.toLowerCase().includes('temp-test') ||
        p.jpgStorageKey === 'demo_aurelia_arch.jpg' ||
        p.jpgStorageKey === 'sample.jpg';
      return !isTest;
    });
    if (data.products.length !== originalCount) changed = true;
  }

  if (Array.isArray(data.orders)) {
    const originalCount = data.orders.length;
    data.orders = data.orders.filter((o) => {
      const isTest =
        o.customerName.toLowerCase().includes('test') ||
        o.email.toLowerCase().includes('automated-test') ||
        o.email.toLowerCase().includes('test@designhub');
      return !isTest;
    });
    if (data.orders.length !== originalCount) changed = true;
  }

  if (Array.isArray(data.downloads)) {
    const originalCount = data.downloads.length;
    data.downloads = data.downloads.filter((d) => {
      const isTest =
        d.customerEmail.toLowerCase().includes('automated-test') ||
        d.customerEmail.toLowerCase().includes('test@designhub') ||
        d.productTitle.toLowerCase().includes('test') ||
        d.storageKey === 'demo_aurelia_arch.jpg' ||
        d.storageKey === 'demo_aurelia_arch.psd' ||
        d.storageKey === 'sample.jpg';
      return !isTest;
    });
    if (data.downloads.length !== originalCount) changed = true;
  }

  if (Array.isArray(data.customers)) {
    const originalCount = data.customers.length;
    data.customers = data.customers.filter((c) => {
      const email = (c.email || '').toLowerCase().trim();
      const name = (c.name || '').toLowerCase().trim();
      const isTest =
        email.includes('automated-test') ||
        email.includes('test@designhub') ||
        email.endsWith('@example.com') ||
        email.includes('temp-test') ||
        name.includes('automated test');
      return !isTest;
    });
    if (data.customers.length !== originalCount) changed = true;
  }

  if (Array.isArray(data.newsletterEmails)) {
    const originalCount = data.newsletterEmails.length;
    data.newsletterEmails = data.newsletterEmails.filter((n) => {
      const email = (n.email || '').toLowerCase().trim();
      return (
        !email.includes('automated-test') &&
        !email.includes('test@') &&
        !email.endsWith('@example.com')
      );
    });
    if (data.newsletterEmails.length !== originalCount) changed = true;
  }

  return changed;
}

export function getCategoryFallbackImage(slug?: string, name?: string): string {
  const s = (slug || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (s.includes('social') || n.includes('social')) {
    return '/src/assets/images/velora_social_studio_clean_1790691323998.jpg';
  }
  if (s.includes('print') || n.includes('print')) {
    return '/src/assets/images/velora_printables_studio_clean_1790691336397.jpg';
  }
  if (s.includes('logo') || n.includes('logo')) {
    return '/src/assets/images/velora_logos_studio_clean_1790691349764.jpg';
  }
  return '/src/assets/images/velora_luxury_hero_showcase_1790742562741.jpg';
}

function normalizeSchemaArrays(schema: DatabaseSchema) {
  if (!Array.isArray(schema.products)) schema.products = [];
  if (!Array.isArray(schema.categories)) schema.categories = [];
  if (!Array.isArray(schema.orders)) schema.orders = [];
  if (!Array.isArray(schema.downloads)) schema.downloads = [];
  if (!Array.isArray(schema.customers)) schema.customers = [];
  if (!Array.isArray(schema.coupons)) schema.coupons = [];
  if (!Array.isArray(schema.deletedCategoryIds)) schema.deletedCategoryIds = [];
  if (!Array.isArray(schema.deletedProductIds)) schema.deletedProductIds = [];
  if (!Array.isArray(schema.deletedOrderIds)) schema.deletedOrderIds = [];
  if (!Array.isArray(schema.deletedCouponIds)) schema.deletedCouponIds = [];
  if (!Array.isArray(schema.newsletterEmails)) schema.newsletterEmails = [];
  if (!Array.isArray(schema.contactInquiries)) schema.contactInquiries = [];

  schema.products = schema.products.map((p) => {
    const anyP = p as any;
    return {
      ...p,
      jpgPrice:
        typeof p.jpgPrice === 'number'
          ? p.jpgPrice
          : typeof anyP.priceJpg === 'number'
          ? anyP.priceJpg
          : 0,
      psdUpgradePrice:
        typeof p.psdUpgradePrice === 'number'
          ? p.psdUpgradePrice
          : typeof anyP.priceJpgPsd === 'number'
          ? anyP.priceJpgPsd
          : null,
      previewImages:
        Array.isArray(p.previewImages) && p.previewImages.length > 0
          ? p.previewImages
          : [],
    };
  });
}

/**
 * Load database from disk or fallback locations.
 */
export function loadLocalFileDb(): DatabaseSchema {
  // 1. Try DB_FILE (e.g. ./data/velora-db.json)
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      normalizeSchemaArrays(parsed);
      const cleaned = cleanTestData(parsed);
      if (cleaned) {
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        } catch {}
      }
      dbCache = parsed;
      return parsed;
    } catch (err) {
      console.warn('[DESIGNHUB DB] Warning reading DB_FILE:', err);
    }
  }

  // 2. Try serverless fallback TMP_DB_FILE (/tmp/velora-db.json)
  if (fs.existsSync(TMP_DB_FILE)) {
    try {
      const raw = fs.readFileSync(TMP_DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      normalizeSchemaArrays(parsed);
      cleanTestData(parsed);
      dbCache = parsed;
      return parsed;
    } catch (err) {
      console.warn('[DESIGNHUB DB] Warning reading TMP_DB_FILE:', err);
    }
  }

  // 3. Fallback to INITIAL_DATABASE and write it out
  const initial = JSON.parse(JSON.stringify(INITIAL_DATABASE)) as DatabaseSchema;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  } catch {
    try {
      fs.writeFileSync(TMP_DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    } catch {}
  }

  dbCache = initial;
  return initial;
}

/**
 * Check connectivity and diagnostic status of Supabase and database engine.
 */
export async function isDatabaseConnected(): Promise<{
  connected: boolean;
  engine: string;
  supabaseConfigured: boolean;
  supabaseUrl: string;
  supabaseOnline: boolean;
  supabaseDetails?: string;
  location: string;
  productsCount: number;
  ordersCount: number;
  error?: string;
}> {
  let supabaseOnline = false;
  let supabaseDetails = '';
  const client = getSupabaseServerClient();

  if (client) {
    try {
      const probePromise = client.from('products').select('count', { count: 'exact' });
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'Connection timed out' } }), 1200)
      );
      const res: any = await Promise.race([probePromise, timeoutPromise]);
      if (!res.error) {
        supabaseOnline = true;
        supabaseDetails = 'Connected to Supabase PostgreSQL table "products".';
      } else {
        supabaseDetails = `Supabase query status: ${res.error.message}`;
      }
    } catch (err: any) {
      supabaseDetails = `Supabase network/DNS: ${err?.message || String(err)}`;
    }
  }

  const db = loadDb();
  return {
    connected: true,
    engine: supabaseOnline ? 'supabase_postgresql' : 'in_built_resilient_database',
    supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
    supabaseUrl: SUPABASE_URL,
    supabaseOnline,
    supabaseDetails,
    location: fs.existsSync(DB_FILE) ? DB_FILE : TMP_DB_FILE,
    productsCount: db.products?.length || 0,
    ordersCount: db.orders?.length || 0,
  };
}

/**
 * Returns null: No separate raw pool required since Supabase client / REST is used.
 */
export function getPgPool(): null {
  return null;
}

let lastSupabaseSyncAttempt = 0;

/**
 * Synchronize from Supabase if online, otherwise ensure local database is loaded.
 * Sub-millisecond return if cache is valid; bounded timeout (800ms) on remote queries.
 */
export async function ensureDbLoaded(): Promise<DatabaseSchema> {
  const now = Date.now();
  if (dbCache && now - lastSupabaseSyncAttempt < 30000) {
    return dbCache;
  }

  const localDb = dbCache || loadLocalFileDb();
  lastSupabaseSyncAttempt = now;

  // Attempt to sync from Supabase if connected with strict 800ms timeout
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const fetchPromise = Promise.all([
        client.from('products').select('*'),
        client.from('categories').select('*'),
      ]);
      const timeoutPromise = new Promise<any>((resolve) =>
        setTimeout(
          () =>
            resolve([
              { data: null, error: { message: 'Supabase sync timeout' } },
              { data: null, error: { message: 'Supabase sync timeout' } },
            ]),
          800
        )
      );

      const [prodRes, catRes]: any = await Promise.race([fetchPromise, timeoutPromise]);
      const supaProducts = prodRes?.data;
      const prodErr = prodRes?.error;
      const supaCategories = catRes?.data;
      const catErr = catRes?.error;

      if (!prodErr && Array.isArray(supaProducts)) {
        const deletedProdSet = new Set(localDb.deletedProductIds || []);
        // Map Supabase snake_case rows to StoredProduct format
        const mappedProducts: StoredProduct[] = supaProducts
          .map((row: any) => ({
            id: row.id,
            title: row.title,
            slug: row.slug,
            category: row.category,
            description: row.description || '',
            previewImages: row.preview_images || [],
            jpgStorageKey: row.jpg_storage_key || `${row.id}_standard.jpg`,
            jpgFileName: row.jpg_file_name || `${row.title}.jpg`,
            jpgPrice: Number(row.jpg_price || 0),
            oldPrice: row.old_price ? Number(row.old_price) : null,
            hasPsd: Boolean(row.has_psd),
            psdStorageKey: row.psd_storage_key || undefined,
            psdFileName: row.psd_file_name || undefined,
            psdUpgradePrice: row.psd_upgrade_price ? Number(row.psd_upgrade_price) : null,
            dimensions: row.dimensions || '',
            compatibility: row.compatibility || '',
            usageRights: row.usage_rights || '',
            whatsIncluded: row.whats_included || [],
            tags: row.tags || [],
            featured: Boolean(row.featured),
            bestseller: Boolean(row.bestseller),
            new: Boolean(row.is_new),
            limited: Boolean(row.limited),
            seoTitle: row.seo_title,
            seoDescription: row.seo_description,
            isPublished: row.is_published !== false,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
          }))
          .filter((p: StoredProduct) => !deletedProdSet.has(p.id) && !deletedProdSet.has(p.slug));
        localDb.products = mappedProducts;
      }

      if (!catErr && Array.isArray(supaCategories)) {
        const deletedCatSet = new Set(localDb.deletedCategoryIds || []);
        // Map Supabase categories to StoredCategory format authoritatively
        const mappedCategories = supaCategories
          .map((row: any) => ({
            id: row.id,
            name: row.name,
            slug: row.slug,
            description: row.description || '',
            image: row.image?.trim() || getCategoryFallbackImage(row.slug, row.name),
            createdAt: row.created_at || new Date().toISOString(),
          }))
          .filter((c: any) => !deletedCatSet.has(c.id) && !deletedCatSet.has(c.slug));
        localDb.categories = mappedCategories;
      }
    } catch {
      // Fall back to local DB if Supabase tables are not yet created or unreachable
    }
  }

  dbCache = localDb;
  return localDb;
}

/**
 * Synchronous accessor for in-memory database state.
 */
export function loadDb(): DatabaseSchema {
  if (dbCache) {
    return dbCache;
  }
  return loadLocalFileDb();
}

/**
 * Save database state atomically to disk with mutex serialization,
 * and asynchronously synchronize to Supabase tables.
 */
export async function saveDb(data: DatabaseSchema): Promise<DatabaseSchema> {
  normalizeSchemaArrays(data);
  dbCache = data;

  writeQueuePromise = writeQueuePromise
    .then(async () => {
      const serialized = JSON.stringify(data, null, 2);

      // 1. Write to local storage
      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const tempPath = `${DB_FILE}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
        fs.writeFileSync(tempPath, serialized, 'utf-8');
        fs.renameSync(tempPath, DB_FILE);
      } catch {
        // Fallback write to /tmp in serverless environment
        try {
          if (!fs.existsSync(TMP_DATA_DIR)) {
            fs.mkdirSync(TMP_DATA_DIR, { recursive: true });
          }
          const tmpTemp = `${TMP_DB_FILE}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
          fs.writeFileSync(tmpTemp, serialized, 'utf-8');
          fs.renameSync(tmpTemp, TMP_DB_FILE);
        } catch (tmpErr) {
          console.warn('[DESIGNHUB DB] Warning writing /tmp file:', tmpErr);
        }
      }

      // 2. Synchronize to Supabase if configured
      const client = getSupabaseServerClient();
      if (client) {
        try {
          // Sync categories (excluding any tombstoned deleted categories)
          const deletedCatSet = new Set(data.deletedCategoryIds || []);
          const activeCategories = (data.categories || []).filter(
            (c) => !deletedCatSet.has(c.id) && !deletedCatSet.has(c.slug)
          );

          if (activeCategories.length > 0) {
            await client.from('categories').upsert(
              activeCategories.map((c) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                description: c.description,
                image: c.image,
                created_at: c.createdAt,
              })),
              { onConflict: 'id' }
            );
          }

          // Sync products (excluding any tombstoned deleted products)
          const deletedProdSet = new Set(data.deletedProductIds || []);
          const activeProducts = (data.products || []).filter(
            (p) => !deletedProdSet.has(p.id) && !deletedProdSet.has(p.slug)
          );

          if (activeProducts.length > 0) {
            await client.from('products').upsert(
              activeProducts.map((p) => ({
                id: p.id,
                title: p.title,
                slug: p.slug,
                category: p.category,
                description: p.description,
                preview_images: p.previewImages,
                jpg_storage_key: p.jpgStorageKey,
                jpg_file_name: p.jpgFileName,
                jpg_price: p.jpgPrice,
                old_price: p.oldPrice,
                has_psd: p.hasPsd,
                psd_storage_key: p.psdStorageKey,
                psd_file_name: p.psdFileName,
                psd_upgrade_price: p.psdUpgradePrice,
                dimensions: p.dimensions,
                compatibility: p.compatibility,
                usage_rights: p.usageRights,
                whats_included: p.whatsIncluded,
                tags: p.tags,
                featured: p.featured,
                bestseller: p.bestseller,
                is_new: p.new,
                limited: p.limited,
                seo_title: p.seoTitle,
                seo_description: p.seoDescription,
                is_published: p.isPublished !== false,
                created_at: p.createdAt,
                updated_at: p.updatedAt,
              })),
              { onConflict: 'id' }
            );
          }

          // Sync orders
          if (data.orders && data.orders.length > 0) {
            await client.from('orders').upsert(
              data.orders.map((o) => ({
                order_id: o.orderId,
                customer_id: o.customerId,
                customer_name: o.customerName,
                email: o.email,
                phone: o.phone,
                country: o.country,
                billing_city: o.billingCity,
                subtotal: o.subtotal,
                discount: o.discount,
                coupon_code: o.couponCode,
                total: o.total,
                payment_method: o.paymentMethod,
                recipient_jazzcash_number: o.recipientJazzCashNumber,
                sender_phone: o.senderPhone,
                sender_name: o.senderName,
                payment_reference: o.paymentReference,
                payment_screenshot: o.paymentScreenshot,
                payment_notes: o.paymentNotes,
                payment_status: o.paymentStatus,
                order_access_token: o.orderAccessToken,
                created_at: o.createdAt,
                updated_at: o.updatedAt,
              })),
              { onConflict: 'order_id' }
            );
          }
        } catch (supaErr) {
          // Supabase sync failure handled gracefully without blocking app
          console.warn('[DESIGNHUB DB] Supabase sync notice:', (supaErr as any)?.message);
        }
      }
    })
    .catch((err) => {
      console.error('[DESIGNHUB DB] Serialization write error:', err);
    });

  await writeQueuePromise;
  return data;
}

// ------------------------------------------------------------------------------
// In-Built & Supabase File Storage Store
// ------------------------------------------------------------------------------

export async function saveInBuiltFile(
  storageKey: string,
  contentType: string,
  buffer: Buffer
): Promise<void> {
  const cleanKey = path.basename(storageKey);
  const record: InBuiltFileRecord = {
    storageKey: cleanKey,
    contentType,
    base64Data: buffer.toString('base64'),
    sizeBytes: buffer.length,
    createdAt: new Date().toISOString(),
  };

  inBuiltFileStore.set(cleanKey, record);

  try {
    const fileEntries: Record<string, InBuiltFileRecord> = {};
    for (const [k, v] of inBuiltFileStore.entries()) {
      fileEntries[k] = v;
    }
    const serialized = JSON.stringify(fileEntries);
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(FILES_DB_FILE, serialized, 'utf-8');
    } catch {
      fs.writeFileSync(TMP_FILES_DB_FILE, serialized, 'utf-8');
    }
  } catch {}

  // Attempt upload to Supabase storage if available
  const client = getSupabaseServerClient();
  if (client) {
    try {
      await client.storage.from('digital-assets').upload(cleanKey, buffer, {
        contentType,
        upsert: true,
      });
    } catch {
      // ignore storage bucket missing
    }
  }
}

export function getInBuiltFile(
  storageKey: string
): { data: Buffer; contentType: string } | null {
  const cleanKey = path.basename(storageKey);

  if (inBuiltFileStore.has(cleanKey)) {
    const rec = inBuiltFileStore.get(cleanKey)!;
    return {
      data: Buffer.from(rec.base64Data, 'base64'),
      contentType: rec.contentType,
    };
  }

  for (const filePath of [FILES_DB_FILE, TMP_FILES_DB_FILE]) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed[cleanKey]) {
          const rec = parsed[cleanKey] as InBuiltFileRecord;
          inBuiltFileStore.set(cleanKey, rec);
          return {
            data: Buffer.from(rec.base64Data, 'base64'),
            contentType: rec.contentType,
          };
        }
      } catch {}
    }
  }

  return null;
}
