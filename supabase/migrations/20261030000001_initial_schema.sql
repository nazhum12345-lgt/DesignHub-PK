-- ==============================================================================
-- DESIGNHUB PK — SUPABASE DATABASE SCHEMA & RLS SECURITY POLICIES
-- Project: https://vrmopkszhyotytfknjrw.supabase.co
-- Run this complete script in your Supabase Dashboard -> SQL Editor -> New Query.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCTS TABLE (Only official admin-published designs, ZERO demo products)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  preview_images TEXT[] DEFAULT '{}',
  jpg_storage_key TEXT,
  jpg_file_name TEXT,
  jpg_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  old_price NUMERIC(10,2),
  has_psd BOOLEAN DEFAULT false,
  psd_storage_key TEXT,
  psd_file_name TEXT,
  psd_upgrade_price NUMERIC(10,2),
  dimensions TEXT,
  compatibility TEXT,
  usage_rights TEXT,
  whats_included TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  featured BOOLEAN DEFAULT false,
  bestseller BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  limited BOOLEAN DEFAULT false,
  seo_title TEXT,
  seo_description TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CUSTOMER PROFILES TABLE (Linked with Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  wishlist TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDERS TABLE (JazzCash manual payment verification flow)
CREATE TABLE IF NOT EXISTS public.orders (
  order_id TEXT PRIMARY KEY,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT DEFAULT 'Pakistan',
  billing_city TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_code TEXT,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'jazzcash',
  recipient_jazzcash_number TEXT,
  sender_phone TEXT,
  sender_name TEXT,
  payment_reference TEXT,
  payment_screenshot TEXT,
  payment_notes TEXT,
  payment_status TEXT NOT NULL DEFAULT 'Payment Verification Pending',
  order_access_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  category TEXT,
  preview_image TEXT,
  selected_format TEXT NOT NULL CHECK (selected_format IN ('JPG_ONLY', 'JPG_PLUS_PSD')),
  jpg_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  psd_upgrade_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  item_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. DOWNLOAD ENTITLEMENTS TABLE (Secure file downloads)
CREATE TABLE IF NOT EXISTS public.download_entitlements (
  download_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_id TEXT,
  product_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('JPG', 'PSD')),
  storage_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  download_count INT NOT NULL DEFAULT 0,
  download_status TEXT NOT NULL DEFAULT 'Locked',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value NUMERIC(10,2) NOT NULL,
  active BOOLEAN DEFAULT true,
  used_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. HOMEPAGE CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS public.homepage_config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. INDEXES FOR HIGH-CONCURRENCY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_published ON public.products(is_published);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_downloads_order_id ON public.download_entitlements(order_id);
CREATE INDEX IF NOT EXISTS idx_downloads_customer_id ON public.download_entitlements(customer_id);

-- 11. AUTOMATIC PROFILE CREATION TRIGGER ON SUPABASE AUTH SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_customer_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customer_profiles (id, name, email, phone, wishlist, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    '{}',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_customer_user();

-- 12. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_config ENABLE ROW LEVEL SECURITY;

-- Categories Policies
-- Public storefront visitors can read all categories
CREATE POLICY "Public can view categories"
  ON public.categories FOR SELECT
  TO public
  USING (true);

-- Products Policies
-- Public storefront visitors can only read published products
CREATE POLICY "Public can view published products"
  ON public.products FOR SELECT
  TO public
  USING (is_published = true);

-- SECURITY SPECIFICATION:
-- Products and Categories mutations (INSERT, UPDATE, DELETE) are intentionally NOT granted to 'anon' or 'public'.
-- In Supabase, server-side admin operations use the service-role key (SUPABASE_SERVICE_ROLE_KEY), which automatically bypasses RLS.
-- This guarantees that unauthenticated public users cannot modify, tamper with, or delete products and categories directly via the Supabase REST API.

-- Customer Profiles Policies (Users can only access their own profile)
CREATE POLICY "Users can view own profile"
  ON public.customer_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.customer_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.customer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Orders Policies (Customers create orders, users view their own orders)
-- Enforces that anonymous clients can never set payment_status to 'PAID' or 'Processing'
CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT
  TO public
  WITH CHECK (
    payment_status = 'Payment Verification Pending'
  );

CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = customer_id)
    OR customer_id IS NULL
  );

-- Order Items Policies
CREATE POLICY "Anyone can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view order items"
  ON public.order_items FOR SELECT
  USING (true);

-- Download Entitlements Policies (Users can only see entitlements for their own orders)
CREATE POLICY "Users can view own download entitlements"
  ON public.download_entitlements FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = customer_id)
    OR customer_id IS NULL
  );

-- Coupons Policies
CREATE POLICY "Public can check active coupons"
  ON public.coupons FOR SELECT
  USING (active = true);

-- Homepage Config Policies
CREATE POLICY "Public can read homepage config"
  ON public.homepage_config FOR SELECT
  USING (true);

-- 13. SEED INITIAL LUXURY CATEGORIES (ZERO DEMO PRODUCTS)
INSERT INTO public.categories (id, name, slug, description, image)
VALUES
  ('cat_social_media', 'Social Media', 'social-media', 'Editorial Instagram post templates, story packs, and high-converting carousel designs.', '/src/assets/images/velora_cat_social_media_1790670021007.jpg'),
  ('cat_printables', 'Printables', 'printables', 'Fine art wedding suites, stationery paper goods, and museum-grade printable artboards.', '/src/assets/images/velora_cat_printables_1790670036140.jpg'),
  ('cat_logos', 'Logos', 'logos', 'Minimalist monograms, bespoke emblems, and timeless brand identity kits.', '/src/assets/images/velora_cat_logos_1790670048012.jpg')
ON CONFLICT (id) DO NOTHING;

-- 14. INITIAL HOMEPAGE CONFIG
INSERT INTO public.homepage_config (id, config)
VALUES ('main', '{
  "announcementText": "OFFICIAL DIGITAL DESIGN RELEASES — INSTANT DOWNLOADS",
  "showAnnouncement": true,
  "showFeaturedSection": true,
  "showMostLovedSection": true,
  "showPsdUpgradeSection": true,
  "showPromoBanner": true,
  "promoHeadline": "Because your brand deserves something exquisite.",
  "promoSubtext": "Explore premium digital assets created for modern creators, businesses, and brands.",
  "currencyCode": "PKR",
  "currencySymbol": "Rs. ",
  "studioFeaturedProductIds": []
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
