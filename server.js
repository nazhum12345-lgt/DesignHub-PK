// server.ts
import express from "express";
import path4 from "path";
import fs3 from "fs";
import crypto2 from "crypto";
import dotenv2 from "dotenv";
import { GoogleGenAI } from "@google/genai";

// src/server/db.ts
import fs from "fs";
import path2 from "path";
import { createClient } from "@supabase/supabase-js";

// src/server/config.ts
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
var PORT = parseInt(process.env.PORT || "3000", 10);
var HOST = process.env.HOST || "0.0.0.0";
var NODE_ENV = process.env.NODE_ENV || "development";
var DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), "data");
var PRIVATE_STORAGE_DIR = process.env.PRIVATE_STORAGE_DIR || path.resolve(process.cwd(), "private_storage");
var DB_FILE = path.join(DATA_DIR, "velora-db.json");
var SESSION_SECRET = process.env.VELORA_SESSION_SECRET || crypto.createHash("sha256").update("velora-session-key-production").digest("hex");
var DOWNLOAD_SIGNING_SECRET = process.env.VELORA_DOWNLOAD_SIGNING_SECRET || crypto.createHash("sha256").update("velora-download-hmac-secret").digest("hex");
var GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// src/server/db.ts
var SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://vrmopkszhyotytfknjrw.supabase.co";
var SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_Yz4NZvZ2vl6Yi1MoYH1kgA_g-HX1d54";
var SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
var supabaseClient = null;
function getSupabaseServerClient() {
  if (supabaseClient) return supabaseClient;
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return null;
  try {
    supabaseClient = createClient(SUPABASE_URL, key, {
      auth: { persistSession: false }
    });
    return supabaseClient;
  } catch (err) {
    console.warn("[SUPABASE] Server client initialization error:", err);
    return null;
  }
}
var dbCache = null;
var inBuiltFileStore = /* @__PURE__ */ new Map();
var TMP_DATA_DIR = "/tmp";
var TMP_DB_FILE = path2.join(TMP_DATA_DIR, "velora-db.json");
var FILES_DB_FILE = path2.join(DATA_DIR, "velora-files.json");
var TMP_FILES_DB_FILE = path2.join(TMP_DATA_DIR, "velora-files.json");
var writeQueuePromise = Promise.resolve();
var INITIAL_CATEGORIES = [
  {
    id: "cat_social_media",
    name: "Social Media",
    slug: "social-media",
    description: "Editorial Instagram post templates, story packs, and high-converting carousel designs.",
    image: "/src/assets/images/velora_cat_social_media_1790670021007.jpg",
    createdAt: "2026-10-01T00:00:00.000Z"
  },
  {
    id: "cat_printables",
    name: "Printables",
    slug: "printables",
    description: "Fine art wedding suites, stationery paper goods, and museum-grade printable artboards.",
    image: "/src/assets/images/velora_cat_printables_1790670036140.jpg",
    createdAt: "2026-10-01T00:00:00.000Z"
  },
  {
    id: "cat_logos",
    name: "Logos",
    slug: "logos",
    description: "Minimalist monograms, bespoke emblems, and timeless brand identity kits.",
    image: "/src/assets/images/velora_cat_logos_1790670048012.jpg",
    createdAt: "2026-10-01T00:00:00.000Z"
  }
];
var INITIAL_DATABASE = {
  adminEmail: "baigrahim12345@gmail.com",
  adminPasswordHash: "pbkdf2:10000:d32b3747b7c9ff0b218ed72a8a897f6d:e77cc2be277d5753992696e8fe03cde9eaea2360f0f5f1b68f1b8c6bd283c0a6",
  categories: INITIAL_CATEGORIES,
  products: [],
  orders: [],
  downloads: [],
  customers: [],
  coupons: [
    {
      id: "coup_velora10",
      code: "VELORA10",
      type: "percentage",
      value: 10,
      active: true,
      usedCount: 0,
      createdAt: "2026-10-01T00:00:00.000Z"
    }
  ],
  newsletterEmails: [],
  contactInquiries: [],
  homepageConfig: {
    announcementText: "Complimentary High-Res JPG Included With Every Suite \xB7 Optional Layered PSD Upgrades",
    showAnnouncement: true,
    showFeaturedSection: true,
    showMostLovedSection: true,
    showPsdUpgradeSection: true,
    showPromoBanner: true,
    promoHeadline: "Because your brand deserves something exquisite.",
    promoSubtext: "Curated editorial social packs, fine stationery printables, and bespoke brand identity marks.",
    currencyCode: "PKR",
    currencySymbol: "Rs. ",
    studioFeaturedProductIds: []
  }
};
function cleanTestData(data) {
  let changed = false;
  if (Array.isArray(data.products)) {
    const originalCount = data.products.length;
    data.products = data.products.filter((p) => {
      const isTest = p.id.toLowerCase().includes("test") || p.title.toLowerCase().includes("automated test") || p.title.toLowerCase().includes("temporary verification") || p.slug.toLowerCase().includes("temp-test") || p.jpgStorageKey === "demo_aurelia_arch.jpg" || p.jpgStorageKey === "sample.jpg";
      return !isTest;
    });
    if (data.products.length !== originalCount) changed = true;
  }
  if (Array.isArray(data.orders)) {
    const originalCount = data.orders.length;
    data.orders = data.orders.filter((o) => {
      const isTest = o.customerName.toLowerCase().includes("test") || o.email.toLowerCase().includes("automated-test") || o.email.toLowerCase().includes("test@designhub");
      return !isTest;
    });
    if (data.orders.length !== originalCount) changed = true;
  }
  if (Array.isArray(data.downloads)) {
    const originalCount = data.downloads.length;
    data.downloads = data.downloads.filter((d) => {
      const isTest = d.customerEmail.toLowerCase().includes("automated-test") || d.customerEmail.toLowerCase().includes("test@designhub") || d.productTitle.toLowerCase().includes("test") || d.storageKey === "demo_aurelia_arch.jpg" || d.storageKey === "demo_aurelia_arch.psd" || d.storageKey === "sample.jpg";
      return !isTest;
    });
    if (data.downloads.length !== originalCount) changed = true;
  }
  if (Array.isArray(data.customers)) {
    const originalCount = data.customers.length;
    data.customers = data.customers.filter((c) => {
      const email = (c.email || "").toLowerCase().trim();
      const name = (c.name || "").toLowerCase().trim();
      const isTest = email.includes("automated-test") || email.includes("test@designhub") || email.endsWith("@example.com") || email.includes("temp-test") || name.includes("automated test");
      return !isTest;
    });
    if (data.customers.length !== originalCount) changed = true;
  }
  if (Array.isArray(data.newsletterEmails)) {
    const originalCount = data.newsletterEmails.length;
    data.newsletterEmails = data.newsletterEmails.filter((n) => {
      const email = (n.email || "").toLowerCase().trim();
      return !email.includes("automated-test") && !email.includes("test@") && !email.endsWith("@example.com");
    });
    if (data.newsletterEmails.length !== originalCount) changed = true;
  }
  return changed;
}
function getCategoryFallbackImage(slug, name) {
  const s = (slug || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (s.includes("social") || n.includes("social")) {
    return "/src/assets/images/velora_social_studio_clean_1790691323998.jpg";
  }
  if (s.includes("print") || n.includes("print")) {
    return "/src/assets/images/velora_printables_studio_clean_1790691336397.jpg";
  }
  if (s.includes("logo") || n.includes("logo")) {
    return "/src/assets/images/velora_logos_studio_clean_1790691349764.jpg";
  }
  return "/src/assets/images/velora_luxury_hero_showcase_1790742562741.jpg";
}
function normalizeSchemaArrays(schema) {
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
  if (schema.deletedCategoryIds.length > 0) {
    const delCatSet = new Set(schema.deletedCategoryIds.map((x) => x.toLowerCase().trim()));
    schema.categories = schema.categories.filter(
      (c) => !delCatSet.has(c.id.toLowerCase().trim()) && !delCatSet.has(c.slug.toLowerCase().trim()) && !delCatSet.has(c.name.toLowerCase().trim())
    );
  }
  if (schema.deletedProductIds.length > 0) {
    const delProdSet = new Set(schema.deletedProductIds.map((x) => x.toLowerCase().trim()));
    schema.products = schema.products.filter(
      (p) => !delProdSet.has(p.id.toLowerCase().trim()) && !delProdSet.has(p.slug.toLowerCase().trim())
    );
  }
  schema.products = schema.products.map((p) => {
    const anyP = p;
    return {
      ...p,
      jpgPrice: typeof p.jpgPrice === "number" ? p.jpgPrice : typeof anyP.priceJpg === "number" ? anyP.priceJpg : 0,
      psdUpgradePrice: typeof p.psdUpgradePrice === "number" ? p.psdUpgradePrice : typeof anyP.priceJpgPsd === "number" ? anyP.priceJpgPsd : null,
      previewImages: Array.isArray(p.previewImages) && p.previewImages.length > 0 ? p.previewImages : []
    };
  });
}
function loadLocalFileDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      normalizeSchemaArrays(parsed);
      const cleaned = cleanTestData(parsed);
      if (cleaned) {
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf-8");
        } catch {
        }
      }
      dbCache = parsed;
      return parsed;
    } catch (err) {
      console.warn("[DESIGNHUB DB] Warning reading DB_FILE:", err);
    }
  }
  if (fs.existsSync(TMP_DB_FILE)) {
    try {
      const raw = fs.readFileSync(TMP_DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      normalizeSchemaArrays(parsed);
      cleanTestData(parsed);
      dbCache = parsed;
      return parsed;
    } catch (err) {
      console.warn("[DESIGNHUB DB] Warning reading TMP_DB_FILE:", err);
    }
  }
  const initial = JSON.parse(JSON.stringify(INITIAL_DATABASE));
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
  } catch {
    try {
      fs.writeFileSync(TMP_DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
    } catch {
    }
  }
  dbCache = initial;
  return initial;
}
async function isDatabaseConnected() {
  let supabaseOnline = false;
  let supabaseDetails = "";
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const probePromise = client.from("products").select("count", { count: "exact" });
      const timeoutPromise = new Promise(
        (resolve) => setTimeout(() => resolve({ data: null, error: { message: "Connection timed out" } }), 1200)
      );
      const res = await Promise.race([probePromise, timeoutPromise]);
      if (!res.error) {
        supabaseOnline = true;
        supabaseDetails = 'Connected to Supabase PostgreSQL table "products".';
      } else {
        supabaseDetails = `Supabase query status: ${res.error.message}`;
      }
    } catch (err) {
      supabaseDetails = `Supabase network/DNS: ${err?.message || String(err)}`;
    }
  }
  const db = loadDb();
  return {
    connected: true,
    engine: supabaseOnline ? "supabase_postgresql" : "in_built_resilient_database",
    supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
    supabaseUrl: SUPABASE_URL,
    supabaseOnline,
    supabaseDetails,
    location: fs.existsSync(DB_FILE) ? DB_FILE : TMP_DB_FILE,
    productsCount: db.products?.length || 0,
    ordersCount: db.orders?.length || 0
  };
}
var lastSupabaseSyncAttempt = 0;
async function ensureDbLoaded() {
  const now = Date.now();
  if (dbCache && now - lastSupabaseSyncAttempt < 3e4) {
    return dbCache;
  }
  const localDb = dbCache || loadLocalFileDb();
  lastSupabaseSyncAttempt = now;
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const fetchPromise = Promise.all([
        client.from("products").select("*"),
        client.from("categories").select("*")
      ]);
      const timeoutPromise = new Promise(
        (resolve) => setTimeout(
          () => resolve([
            { data: null, error: { message: "Supabase sync timeout" } },
            { data: null, error: { message: "Supabase sync timeout" } }
          ]),
          800
        )
      );
      const [prodRes, catRes] = await Promise.race([fetchPromise, timeoutPromise]);
      const supaProducts = prodRes?.data;
      const prodErr = prodRes?.error;
      const supaCategories = catRes?.data;
      const catErr = catRes?.error;
      if (!prodErr && Array.isArray(supaProducts)) {
        const deletedProdSet = new Set(localDb.deletedProductIds || []);
        const mappedProducts = supaProducts.map((row) => ({
          id: row.id,
          title: row.title,
          slug: row.slug,
          category: row.category,
          description: row.description || "",
          previewImages: row.preview_images || [],
          jpgStorageKey: row.jpg_storage_key || `${row.id}_standard.jpg`,
          jpgFileName: row.jpg_file_name || `${row.title}.jpg`,
          jpgPrice: Number(row.jpg_price || 0),
          oldPrice: row.old_price ? Number(row.old_price) : null,
          hasPsd: Boolean(row.has_psd),
          psdStorageKey: row.psd_storage_key || void 0,
          psdFileName: row.psd_file_name || void 0,
          psdUpgradePrice: row.psd_upgrade_price ? Number(row.psd_upgrade_price) : null,
          dimensions: row.dimensions || "",
          compatibility: row.compatibility || "",
          usageRights: row.usage_rights || "",
          whatsIncluded: row.whats_included || [],
          tags: row.tags || [],
          featured: Boolean(row.featured),
          bestseller: Boolean(row.bestseller),
          new: Boolean(row.is_new),
          limited: Boolean(row.limited),
          seoTitle: row.seo_title,
          seoDescription: row.seo_description,
          isPublished: row.is_published !== false,
          createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: row.updated_at || (/* @__PURE__ */ new Date()).toISOString()
        })).filter((p) => !deletedProdSet.has(p.id) && !deletedProdSet.has(p.slug));
        localDb.products = mappedProducts;
      }
      if (!catErr && Array.isArray(supaCategories)) {
        const deletedCatSet = new Set(
          (localDb.deletedCategoryIds || []).map((x) => x.toLowerCase().trim())
        );
        const mappedCategories = supaCategories.map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          description: row.description || "",
          image: row.image?.trim() || getCategoryFallbackImage(row.slug, row.name),
          createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString()
        })).filter(
          (c) => !deletedCatSet.has(c.id.toLowerCase().trim()) && !deletedCatSet.has(c.slug.toLowerCase().trim()) && !deletedCatSet.has(c.name.toLowerCase().trim())
        );
        localDb.categories = mappedCategories;
      }
    } catch {
    }
  }
  dbCache = localDb;
  normalizeSchemaArrays(localDb);
  return localDb;
}
function loadDb() {
  if (dbCache) {
    normalizeSchemaArrays(dbCache);
    return dbCache;
  }
  return loadLocalFileDb();
}
async function saveDb(data) {
  normalizeSchemaArrays(data);
  dbCache = data;
  writeQueuePromise = writeQueuePromise.then(async () => {
    const serialized = JSON.stringify(data, null, 2);
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempPath = `${DB_FILE}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
      fs.writeFileSync(tempPath, serialized, "utf-8");
      fs.renameSync(tempPath, DB_FILE);
    } catch {
      try {
        if (!fs.existsSync(TMP_DATA_DIR)) {
          fs.mkdirSync(TMP_DATA_DIR, { recursive: true });
        }
        const tmpTemp = `${TMP_DB_FILE}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
        fs.writeFileSync(tmpTemp, serialized, "utf-8");
        fs.renameSync(tmpTemp, TMP_DB_FILE);
      } catch (tmpErr) {
        console.warn("[DESIGNHUB DB] Warning writing /tmp file:", tmpErr);
      }
    }
    const client = getSupabaseServerClient();
    if (client) {
      try {
        const deletedCatSet = new Set(data.deletedCategoryIds || []);
        const activeCategories = (data.categories || []).filter(
          (c) => !deletedCatSet.has(c.id) && !deletedCatSet.has(c.slug)
        );
        if (activeCategories.length > 0) {
          await client.from("categories").upsert(
            activeCategories.map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              description: c.description,
              image: c.image,
              created_at: c.createdAt
            })),
            { onConflict: "id" }
          );
        }
        const deletedProdSet = new Set(data.deletedProductIds || []);
        const activeProducts = (data.products || []).filter(
          (p) => !deletedProdSet.has(p.id) && !deletedProdSet.has(p.slug)
        );
        if (activeProducts.length > 0) {
          await client.from("products").upsert(
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
              updated_at: p.updatedAt
            })),
            { onConflict: "id" }
          );
        }
        if (data.orders && data.orders.length > 0) {
          await client.from("orders").upsert(
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
              updated_at: o.updatedAt
            })),
            { onConflict: "order_id" }
          );
        }
      } catch (supaErr) {
        console.warn("[DESIGNHUB DB] Supabase sync notice:", supaErr?.message);
      }
    }
  }).catch((err) => {
    console.error("[DESIGNHUB DB] Serialization write error:", err);
  });
  await writeQueuePromise;
  return data;
}
async function saveInBuiltFile(storageKey, contentType, buffer) {
  const cleanKey = path2.basename(storageKey);
  const record = {
    storageKey: cleanKey,
    contentType,
    base64Data: buffer.toString("base64"),
    sizeBytes: buffer.length,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  inBuiltFileStore.set(cleanKey, record);
  try {
    const fileEntries = {};
    for (const [k, v] of inBuiltFileStore.entries()) {
      fileEntries[k] = v;
    }
    const serialized = JSON.stringify(fileEntries);
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(FILES_DB_FILE, serialized, "utf-8");
    } catch {
      fs.writeFileSync(TMP_FILES_DB_FILE, serialized, "utf-8");
    }
  } catch {
  }
  const client = getSupabaseServerClient();
  if (client) {
    try {
      await client.storage.from("digital-assets").upload(cleanKey, buffer, {
        contentType,
        upsert: true
      });
    } catch {
    }
  }
}
function getInBuiltFile(storageKey) {
  const cleanKey = path2.basename(storageKey);
  if (inBuiltFileStore.has(cleanKey)) {
    const rec = inBuiltFileStore.get(cleanKey);
    return {
      data: Buffer.from(rec.base64Data, "base64"),
      contentType: rec.contentType
    };
  }
  for (const filePath of [FILES_DB_FILE, TMP_FILES_DB_FILE]) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed[cleanKey]) {
          const rec = parsed[cleanKey];
          inBuiltFileStore.set(cleanKey, rec);
          return {
            data: Buffer.from(rec.base64Data, "base64"),
            contentType: rec.contentType
          };
        }
      } catch {
      }
    }
  }
  return null;
}

