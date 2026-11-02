import React from 'react';
import {
  ArrowRight,
  FileImage,
  Layers,
  ShieldCheck,
  UserPlus,
  LogIn,
  CheckCircle2,
  Award,
  Sliders,
  Sparkles,
  Lock,
  Compass,
  PenTool,
} from 'lucide-react';
import {
  Product,
  Category,
  HomepageConfig,
  ProductFormatSelection,
  CustomerProfile,
} from '../types/velora';
import { ResilientImage, VeloraMonogram } from '../components/VeloraLogo';
import { NavigationPage, AccountSectionTab } from '../components/Header';
import {
  RevealOnScroll,
  AnimatedHeading,
  InteractiveTilt,
  MagneticButtonWrapper,
} from '../components/MotionPrimitives';

interface StudioPageProps {
  products: Product[];
  categories: Category[];
  homepageConfig: HomepageConfig;
  customer: CustomerProfile | null;
  onSelectProduct: (slug: string) => void;
  onAddToCart: (product: Product, format: ProductFormatSelection) => boolean | void;
  onNavigate: (
    page: NavigationPage,
    params?: {
      category?: string;
      format?: string;
      accountTab?: AccountSectionTab;
    }
  ) => void;
}

export function StudioPage({
  products,
  homepageConfig,
  customer,
  onSelectProduct,
  onAddToCart,
  onNavigate,
}: StudioPageProps) {
  // Admin-controlled showcase designs (3–4 PSD or JPG products chosen by Admin)
  const showcaseProducts = (() => {
    if (
      homepageConfig?.studioFeaturedProductIds &&
      homepageConfig.studioFeaturedProductIds.length > 0
    ) {
      const selected = homepageConfig.studioFeaturedProductIds
        .map((id) => products.find((p) => p.id === id || p.slug === id))
        .filter((p): p is Product => Boolean(p));
      if (selected.length > 0) return selected.slice(0, 4);
    }
    const marked = products.filter((p) => p.featuredInStudio);
    if (marked.length > 0) return marked.slice(0, 4);
    // Graceful fallback: top products with PSD, or any products
    const withPsd = products.filter((p) => p.hasPsd);
    if (withPsd.length > 0) return withPsd.slice(0, 4);
    return products.slice(0, 4);
  })();

  return (
    <div className="w-full bg-[#1E060B] text-[#FAF6F3]">
      {/* =====================================================================
          1. DEDICATED BURGUNDY STUDIO HERO (/studio)
      ===================================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#28080F] via-[#3D0F18] to-[#190408] text-[#FAF6F3] border-b border-[#C59B6D]/25">
        {/* Ambient radial burgundy & champagne glow */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full bg-[#C59B6D]/12 blur-3xl" />
          <div className="absolute -bottom-36 right-1/4 w-[600px] h-[600px] rounded-full bg-[#FAF6F3]/6 blur-3xl" />
        </div>

        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-14 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Official Studio Introduction */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2.5">
                <span className="w-7 h-px bg-[#C59B6D]" aria-hidden="true" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#C59B6D]">
                  WELCOME TO DESIGNHUB PK · OFFICIAL DIGITAL DESIGN STUDIO
                </span>
              </div>

              <AnimatedHeading
                as="h1"
                text="Exquisite Digital Designs Crafted for Modern Brands."
                triggerOnScroll={false}
                baseDelayMs={80}
                staggerMs={55}
                className="font-serif-editorial text-4xl sm:text-6xl lg:text-[64px] font-normal tracking-tight text-[#FAF6F3] leading-[1.04] text-balance"
              />

              <p className="text-sm sm:text-base text-[#FAF6F3]/80 leading-relaxed max-w-xl">
                Inside the DesignHub PK Digital Design Studio, every composition is architected with
                editorial precision—combining ready-to-publish high-resolution{' '}
                <strong className="text-[#FAF6F3] font-semibold">JPG</strong> masters with optional
                fully layered{' '}
                <strong className="text-[#C59B6D] font-semibold">Adobe Photoshop (PSD)</strong>{' '}
                source files for complete creative control.
              </p>

              {/* Studio CTA Row */}
              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <MagneticButtonWrapper>
                  <button
                    type="button"
                    onClick={() => onNavigate('shop')}
                    className="px-7 py-4 bg-[#C59B6D] hover:bg-[#d4ab7d] text-[#231518] text-xs font-semibold uppercase tracking-[0.2em] rounded-xs inline-flex items-center gap-2.5 transition-all shadow-lg cursor-pointer"
                  >
                    <span>EXPLORE THE COLLECTION</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </MagneticButtonWrapper>

                {!customer ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate('account', { accountTab: 'create-account' })
                      }
                      className="px-6 py-4 bg-[#FAF6F3] hover:bg-[#F3EAE4] text-[#3D0F18] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs inline-flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4 text-[#3D0F18]" />
                      <span>CREATE FREE ACCOUNT</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate('account', { accountTab: 'sign-in' })}
                      className="px-5 py-4 bg-transparent hover:bg-[#FAF6F3]/10 text-[#FAF6F3] border border-[#C59B6D]/50 text-xs font-semibold uppercase tracking-[0.18em] rounded-xs inline-flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <LogIn className="w-4 h-4 text-[#C59B6D]" />
                      <span>SIGN IN</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigate('account', { accountTab: 'my-inventory' })}
                    className="px-6 py-4 bg-transparent hover:bg-[#FAF6F3]/10 text-[#FAF6F3] border border-[#C59B6D]/50 text-xs font-semibold uppercase tracking-[0.18em] rounded-xs inline-flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>OPEN MY INVENTORY</span>
                    <ArrowRight className="w-4 h-4 text-[#C59B6D]" />
                  </button>
                )}
              </div>

              {/* Studio Standards Strip */}
              <div className="pt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#FAF6F3]/75">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C59B6D]" />
                  <span>High-Res JPG Included</span>
                </span>
                <span aria-hidden="true" className="text-[#C59B6D]/40">
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#C59B6D]" />
                  <span>Optional Layered PSD Upgrade</span>
                </span>
                <span aria-hidden="true" className="text-[#C59B6D]/40">
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#C59B6D]" />
                  <span>Account Protected Cart &amp; Inventory</span>
                </span>
              </div>
            </div>

            {/* Right Column: Studio Artboard Showcase */}
            <div className="lg:col-span-6">
              <InteractiveTilt maxTiltDeg={2} scaleOnHover={1.005}>
                <div className="relative rounded-xs overflow-hidden border border-[#C59B6D]/40 bg-[#26090F] shadow-[0_28px_70px_-12px_rgba(0,0,0,0.55)]">
                  <div className="aspect-[16/11] w-full overflow-hidden relative">
                    <ResilientImage
                      src="/src/assets/images/velora_luxury_hero_showcase_1790742562741.jpg"
                      alt="DesignHub PK Digital Design Studio Showcase"
                      fallbackTitle="DesignHub PK Digital Design Studio"
                      fallbackSubtitle="JPG + Editable PSD Collection"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E060B]/90 via-[#1E060B]/25 to-transparent" />

                    <div className="absolute inset-x-4 sm:inset-x-6 bottom-4 sm:bottom-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                      <div className="bg-[#28080F]/95 backdrop-blur-md border border-[#C59B6D]/40 px-5 py-4 rounded-xs">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#C59B6D]">
                          DUAL-FORMAT ARCHITECTURE
                        </p>
                        <p className="mt-1 font-serif-editorial text-xl sm:text-2xl text-[#FAF6F3]">
                          Standard JPG · Optional Editable PSD
                        </p>
                        <p className="mt-0.5 text-xs text-[#FAF6F3]/75">
                          Instant browser downloads linked permanently to your account.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigate('home')}
                        className="px-4 py-2.5 bg-[#FAF6F3]/95 hover:bg-white text-[#231518] text-[11px] font-semibold uppercase tracking-[0.18em] rounded-xs self-start sm:self-auto shrink-0 transition-colors cursor-pointer"
                      >
                        MAIN STOREFRONT →
                      </button>
                    </div>
                  </div>
                </div>
              </InteractiveTilt>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. STUDIO CRAFT & DUAL-FORMAT ARCHITECTURE (BURGUNDY EDITORIAL)
      ===================================================================== */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24 border-b border-[#C59B6D]/20">
        <RevealOnScroll>
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#C59B6D]">
              THE STUDIO PHILOSOPHY
            </p>
            <h2 className="font-serif-editorial text-3xl sm:text-5xl font-normal text-[#FAF6F3] leading-tight">
              Precision Typography, Layered Hierarchy &amp; Timeless Aesthetics
            </h2>
            <p className="text-sm sm:text-base text-[#FAF6F3]/75 leading-relaxed">
              Every DesignHub PK piece begins in our design studio with strict attention to grid
              proportion, color harmony, and print-ready resolution.
            </p>
          </div>
        </RevealOnScroll>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              num: '01',
              icon: Compass,
              kicker: 'EDITORIAL DIRECTION',
              title: 'Curated Visual Systems',
              desc: 'Designed for brands and creators who value refined typography, balanced negative space, and unmistakable visual authority.',
              footer: 'Social Media · Printables · Logos',
            },
            {
              num: '02',
              icon: FileImage,
              kicker: 'MASTER OUTPUT',
              title: 'High-Resolution JPG Standard',
              desc: 'Every single order includes the full-resolution master JPG file—ready for immediate publishing across digital or print channels.',
              footer: 'Included in Base Price',
            },
            {
              num: '03',
              icon: PenTool,
              kicker: 'SOURCE CUSTOMIZATION',
              title: 'Layered PSD Source Upgrades',
              desc: 'Select the optional PSD upgrade when you want named, organized Adobe Photoshop layers to tailor headlines, palettes, and marks.',
              footer: 'Optional Studio Upgrade',
            },
          ].map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <RevealOnScroll key={pillar.num} delayMs={idx * 80}>
                <div className="bg-[#28080F] border border-[#C59B6D]/30 rounded-xs p-7 h-full flex flex-col justify-between hover:border-[#C59B6D] transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="font-serif-editorial text-3xl text-[#C59B6D]">
                        {pillar.num}
                      </span>
                      <div className="w-10 h-10 rounded-xs bg-[#3D0F18] border border-[#C59B6D]/35 flex items-center justify-center text-[#C59B6D]">
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C59B6D]">
                      {pillar.kicker}
                    </p>
                    <h3 className="mt-1.5 font-serif-editorial text-2xl font-normal text-[#FAF6F3]">
                      {pillar.title}
                    </h3>
                    <p className="mt-3 text-xs sm:text-sm text-[#FAF6F3]/75 leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                  <p className="mt-6 pt-4 border-t border-[#C59B6D]/20 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C59B6D]">
                    {pillar.footer}
                  </p>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          3. INSIDE THE STUDIO FLATLAY & LAYERED PSD EDITION SHOWCASE
      ===================================================================== */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24 border-b border-[#C59B6D]/20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <RevealOnScroll className="lg:col-span-6">
            <div className="relative rounded-xs overflow-hidden border border-[#C59B6D]/35 bg-[#28080F] shadow-2xl">
              <div className="aspect-[4/3] w-full overflow-hidden">
                <ResilientImage
                  src="/src/assets/images/velora_luxury_craft_flatlay_1790742575943.jpg"
                  alt="DesignHub PK Studio Craft Flatlay"
                  fallbackTitle="DesignHub PK Studio Craft"
                  fallbackSubtitle="JPG & PSD Architecture"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-[#1E060B]/95 backdrop-blur-md border border-[#C59B6D]/50 px-5 py-3.5 rounded-xs text-center">
                <p className="font-serif-editorial text-lg tracking-[0.1em] text-[#FAF6F3]">
                  DesignHub PK
                </p>
                <p className="text-[8px] uppercase tracking-[0.28em] text-[#C59B6D]">
                  STUDIO ARCHIVE
                </p>
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delayMs={100} className="lg:col-span-6 space-y-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C59B6D]">
              BUILT FOR CREATORS &amp; BRANDS
            </p>
            <h2 className="font-serif-editorial text-3xl sm:text-5xl font-normal text-[#FAF6F3] leading-tight">
              From Studio Artboard to Your Personal Inventory
            </h2>
            <p className="text-sm sm:text-base text-[#FAF6F3]/80 leading-relaxed">
              When you purchase any design from DesignHub PK, your files are never lost in temporary
              links. Every completed order is automatically archived inside your personal{' '}
              <strong className="text-[#FAF6F3]">My Inventory</strong>—giving you direct browser
              downloads of your original <code className="text-[#C59B6D]">.jpg</code> and upgraded{' '}
              <code className="text-[#C59B6D]">.psd</code> files whenever you need them.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xs bg-[#28080F] border border-[#C59B6D]/25 flex items-start gap-3">
                <Sliders className="w-4 h-4 text-[#C59B6D] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#FAF6F3]">
                    Non-Destructive Layers
                  </p>
                  <p className="text-xs text-[#FAF6F3]/70 mt-1">
                    PSD upgrades keep typography and graphic layers cleanly separated.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xs bg-[#28080F] border border-[#C59B6D]/25 flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#C59B6D] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#FAF6F3]">
                    Authenticated Delivery
                  </p>
                  <p className="text-xs text-[#FAF6F3]/70 mt-1">
                    Verified account protection ensures only you can access your purchased files.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('shop', { format: 'PSD' })}
                className="px-7 py-3.5 bg-[#C59B6D] hover:bg-[#d4ab7d] text-[#231518] text-xs font-semibold uppercase tracking-[0.2em] rounded-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span>BROWSE PSD-ENABLED DESIGNS</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="px-6 py-3.5 bg-transparent hover:bg-[#FAF6F3]/10 text-[#FAF6F3] border border-[#C59B6D]/45 text-xs font-semibold uppercase tracking-[0.18em] rounded-xs transition-colors cursor-pointer"
              >
                RETURN TO HOME PAGE
              </button>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* =====================================================================
          4. STUDIO CURATED EDITIONS (ADMIN-CONTROLLED PSD & JPG RELEASES)
      ===================================================================== */}
      {showcaseProducts.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-20 border-b border-[#C59B6D]/20">
          <RevealOnScroll>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C59B6D]">
                  CURATED STUDIO RELEASES
                </p>
                <h2 className="mt-1 font-serif-editorial text-3xl sm:text-4xl font-normal text-[#FAF6F3]">
                  Signature Digital Design Editions
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#C59B6D] hover:text-[#FAF6F3] transition-colors cursor-pointer"
              >
                <span>VIEW ALL IN SHOP</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {showcaseProducts.map((item, idx) => (
              <RevealOnScroll key={item.id} delayMs={idx * 70}>
                <div className="bg-[#28080F] border border-[#C59B6D]/30 hover:border-[#C59B6D] rounded-xs overflow-hidden flex flex-col justify-between p-4 transition-all h-full">
                  <div>
                    <div
                      onClick={() => onSelectProduct(item.slug)}
                      className="aspect-[4/3] w-full rounded-xs overflow-hidden bg-[#1E060B] cursor-pointer group"
                    >
                      <ResilientImage
                        src={item.previewImages?.[0] || ''}
                        alt={item.title || 'Digital Design'}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="pt-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C59B6D]">
                        {item.category} · {item.hasPsd ? 'JPG + PSD UPGRADE' : 'HIGH-RES JPG'}
                      </p>
                      <h3 className="mt-1 font-serif-editorial text-xl sm:text-2xl text-[#FAF6F3] truncate">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs font-mono-tabular text-[#FAF6F3]/80">
                        JPG: {homepageConfig?.currencySymbol || 'Rs. '}
                        {(item.jpgPrice ?? (item as any).priceJpg ?? 0).toLocaleString()}
                        {item.hasPsd && (item.psdUpgradePrice || (item as any).priceJpgPsd) ? (
                          <> · +PSD: {homepageConfig?.currencySymbol || 'Rs. '}{(item.psdUpgradePrice ?? (item as any).priceJpgPsd ?? 0).toLocaleString()}</>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#C59B6D]/20 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onAddToCart(item, item.hasPsd ? 'JPG_PLUS_PSD' : 'JPG_ONLY')}
                      className="flex-1 py-2.5 px-3 bg-[#C59B6D] hover:bg-[#d4ab7d] text-[#231518] text-[11px] font-semibold uppercase tracking-[0.16em] rounded-xs transition-colors cursor-pointer text-center whitespace-nowrap"
                    >
                      {item.hasPsd ? 'ADD JPG + PSD' : 'ADD TO BAG'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectProduct(item.slug)}
                      className="py-2.5 px-3.5 border border-[#C59B6D]/40 hover:border-[#FAF6F3] text-[#FAF6F3] text-[11px] font-semibold uppercase tracking-[0.16em] rounded-xs transition-colors cursor-pointer"
                    >
                      DETAILS
                    </button>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================================
          5. STUDIO FOOTER CALLOUT
      ===================================================================== */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-20 text-center">
        <RevealOnScroll>
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="flex justify-center">
              <VeloraMonogram className="w-12 h-12" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#C59B6D]">
              DESIGNHUB PK DIGITAL DESIGN STUDIO
            </p>
            <h2 className="font-serif-editorial text-3xl sm:text-5xl font-normal text-[#FAF6F3]">
              Enter the Full DesignHub PK Store
            </h2>
            <p className="text-xs sm:text-sm text-[#FAF6F3]/75 leading-relaxed">
              Continue forward to browse the complete digital collection, saved designs, and instant download inventory.
            </p>
            <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="px-8 py-4 bg-[#C59B6D] hover:bg-[#d4ab7d] text-[#231518] text-xs font-semibold uppercase tracking-[0.2em] rounded-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span>ENTER STOREFRONT</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {!customer ? (
                <button
                  type="button"
                  onClick={() => onNavigate('account', { accountTab: 'create-account' })}
                  className="px-7 py-4 bg-transparent hover:bg-[#FAF6F3]/10 text-[#FAF6F3] border border-[#C59B6D]/50 text-xs font-semibold uppercase tracking-[0.2em] rounded-xs transition-colors cursor-pointer"
                >
                  CREATE ACCOUNT TO CONTINUE
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate('account', { accountTab: 'my-inventory' })}
                  className="px-7 py-4 bg-transparent hover:bg-[#FAF6F3]/10 text-[#FAF6F3] border border-[#C59B6D]/50 text-xs font-semibold uppercase tracking-[0.2em] rounded-xs transition-colors cursor-pointer"
                >
                  MY INVENTORY
                </button>
              )}
            </div>
          </div>
        </RevealOnScroll>
      </section>
    </div>
  );
}
