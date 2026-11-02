import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Download,
  CheckCircle2,
  FileImage,
  Layers,
  Sparkles,
  ShieldCheck,
  Clock,
  Sliders,
  Package,
  ChevronRight,
} from 'lucide-react';
import {
  Product,
  Category,
  HomepageConfig,
  ProductFormatSelection,
} from '../types/velora';
import { ProductCard } from '../components/ProductCard';
import { ResilientImage, OrnamentalDivider, VeloraMonogram } from '../components/VeloraLogo';
import { NavigationPage } from '../components/Header';
import {
  RevealOnScroll,
  AnimatedHeading,
  InteractiveTilt,
  MagneticButtonWrapper,
  ProductCardSkeleton,
} from '../components/MotionPrimitives';

interface HomePageProps {
  products: Product[];
  categories: Category[];
  homepageConfig: HomepageConfig;
  isLoadingStorefront?: boolean;
  wishlist: string[];
  onToggleWishlist: (productId: string) => void;
  onQuickView: (product: Product) => void;
  onSelectProduct: (slug: string) => void;
  onAddToCart: (product: Product, format: ProductFormatSelection) => boolean | void;
  onNavigate: (
    page: NavigationPage,
    params?: { category?: string; format?: string }
  ) => void;
  onNotify: (msg: string) => void;
}