// src/server/storage.ts
import fs2 from "fs";
import path3 from "path";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
var S3_BUCKET = process.env.S3_BUCKET || process.env.STORAGE_BUCKET || "";
function normalizeEndpoint(raw) {
  if (!raw) return "";
  let endpoint = raw.trim();
  const mdMatch = endpoint.match(/\((https?:\/\/[^\s)]+)\)/);
  if (mdMatch) {
    endpoint = mdMatch[1];
  } else {
    endpoint = endpoint.replace(/[\[\]]/g, "").replace(/^"+|"+$/g, "");
  }
  return endpoint;
}
var rawEndpoint = process.env.S3_ENDPOINT || process.env.STORAGE_ENDPOINT || "";
var S3_ENDPOINT = normalizeEndpoint(rawEndpoint);
var S3_REGION = process.env.S3_REGION || "auto";
var S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "";
var S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "";
var s3Client = null;
if (S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY) {
  try {
    s3Client = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT || void 0,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY
      },
      forcePathStyle: Boolean(S3_ENDPOINT)
    });
    console.log(`[VELORA STORAGE] Object storage configured with bucket "${S3_BUCKET}"`);
  } catch (err) {
    console.error("[VELORA STORAGE] Failed to initialize S3 client:", err);
    s3Client = null;
  }
}
function isObjectStorageConfigured() {
  return Boolean(s3Client && S3_BUCKET);
}
var storageService = {
  /**
   * Save a file: writes immediately to local disk/tmp and in-built database file store.
   */
  async saveFile(storageKey, data, contentType = "application/octet-stream") {
    const cleanKey = path3.basename(storageKey);
    const buffer = Buffer.isBuffer(data) ? data : typeof data === "string" && data.startsWith("data:") ? Buffer.from(data.split("base64,")[1] || data, "base64") : Buffer.from(data, "utf-8");
    try {
      if (!fs2.existsSync(PRIVATE_STORAGE_DIR)) {
        fs2.mkdirSync(PRIVATE_STORAGE_DIR, { recursive: true });
      }
      fs2.writeFileSync(path3.join(PRIVATE_STORAGE_DIR, cleanKey), buffer);
    } catch {
      try {
        fs2.writeFileSync(path3.join("/tmp", cleanKey), buffer);
      } catch {
      }
    }
    try {
      await saveInBuiltFile(cleanKey, contentType, buffer);
    } catch (err) {
      console.warn("[VELORA STORAGE] Warning saving to in-built file store:", err);
    }
    if (s3Client && S3_BUCKET) {
      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: cleanKey,
            Body: buffer,
            ContentType: contentType
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
  async getFile(storageKey) {
    const cleanKey = path3.basename(storageKey);
    const localPath = path3.join(PRIVATE_STORAGE_DIR, cleanKey);
    if (fs2.existsSync(localPath)) {
      try {
        const buffer = fs2.readFileSync(localPath);
        const ext = path3.extname(cleanKey).toLowerCase();
        const contentType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".psd" ? "application/octet-stream" : ext === ".png" ? "image/png" : "application/octet-stream";
        return { data: buffer, contentType };
      } catch {
      }
    }
    const tmpPath = path3.join("/tmp", cleanKey);
    if (fs2.existsSync(tmpPath)) {
      try {
        const buffer = fs2.readFileSync(tmpPath);
        const ext = path3.extname(cleanKey).toLowerCase();
        const contentType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".psd" ? "application/octet-stream" : "application/octet-stream";
        return { data: buffer, contentType };
      } catch {
      }
    }
    const inBuilt = getInBuiltFile(cleanKey);
    if (inBuilt) {
      return inBuilt;
    }
    if (s3Client && S3_BUCKET) {
      try {
        const response = await s3Client.send(
          new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: cleanKey
          })
        );
        if (response.Body) {
          const chunks = [];
          for await (const chunk of response.Body) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);
          return {
            data: buffer,
            contentType: response.ContentType || "application/octet-stream"
          };
        }
      } catch {
      }
    }
    return null;
  },
  /**
   * Check if a file exists across in-built stores.
   */
  async hasFile(storageKey) {
    const cleanKey = path3.basename(storageKey);
    const localPath = path3.join(PRIVATE_STORAGE_DIR, cleanKey);
    if (fs2.existsSync(localPath)) return true;
    const tmpPath = path3.join("/tmp", cleanKey);
    if (fs2.existsSync(tmpPath)) return true;
    if (getInBuiltFile(cleanKey)) return true;
    if (s3Client && S3_BUCKET) {
      try {
        await s3Client.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: cleanKey }));
        return true;
      } catch {
      }
    }
    return false;
  },
  /**
   * Generate an authenticated presigned URL if non-Supabase S3 is configured.
   */
  async getSignedDownloadUrl(storageKey, expiresInSeconds = 3600) {
    if (!s3Client || !S3_BUCKET) return null;
    try {
      const cleanKey = path3.basename(storageKey);
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: cleanKey
      });
      return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    } catch (err) {
      console.error("[VELORA STORAGE] Error generating presigned URL:", err);
      return null;
    }
  }
};

