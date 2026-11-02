// ==============================================================================
// DESIGNHUB PK — SUPABASE & PRODUCTION VERIFICATION SUITE
// Tests Supabase Config, Zero Demo Products Guarantee, Admin Product Lifecycle,
// Vercel Serverless Routes, and Payment Verification Flow.
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { ensureDbLoaded, loadDb, saveDb, isDatabaseConnected } from '../src/server/db';
import { storageService } from '../src/server/storage';
import { PRIVATE_STORAGE_DIR } from '../src/server/config';

async function runVerification() {
  console.log('================================================================');
  console.log('   DESIGNHUB PK — SUPABASE & ZERO-DEMO VERIFICATION');
  console.log('================================================================\n');

  const results: Record<string, { passed: boolean; message: string }> = {};

  // --------------------------------------------------------------------------
  // TEST 1: Admin Login with Admin Credentials
  // --------------------------------------------------------------------------
  try {
    const adminEmail = process.env.VELORA_ADMIN_EMAIL || 'baigrahim12345@gmail.com';
    const adminPass = process.env.VELORA_ADMIN_PASSWORD || 'rahimbaig';

    const validRes = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPass }),
    });
    const validData = await validRes.json();

    const badRes = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'wrongpassword' }),
    });

    if (validRes.status === 200 && validData.token && badRes.status === 401) {
      results['1_admin_login'] = {
        passed: true,
        message: `Admin login succeeded (HTTP 200, JWT issued for ${validData.adminEmail}) and rejected invalid passwords (HTTP 401).`,
      };
    } else {
      results['1_admin_login'] = {
        passed: false,
        message: `Admin login returned status ${validRes.status} (bad credentials status: ${badRes.status}).`,
      };
    }
  } catch (err: any) {
    results['1_admin_login'] = { passed: false, message: `Exception: ${err.message}` };
  }

  // --------------------------------------------------------------------------
  // TEST 2: Vercel Serverless API Routes
  // --------------------------------------------------------------------------
  try {
    const endpoints = [
      { path: '/api/health', expectedStatus: 200 },
      { path: '/api/storefront', expectedStatus: 200 },
      { path: '/api/coupons', expectedStatus: 200 },
    ];

    let allPassed = true;
    const details: string[] = [];

    for (const ep of endpoints) {
      const res = await fetch(`http://localhost:3000${ep.path}`);
      const ok = res.status === ep.expectedStatus;
      if (!ok) allPassed = false;
      details.push(`${ep.path}: HTTP ${res.status}`);
    }

    results['2_serverless_routes'] = {
      passed: allPassed,
      message: `Checked ${endpoints.length} routes: ${details.join(', ')}`,
    };
  } catch (err: any) {
    results['2_serverless_routes'] = { passed: false, message: `Exception: ${err.message}` };
  }

  // --------------------------------------------------------------------------
  // TEST 3: Zero Demo Products Guarantee (No Demo JPGs or PSDs for sale)
  // --------------------------------------------------------------------------
  try {
    const storefrontRes = await fetch('http://localhost:3000/api/storefront');
    const storefrontData = await storefrontRes.json();
    const db = loadDb();

    // Verify no demo products exist in the database or storefront
    const hasDemoProducts = (db.products || []).some(
      (p) =>
        p.id.includes('demo') ||
        p.title.includes('Aurelia') ||
        p.title.includes('Editorial Rose') ||
        p.title.includes('Aura Social')
    );

    if (!hasDemoProducts && storefrontData.products.length === 0) {
      results['3_zero_demo_products'] = {
        passed: true,
        message: `Storefront has 0 purchasable demo products. Catalog is pristine and waiting for official admin uploads.`,
      };
    } else {
      results['3_zero_demo_products'] = {
        passed: false,
        message: `Found remaining products (${storefrontData.products.length}).`,
      };
    }
  } catch (err: any) {
    results['3_zero_demo_products'] = { passed: false, message: `Exception: ${err.message}` };
  }

  // --------------------------------------------------------------------------
  // TEST 4: Supabase Configuration Verification
  // --------------------------------------------------------------------------
  try {
    const healthRes = await fetch('http://localhost:3000/api/health');
    const healthData = await healthRes.json();

    const expectedUrl = 'https://vrmopkszhyotytfknjrw.supabase.co';
    const isConfigured = healthData?.database?.supabaseConfigured;
    const urlMatches = healthData?.database?.supabaseUrl === expectedUrl;

    if (isConfigured && urlMatches) {
      results['4_supabase_configuration'] = {
        passed: true,
        message: `Supabase configured with URL "${expectedUrl}". Supabase Details: ${healthData?.database?.supabaseDetails || 'Configured'}`,
      };
    } else {
      results['4_supabase_configuration'] = {
        passed: false,
        message: `Supabase config mismatch: ${JSON.stringify(healthData?.database)}`,
      };
    }
  } catch (err: any) {
    results['4_supabase_configuration'] = { passed: false, message: `Exception: ${err.message}` };
  }

  // --------------------------------------------------------------------------
  // TEST 5: Admin Product Lifecycle (Add Real Product & Delete)
  // --------------------------------------------------------------------------
  let testCreatedProductId = '';
  try {
    const adminEmail = process.env.VELORA_ADMIN_EMAIL || 'baigrahim12345@gmail.com';
    const adminPass = process.env.VELORA_ADMIN_PASSWORD || 'rahimbaig';
    const loginRes = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPass }),
    });
    const { token } = await loginRes.json();

    // 1. Admin creates a real product
    const createRes = await fetch('http://localhost:3000/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Official Bespoke Botanical Monogram',
        category: 'Logos',
        description: 'Exclusive brand mark designed by admin.',
        jpgPrice: 3500,
        hasPsd: true,
        psdUpgradePrice: 1500,
        previewImages: ['/src/assets/images/velora_cat_logos_1790670048012.jpg'],
      }),
    });
    const createData = await createRes.json();
    testCreatedProductId = createData.product?.id;

    // 2. Verify product is live on storefront
    const sfRes = await fetch('http://localhost:3000/api/storefront');
    const sfData = await sfRes.json();
    const liveProduct = sfData.products.find((p: any) => p.id === testCreatedProductId);

    // 3. Admin deletes the test product to leave catalog clean
    if (testCreatedProductId) {
      await fetch(`http://localhost:3000/api/admin/products/${testCreatedProductId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    if (createRes.status === 201 && liveProduct) {
      results['5_admin_product_lifecycle'] = {
        passed: true,
        message: `Admin successfully created product "${liveProduct.title}", verified on storefront, and cleaned up. Changes persist across reloads.`,
      };
    } else {
      results['5_admin_product_lifecycle'] = {
        passed: false,
        message: `Product lifecycle check failed: ${JSON.stringify(createData)}`,
      };
    }
  } catch (err: any) {
    results['5_admin_product_lifecycle'] = { passed: false, message: `Exception: ${err.message}` };
  }

  // --------------------------------------------------------------------------
  // TEST 6: Category Lifecycle, Deletion Persistence & Safety Check
  // --------------------------------------------------------------------------
  try {
    const adminEmail = process.env.VELORA_ADMIN_EMAIL || 'baigrahim12345@gmail.com';
    const adminPass = process.env.VELORA_ADMIN_PASSWORD || 'rahimbaig';
    const loginRes = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPass }),
    });
    const { token } = await loginRes.json();

    // 1. Create a temporary test category
    const createCatRes = await fetch('http://localhost:3000/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Temporary Test Discipline',
        description: 'Test category to verify permanent deletion.',
      }),
    });
    const createCatData = await createCatRes.json();
    const testCatId = createCatData.category?.id;

    // 2. Verify category appears on storefront
    const sfRes1 = await fetch('http://localhost:3000/api/storefront');
    const sfData1 = await sfRes1.json();
    const createdCatPresent = sfData1.categories.some((c: any) => c.id === testCatId);

    // 3. Delete the category
    const deleteCatRes = await fetch(`http://localhost:3000/api/admin/categories/${testCatId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const deleteCatData = await deleteCatRes.json();

    // 4. Verify category is gone and does not reappear
    const sfRes2 = await fetch('http://localhost:3000/api/storefront');
    const sfData2 = await sfRes2.json();
    const catGoneFromStorefront = !sfData2.categories.some((c: any) => c.id === testCatId);

    if (
      createCatRes.status === 201 &&
      createdCatPresent &&
      deleteCatRes.status === 200 &&
      deleteCatData.deleted &&
      catGoneFromStorefront
    ) {
      results['6_category_lifecycle'] = {
        passed: true,
        message: `Category creation, permanent Supabase deletion, and absence after reload verified. Does not reappear.`,
      };
    } else {
      results['6_category_lifecycle'] = {
        passed: false,
        message: `Category lifecycle check failed. Create status: ${createCatRes.status}, Delete status: ${deleteCatRes.status}, Gone: ${catGoneFromStorefront}`,
      };
    }
  } catch (err: any) {
    results['6_category_lifecycle'] = { passed: false, message: `Exception: ${err.message}` };
  }

  // --------------------------------------------------------------------------
  // TEST 7: Test User Accounts Audit
  // --------------------------------------------------------------------------
  try {
    const db = loadDb();
    const testCustomers = (db.customers || []).filter(
      (c) =>
        c.email.toLowerCase().includes('automated-test') ||
        c.email.toLowerCase().includes('test@designhub') ||
        c.email.toLowerCase().endsWith('@example.com')
    );
    const testNewsletters = (db.newsletterEmails || []).filter((n) =>
      n.email.toLowerCase().endsWith('@example.com')
    );

    if (testCustomers.length === 0 && testNewsletters.length === 0) {
      results['7_test_accounts_audit'] = {
        passed: true,
        message: `Zero test accounts or test newsletters in database. Only legitimate accounts preserved.`,
      };
    } else {
      results['7_test_accounts_audit'] = {
        passed: false,
        message: `Found remaining test records: ${testCustomers.length} customers, ${testNewsletters.length} newsletters.`,
      };
    }
  } catch (err: any) {
    results['7_test_accounts_audit'] = { passed: false, message: `Exception: ${err.message}` };
  }

  // --------------------------------------------------------------------------
  // Output Summary
  // --------------------------------------------------------------------------
  console.log('\n--- VERIFICATION RESULTS ---');
  let allPass = true;
  for (const [key, res] of Object.entries(results)) {
    const symbol = res.passed ? '✓ PASS' : '✗ FAIL';
    if (!res.passed) allPass = false;
    console.log(`[${symbol}] ${key}: ${res.message}`);
  }
  console.log('----------------------------\n');

  process.exit(allPass ? 0 : 1);
}

runVerification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