export function HomePage({
  products,
  categories,
  homepageConfig,
  isLoadingStorefront = false,
  wishlist,
  onToggleWishlist,
  onQuickView,
  onSelectProduct,
  onAddToCart,
  onNavigate,
  onNotify,
}: HomePageProps) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [activeFormatPreview, setActiveFormatPreview] = useState<'JPG' | 'PSD'>('JPG');

  // Subtle mouse-follow parallax coordinates for Hero Section
  const [heroOffset, setHeroOffset] = useState({ x: 0, y: 0 });
  const [canParallax, setCanParallax] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setCanParallax(!isCoarse && !isReduced);
  }, []);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!canParallax) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setHeroOffset({ x: nx, y: ny });
  };

  const handleHeroMouseLeave = () => {
    if (!canParallax) return;
    setHeroOffset({ x: 0, y: 0 });
  };

  const featuredProducts = products.filter((p) => p.featured);
  const displayFeatured =
    featuredProducts.length > 0 ? featuredProducts.slice(0, 5) : products.slice(0, 5);
  const bestsellerProducts = products.filter((p) => p.bestseller).slice(0, 5);

  // Categories mapped from live database only (zero hardcoded demo categories)
  const allCategoriesList = categories.map((c) => ({
    name: c.name,
    subtitle: 'Curated Digital Collection',
    description:
      c.description || `Explore official DesignHub PK ${c.name} digital designs.`,
    filterParams: { category: c.name },
    image:
      c.image || '/src/assets/images/velora_luxury_hero_showcase_1790742562741.jpg',
  }));

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) {
      onNotify('Please enter a valid email address.');
      return;
    }
    setNewsletterSubmitting(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail.trim() }),
      });
      if (res.ok) {
        setNewsletterSubscribed(true);
        setNewsletterEmail('');
        onNotify('Thank you for subscribing to the DesignHub PK list.');
      } else {
        const data = await res.json();
        onNotify(data.error || 'Could not subscribe at this moment.');
      }
    } catch {
      onNotify('Unable to connect. Please try again.');
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-[#FAF6F3] text-[#231518] overflow-x-hidden">
      {/* =====================================================================
          1. MAIN LANDING HERO — LIGHT LUXURY EDITORIAL MARKETPLACE
      ===================================================================== */}
      <section
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
        className="relative overflow-hidden bg-gradient-to-r from-[#FAF6F3] via-[#F5EBE4] to-[#EDE0D6] border-b border-[#E6DAD2]"
      >
        {/* Subtle sunlit drapery & warm ambient light */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            style={{
              transform: `translate3d(${heroOffset.x * -22}px, ${heroOffset.y * -22}px, 0)`,
              transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            className="absolute -top-24 left-1/4 w-[540px] h-[540px] rounded-full bg-white/65 blur-3xl"
          />
          <div
            style={{
              transform: `translate3d(${heroOffset.x * 16}px, ${heroOffset.y * 16}px, 0)`,
              transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            className="absolute -bottom-32 right-10 w-[460px] h-[460px] rounded-full bg-[#C59B6D]/12 blur-3xl"
          />
        </div>

        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-24 pb-12 sm:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* LEFT COLUMN: Editorial Headline, Description & Primary CTAs */}
            <div className="lg:col-span-5 space-y-6">
              <div
                style={{ animationDelay: '40ms' }}
                className="animate-hero-fade-up inline-flex items-center gap-2.5"
              >
                <span className="w-6 h-px bg-[#7A545B]" aria-hidden="true" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7A545B]">
                  DESIGNHUB PK · LUXURY DIGITAL DESIGN MARKETPLACE
                </p>
              </div>

              <AnimatedHeading
                as="h1"
                text="Designs that leave a legacy."
                triggerOnScroll={false}
                baseDelayMs={90}
                staggerMs={65}
                className="font-serif-editorial text-4xl sm:text-6xl lg:text-[66px] font-normal tracking-tight text-[#231518] leading-[1.03] text-balance"
              />

              <p
                style={{ animationDelay: '220ms' }}
                className="animate-hero-fade-up text-sm sm:text-base text-[#5C474B] leading-relaxed max-w-md"
              >
                Curated digital assets for social media, fine printables, and modern brand
                identities—delivered instantly in high-resolution JPG with optional editable PSD
                source upgrades.
              </p>

              <div
                style={{ animationDelay: '300ms' }}
                className="animate-hero-fade-up pt-2 flex flex-wrap items-center gap-3.5"
              >
                <MagneticButtonWrapper>
                  <button
                    type="button"
                    onClick={() => onNavigate('shop')}
                    className="btn-velora-primary px-7 py-4 bg-[#3D0F18] text-[#FAF6F3] hover:bg-[#521521] text-xs font-semibold uppercase tracking-[0.2em] rounded-xs flex items-center justify-center gap-2.5 whitespace-nowrap cursor-pointer"
                  >
                    <span>SHOP COLLECTION</span>
                    <ArrowRight className="w-3.5 h-3.5 btn-arrow" />
                  </button>
                </MagneticButtonWrapper>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('categories-section');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      onNavigate('categories');
                    }
                  }}
                  className="btn-velora-secondary px-6 py-4 bg-white/90 hover:bg-white text-[#231518] border border-[#231518]/20 hover:border-[#3D0F18] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs flex items-center justify-center whitespace-nowrap cursor-pointer"
                >
                  EXPLORE CATEGORIES
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Layered Product Showcase */}
            <div
              style={{ animationDelay: '160ms' }}
              className="lg:col-span-7 animate-hero-scale-reveal"
            >
              <InteractiveTilt maxTiltDeg={2} scaleOnHover={1.005}>
                <div className="relative">
                  <div
                    aria-hidden="true"
                    style={{
                      transform: `translate3d(${heroOffset.x * -10}px, ${heroOffset.y * -10}px, 0)`,
                      transition: 'transform 550ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                    className="hidden sm:block absolute -inset-2.5 rounded-sm border border-[#C59B6D]/40 bg-white/35 pointer-events-none"
                  />

                  <div
                    style={{
                      transform: `translate3d(${heroOffset.x * 8}px, ${heroOffset.y * 8}px, 0)`,
                      transition: 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                    className="relative rounded-xs overflow-hidden border border-[#E6DAD2] bg-[#EAD9CE] shadow-[0_26px_64px_-14px_rgba(61,15,24,0.18)]"
                  >
                    <div className="aspect-[16/10] w-full overflow-hidden relative">
                      <ResilientImage
                        src="/src/assets/images/velora_luxury_hero_showcase_1790742562741.jpg"
                        alt="DesignHub PK luxury digital design showcase featuring social media, printable, and brand identity artboards"
                        fallbackTitle="DesignHub PK Digital Collection"
                        fallbackSubtitle="JPG + Optional PSD"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#231518]/45 via-transparent to-transparent pointer-events-none" />

                      {/* 3 Edition Plaques Overlaid at Bottom of Showcase (Interactive / Clickable) */}
                      <div className="absolute inset-x-3 sm:inset-x-6 bottom-3 sm:bottom-5 grid grid-cols-3 gap-2 sm:gap-4">
                        <button
                          type="button"
                          onClick={() => onNavigate('shop', { category: 'Social Media' })}
                          className="bg-[#FAF6F3]/95 hover:bg-white backdrop-blur-md border border-[#E6DAD2] hover:border-[#3D0F18] px-2.5 py-2 sm:px-4 sm:py-3 text-center rounded-xs shadow-md hover:shadow-lg transition-all duration-300 ease-velora cursor-pointer transform hover:-translate-y-0.5"
                        >
                          <p className="font-serif-editorial text-xs sm:text-base font-medium tracking-[0.08em] text-[#231518]">
                            SOCIAL MEDIA
                          </p>
                          <p className="mt-0.5 text-[8px] sm:text-[9px] uppercase tracking-[0.18em] text-[#7A545B] truncate">
                            JPG · PSD OPTION
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigate('shop', { category: 'Printables' })}
                          className="bg-white/95 hover:bg-white backdrop-blur-md border border-[#C59B6D]/60 hover:border-[#3D0F18] px-2.5 py-2 sm:px-4 sm:py-3 text-center rounded-xs shadow-md hover:shadow-lg transition-all duration-300 ease-velora cursor-pointer transform hover:-translate-y-0.5"
                        >
                          <p className="font-serif-editorial text-xs sm:text-base font-medium tracking-[0.08em] text-[#3D0F18]">
                            PRINTABLES
                          </p>
                          <p className="mt-0.5 text-[8px] sm:text-[9px] uppercase tracking-[0.18em] text-[#7A545B] truncate">
                            HIGH-RESOLUTION
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigate('shop', { category: 'Logos' })}
                          className="bg-[#FAF6F3]/95 hover:bg-white backdrop-blur-md border border-[#E6DAD2] hover:border-[#3D0F18] px-2.5 py-2 sm:px-4 sm:py-3 text-center rounded-xs shadow-md hover:shadow-lg transition-all duration-300 ease-velora cursor-pointer transform hover:-translate-y-0.5"
                        >
                          <p className="font-serif-editorial text-xs sm:text-base font-medium tracking-[0.08em] text-[#231518]">
                            LOGOS
                          </p>
                          <p className="mt-0.5 text-[8px] sm:text-[9px] uppercase tracking-[0.18em] text-[#7A545B] truncate">
                            BRAND IDENTITY
                          </p>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </InteractiveTilt>
            </div>
          </div>

          {/* Bottom-of-Hero 4-Pillar Trust Bar (Circles removed, items clickable) */}
          <div className="mt-12 sm:mt-14 pt-7 border-t border-[#231518]/10 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-4xl">
            {[
              {
                icon: Download,
                line1: 'INSTANT',
                line2: 'DIGITAL ACCESS',
                action: () => onNavigate('shop'),
              },
              {
                icon: FileImage,
                line1: 'HIGH-RESOLUTION',
                line2: 'JPG INCLUDED',
                action: () => onNavigate('shop'),
              },
              {
                icon: Layers,
                line1: 'OPTIONAL',
                line2: 'PSD UPGRADES',
                action: () => onNavigate('studio'),
              },
              {
                icon: Package,
                line1: 'PERMANENT',
                line2: 'MY INVENTORY',
                action: () => onNavigate('account'),
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={item.action}
                  className="flex items-center gap-3 group text-left cursor-pointer transition-transform duration-200 hover:translate-x-1"
                >
                  <Icon className="w-5 h-5 text-[#3D0F18] shrink-0 transition-transform duration-300 ease-velora group-hover:scale-115" />
                  <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#231518] leading-tight">
                    <span className="block group-hover:text-[#3D0F18] transition-colors">{item.line1}</span>
                    <span className="block text-[#6E5A5D] group-hover:text-[#231518] transition-colors">{item.line2}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. CATEGORIES — SOCIAL MEDIA, PRINTABLES, LOGOS
      ===================================================================== */}
      <section
        id="categories-section"
        className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pt-16 sm:pt-24 pb-12 sm:pb-16"
      >
        <RevealOnScroll>
          <div className="text-center mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7A545B] mb-2">
              BROWSE BY CATEGORY
            </p>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#231518]">
              Curated Design Categories
            </h2>
            <OrnamentalDivider />
          </div>
        </RevealOnScroll>

        {allCategoriesList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {allCategoriesList.map((cat, idx) => (
              <RevealOnScroll key={cat.name} delayMs={idx * 70}>
                <div
                  onClick={() => onNavigate('shop', cat.filterParams)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNavigate('shop', cat.filterParams);
                    }
                  }}
                  className="group bg-white border border-[#E6DAD2] hover:border-[#C59B6D] rounded-xs overflow-hidden cursor-pointer flex flex-col justify-between h-full velora-surface-card velora-surface-card-hover"
                >
                  <div>
                    <div className="aspect-[16/10] w-full bg-[#F3EAE4] overflow-hidden relative">
                      <ResilientImage
                        src={cat.image}
                        alt={cat.name}
                        fallbackTitle={cat.name}
                        className="w-full h-full object-cover transition-transform duration-[750ms] ease-velora group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#231518]/55 via-transparent to-transparent" />
                      <div className="absolute bottom-3.5 left-5 right-5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FAF6F3]/85">
                          {cat.subtitle}
                        </p>
                        <h3 className="font-serif-editorial text-2xl sm:text-3xl font-medium text-[#FAF6F3] mt-0.5">
                          {cat.name}
                        </h3>
                      </div>
                    </div>

                    <div className="p-6">
                      <p className="text-xs sm:text-sm text-[#5C474B] leading-relaxed">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-[#FAF6F3]">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D0F18]">
                      SHOP {cat.name.toUpperCase()}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#3D0F18] transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        ) : (
          <RevealOnScroll>
            <div className="bg-white border border-[#E6DAD2] rounded-xs p-8 sm:p-12 text-center max-w-3xl mx-auto velora-surface-card">
              <h3 className="font-serif-editorial text-2xl font-semibold text-[#231518]">
                Ready for Your Categories &amp; Collections
              </h3>
              <p className="mt-2 text-sm text-[#6E5A5D] max-w-lg mx-auto leading-relaxed">
                No categories have been added yet. Custom categories and digital collections will appear here once published.
              </p>
            </div>
          </RevealOnScroll>
        )}
      </section>

      {/* =====================================================================
          3. FEATURED PRODUCTS (REAL CATALOG DATA ONLY)
      ===================================================================== */}
      {homepageConfig.showFeaturedSection && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-12 sm:py-18">
          <RevealOnScroll>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7A545B]">
                  OFFICIAL CATALOG
                </p>
                <h2 className="mt-1 font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#231518]">
                  Featured Digital Designs
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="group inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#231518] hover:text-[#3D0F18] transition-colors cursor-pointer"
              >
                <span className="velora-link-underline">VIEW ALL DESIGNS</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform duration-250 group-hover:translate-x-1" />
              </button>
            </div>
          </RevealOnScroll>

          {isLoadingStorefront ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {[0, 1, 2, 3, 4].map((n) => (
                <ProductCardSkeleton key={n} />
              ))}
            </div>
          ) : displayFeatured.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {displayFeatured.map((product, idx) => (
                  <RevealOnScroll key={product.id} delayMs={(idx % 5) * 60}>
                    <ProductCard
                      product={product}
                      currencySymbol={homepageConfig.currencySymbol}
                      isWishlisted={wishlist.includes(product.id)}
                      onToggleWishlist={onToggleWishlist}
                      onQuickView={onQuickView}
                      onSelectProduct={onSelectProduct}
                      onAddToCart={onAddToCart}
                    />
                  </RevealOnScroll>
                ))}
              </div>

              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => onNavigate('shop')}
                  className="btn-velora-primary px-8 py-3.5 bg-[#3D0F18] text-[#FAF6F3] hover:bg-[#521521] text-xs font-semibold uppercase tracking-[0.2em] rounded-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>SHOP COLLECTION</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            /* Client-Ready Empty Catalog State — Zero fake products */
            <RevealOnScroll>
              <div className="bg-white border border-[#E6DAD2] rounded-xs p-8 sm:p-12 text-center max-w-3xl mx-auto velora-surface-card">
                <div className="w-12 h-12 rounded-full bg-[#FAF6F3] border border-[#E6DAD2] flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-5 h-5 text-[#C59B6D]" />
                </div>
                <h3 className="font-serif-editorial text-2xl font-semibold text-[#231518]">
                  Ready for Your Official DesignHub PK Digital Designs
                </h3>
                <p className="mt-2 text-sm text-[#6E5A5D] max-w-lg mx-auto leading-relaxed">
                  Your luxury storefront catalog is connected and ready. Publish your official
                  DesignHub PK designs—with standard high-resolution JPG files and optional editable PSD
                  upgrades—directly through the Studio Admin Panel.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('shop')}
                    className="btn-velora-secondary px-6 py-3 bg-[#FAF6F3] border border-[#E6DAD2] hover:border-[#3D0F18] text-[#231518] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs cursor-pointer"
                  >
                    OPEN SHOP CATALOG
                  </button>
                </div>
              </div>
            </RevealOnScroll>
          )}
        </section>
      )}

      {/* =====================================================================
          4. MOST LOVED (Only shown when real bestseller products exist)
      ===================================================================== */}
      {homepageConfig.showMostLovedSection && bestsellerProducts.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-14 sm:pb-20">
          <RevealOnScroll>
            <div className="text-center mb-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7A545B] mb-1">
                CLIENT FAVORITES
              </p>
              <h2 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#231518]">
                Most Loved Designs
              </h2>
              <OrnamentalDivider />
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {bestsellerProducts.map((product, idx) => (
              <RevealOnScroll key={product.id} delayMs={(idx % 5) * 60}>
                <ProductCard
                  product={product}
                  currencySymbol={homepageConfig.currencySymbol}
                  isWishlisted={wishlist.includes(product.id)}
                  onToggleWishlist={onToggleWishlist}
                  onQuickView={onQuickView}
                  onSelectProduct={onSelectProduct}
                  onAddToCart={onAddToCart}
                />
              </RevealOnScroll>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================================
          5. COLLECTION / SHOP CTA — EDITORIAL FORMAT SHOWCASE
      ===================================================================== */}
      {homepageConfig.showPsdUpgradeSection && (
        <section className="bg-[#F3EAE4] border-y border-[#E6DAD2]">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              {/* Left Column: Editorial Format Story + Interactive Format Switcher */}
              <RevealOnScroll className="lg:col-span-6 space-y-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7A545B]">
                  COLLECTION &amp; FORMAT ARCHITECTURE
                </p>

                <AnimatedHeading
                  as="h2"
                  text="Every design ready to use—or ready to customize."
                  className="font-serif-editorial text-3xl sm:text-5xl font-normal text-[#231518] leading-[1.08] text-balance"
                />

                <p className="text-sm sm:text-base text-[#5C474B] leading-relaxed">
                  Explore the DesignHub PK digital collection knowing every product includes a crisp,
                  high-resolution <strong>JPG</strong> file as standard, with an optional{' '}
                  <strong>PSD</strong> upgrade whenever your project calls for full layer-by-layer
                  editing in Adobe Photoshop.
                </p>

                {/* Interactive Format Comparison Toggle */}
                <div className="pt-1">
                  <div className="inline-flex rounded-xs p-1 bg-white border border-[#E6DAD2] mb-4">
                    <button
                      type="button"
                      onClick={() => setActiveFormatPreview('JPG')}
                      className={`px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] rounded-xs transition-all duration-250 cursor-pointer ${
                        activeFormatPreview === 'JPG'
                          ? 'bg-[#3D0F18] text-[#FAF6F3]'
                          : 'text-[#6E5A5D] hover:text-[#231518]'
                      }`}
                    >
                      JPG · Standard (Included)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFormatPreview('PSD')}
                      className={`px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] rounded-xs transition-all duration-250 cursor-pointer ${
                        activeFormatPreview === 'PSD'
                          ? 'bg-[#3D0F18] text-[#FAF6F3]'
                          : 'text-[#6E5A5D] hover:text-[#231518]'
                      }`}
                    >
                      PSD · Editable Upgrade
                    </button>
                  </div>

                  <div className="bg-white border border-[#E6DAD2] rounded-xs p-5 shadow-xs">
                    {activeFormatPreview === 'JPG' ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-serif-editorial text-lg font-semibold text-[#231518]">
                            High-Resolution JPG Format
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3D0F18]">
                            INCLUDED EVERY ORDER
                          </span>
                        </div>
                        <p className="text-xs text-[#6E5A5D] leading-relaxed">
                          Prepared for immediate publishing, social media posting, and crisp print
                          reproduction at the base product price.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-serif-editorial text-lg font-semibold text-[#3D0F18]">
                            Editable Layered PSD Source File
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C59B6D]">
                            OPTIONAL UPGRADE
                          </span>
                        </div>
                        <p className="text-xs text-[#6E5A5D] leading-relaxed">
                          Includes the standard JPG plus the organized Adobe Photoshop (.PSD)
                          source file so you can customize typography, colors, and layout layers.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => onNavigate('shop')}
                    className="btn-velora-primary px-7 py-3.5 bg-[#3D0F18] text-[#FAF6F3] hover:bg-[#521521] text-xs font-semibold uppercase tracking-[0.2em] rounded-xs inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <span>SHOP COLLECTION</span>
                    <ArrowRight className="w-3.5 h-3.5 btn-arrow" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('studio')}
                    className="btn-velora-secondary px-6 py-3.5 bg-white hover:bg-[#FAF6F3] text-[#231518] border border-[#E6DAD2] hover:border-[#3D0F18] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <span>EXPLORE DESIGNHUB PK STUDIO</span>
                  </button>
                </div>
              </RevealOnScroll>

              {/* Right Column: Overhead Luxury Flatlay */}
              <RevealOnScroll delayMs={100} className="lg:col-span-6">
                <InteractiveTilt maxTiltDeg={1.8} scaleOnHover={1.005}>
                  <div className="relative rounded-xs overflow-hidden border border-[#E6DAD2] bg-[#EAD9CE] shadow-[0_24px_56px_-12px_rgba(61,15,24,0.16)]">
                    <div className="aspect-[4/3] w-full overflow-hidden">
                      <ResilientImage
                        src="/src/assets/images/velora_luxury_craft_flatlay_1790742575943.jpg"
                        alt="DesignHub PK studio flat-lay showing presentation card, gold swatches, and graphic design layouts"
                        fallbackTitle="DesignHub PK Collection"
                        fallbackSubtitle="JPG & PSD Formats"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-white/95 backdrop-blur-md border border-[#E6DAD2] px-5 py-3.5 rounded-xs text-center shadow-lg">
                      <p className="font-serif-editorial text-lg font-medium tracking-[0.1em] text-[#231518]">
                        DesignHub PK
                      </p>
                      <p className="text-[8px] uppercase tracking-[0.28em] text-[#7A545B]">
                        DIGITAL COLLECTION
                      </p>
                      <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-[#3D0F18] font-semibold">
                        JPG + PSD EDITION
                      </p>
                    </div>
                  </div>
                </InteractiveTilt>
              </RevealOnScroll>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          6. WHY VELORA — 5 ACTUAL STORE BENEFITS
      ===================================================================== */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24 border-b border-[#E6DAD2]">
        <RevealOnScroll>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7A545B] mb-2">
              WHY CHOOSE DESIGNHUB PK
            </p>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#231518]">
              Crafted for Effortless Digital Ownership
            </h2>
            <OrnamentalDivider />
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {[
            {
              icon: Sparkles,
              title: 'Ready-to-Use Designs',
              desc: 'Compositions crafted for immediate social media publishing, branding, and print use.',
              meta: 'Editorial Quality',
            },
            {
              icon: FileImage,
              title: 'High-Resolution JPG',
              desc: 'Every purchase includes the original high-resolution master .jpg file as standard.',
              meta: 'Standard Included',
            },
            {
              icon: Sliders,
              title: 'Optional PSD Upgrades',
              desc: 'Upgrade eligible designs to receive the layered Adobe Photoshop (.psd) source file.',
              meta: 'Full Layer Control',
            },
            {
              icon: Clock,
              title: 'Instant Digital Access',
              desc: 'No shipping delays—your purchased files unlock immediately after payment confirmation.',
              meta: 'Immediate Delivery',
            },
            {
              icon: ShieldCheck,
              title: 'Personal Inventory Access',
              desc: 'Every completed purchase is permanently saved in your account’s My Inventory for future downloads.',
              meta: 'Lifetime Re-Downloads',
            },
          ].map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <RevealOnScroll key={benefit.title} delayMs={idx * 60}>
                <div className="bg-white border border-[#E6DAD2] hover:border-[#C59B6D] rounded-xs p-6 flex flex-col justify-between h-full velora-surface-card velora-surface-card-hover">
                  <div>
                    <div className="w-10 h-10 rounded-full bg-[#FAF6F3] border border-[#E6DAD2] flex items-center justify-center text-[#3D0F18] mb-5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-serif-editorial text-xl font-semibold text-[#231518] leading-snug">
                      {benefit.title}
                    </h3>
                    <p className="mt-2.5 text-xs text-[#5C474B] leading-relaxed">
                      {benefit.desc}
                    </p>
                  </div>
                  <p className="mt-5 pt-3 border-t border-[#E6DAD2] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7A545B]">
                    {benefit.meta}
                  </p>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          7. FINAL CALL TO ACTION — LIGHT LUXURY EDITORIAL SHOWCASE
      ===================================================================== */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24">
        <RevealOnScroll>
          <div className="relative bg-gradient-to-br from-[#F5EBE4] via-[#EFE1D6] to-[#E6D3C5] border border-[#D8C3B4] rounded-xs p-8 sm:p-14 lg:p-20 text-center overflow-hidden shadow-[0_20px_50px_-14px_rgba(61,15,24,0.12)]">
            <div className="max-w-2xl mx-auto space-y-5 relative z-10">
              <div className="flex justify-center">
                <VeloraMonogram className="w-11 h-11" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#7A545B]">
                DESIGNHUB PK DIGITAL MARKETPLACE
              </p>
              <h2 className="font-serif-editorial text-3xl sm:text-5xl font-normal text-[#231518] leading-tight">
                {homepageConfig.promoHeadline ||
                  'Because your brand deserves something exquisite.'}
              </h2>
              <p className="text-xs sm:text-base text-[#5C474B] leading-relaxed max-w-xl mx-auto">
                {homepageConfig.promoSubtext ||
                  'Explore premium digital assets created for modern creators, businesses, and brands—with instant JPG & optional PSD downloads saved to your personal inventory.'}
              </p>

              <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
                <MagneticButtonWrapper>
                  <button
                    type="button"
                    onClick={() => onNavigate('shop')}
                    className="btn-velora-primary px-9 py-4 bg-[#3D0F18] text-[#FAF6F3] hover:bg-[#521521] text-xs font-semibold uppercase tracking-[0.2em] rounded-xs inline-flex items-center gap-2.5 shadow-md cursor-pointer"
                  >
                    <span>SHOP COLLECTION</span>
                    <ArrowRight className="w-4 h-4 btn-arrow" />
                  </button>
                </MagneticButtonWrapper>

                <button
                  type="button"
                  onClick={() => onNavigate('categories')}
                  className="btn-velora-secondary px-7 py-4 bg-white/90 hover:bg-white text-[#231518] border border-[#231518]/20 hover:border-[#3D0F18] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>VIEW COLLECTIONS</span>
                </button>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        {/* Subtle Newsletter Sign-Up Strip */}
        <RevealOnScroll delayMs={80}>
          <div className="mt-10 bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="font-serif-editorial text-2xl font-normal text-[#231518]">
                Stay inspired &amp; get the newest designs first
              </h3>
              <p className="mt-1 text-xs text-[#6E5A5D]">
                Join the DesignHub PK list for new releases and studio updates.
              </p>
            </div>

            <div className="w-full md:w-auto shrink-0">
              {newsletterSubscribed ? (
                <div className="px-5 py-3 rounded-xs bg-[#FAF6F3] border border-[#C59B6D]/40 text-xs text-[#231518] flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3D0F18] shrink-0" />
                  <span>Subscribed to the DesignHub PK release list.</span>
                </div>
              ) : (
                <form
                  onSubmit={handleNewsletterSubmit}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0"
                >
                  <label htmlFor="velora-newsletter-email" className="sr-only">
                    Enter your email address
                  </label>
                  <input
                    id="velora-newsletter-email"
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full sm:w-64 px-4 py-3 bg-[#FAF6F3] border border-[#E6DAD2] text-[#231518] placeholder:text-[#6E5A5D] text-xs rounded-xs sm:rounded-r-none focus:outline-none focus:border-[#3D0F18]"
                  />
                  <button
                    type="submit"
                    disabled={newsletterSubmitting}
                    className="px-6 py-3 bg-[#3D0F18] hover:bg-[#521521] text-[#FAF6F3] text-[11px] font-semibold uppercase tracking-[0.18em] rounded-xs sm:rounded-l-none transition-colors whitespace-nowrap disabled:opacity-50 cursor-pointer"
                  >
                    {newsletterSubmitting ? 'JOINING...' : 'SUBSCRIBE'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </RevealOnScroll>
      </section>
    </div>
  );
}