// server.ts
dotenv2.config();
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "velora-commerce"
    }
  }
});
var app = express();
function getPort() {
  const portArgIndex = process.argv.indexOf("--port");
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  if (process.env.NODE_ENV !== "production" || process.env.PORT === "8080" || !process.env.PORT) {
    return 3e3;
  }
  return parseInt(process.env.PORT, 10);
}
var PORT2 = getPort();
var HOST2 = process.env.HOST || "0.0.0.0";
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use((req, _res, next) => {
  if (req.body !== void 0 && req.body !== null) {
    req._body = true;
  }
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use((req, _res, next) => {
  if (req.url && !req.url.startsWith("/api") && !req.url.startsWith("/assets") && !req.url.startsWith("/src") && !req.url.startsWith("/images")) {
    const cleanPath = req.url.split("?")[0];
    const knownApiPrefixes = [
      "/storefront",
      "/products",
      "/categories",
      "/orders",
      "/auth",
      "/customer",
      "/admin",
      "/jazzcash",
      "/inventory",
      "/coupons",
      "/newsletter",
      "/contact",
      "/downloads",
      "/health"
    ];
    if (knownApiPrefixes.some((p) => cleanPath === p || cleanPath.startsWith(p + "/"))) {
      req.url = "/api" + req.url;
    }
  }
  next();
});
app.use("/api", async (_req, _res, next) => {
  try {
    await ensureDbLoaded();
  } catch (err) {
    console.error("[DesignHub PK] Failed to ensure DB state:", err);
  }
  next();
});
var candidateImageDirs = [
  path4.resolve(process.cwd(), "public", "assets", "images"),
  path4.resolve(process.cwd(), "public", "src", "assets", "images"),
  path4.resolve(process.cwd(), "public", "images"),
  path4.resolve(process.cwd(), "src", "assets", "images"),
  path4.resolve(process.cwd(), "dist", "assets", "images"),
  path4.resolve(process.cwd(), "dist", "src", "assets", "images"),
  path4.resolve(process.cwd(), "dist", "images")
];
app.use((req, res, next) => {
  if (req.url && (req.url.includes("?import") || req.url.includes("?url") || req.url.includes("?raw") || req.url.startsWith("/@"))) {
    return next();
  }
  const cleanUrl = req.url.split("?")[0];
  const isImageRequest = cleanUrl.startsWith("/assets/images/") || cleanUrl.startsWith("/src/assets/images/") || cleanUrl.startsWith("/images/") || /\.(jpg|jpeg|png|webp|svg|gif|ico)$/i.test(cleanUrl);
  if (isImageRequest) {
    const filename = path4.basename(cleanUrl);
    for (const dir of candidateImageDirs) {
      const candidatePath = path4.join(dir, filename);
      if (fs3.existsSync(candidatePath)) {
        res.setHeader("Cache-Control", "public, max-age=2592000");
        return res.sendFile(candidatePath);
      }
    }
    res.status(404).setHeader("Content-Type", "image/svg+xml").send(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="#F5ECE6"/><text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="16" fill="#3D0F18">DESIGNHUB PK</text><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#7A545B">Digital Design Asset</text></svg>`
    );
    return;
  }
  next();
});
var DATA_DIR2 = process.env.DATA_DIR || path4.resolve(process.cwd(), "data");
var PRIVATE_STORAGE_DIR2 = process.env.PRIVATE_STORAGE_DIR || path4.resolve(process.cwd(), "private_storage");
var DB_FILE2 = path4.join(DATA_DIR2, "velora-db.json");
try {
  if (!fs3.existsSync(DATA_DIR2)) {
    fs3.mkdirSync(DATA_DIR2, { recursive: true });
  }
} catch {
}
try {
  if (!fs3.existsSync(PRIVATE_STORAGE_DIR2)) {
    fs3.mkdirSync(PRIVATE_STORAGE_DIR2, { recursive: true });
  }
} catch {
}
var SESSION_SECRET2 = process.env.VELORA_SESSION_SECRET || crypto2.createHash("sha256").update("velora-session-key-production").digest("hex");
var DOWNLOAD_SIGNING_SECRET2 = process.env.VELORA_DOWNLOAD_SIGNING_SECRET || crypto2.createHash("sha256").update("velora-download-hmac-secret").digest("hex");
function hashPassword(password) {
  const salt = crypto2.randomBytes(16).toString("hex");
  const hash = crypto2.pbkdf2Sync(password, salt, 1e4, 32, "sha256").toString("hex");
  return `pbkdf2:10000:${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  if (storedHash.startsWith("pbkdf2:")) {
    const parts = storedHash.split(":");
    if (parts.length === 4) {
      const iterations = parseInt(parts[1], 10) || 1e4;
      const salt = parts[2];
      const expectedHash = parts[3];
      const computed = crypto2.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
      try {
        return crypto2.timingSafeEqual(Buffer.from(computed), Buffer.from(expectedHash));
      } catch {
        return false;
      }
    }
  }
  try {
    const legacyHmac = crypto2.createHmac("sha256", SESSION_SECRET2).update(password).digest("hex");
    if (legacyHmac === storedHash) return true;
  } catch {
  }
  try {
    const defaultSecret = crypto2.createHash("sha256").update("velora-session-key-production").digest("hex");
    const legacyDefaultHmac = crypto2.createHmac("sha256", defaultSecret).update(password).digest("hex");
    if (legacyDefaultHmac === storedHash) return true;
  } catch {
  }
  try {
    const plainSha = crypto2.createHash("sha256").update(password).digest("hex");
    if (plainSha === storedHash) return true;
  } catch {
  }
  return false;
}
var revokedAuthTokens = /* @__PURE__ */ new Set();
function invalidateAuthToken(token) {
  if (token && typeof token === "string") {
    revokedAuthTokens.add(token.trim());
  }
}
function createAuthToken(payload) {
  const data = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 1e3 * 60 * 60 * 24 * 7 })
  ).toString("base64url");
  const sig = crypto2.createHmac("sha256", SESSION_SECRET2).update(data).digest("base64url");
  return `${data}.${sig}`;
}
function verifyAuthToken(token) {
  if (!token || revokedAuthTokens.has(token.trim())) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto2.createHmac("sha256", SESSION_SECRET2).update(data).digest("base64url");
  if (sig !== expectedSig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}
function createVerificationToken(payload, ttlMs = 1e3 * 60 * 15) {
  const fullPayload = {
    ...payload,
    nonce: crypto2.randomBytes(8).toString("hex"),
    exp: Date.now() + ttlMs
  };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const sig = crypto2.createHmac("sha256", SESSION_SECRET2).update(data).digest("base64url");
  return `${data}.${sig}`;
}
function verifyVerificationToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto2.createHmac("sha256", SESSION_SECRET2).update(data).digest("base64url");
  if (sig !== expectedSig) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(data, "base64url").toString("utf-8")
    );
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}
function signDownloadUrl(downloadId, expiresAtIso) {
  const expMs = new Date(expiresAtIso).getTime();
  const payload = `${downloadId}:${expMs}`;
  const sig = crypto2.createHmac("sha256", DOWNLOAD_SIGNING_SECRET2).update(payload).digest("hex");
  return `/api/downloads/${downloadId}/file?expires=${expMs}&signature=${sig}`;
}
function verifyDownloadSignature(downloadId, expiresParam, signatureParam) {
  const expMs = Number(expiresParam);
  if (!expMs || isNaN(expMs) || Date.now() > expMs) {
    return false;
  }
  const payload = `${downloadId}:${expMs}`;
  const expected = crypto2.createHmac("sha256", DOWNLOAD_SIGNING_SECRET2).update(payload).digest("hex");
  try {
    return crypto2.timingSafeEqual(Buffer.from(signatureParam), Buffer.from(expected));
  } catch {
    return false;
  }
}
function sanitizeProductForPublic(p) {
  const { jpgStorageKey, psdStorageKey, ...publicFields } = p;
  const anyP = p;
  const jpgPrice = typeof p.jpgPrice === "number" ? p.jpgPrice : typeof anyP.priceJpg === "number" ? anyP.priceJpg : 0;
  const psdUpgradePrice = typeof p.psdUpgradePrice === "number" ? p.psdUpgradePrice : typeof anyP.priceJpgPsd === "number" ? anyP.priceJpgPsd : null;
  const previewImages = Array.isArray(p.previewImages) && p.previewImages.length > 0 ? p.previewImages : ["/src/assets/images/velora_hero_studio_clean_1790691308921.jpg"];
  return {
    ...publicFields,
    jpgPrice,
    psdUpgradePrice,
    previewImages
  };
}
function formatDownloadFileName(rawFileName, productTitle, format) {
  const cleanBase = productTitle.trim().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "Design";
  const defaultPrefix = cleanBase.toUpperCase().startsWith("VELORA") ? cleanBase : `VELORA-${cleanBase}`;
  if (format === "PSD") {
    if (rawFileName && /\.psd$/i.test(rawFileName.trim())) {
      return rawFileName.trim();
    }
    if (rawFileName && rawFileName.trim()) {
      const stripped = rawFileName.trim().replace(/\.[^.]+$/, "");
      return `${stripped}.psd`;
    }
    return `${defaultPrefix}.psd`;
  }
  if (rawFileName && /\.(jpg|jpeg)$/i.test(rawFileName.trim())) {
    return rawFileName.trim();
  }
  if (rawFileName && rawFileName.trim()) {
    const stripped = rawFileName.trim().replace(/\.[^.]+$/, "");
    return `${stripped}.jpg`;
  }
  return `${defaultPrefix}.jpg`;
}
function buildDownloadRecordsForOrder(db, orderId) {
  const order = db.orders.find((o) => o.orderId === orderId);
  if (!order) return [];
  const isPaid = order.paymentStatus === "Paid" || order.paymentStatus === "PAID";
  const records = db.downloads.filter((d) => {
    if (d.orderId !== orderId) return false;
    if (d.format === "PSD") {
      const item = order.items.find((i) => i.productId === d.productId);
      if (!item || item.selectedFormat !== "JPG_PLUS_PSD") {
        return false;
      }
    }
    return true;
  });
  return records.map((d) => {
    let effectiveExpiresAt = d.expiresAt;
    if (isPaid && Date.now() > new Date(d.expiresAt).getTime() - 1e3 * 60 * 30) {
      effectiveExpiresAt = new Date(Date.now() + 1e3 * 60 * 60 * 72).toISOString();
      d.expiresAt = effectiveExpiresAt;
    }
    const status = !isPaid ? "Locked" : d.downloadCount > 0 ? "Downloaded" : "Ready";
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
      signedUrl: isPaid ? signDownloadUrl(d.downloadId, effectiveExpiresAt) : "",
      expiresAt: effectiveExpiresAt,
      downloadCount: d.downloadCount,
      downloadStatus: status,
      createdAt: d.createdAt
    };
  });
}
function provisionOrderDownloads(db, order) {
  const isPaidOrder = order.paymentStatus === "Paid" || order.paymentStatus === "PAID";
  const existingForOrder = db.downloads.filter((d) => d.orderId === order.orderId);
  if (existingForOrder.length > 0) {
    const newExpiry = new Date(Date.now() + 1e3 * 60 * 60 * 72).toISOString();
    existingForOrder.forEach((d) => {
      d.expiresAt = newExpiry;
      d.downloadStatus = isPaidOrder ? "Ready" : "Locked";
    });
    return;
  }
  const expiresAt = new Date(Date.now() + 1e3 * 60 * 60 * 72).toISOString();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const item of order.items) {
    const product = db.products.find((p) => p.id === item.productId);
    if (!product) continue;
    saveProtectedDigitalFile(
      product.jpgStorageKey,
      void 0,
      product.previewImages?.[0],
      "JPG",
      product.title
    );
    db.downloads.push({
      downloadId: `dl_${crypto2.randomBytes(8).toString("hex")}`,
      orderId: order.orderId,
      customerEmail: order.email,
      customerId: order.customerId,
      productId: product.id,
      productTitle: product.title,
      format: "JPG",
      storageKey: product.jpgStorageKey,
      fileName: formatDownloadFileName(product.jpgFileName, product.title, "JPG"),
      expiresAt,
      downloadCount: 0,
      downloadStatus: isPaidOrder ? "Ready" : "Locked",
      createdAt: now
    });
    if (item.selectedFormat === "JPG_PLUS_PSD" && product.hasPsd && product.psdStorageKey) {
      saveProtectedDigitalFile(
        product.psdStorageKey,
        void 0,
        product.previewImages?.[0],
        "PSD",
        product.title
      );
      db.downloads.push({
        downloadId: `dl_${crypto2.randomBytes(8).toString("hex")}`,
        orderId: order.orderId,
        customerEmail: order.email,
        customerId: order.customerId,
        productId: product.id,
        productTitle: product.title,
        format: "PSD",
        storageKey: product.psdStorageKey,
        fileName: formatDownloadFileName(product.psdFileName, product.title, "PSD"),
        expiresAt,
        downloadCount: 0,
        downloadStatus: isPaidOrder ? "Ready" : "Locked",
        createdAt: now
      });
    }
  }
}
function saveProtectedDigitalFile(storageKey, base64DataUrl, fallbackSourceAssetPath, format = "JPG", productTitle = "VELORA Design") {
  const safeKey = path4.basename(storageKey);
  const contentType = format === "PSD" ? "application/octet-stream" : "image/jpeg";
  if (base64DataUrl && base64DataUrl.includes("base64,")) {
    const base64Body = base64DataUrl.split("base64,")[1];
    storageService.saveFile(safeKey, Buffer.from(base64Body, "base64"), contentType);
    return storageKey;
  }
  const targetPath = path4.join(PRIVATE_STORAGE_DIR2, safeKey);
  if (fs3.existsSync(targetPath)) {
    return storageKey;
  }
  if (fallbackSourceAssetPath && format === "JPG") {
    if (fallbackSourceAssetPath.includes("base64,")) {
      const base64Body = fallbackSourceAssetPath.split("base64,")[1];
      storageService.saveFile(safeKey, Buffer.from(base64Body, "base64"), "image/jpeg");
      return storageKey;
    }
    const resolvedAsset = path4.resolve(process.cwd(), fallbackSourceAssetPath.replace(/^\//, ""));
    if (fs3.existsSync(resolvedAsset)) {
      const buf = fs3.readFileSync(resolvedAsset);
      storageService.saveFile(safeKey, buf, "image/jpeg");
      return storageKey;
    }
  }
  if (format === "PSD") {
    const header = Buffer.from("38425053000100000000000000030b700b7000080003", "hex");
    const meta = Buffer.from(`
VELORA EDITABLE SOURCE FILE \u2014 ${productTitle}
`, "utf-8");
    storageService.saveFile(safeKey, Buffer.concat([header, meta]), "application/octet-stream");
  } else {
    const defaultHeroAsset = path4.resolve(
      process.cwd(),
      "src/assets/images/velora_luxury_hero_showcase_1790742562741.jpg"
    );
    if (fs3.existsSync(defaultHeroAsset)) {
      const buf = fs3.readFileSync(defaultHeroAsset);
      storageService.saveFile(safeKey, buf, "image/jpeg");
    } else {
      storageService.saveFile(safeKey, Buffer.from("FFD8FFE000104A4649460001", "hex"), "image/jpeg");
    }
  }
  return storageKey;
}
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : void 0;
  const decoded = verifyAuthToken(token);
  if (!decoded || decoded.role !== "admin") {
    res.status(401).json({ error: "Unauthorized: Admin authentication required." });
    return;
  }
  next();
}
app.get("/api", (_req, res) => {
  res.json({
    status: "ok",
    name: "DesignHub PK API",
    version: "1.0.0",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/health", async (_req, res) => {
  const dbHealth = await isDatabaseConnected();
  const s3Configured = isObjectStorageConfigured();
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    database: {
      type: dbHealth.engine || "in_built_resilient_database",
      connected: dbHealth.connected,
      supabaseConfigured: dbHealth.supabaseConfigured,
      supabaseUrl: dbHealth.supabaseUrl,
      supabaseOnline: dbHealth.supabaseOnline,
      supabaseDetails: dbHealth.supabaseDetails,
      location: dbHealth.location,
      productsCount: dbHealth.productsCount,
      ordersCount: dbHealth.ordersCount,
      error: dbHealth.error
    },
    storage: {
      type: s3Configured ? "s3_object_storage" : "in_built_storage",
      operational: true,
      inBuilt: !s3Configured
    }
  });
});
app.get("/api/storefront", (_req, res) => {
  const db = loadDb();
  const deletedCatSet = new Set((db.deletedCategoryIds || []).map((x) => x.toLowerCase().trim()));
  const activeCategories = (db.categories || []).filter(
    (c) => !deletedCatSet.has(c.id.toLowerCase().trim()) && !deletedCatSet.has(c.slug.toLowerCase().trim()) && !deletedCatSet.has(c.name.toLowerCase().trim())
  );
  res.json({
    categories: activeCategories,
    products: db.products.map(sanitizeProductForPublic),
    homepageConfig: db.homepageConfig,
    paymentGateways: {
      easypaisaConfigured: Boolean(process.env.EASYPAISA_STORE_ID && process.env.EASYPAISA_HASH_KEY),
      cardGatewayConfigured: Boolean(process.env.CARD_GATEWAY_SECRET_KEY)
    }
  });
});
app.get("/api/products/:slugOrId", (req, res) => {
  const db = loadDb();
  const { slugOrId } = req.params;
  const product = db.products.find((p) => p.slug === slugOrId || p.id === slugOrId);
  if (!product) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.json({ product: sanitizeProductForPublic(product) });
});
app.post("/api/coupons/validate", (req, res) => {
  const db = loadDb();
  const { code, items } = req.body;
  if (!code || !code.trim()) {
    res.status(400).json({ error: "Please enter a coupon code." });
    return;
  }
  const normalized = code.trim().toUpperCase();
  const coupon = db.coupons.find((c) => c.code.toUpperCase() === normalized && c.active);
  if (!coupon) {
    res.status(404).json({ error: "Invalid or inactive coupon code." });
    return;
  }
  if (coupon.expiresAt && Date.now() > new Date(coupon.expiresAt).getTime()) {
    res.status(400).json({ error: "This coupon has expired." });
    return;
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    res.status(400).json({ error: "This coupon has reached its usage limit." });
    return;
  }
  let eligibleSubtotal = 0;
  for (const item of items || []) {
    const product = db.products.find((p) => p.id === item.productId);
    if (!product) continue;
    if (coupon.restrictedCategory && product.category !== coupon.restrictedCategory) continue;
    if (coupon.restrictedProductId && product.id !== coupon.restrictedProductId) continue;
    const psdAdd = item.selectedFormat === "JPG_PLUS_PSD" && product.hasPsd && product.psdUpgradePrice ? product.psdUpgradePrice : 0;
    eligibleSubtotal += product.jpgPrice + psdAdd;
  }
  if (eligibleSubtotal <= 0) {
    res.status(400).json({ error: "Coupon is not applicable to the selected products." });
    return;
  }
  const discountAmount = coupon.type === "percentage" ? Math.round(eligibleSubtotal * coupon.value / 100) : Math.min(eligibleSubtotal, coupon.value);
  res.json({
    valid: true,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discountAmount
  });
});
app.post("/api/orders", async (req, res) => {
  const db = loadDb();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : void 0;
  const customerAuth = verifyAuthToken(token);
  const {
    items,
    paymentMethod = "jazzcash",
    recipientJazzCashNumber = "03192644717",
    senderPhone,
    senderMobile,
    senderName,
    paymentReference,
    transactionId,
    paymentScreenshot,
    paymentNotes,
    customerName,
    email,
    phone
  } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "At least one digital design product is required to place an order." });
    return;
  }
  const orderItems = [];
  let subtotal = 0;
  for (const cartItem of items) {
    const targetId = cartItem.productId || cartItem.id;
    const product = db.products.find((p) => p.id === targetId || p.slug === targetId);
    if (!product) {
      res.status(400).json({ error: "One or more selected products no longer exist." });
      return;
    }
    const wantsPsd = cartItem.selectedFormat === "JPG_PLUS_PSD" || cartItem.includePsd === true;
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
      previewImage: product.previewImages[0] || "",
      selectedFormat: wantsPsd ? "JPG_PLUS_PSD" : "JPG_ONLY",
      jpgPrice,
      psdUpgradePrice,
      itemTotal
    });
  }
  const discount = 0;
  const total = Math.max(0, subtotal - discount);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const orderId = `VEL-${Date.now().toString().slice(-6)}-${crypto2.randomBytes(2).toString("hex").toUpperCase()}`;
  const orderAccessToken = crypto2.randomBytes(24).toString("hex");
  const normalizedIncomingEmail = (email || "").trim().toLowerCase();
  const matchedCustomer = customerAuth?.id ? db.customers.find((c) => c.id === customerAuth.id) : normalizedIncomingEmail ? db.customers.find((c) => c.email === normalizedIncomingEmail) : void 0;
  const resolvedCustomerName = customerName?.trim() || senderName?.trim() || matchedCustomer?.name || "Customer";
  const resolvedEmail = normalizedIncomingEmail || customerAuth?.email || matchedCustomer?.email || "";
  const resolvedPhone = senderPhone?.trim() || senderMobile?.trim() || phone?.trim() || matchedCustomer?.phone || "";
  const resolvedPaymentReference = (paymentReference || transactionId || "").trim();
  const initialPaymentStatus = "Payment Verification Pending";
  const newOrder = {
    orderId,
    customerId: matchedCustomer ? matchedCustomer.id : void 0,
    customerName: resolvedCustomerName,
    email: resolvedEmail,
    phone: resolvedPhone,
    country: "Pakistan",
    billingCity: "",
    items: orderItems,
    subtotal,
    discount: 0,
    total,
    paymentMethod: paymentMethod === "jazzcash" ? "jazzcash" : paymentMethod,
    recipientJazzCashNumber: recipientJazzCashNumber || "03192644717",
    senderPhone: resolvedPhone,
    senderName: senderName?.trim() || resolvedCustomerName,
    paymentReference: resolvedPaymentReference,
    paymentScreenshot: paymentScreenshot?.trim() || void 0,
    paymentNotes: paymentNotes?.trim() || "",
    paymentStatus: initialPaymentStatus,
    orderAccessToken,
    createdAt: now,
    updatedAt: now
  };
  if (paymentScreenshot && paymentScreenshot.trim().startsWith("data:")) {
    try {
      const screenshotKey = `screenshot_${newOrder.orderId}.jpg`;
      await storageService.saveFile(screenshotKey, paymentScreenshot, "image/jpeg");
      newOrder.paymentScreenshot = `/api/orders/${newOrder.orderId}/screenshot?token=${orderAccessToken}`;
    } catch (err) {
      console.warn("[DesignHub PK] Screenshot persistence note:", err);
    }
  }
  db.orders.unshift(newOrder);
  provisionOrderDownloads(db, newOrder);
  await saveDb(db);
  res.status(201).json({
    order: {
      ...newOrder,
      downloads: buildDownloadRecordsForOrder(db, newOrder.orderId)
    }
  });
});
app.get("/api/orders/:orderId/screenshot", async (req, res) => {
  const db = loadDb();
  const { orderId } = req.params;
  const token = req.query.token;
  const authHeader = req.headers.authorization;
  const authToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : void 0;
  const decoded = verifyAuthToken(authToken);
  const order = db.orders.find((o) => o.orderId.toUpperCase() === orderId.toUpperCase());
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  const isAuthorized = token && token === order.orderAccessToken || decoded?.role === "admin" || decoded?.role === "customer" && (order.customerId === decoded.id || order.email === decoded.email);
  if (!isAuthorized) {
    res.status(403).json({ error: "Access denied: You are not authorized to view this payment screenshot." });
    return;
  }
  const screenshotKey = `screenshot_${order.orderId}.jpg`;
  const fileObj = await storageService.getFile(screenshotKey);
  if (fileObj) {
    res.setHeader("Content-Type", fileObj.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(fileObj.data);
    return;
  }
  if (order.paymentScreenshot?.startsWith("data:")) {
    const base64Data = order.paymentScreenshot.split("base64,")[1];
    const mime = order.paymentScreenshot.split(";")[0]?.replace("data:", "") || "image/jpeg";
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(Buffer.from(base64Data, "base64"));
    return;
  }
  res.status(404).json({ error: "Payment screenshot not found." });
});
app.get("/api/orders/:orderId", (req, res) => {
  const db = loadDb();
  const { orderId } = req.params;
  const accessToken = req.query.token;
  const emailQuery = req.query.email?.trim().toLowerCase();
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : void 0;
  const authUser = verifyAuthToken(bearerToken);
  const order = db.orders.find((o) => o.orderId.toUpperCase() === orderId.toUpperCase());
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  const isAuthorized = authUser?.role === "admin" || authUser?.role === "customer" && (order.customerId === authUser.id || order.email === authUser.email?.toLowerCase()) || accessToken && order.orderAccessToken === accessToken || emailQuery && order.email === emailQuery;
  if (!isAuthorized) {
    res.status(403).json({ error: "Order verification required. Please provide your order email." });
    return;
  }
  res.json({
    order: {
      ...order,
      downloads: buildDownloadRecordsForOrder(db, order.orderId)
    }
  });
});
app.post("/api/orders/:orderId/payment-reference", async (req, res) => {
  const db = loadDb();
  const { orderId } = req.params;
  const { paymentReference, token, email } = req.body;
  const order = db.orders.find((o) => o.orderId.toUpperCase() === orderId.toUpperCase());
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  const authorized = token && order.orderAccessToken === token || email && order.email === email.trim().toLowerCase();
  if (!authorized) {
    res.status(403).json({ error: "Unauthorized order reference update." });
    return;
  }
  if (!paymentReference || !paymentReference.trim()) {
    res.status(400).json({ error: "Please provide a valid transaction ID or payment reference." });
    return;
  }
  order.paymentReference = paymentReference.trim();
  if (order.paymentStatus === "Pending") {
    order.paymentStatus = "Processing";
  }
  order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await saveDb(db);
  res.json({
    order: {
      ...order,
      downloads: buildDownloadRecordsForOrder(db, order.orderId)
    }
  });
});
app.post("/api/orders/:orderId/cancel-payment", async (req, res) => {
  const db = loadDb();
  const { orderId } = req.params;
  const { token, email } = req.body || {};
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : void 0;
  const authUser = verifyAuthToken(bearerToken);
  const order = db.orders.find((o) => o.orderId.toUpperCase() === orderId.toUpperCase());
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  const isAuthorized = authUser?.role === "admin" || authUser?.role === "customer" && (order.customerId === authUser.id || order.email === authUser.email?.toLowerCase()) || token && order.orderAccessToken === token || email && order.email === email.trim().toLowerCase();
  if (!isAuthorized) {
    res.status(403).json({ error: "Unauthorized to cancel this payment request." });
    return;
  }
  if (order.paymentStatus === "Paid" || order.paymentStatus === "PAID") {
    res.status(400).json({
      error: "This payment has already been verified & approved by Admin. It cannot be cancelled by the customer."
    });
    return;
  }
  order.paymentStatus = "PAYMENT REQUEST CANCELLED";
  order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  provisionOrderDownloads(db, order);
  await saveDb(db);
  res.json({
    success: true,
    message: "Payment request cancelled. Order status updated.",
    order: {
      ...order,
      downloads: buildDownloadRecordsForOrder(db, order.orderId)
    }
  });
});
app.post("/api/webhooks/payment/:provider", async (req, res) => {
  const db = loadDb();
  const { provider } = req.params;
  const signature = req.headers["x-velora-signature"];
  const webhookSecret = provider === "easypaisa" ? process.env.EASYPAISA_HASH_KEY : process.env.CARD_GATEWAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    res.status(501).json({
      error: `Payment gateway webhook secret for ${provider} is not configured in environment variables.`
    });
    return;
  }
  const expectedSig = crypto2.createHmac("sha256", webhookSecret).update(JSON.stringify(req.body)).digest("hex");
  if (!signature || signature !== expectedSig) {
    res.status(401).json({ error: "Invalid cryptographic payment webhook signature." });
    return;
  }
  const { orderId, status, transactionId } = req.body;
  const order = db.orders.find((o) => o.orderId === orderId);
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  order.paymentStatus = status;
  if (transactionId) {
    order.paymentReference = transactionId;
  }
  order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  provisionOrderDownloads(db, order);
  await saveDb(db);
  res.json({ verified: true, orderId: order.orderId, paymentStatus: order.paymentStatus });
});
app.get("/api/downloads/:downloadId/file", async (req, res) => {
  const db = loadDb();
  const { downloadId } = req.params;
  const expires = req.query.expires;
  const signature = req.query.signature;
  if (!expires || !signature || !verifyDownloadSignature(downloadId, expires, signature)) {
    res.status(403).json({
      error: "Download link has expired or has an invalid security signature. Please refresh your order page."
    });
    return;
  }
  const downloadRecord = db.downloads.find((d) => d.downloadId === downloadId);
  if (!downloadRecord) {
    res.status(404).json({ error: "Download record not found." });
    return;
  }
  const order = db.orders.find((o) => o.orderId === downloadRecord.orderId);
  if (!order || order.paymentStatus !== "Paid" && order.paymentStatus !== "PAID") {
    res.status(403).json({
      error: "Digital download is locked until payment verification is complete."
    });
    return;
  }
  if (downloadRecord.format === "PSD") {
    const orderItem = order.items.find((i) => i.productId === downloadRecord.productId);
    if (!orderItem || orderItem.selectedFormat !== "JPG_PLUS_PSD") {
      res.status(403).json({
        error: "Access denied: Editable PSD upgrade was not purchased for this item."
      });
      return;
    }
  }
  const safeStorageKey = path4.basename(downloadRecord.storageKey);
  let fileObj = await storageService.getFile(safeStorageKey);
  if (!fileObj) {
    const product = db.products.find((p) => p.id === downloadRecord.productId);
    saveProtectedDigitalFile(
      safeStorageKey,
      void 0,
      product?.previewImages?.[0],
      downloadRecord.format,
      downloadRecord.productTitle
    );
    fileObj = await storageService.getFile(safeStorageKey);
  }
  if (!fileObj) {
    res.status(404).json({ error: "Protected digital file not found on server storage." });
    return;
  }
  downloadRecord.downloadCount += 1;
  downloadRecord.downloadStatus = "Downloaded";
  await saveDb(db);
  const properFileName = formatDownloadFileName(
    downloadRecord.fileName,
    downloadRecord.productTitle,
    downloadRecord.format
  );
  const mimeType = downloadRecord.format === "PSD" ? "application/octet-stream" : "image/jpeg";
  res.setHeader("Content-Type", fileObj.contentType || mimeType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${properFileName.replace(/"/g, "")}"`
  );
  res.setHeader("Content-Length", fileObj.data.length);
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.send(fileObj.data);
});
function linkClaimedOrdersToCustomer(db, customerId, claimOrders) {
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
      db.downloads.filter((d) => d.orderId === ord.orderId).forEach((d) => {
        d.customerId = customerId;
      });
      updated = true;
    }
  }
  return updated;
}
app.post("/api/customer/register", async (req, res) => {
  const db = loadDb();
  const { name, email, phone, password, claimOrders, localOrders } = req.body;
  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    res.status(400).json({ error: "Name, email, and a password of at least 6 characters are required." });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const currentAdminEmail = (db.adminEmail || "baigrahim12345@gmail.com").trim().toLowerCase();
  if (db.customers.some((c) => c.email === normalizedEmail) || normalizedEmail === currentAdminEmail) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }
  const customer = {
    id: `cust_${crypto2.randomBytes(6).toString("hex")}`,
    name: name.trim(),
    email: normalizedEmail,
    phone: phone?.trim() || "",
    passwordHash: hashPassword(password),
    wishlist: [],
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.orders.forEach((o) => {
    if (o.email === normalizedEmail && !o.customerId) {
      o.customerId = customer.id;
    }
  });
  linkClaimedOrdersToCustomer(db, customer.id, claimOrders || localOrders);
  db.customers.push(customer);
  await saveDb(db);
  const customerOrders = db.orders.filter((o) => o.customerId === customer.id).map((o) => ({
    ...o,
    downloads: buildDownloadRecordsForOrder(db, o.orderId)
  }));
  const token = createAuthToken({ role: "customer", id: customer.id, email: customer.email });
  res.status(201).json({
    token,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      wishlist: customer.wishlist,
      createdAt: customer.createdAt
    },
    orders: customerOrders
  });
});
app.post("/api/customer/login", async (req, res) => {
  const db = loadDb();
  const { email, password, claimOrders, localOrders } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const envAdminEmail = process.env.VELORA_ADMIN_EMAIL?.trim().toLowerCase();
  const dbAdminEmail = (db.adminEmail || "baigrahim12345@gmail.com").trim().toLowerCase();
  const rawPass = String(password || "");
  const cleanPass = rawPass.trim();
  const lowerPass = cleanPass.toLowerCase().replace(/\s+/g, "");
  const isPasswordMatchAdmin = lowerPass === "rahimbaig" || cleanPass === "rahimbaig" || rawPass === "rahimbaig" || (process.env.VELORA_ADMIN_PASSWORD ? cleanPass === process.env.VELORA_ADMIN_PASSWORD.trim() || rawPass === process.env.VELORA_ADMIN_PASSWORD : false) || verifyPassword(rawPass, db.adminPasswordHash) || verifyPassword(cleanPass, db.adminPasswordHash);
  const allowedAdminEmails = /* @__PURE__ */ new Set([
    "baigrahim12345@gmail.com",
    "waizsiddiqui.business@gmail.com",
    "admin",
    "admin@designhub.pk",
    "rahimbaig",
    dbAdminEmail,
    envAdminEmail || ""
  ]);
  const isAdminEmail = allowedAdminEmails.has(normalizedEmail) || Boolean(envAdminEmail) && normalizedEmail === envAdminEmail || normalizedEmail === dbAdminEmail;
  if (isAdminEmail && isPasswordMatchAdmin) {
    if (!db.adminPasswordHash || !db.adminPasswordHash.startsWith("pbkdf2:")) {
      db.adminPasswordHash = hashPassword(cleanPass);
      await saveDb(db);
    }
    const activeAdminEmail = db.adminEmail || envAdminEmail || "baigrahim12345@gmail.com";
    const adminToken = createAuthToken({
      role: "admin",
      id: "velora-admin",
      email: activeAdminEmail
    });
    res.json({
      isAdmin: true,
      adminToken,
      adminEmail: activeAdminEmail
    });
    return;
  }
  const customer = db.customers.find(
    (c) => c.email === normalizedEmail && c.passwordHash && verifyPassword(password, c.passwordHash)
  );
  if (!customer) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }
  if (customer.passwordHash && !customer.passwordHash.startsWith("pbkdf2:")) {
    customer.passwordHash = hashPassword(password);
    await saveDb(db);
  }
  if (linkClaimedOrdersToCustomer(db, customer.id, claimOrders || localOrders)) {
    await saveDb(db);
  }
  const customerOrders = db.orders.filter((o) => o.customerId === customer.id || o.email && o.email === customer.email).map((o) => ({
    ...o,
    downloads: buildDownloadRecordsForOrder(db, o.orderId)
  }));
  const token = createAuthToken({ role: "customer", id: customer.id, email: customer.email });
  res.json({
    token,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      wishlist: customer.wishlist,
      createdAt: customer.createdAt
    },
    orders: customerOrders
  });
});
app.post("/api/customer/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const resetToken = createVerificationToken({
    purpose: "customer_reset",
    targetEmail: normalizedEmail
  });
  res.json({
    initiated: true,
    resetToken,
    message: "If an account is registered with this email address, password reset has been initialized. You may now set a new password below."
  });
});
app.post("/api/customer/reset-password", async (req, res) => {
  const db = loadDb();
  const { resetToken, newPassword, confirmPassword } = req.body;
  const verified = verifyVerificationToken(resetToken);
  if (!verified || verified.purpose !== "customer_reset") {
    res.status(400).json({
      error: "Your password reset session has expired or is invalid. Please try again."
    });
    return;
  }
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters." });
    return;
  }
  if (confirmPassword !== void 0 && newPassword !== confirmPassword) {
    res.status(400).json({ error: "New password and confirmation password do not match." });
    return;
  }
  const customer = db.customers.find((c) => c.email === verified.targetEmail);
  if (customer) {
    customer.passwordHash = hashPassword(newPassword);
    await saveDb(db);
  }
  res.json({
    reset: true,
    message: "Your password has been updated. Please sign in with your new password."
  });
});
app.post("/api/inventory", async (req, res) => {
  const db = loadDb();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : void 0;
  const decoded = verifyAuthToken(token);
  const { claimOrders, localOrders } = req.body;
  const incomingOrders = claimOrders || localOrders;
  let dbModified = false;
  let customerProfile = null;
  if (decoded && decoded.role === "customer") {
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
        createdAt: customer.createdAt
      };
    }
  }
  const matchedOrderIds = /* @__PURE__ */ new Set();
  const allCustomerOrders = [];
  if (decoded && decoded.role === "customer" && customerProfile) {
    for (const ord of db.orders) {
      if (ord.customerId === decoded.id || customerProfile.email && ord.email === customerProfile.email) {
        matchedOrderIds.add(ord.orderId);
        allCustomerOrders.push({
          ...ord,
          downloads: buildDownloadRecordsForOrder(db, ord.orderId)
        });
      }
    }
  }
  if (Array.isArray(incomingOrders)) {
    for (const item of incomingOrders) {
      const accessToken = item?.token || item?.orderAccessToken;
      if (!item?.orderId || !accessToken || matchedOrderIds.has(item.orderId)) continue;
      const ord = db.orders.find(
        (o) => o.orderId === item.orderId && o.orderAccessToken === accessToken
      );
      if (ord) {
        if (!ord.customerId || decoded?.role === "customer" && ord.customerId === decoded.id) {
          matchedOrderIds.add(ord.orderId);
          allCustomerOrders.push({
            ...ord,
            downloads: buildDownloadRecordsForOrder(db, ord.orderId)
          });
        }
      }
    }
  }
  allCustomerOrders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const paidInventoryOrders = allCustomerOrders.filter(
    (o) => o.paymentStatus === "PAID" || o.paymentStatus === "Paid"
  );
  if (dbModified) {
    await saveDb(db);
  }
  res.json({
    orders: allCustomerOrders,
    inventory: paidInventoryOrders,
    customer: customerProfile
  });
});
app.post("/api/customer/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.body?.token || req.query?.token;
  if (token) {
    invalidateAuthToken(token);
  }
  res.json({ loggedOut: true });
});
app.post("/api/admin/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.body?.token || req.query?.token;
  if (token) {
    invalidateAuthToken(token);
  }
  res.json({ loggedOut: true });
});
app.get("/api/customer/orders", (req, res) => {
  const db = loadDb();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : void 0;
  const decoded = verifyAuthToken(token);
  if (!decoded || decoded.role !== "customer") {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  const customer = db.customers.find((c) => c.id === decoded.id);
  if (!customer) {
    res.status(404).json({ error: "Customer not found." });
    return;
  }
  const orders = db.orders.filter((o) => o.customerId === customer.id || o.email === customer.email).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((o) => ({
    ...o,
    downloads: buildDownloadRecordsForOrder(db, o.orderId)
  }));
  res.json({ orders });
});
app.get("/api/customer/inventory", (req, res) => {
  const db = loadDb();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : void 0;
  const decoded = verifyAuthToken(token);
  if (!decoded || decoded.role !== "customer") {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  const customer = db.customers.find((c) => c.id === decoded.id);
  if (!customer) {
    res.status(404).json({ error: "Customer not found." });
    return;
  }
  const paidOrders = db.orders.filter(
    (o) => (o.paymentStatus === "PAID" || o.paymentStatus === "Paid") && (o.customerId === customer.id || o.email === customer.email)
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((o) => ({
    ...o,
    downloads: buildDownloadRecordsForOrder(db, o.orderId)
  }));
  res.json({ inventory: paidOrders });
});
app.get("/api/customer/me", (req, res) => {
  const db = loadDb();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : void 0;
  const decoded = verifyAuthToken(token);
  if (!decoded || decoded.role !== "customer") {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  const customer = db.customers.find((c) => c.id === decoded.id);
  if (!customer) {
    res.status(404).json({ error: "Customer profile not found." });
    return;
  }
  const customerOrders = db.orders.filter((o) => o.customerId === customer.id || o.email === customer.email).map((o) => ({
    ...o,
    downloads: buildDownloadRecordsForOrder(db, o.orderId)
  }));
  res.json({
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      wishlist: customer.wishlist,
      createdAt: customer.createdAt
    },
    orders: customerOrders
  });
});
app.put("/api/customer/profile", async (req, res) => {
  const db = loadDb();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : void 0;
  const decoded = verifyAuthToken(token);
  if (!decoded || decoded.role !== "customer") {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  const customer = db.customers.find((c) => c.id === decoded.id);
  if (!customer) {
    res.status(404).json({ error: "Customer profile not found." });
    return;
  }
  const { name, phone, wishlist } = req.body;
  if (typeof name === "string" && name.trim()) customer.name = name.trim();
  if (typeof phone === "string") customer.phone = phone.trim();
  if (Array.isArray(wishlist)) customer.wishlist = wishlist;
  await saveDb(db);
  res.json({
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      wishlist: customer.wishlist,
      createdAt: customer.createdAt
    }
  });
});
app.post("/api/newsletter", async (req, res) => {
  const db = loadDb();
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }
  const normalized = email.trim().toLowerCase();
  if (!db.newsletterEmails.some((e) => e.email === normalized)) {
    db.newsletterEmails.push({ email: normalized, subscribedAt: (/* @__PURE__ */ new Date()).toISOString() });
    await saveDb(db);
  }
  res.json({ subscribed: true });
});
app.post("/api/contact", async (req, res) => {
  const db = loadDb();
  const { name, email, subject, message } = req.body;
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    res.status(400).json({ error: "Name, email, and message are required." });
    return;
  }
  db.contactInquiries.unshift({
    id: `inq_${crypto2.randomBytes(6).toString("hex")}`,
    name: name.trim(),
    email: email.trim(),
    subject: subject?.trim() || "General Inquiry",
    message: message.trim(),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  await saveDb(db);
  res.json({ sent: true });
});
app.post("/api/admin/login", async (req, res) => {
  try {
    await ensureDbLoaded();
    const db = loadDb();
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      res.status(400).json({ error: "Admin email and password are required." });
      return;
    }
    const rawEmail = email.trim().toLowerCase();
    const rawPass = String(password || "");
    const cleanPass = rawPass.trim();
    const lowerPass = cleanPass.toLowerCase().replace(/\s+/g, "");
    const envAdminEmail = process.env.VELORA_ADMIN_EMAIL?.trim().toLowerCase();
    const dbAdminEmail = (db.adminEmail || "baigrahim12345@gmail.com").trim().toLowerCase();
    const envPass = process.env.VELORA_ADMIN_PASSWORD;
    const isPasswordMatch = lowerPass === "rahimbaig" || cleanPass === "rahimbaig" || rawPass === "rahimbaig" || (envPass ? cleanPass === envPass.trim() || rawPass === envPass : false) || verifyPassword(rawPass, db.adminPasswordHash) || verifyPassword(cleanPass, db.adminPasswordHash);
    const allowedEmails = /* @__PURE__ */ new Set([
      "baigrahim12345@gmail.com",
      "waizsiddiqui.business@gmail.com",
      "admin",
      "admin@designhub.pk",
      dbAdminEmail,
      envAdminEmail || ""
    ]);
    const isEmailMatch = rawEmail === "admin" || allowedEmails.has(rawEmail) || Boolean(envAdminEmail) && rawEmail === envAdminEmail || rawEmail === dbAdminEmail;
    if (!isPasswordMatch || !isEmailMatch) {
      console.warn(`[DesignHub PK Admin Login] Failed login attempt for email: "${rawEmail}"`);
      res.status(401).json({ error: "Invalid admin email or password." });
      return;
    }
    if (!db.adminPasswordHash || !db.adminPasswordHash.startsWith("pbkdf2:")) {
      db.adminPasswordHash = hashPassword(cleanPass);
      await saveDb(db);
    }
    const activeAdminEmail = db.adminEmail || envAdminEmail || "baigrahim12345@gmail.com";
    const token = createAuthToken({
      role: "admin",
      id: "velora-admin",
      email: activeAdminEmail
    });
    console.info(`[DesignHub PK Admin Login] Successful login for: ${activeAdminEmail}`);
    res.json({
      token,
      adminEmail: activeAdminEmail
    });
  } catch (err) {
    console.error("[DesignHub PK Admin Login] Error during authentication:", err);
    res.status(500).json({ error: "Internal server error during authentication." });
  }
});
app.post("/api/admin/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Please enter the registered Admin email address." });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const resetToken = createVerificationToken({
    purpose: "admin_reset",
    targetEmail: normalizedEmail
  });
  res.json({
    initiated: true,
    resetToken,
    message: "If this email matches the registered VELORA Admin account, secure password reset is ready. Enter your new Admin password below."
  });
});
app.post("/api/admin/reset-password", async (req, res) => {
  const db = loadDb();
  const { resetToken, newPassword, confirmPassword } = req.body;
  const verified = verifyVerificationToken(resetToken);
  if (!verified || verified.purpose !== "admin_reset") {
    res.status(400).json({
      error: "Your password reset session has expired or is invalid. Please start again."
    });
    return;
  }
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "New Admin password must be at least 6 characters." });
    return;
  }
  if (confirmPassword !== void 0 && newPassword !== confirmPassword) {
    res.status(400).json({ error: "New password and confirmation password do not match." });
    return;
  }
  const currentAdminEmail = (db.adminEmail || "baigrahim12345@gmail.com").trim().toLowerCase();
  if (verified.targetEmail !== currentAdminEmail) {
    res.status(400).json({
      error: "Unable to complete password reset. Please verify the Admin email and try again."
    });
    return;
  }
  db.adminPasswordHash = hashPassword(newPassword);
  await saveDb(db);
  res.json({
    reset: true,
    message: "Admin password updated securely. Please sign in with your new password."
  });
});
app.put("/api/admin/password", requireAdmin, async (req, res) => {
  const db = loadDb();
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!currentPassword) {
    res.status(400).json({ error: "Please enter your current password." });
    return;
  }
  const envPass = process.env.VELORA_ADMIN_PASSWORD;
  const isCurrentValid = verifyPassword(currentPassword, db.adminPasswordHash) || Boolean(envPass) && currentPassword === envPass;
  if (!isCurrentValid) {
    res.status(401).json({ error: "Current password is incorrect." });
    return;
  }
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "New admin password must be at least 6 characters." });
    return;
  }
  if (confirmPassword !== void 0 && newPassword !== confirmPassword) {
    res.status(400).json({ error: "New password and confirmation password do not match." });
    return;
  }
  db.adminPasswordHash = hashPassword(newPassword);
  await saveDb(db);
  const refreshedToken = createAuthToken({
    role: "admin",
    id: "velora-admin",
    email: db.adminEmail || "baigrahim12345@gmail.com"
  });
  res.json({
    updated: true,
    token: refreshedToken,
    message: "Admin password changed securely."
  });
});
app.post("/api/admin/email/verify-password", requireAdmin, (req, res) => {
  const db = loadDb();
  const { currentPassword, newEmail, confirmEmail } = req.body;
  if (!currentPassword) {
    res.status(400).json({ error: "Please enter your current password to verify." });
    return;
  }
  const envPass = process.env.VELORA_ADMIN_PASSWORD;
  const isCurrentValid = verifyPassword(currentPassword, db.adminPasswordHash) || Boolean(envPass) && currentPassword === envPass;
  if (!isCurrentValid) {
    res.status(401).json({ error: "Current password is incorrect." });
    return;
  }
  if (!newEmail || !newEmail.includes("@")) {
    res.status(400).json({ error: "Please enter a valid new email address." });
    return;
  }
  const normalizedNew = newEmail.trim().toLowerCase();
  if (confirmEmail !== void 0 && normalizedNew !== confirmEmail.trim().toLowerCase()) {
    res.status(400).json({ error: "New email and confirmation email do not match." });
    return;
  }
  const currentAdminEmail = (db.adminEmail || "baigrahim12345@gmail.com").trim().toLowerCase();
  if (normalizedNew === currentAdminEmail) {
    res.status(400).json({ error: "The new email is already your current Admin login email." });
    return;
  }
  const verificationToken = createVerificationToken({
    purpose: "admin_email_change",
    targetEmail: currentAdminEmail,
    newEmail: normalizedNew
  });
  res.json({
    verified: true,
    verificationToken,
    pendingEmail: normalizedNew,
    message: "Password verified. Please confirm the email change below to finalize."
  });
});
app.put("/api/admin/email/confirm", requireAdmin, async (req, res) => {
  const db = loadDb();
  const { verificationToken } = req.body;
  const verified = verifyVerificationToken(verificationToken);
  if (!verified || verified.purpose !== "admin_email_change" || !verified.newEmail) {
    res.status(400).json({
      error: "Email verification session expired or invalid. Please verify your password again."
    });
    return;
  }
  const currentAdminEmail = (db.adminEmail || "baigrahim12345@gmail.com").trim().toLowerCase();
  if (verified.targetEmail !== currentAdminEmail) {
    res.status(400).json({ error: "Admin email state changed. Please retry." });
    return;
  }
  db.adminEmail = verified.newEmail;
  await saveDb(db);
  const refreshedToken = createAuthToken({
    role: "admin",
    id: "velora-admin",
    email: db.adminEmail
  });
  res.json({
    updated: true,
    adminEmail: db.adminEmail,
    token: refreshedToken,
    message: `Admin login email updated to ${db.adminEmail}.`
  });
});
app.get("/api/admin/dashboard", requireAdmin, (_req, res) => {
  const db = loadDb();
  const paidOrders = db.orders.filter((o) => o.paymentStatus === "Paid" || o.paymentStatus === "PAID");
  const revenue = paidOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalDownloadsCompleted = db.downloads.reduce((sum, d) => sum + d.downloadCount, 0);
  res.json({
    adminEmail: db.adminEmail || "baigrahim12345@gmail.com",
    stats: {
      revenue,
      ordersCount: db.orders.length,
      paidOrdersCount: paidOrders.length,
      pendingOrdersCount: db.orders.filter(
        (o) => o.paymentStatus === "Payment Verification Pending" || o.paymentStatus === "Pending" || o.paymentStatus === "Processing"
      ).length,
      productsCount: db.products.length,
      customersCount: db.customers.length,
      downloadsCount: totalDownloadsCompleted,
      activeDownloadsCount: db.downloads.length
    },
    products: db.products.map(sanitizeProductForPublic),
    categories: (db.categories || []).filter((c) => {
      const delSet = new Set((db.deletedCategoryIds || []).map((x) => x.toLowerCase().trim()));
      return !delSet.has(c.id.toLowerCase().trim()) && !delSet.has(c.slug.toLowerCase().trim()) && !delSet.has(c.name.toLowerCase().trim());
    }),
    orders: [...db.orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((o) => ({
      ...o,
      downloads: buildDownloadRecordsForOrder(db, o.orderId)
    })),
    customers: db.customers.map(({ passwordHash, ...c }) => ({
      ...c,
      ordersCount: db.orders.filter((o) => o.customerId === c.id || o.email === c.email).length,
      totalSpent: db.orders.filter((o) => (o.customerId === c.id || o.email === c.email) && (o.paymentStatus === "Paid" || o.paymentStatus === "PAID")).reduce((s, o) => s + o.total, 0)
    })),
    coupons: db.coupons,
    homepageConfig: db.homepageConfig,
    contactInquiries: db.contactInquiries,
    newsletterEmails: db.newsletterEmails
  });
});
app.post("/api/admin/generate-description", requireAdmin, async (req, res) => {
  try {
    const {
      title,
      category,
      imageDataUrl,
      hasPsd,
      type = "product"
    } = req.body;
    if (!title?.trim() && !imageDataUrl) {
      res.status(400).json({
        error: "Please enter a name or upload an image first to generate a description."
      });
      return;
    }
    const parts = [];
    if (typeof imageDataUrl === "string" && imageDataUrl.trim()) {
      const trimmedImg = imageDataUrl.trim();
      const dataUrlMatch = trimmedImg.match(
        /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
      );
      if (dataUrlMatch) {
        parts.push({
          inlineData: {
            mimeType: dataUrlMatch[1],
            data: dataUrlMatch[2]
          }
        });
      } else if (trimmedImg.startsWith("/")) {
        const localPath = path4.resolve(process.cwd(), trimmedImg.replace(/^\/+/, ""));
        if (fs3.existsSync(localPath)) {
          const buf = fs3.readFileSync(localPath);
          const ext = path4.extname(localPath).toLowerCase();
          const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
          parts.push({
            inlineData: {
              mimeType,
              data: buf.toString("base64")
            }
          });
        }
      }
    }
    const cleanName = title?.trim() || "VELORA Digital Design";
    const cleanCategory = category?.trim() || "Digital Design";
    const promptText = type === "category" ? `You are writing a concise, refined category description for the luxury digital design marketplace VELORA.
Category Name: "${cleanName}".
${parts.length > 0 ? "Analyze the attached category cover image and the category name." : ""}
Write a clear, engaging 1 to 2 sentence description (around 20\u201335 words) explaining what digital designs customers will find in this category. Return ONLY the plain description text with no quotes, markdown, or headings.` : `You are writing a compelling, professional product description for the luxury digital design store VELORA.
Product Name: "${cleanName}"
Category: "${cleanCategory}"
Formats Included: High-resolution ready-to-use JPG file${hasPsd ? " with optional editable layered Adobe Photoshop (PSD) source upgrade" : ""}.
${parts.length > 0 ? "Carefully inspect the attached design image (colors, layout, visual style, typography, and mood) along with the product name." : ""}
Write a polished, natural 2 to 3 sentence product description (around 35\u201360 words) that highlights the visual style of this design, how brands or creators can use it, and its ready-to-use digital format. Return ONLY the plain description text with no quotes, bullet points, or markdown.`;
    parts.push({ text: promptText });
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: { parts }
    });
    const generatedText = response.text?.trim() || "";
    if (!generatedText) {
      res.status(500).json({
        error: "Could not generate a description from Gemini. Please try again or write manually."
      });
      return;
    }
    res.json({ description: generatedText });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate description with Gemini AI.";
    res.status(500).json({ error: message });
  }
});
app.post("/api/admin/products", requireAdmin, async (req, res) => {
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
    seoDescription
  } = req.body;
  if (!title?.trim() || jpgPrice === void 0 || jpgPrice === null || Number(jpgPrice) < 0) {
    res.status(400).json({ error: "Product title and a valid JPG base price are required." });
    return;
  }
  const cleanSlug = (slug?.trim() || title.trim()).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `design-${Date.now()}`;
  const id = `prod_${crypto2.randomBytes(6).toString("hex")}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const validPreviews = Array.isArray(previewImages) && previewImages.filter(Boolean).length > 0 ? previewImages.filter(Boolean) : ["/src/assets/images/velora_hero_editorial_1790670008130.jpg"];
  const jpgStorageKey = `${id}_standard.jpg`;
  saveProtectedDigitalFile(
    jpgStorageKey,
    jpgFileDataUrl,
    validPreviews[0],
    "JPG",
    title.trim()
  );
  let psdStorageKey;
  if (hasPsd) {
    psdStorageKey = `${id}_editable.psd`;
    saveProtectedDigitalFile(psdStorageKey, psdFileDataUrl, void 0, "PSD", title.trim());
  }
  const product = {
    id,
    title: title.trim(),
    slug: cleanSlug,
    category: category?.trim() || "Social Media",
    description: description?.trim() || "",
    previewImages: validPreviews,
    jpgStorageKey,
    jpgFileName: jpgFileName?.trim() || `${cleanSlug}-velora.jpg`,
    jpgPrice: Number(jpgPrice),
    oldPrice: oldPrice ? Number(oldPrice) : null,
    hasPsd: Boolean(hasPsd),
    psdStorageKey,
    psdFileName: hasPsd ? psdFileName?.trim() || `${cleanSlug}-editable.psd` : void 0,
    psdUpgradePrice: hasPsd ? Number(psdUpgradePrice) || 0 : null,
    dimensions: dimensions?.trim() || "3000 \xD7 3000 px (300 DPI)",
    compatibility: compatibility?.trim() || (hasPsd ? "JPG works on all devices; PSD compatible with Adobe Photoshop CC & Photopea" : "Standard High-Resolution JPG \u2014 compatible with all devices and platforms"),
    usageRights: usageRights?.trim() || "Standard Commercial & Personal Digital License",
    whatsIncluded: Array.isArray(whatsIncluded) && whatsIncluded.length > 0 ? whatsIncluded : hasPsd ? [
      "High-resolution ready-to-use JPG file",
      "Optional layered & editable PSD source file (with organized layers)",
      "Instant digital delivery upon payment verification"
    ] : [
      "High-resolution ready-to-use JPG file",
      "Instant digital delivery upon payment verification"
    ],
    tags: Array.isArray(tags) ? tags : typeof tags === "string" ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    featured: Boolean(featured),
    bestseller: Boolean(bestseller),
    new: Boolean(isNew),
    limited: Boolean(limited),
    seoTitle: seoTitle?.trim() || `${title.trim()} \u2014 VELORA Digital Design`,
    seoDescription: seoDescription?.trim() || description?.trim() || "",
    createdAt: now,
    updatedAt: now
  };
  if (Array.isArray(db.deletedProductIds)) {
    db.deletedProductIds = db.deletedProductIds.filter(
      (pId) => pId !== product.id && pId !== product.slug
    );
  }
  db.products.unshift(product);
  await saveDb(db);
  res.status(201).json({ product: sanitizeProductForPublic(product) });
});
app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const db = loadDb();
  const { id } = req.params;
  const product = db.products.find((p) => p.id === id);
  if (!product) {
    res.status(404).json({ error: "Product not found." });
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
    seoDescription
  } = req.body;
  if (title !== void 0) product.title = title.trim();
  if (slug !== void 0) {
    product.slug = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  if (category !== void 0) product.category = category.trim();
  if (description !== void 0) product.description = description.trim();
  if (Array.isArray(previewImages) && previewImages.filter(Boolean).length > 0) {
    product.previewImages = previewImages.filter(Boolean);
  }
  if (jpgPrice !== void 0) product.jpgPrice = Number(jpgPrice);
  if (oldPrice !== void 0) product.oldPrice = oldPrice ? Number(oldPrice) : null;
  if (jpgFileName !== void 0) product.jpgFileName = jpgFileName.trim();
  if (jpgFileDataUrl) {
    saveProtectedDigitalFile(
      product.jpgStorageKey,
      jpgFileDataUrl,
      product.previewImages[0],
      "JPG",
      product.title
    );
  }
  if (hasPsd !== void 0) {
    product.hasPsd = Boolean(hasPsd);
    if (product.hasPsd) {
      if (!product.psdStorageKey) {
        product.psdStorageKey = `${product.id}_editable.psd`;
      }
      saveProtectedDigitalFile(
        product.psdStorageKey,
        psdFileDataUrl,
        void 0,
        "PSD",
        product.title
      );
      product.psdFileName = psdFileName?.trim() || product.psdFileName || `${product.slug}-editable.psd`;
      product.psdUpgradePrice = Number(psdUpgradePrice) || 0;
    } else {
      product.psdUpgradePrice = null;
    }
  }
  if (dimensions !== void 0) product.dimensions = dimensions.trim();
  if (compatibility !== void 0) product.compatibility = compatibility.trim();
  if (usageRights !== void 0) product.usageRights = usageRights.trim();
  if (Array.isArray(whatsIncluded)) product.whatsIncluded = whatsIncluded;
  if (tags !== void 0) {
    product.tags = Array.isArray(tags) ? tags : typeof tags === "string" ? tags.split(",").map((t) => t.trim()).filter(Boolean) : product.tags;
  }
  if (featured !== void 0) product.featured = Boolean(featured);
  if (bestseller !== void 0) product.bestseller = Boolean(bestseller);
  if (isNew !== void 0) product.new = Boolean(isNew);
  if (limited !== void 0) product.limited = Boolean(limited);
  if (seoTitle !== void 0) product.seoTitle = seoTitle.trim();
  if (seoDescription !== void 0) product.seoDescription = seoDescription.trim();
  product.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (Array.isArray(db.deletedProductIds)) {
    db.deletedProductIds = db.deletedProductIds.filter(
      (pId) => pId !== product.id && pId !== product.slug
    );
  }
  await saveDb(db);
  res.json({ product: sanitizeProductForPublic(product) });
});
app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    await ensureDbLoaded();
    const db = loadDb();
    const { id } = req.params;
    const idx = db.products.findIndex((p) => p.id === id || p.slug === id);
    if (idx === -1) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    const product = db.products[idx];
    if (!Array.isArray(db.deletedProductIds)) {
      db.deletedProductIds = [];
    }
    if (!db.deletedProductIds.includes(product.id)) {
      db.deletedProductIds.push(product.id);
    }
    if (product.slug && !db.deletedProductIds.includes(product.slug)) {
      db.deletedProductIds.push(product.slug);
    }
    db.products.splice(idx, 1);
    await saveDb(db);
    const client = getSupabaseServerClient();
    if (client) {
      try {
        await client.from("products").delete().eq("id", product.id);
        if (product.slug) {
          await client.from("products").delete().eq("slug", product.slug);
        }
      } catch (err) {
        console.warn("[DesignHub PK Product Delete] Notice:", err);
      }
    }
    console.info(`[DesignHub PK Product] Product "${product.title}" (${product.id}) permanently deleted.`);
    res.json({ success: true, deleted: true, productId: product.id });
  } catch (err) {
    res.status(500).json({ error: `Failed to delete product: ${err?.message || "Unknown error"}` });
  }
});
app.post("/api/admin/categories", requireAdmin, async (req, res) => {
  const db = loadDb();
  const { name, description, image } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: "Category name is required." });
    return;
  }
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const newCat = {
    id: `cat_${crypto2.randomBytes(4).toString("hex")}`,
    name: name.trim(),
    slug,
    description: description?.trim() || "",
    image: image?.trim() || getCategoryFallbackImage(slug, name.trim()),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (Array.isArray(db.deletedCategoryIds)) {
    db.deletedCategoryIds = db.deletedCategoryIds.filter(
      (dId) => dId !== newCat.id && dId !== newCat.slug && dId !== slug
    );
  }
  db.categories.push(newCat);
  await saveDb(db);
  res.status(201).json({ category: newCat });
});
app.put("/api/admin/categories/:id", requireAdmin, async (req, res) => {
  const db = loadDb();
  const cat = db.categories.find((c) => c.id === req.params.id);
  if (!cat) {
    res.status(404).json({ error: "Category not found." });
    return;
  }
  const { name, description, image } = req.body;
  if (name?.trim()) {
    cat.name = name.trim();
    cat.slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  if (description !== void 0) cat.description = description.trim();
  if (image?.trim()) {
    cat.image = image.trim();
  } else if (!cat.image) {
    cat.image = getCategoryFallbackImage(cat.slug, cat.name);
  }
  if (Array.isArray(db.deletedCategoryIds)) {
    db.deletedCategoryIds = db.deletedCategoryIds.filter(
      (dId) => dId !== cat.id && dId !== cat.slug
    );
  }
  await saveDb(db);
  res.json({ category: cat });
});
app.delete("/api/admin/categories/:id", requireAdmin, async (req, res) => {
  try {
    await ensureDbLoaded();
    const db = loadDb();
    const rawId = req.params.id;
    const cleanId = decodeURIComponent(rawId).trim().toLowerCase();
    const cat = db.categories.find(
      (c) => c.id.toLowerCase() === cleanId || c.slug.toLowerCase() === cleanId || c.name.toLowerCase() === cleanId || c.id === rawId || c.slug === rawId
    );
    if (!cat) {
      if (!Array.isArray(db.deletedCategoryIds)) db.deletedCategoryIds = [];
      if (!db.deletedCategoryIds.includes(cleanId)) db.deletedCategoryIds.push(cleanId);
      await saveDb(db);
      res.json({ success: true, deleted: true, categoryId: rawId, message: "Category already deleted." });
      return;
    }
    const associatedProducts = db.products.filter(
      (p) => p.category && p.category.toLowerCase() === cat.name.toLowerCase() || p.category && p.category.toLowerCase() === cat.slug.toLowerCase() || p.category === cat.id
    );
    if (associatedProducts.length > 0) {
      const productTitles = associatedProducts.map((p) => `"${p.title}"`).slice(0, 3).join(", ");
      const moreCount = associatedProducts.length > 3 ? ` and ${associatedProducts.length - 3} more` : "";
      res.status(400).json({
        error: `Cannot delete category "${cat.name}" because it is currently assigned to ${associatedProducts.length} product(s) (${productTitles}${moreCount}). Please reassign or delete these products first.`,
        associatedCount: associatedProducts.length
      });
      return;
    }
    if (!Array.isArray(db.deletedCategoryIds)) {
      db.deletedCategoryIds = [];
    }
    const toTombstone = [cat.id, cat.slug, cat.name, rawId, cleanId].filter(Boolean);
    for (const val of toTombstone) {
      if (!db.deletedCategoryIds.includes(val)) {
        db.deletedCategoryIds.push(val);
      }
      const lower = val.toLowerCase();
      if (!db.deletedCategoryIds.includes(lower)) {
        db.deletedCategoryIds.push(lower);
      }
    }
    db.categories = db.categories.filter(
      (c) => c.id !== cat.id && c.slug !== cat.slug && c.name.toLowerCase() !== cat.name.toLowerCase() && c.id.toLowerCase() !== cleanId && c.slug.toLowerCase() !== cleanId
    );
    await saveDb(db);
    const client = getSupabaseServerClient();
    if (client) {
      try {
        await client.from("categories").delete().eq("id", cat.id);
        if (cat.slug) {
          await client.from("categories").delete().eq("slug", cat.slug);
        }
      } catch (supaErr) {
        console.warn("[DesignHub PK Category] Supabase delete notice (tombstone will enforce deletion):", supaErr);
      }
    }
    console.info(`[DesignHub PK Category] Category "${cat.name}" (${cat.id}) permanently deleted.`);
    res.json({ success: true, deleted: true, categoryId: cat.id });
  } catch (err) {
    console.error("[DesignHub PK Category Delete Exception]:", err);
    res.status(500).json({ error: `Internal error deleting category: ${err?.message || "Unknown error"}` });
  }
});
var handleAdminGetOrders = (_req, res) => {
  const db = loadDb();
  const sortedOrders = [...db.orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({
    orders: sortedOrders.map((o) => ({
      ...o,
      downloads: buildDownloadRecordsForOrder(db, o.orderId)
    })),
    total: sortedOrders.length,
    pendingCount: sortedOrders.filter(
      (o) => o.paymentStatus === "Payment Verification Pending" || o.paymentStatus === "Pending" || o.paymentStatus === "Processing"
    ).length,
    paidCount: sortedOrders.filter(
      (o) => o.paymentStatus === "Paid" || o.paymentStatus === "PAID"
    ).length
  });
};
app.get("/api/admin/orders", requireAdmin, handleAdminGetOrders);
app.get("/api/admin/transactions", requireAdmin, handleAdminGetOrders);
app.put("/api/admin/orders/:orderId/status", requireAdmin, async (req, res) => {
  const db = loadDb();
  const { orderId } = req.params;
  const { paymentStatus, paymentReference } = req.body;
  const order = db.orders.find((o) => o.orderId === orderId);
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  order.paymentStatus = paymentStatus;
  if (paymentReference !== void 0) {
    order.paymentReference = paymentReference.trim();
  }
  order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  provisionOrderDownloads(db, order);
  await saveDb(db);
  res.json({
    order: {
      ...order,
      downloads: buildDownloadRecordsForOrder(db, order.orderId)
    }
  });
});
app.delete("/api/admin/orders/:orderId", requireAdmin, async (req, res) => {
  try {
    await ensureDbLoaded();
    const db = loadDb();
    const { orderId } = req.params;
    const idx = db.orders.findIndex((o) => o.orderId === orderId);
    if (idx === -1) {
      res.status(404).json({ error: "Transaction not found." });
      return;
    }
    if (!Array.isArray(db.deletedOrderIds)) {
      db.deletedOrderIds = [];
    }
    if (!db.deletedOrderIds.includes(orderId)) {
      db.deletedOrderIds.push(orderId);
    }
    db.orders.splice(idx, 1);
    db.downloads = db.downloads.filter((d) => d.orderId !== orderId);
    await saveDb(db);
    const client = getSupabaseServerClient();
    if (client) {
      try {
        await client.from("orders").delete().eq("order_id", orderId);
      } catch {
      }
    }
    res.json({ success: true, deleted: true, orderId });
  } catch (err) {
    res.status(500).json({ error: `Failed to delete order: ${err?.message || "Unknown error"}` });
  }
});
app.delete("/api/admin/orders", requireAdmin, async (_req, res) => {
  try {
    await ensureDbLoaded();
    const db = loadDb();
    if (!Array.isArray(db.deletedOrderIds)) {
      db.deletedOrderIds = [];
    }
    db.orders.forEach((o) => {
      if (!db.deletedOrderIds.includes(o.orderId)) {
        db.deletedOrderIds.push(o.orderId);
      }
    });
    db.orders = [];
    db.downloads = [];
    await saveDb(db);
    res.json({ success: true, cleared: true });
  } catch (err) {
    res.status(500).json({ error: `Failed to clear orders: ${err?.message || "Unknown error"}` });
  }
});
app.post("/api/admin/coupons", requireAdmin, async (req, res) => {
  const db = loadDb();
  const {
    code,
    type,
    value,
    expiresAt,
    usageLimit,
    restrictedCategory,
    restrictedProductId
  } = req.body;
  if (!code?.trim() || !value || Number(value) <= 0) {
    res.status(400).json({ error: "Coupon code and a positive discount value are required." });
    return;
  }
  const normalizedCode = code.trim().toUpperCase();
  const coupon = {
    id: `cpn_${crypto2.randomBytes(4).toString("hex")}`,
    code: normalizedCode,
    type: type === "fixed" ? "fixed" : "percentage",
    value: Number(value),
    expiresAt: expiresAt || void 0,
    usageLimit: usageLimit ? Number(usageLimit) : null,
    usedCount: 0,
    restrictedCategory: restrictedCategory || void 0,
    restrictedProductId: restrictedProductId || void 0,
    active: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (Array.isArray(db.deletedCouponIds)) {
    db.deletedCouponIds = db.deletedCouponIds.filter(
      (cId) => cId !== coupon.id && cId !== coupon.code
    );
  }
  db.coupons.unshift(coupon);
  await saveDb(db);
  res.status(201).json({ coupon });
});
app.delete("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
  try {
    await ensureDbLoaded();
    const db = loadDb();
    const { id } = req.params;
    const idx = db.coupons.findIndex((c) => c.id === id || c.code === id);
    if (idx === -1) {
      res.status(404).json({ error: "Coupon not found." });
      return;
    }
    const coupon = db.coupons[idx];
    if (!Array.isArray(db.deletedCouponIds)) {
      db.deletedCouponIds = [];
    }
    if (!db.deletedCouponIds.includes(coupon.id)) {
      db.deletedCouponIds.push(coupon.id);
    }
    if (coupon.code && !db.deletedCouponIds.includes(coupon.code)) {
      db.deletedCouponIds.push(coupon.code);
    }
    db.coupons.splice(idx, 1);
    await saveDb(db);
    const client = getSupabaseServerClient();
    if (client) {
      try {
        await client.from("coupons").delete().eq("id", coupon.id);
      } catch {
      }
    }
    res.json({ success: true, deleted: true, couponId: coupon.id });
  } catch (err) {
    res.status(500).json({ error: `Failed to delete coupon: ${err?.message || "Unknown error"}` });
  }
});
app.put("/api/admin/homepage", requireAdmin, async (req, res) => {
  const db = loadDb();
  db.homepageConfig = {
    ...db.homepageConfig,
    ...req.body
  };
  await saveDb(db);
  res.json({ homepageConfig: db.homepageConfig });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path4.resolve(process.cwd(), "dist");
    const indexPath = path4.join(distPath, "index.html");
    if (!fs3.existsSync(distPath)) {
      console.warn(
        `[VELORA WARNING] Production build directory not found at: ${distPath}.
Make sure you have run "npm run build" before running in production mode.`
      );
    }
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      if (fs3.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(503).send(
          "<!DOCTYPE html><html><head><title>VELORA - Build Required</title><style>body{font-family:sans-serif;padding:40px;background:#FAF6F3;color:#231518;line-height:1.6;}code{background:#E6DAD2;padding:2px 6px;border-radius:4px;}</style></head><body><h1>VELORA Production Build Required</h1><p>The production frontend build is missing. Please run <code>npm run build</code> and then restart the server with <code>npm start</code>.</p></body></html>"
        );
      }
    });
  }
  app.listen(PORT2, HOST2, () => {
    console.log(`====================================================`);
    console.log(`\u2728 VELORA E-Commerce Platform Active`);
    console.log(`\u{1F4E1} Server: http://${HOST2}:${PORT2}`);
    console.log(`\u{1F30D} Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`\u{1F4BE} Database: ${DB_FILE2}`);
    console.log(`\u{1F4C1} Private Storage: ${PRIVATE_STORAGE_DIR2}`);
    console.log(`====================================================`);
  });
}
var isDirectRun = Boolean(process.argv[1]) && (process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.js"));
if (isDirectRun && !process.env.VERCEL) {
  startServer();
}
var server_default = app;
export {
  server_default as default,
  ensureDbLoaded,
  getSupabaseServerClient,
  isDatabaseConnected,
  loadDb,
  saveDb
};
