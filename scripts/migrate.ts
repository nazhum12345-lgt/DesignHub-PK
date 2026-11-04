// ==============================================================================
// VELORA — In-Built Database Seeder & Integrity Tool
// Seeds, sanitizes, and verifies the in-built persistent database engine.
// Supabase access is completely revoked.
// ==============================================================================

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {
  INITIAL_DATABASE,
  loadLocalFileDb,
  saveDb,
  isDatabaseConnected,
} from '../src/server/db';

dotenv.config();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'velora-db.json');

async function runSeed() {
  console.log('====================================================');
  console.log('💎 VELORA In-Built Database Engine & Seeder');
  console.log('====================================================');
  console.log(`📁 Target In-Built Database File: ${DB_FILE}`);

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Load or initialize database
  const current = loadLocalFileDb();
  console.log(`✅ Database loaded: ${current.products?.length || 0} products, ${current.categories?.length || 0} categories, ${current.orders?.length || 0} orders.`);

  // Purge any test products or test orders
  current.products = (current.products || []).filter(
    (p) =>
      !p.id.toLowerCase().includes('test') &&
      !p.title.toLowerCase().includes('test')
  );
  current.orders = (current.orders || []).filter(
    (o) =>
      !o.customerName.toLowerCase().includes('test') &&
      !o.email.toLowerCase().includes('test')
  );
  current.downloads = (current.downloads || []).filter(
    (d) =>
      !d.customerEmail.toLowerCase().includes('test') &&
      !d.productTitle.toLowerCase().includes('test')
  );

  // Ensure products and categories are valid arrays without auto-seeding demo categories
  if (!Array.isArray(current.products)) {
    current.products = [];
  }
  if (!Array.isArray(current.categories)) {
    current.categories = [];
  }

  await saveDb(current);
  console.log(`✨ Successfully verified and saved in-built database with ${current.products.length} products.`);

  const status = await isDatabaseConnected();
  console.log('📊 Status:', status);
  console.log('====================================================');
}

runSeed().catch((err) => {
  console.error('❌ Error initializing in-built database:', err);
  process.exit(1);
});
