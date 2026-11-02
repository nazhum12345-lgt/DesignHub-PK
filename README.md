# DesignHub PK — Luxury Digital Design E-Commerce Platform
## Supabase Production Integration & Vercel Deployment Guide

DesignHub PK is a production-grade digital commerce store built for selling premium downloadable digital assets (social media packages, branding suites, printables, and monograms) with instant high-resolution JPG delivery, optional editable PSD upgrades, manual JazzCash payment verification with screenshot review, and HMAC-signed protected file downloads.

Connected Supabase Project:
- **Supabase Project URL**: `https://vrmopkszhyotytfknjrw.supabase.co`
- **Supabase Publishable Key**: `sb_publishable_Yz4NZvZ2vl6Yi1MoYH1kgA_g-HX1d54`

---

## 🛑 Zero Demo Products Policy
All purchasable demo JPGs and PSDs have been completely removed.
No demo pieces appear for sale. The storefront displays an elegant coming-soon state until an authorized administrator logs into the **Admin Panel** (`/admin`) and publishes real digital designs.

---

## ⚡ Step 1: Run the Database Migration in Supabase (1-Minute Setup)

1. Open your Supabase Dashboard: [https://supabase.com/dashboard/project/vrmopkszhyotytfknjrw](https://supabase.com/dashboard/project/vrmopkszhyotytfknjrw)
2. In the left sidebar, click **SQL Editor**.
3. Click **+ New Query**.
4. Open the file `supabase-schema.sql` from this repository, copy all contents, paste it into the SQL editor, and click **Run**.
5. This creates all necessary tables with Row Level Security (RLS) policies:
   - `categories`
   - `products`
   - `customer_profiles` (with automatic signup trigger from `auth.users`)
   - `orders` (with JazzCash payment workflow tracking)
   - `order_items`
   - `download_entitlements` (secure paid download tracking)
   - `coupons`
   - `homepage_config`

---

## 🚀 Step 2: Deploy to Vercel

1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), click **Add New...** -> **Project** and import your GitHub repository.
3. In **Project Settings** -> **Environment Variables**, add the following:

| Variable Name | Value | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://vrmopkszhyotytfknjrw.supabase.co` | Supabase Project URL for client |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_Yz4NZvZ2vl6Yi1MoYH1kgA_g-HX1d54` | Supabase Anon Key for client |
| `SUPABASE_URL` | `https://vrmopkszhyotytfknjrw.supabase.co` | Server Supabase URL |
| `SUPABASE_ANON_KEY` | `sb_publishable_Yz4NZvZ2vl6Yi1MoYH1kgA_g-HX1d54` | Server Supabase Key |
| `VELORA_ADMIN_PASSWORD` | `YourStrongAdminPasswordHere` | Master password for `/admin` |
| `VELORA_ADMIN_EMAIL` | `baigrahim12345@gmail.com` | Master admin email address |
| `VELORA_SESSION_SECRET` | *(64 random hex characters)* | Secret for customer session tokens |
| `VELORA_DOWNLOAD_SIGNING_SECRET` | *(64 random hex characters)* | Secret for HMAC download URL signatures |
| `JAZZCASH_RECEIVER_MOBILE` | `03192644717` | JazzCash recipient mobile number |
| `JAZZCASH_RECEIVER_NAME` | `M BAIQ` | JazzCash recipient account title |

4. Click **Deploy**. Vercel will compile the Vite React frontend and wire up the serverless `/api/*` routes.

---

## 🛡️ Architecture & Security

- **Supabase Auth**: Customers can sign up, sign in, and persist their session securely using Supabase Auth.
- **Manual JazzCash Flow**: Customers enter their JazzCash sender number, TID, and optional screenshot. Orders start in `Payment Verification Pending`.
- **Admin Verification**: The administrator verifies payments in `/admin`. Once marked `Paid`, digital download entitlements unlock immediately.
- **Protected Digital Downloads**: High-resolution JPGs and layered PSDs cannot be downloaded unless the order is verified as `Paid` and the customer purchased that specific format.
- **Resilient Fallback**: If Supabase experiences cold-start latency or DNS propagation delays, the built-in database layer ensures zero downtime or crashes.
