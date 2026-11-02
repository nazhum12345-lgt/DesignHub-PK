import React, { useState, useEffect } from 'react';
import {
  Heart,
  ShoppingBag,
  Zap,
  CheckCircle2,
  ArrowLeft,
  Layers,
  FileImage,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  Product,
  ProductFormatSelection,
  HomepageConfig,
} from '../types/velora';
import { ResilientImage, OrnamentalDivider } from '../components/VeloraLogo';
import { ProductCard } from '../components/ProductCard';
import { NavigationPage } from '../components/Header';
import { RevealOnScroll } from '../components/MotionPrimitives';

interface ProductDetailPageProps {
  product: Product | null;
  allProducts: Product[];
  homepageConfig: HomepageConfig;
  isWishlisted: boolean;
  wishlist: string[];
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product, format: ProductFormatSelection) => boolean | void;
  onBuyNow: (product: Product, format: ProductFormatSelection) => void;
  onQuickView: (product: Product) => void;
  onSelectProduct: (slug: string) => void;
  onNavigate: (page: NavigationPage, params?: { category?: string }) => void;
}

export function ProductDetailPage({
  product,
  allProducts,
  homepageConfig,
  isWishlisted,
  wishlist,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
  onQuickView,
  onSelectProduct,
  onNavigate,
}: ProductDetailPageProps) {
  const [selectedFormat, setSelectedFormat] = useState<ProductFormatSelection>('JPG_ONLY');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [justAdded, setJustAdded] = useState(false);
  const [heartPop, setHeartPop] = useState(false);

  useEffect(() => {
    setSelectedFormat('JPG_ONLY');
    setActiveImageIndex(0);
    setJustAdded(false);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    const prevTitle = document.title;
    document.title = product.seoTitle || `${product.title} — DesignHub PK Digital Design`;

    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute('content') || '';
    if (metaDesc && (product.seoDescription || product.description)) {
      metaDesc.setAttribute('content', product.seoDescription || product.description);
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc) {
        metaDesc.setAttribute('content', prevDesc);
      }
    };
  }, [product]);

  if (!product) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-20 text-center">
        <h1 className="font-serif-editorial text-3xl font-semibold text-[#231518]">
          Design Not Found
        </h1>
        <p className="mt-2 text-sm text-[#6E5A5D]">
          The requested digital design could not be located or may have been removed.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('shop')}
          className="btn-velora-primary mt-6 px-6 py-3 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  const jpgPrice = product.jpgPrice ?? (product as any).priceJpg ?? 0;
  const psdUpgradePrice =
    product.hasPsd && (product.psdUpgradePrice || (product as any).priceJpgPsd)
      ? (product.psdUpgradePrice ?? (product as any).priceJpgPsd ?? 0)
      : 0;
  const selectedPsdAdd = selectedFormat === 'JPG_PLUS_PSD' && product.hasPsd ? psdUpgradePrice : 0;
  const calculatedTotal = (jpgPrice || 0) + (selectedPsdAdd || 0);

  const relatedProducts = allProducts
    .filter(
      (p) =>
        p.id !== product.id &&
        (p.category === product.category ||
          p.tags.some((t) => product.tags.includes(t)))
    )
    .slice(0, 4);

  const images =
    product.previewImages && product.previewImages.length > 0
      ? product.previewImages
      : ['/src/assets/images/velora_luxury_hero_showcase_1790742562741.jpg'];

  const handleAddClick = () => {
    const added = onAddToCart(product, selectedFormat);
    if (added !== false) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1300);
    }
  };

  const handleWishlistToggle = () => {
    setHeartPop(true);
    onToggleWishlist(product.id);
    setTimeout(() => setHeartPop(false), 400);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.title,
            description: product.description,
            category: product.category,
            brand: { '@type': 'Brand', name: 'DesignHub PK' },
            offers: {
              '@type': 'Offer',
              price: calculatedTotal,
              priceCurrency: homepageConfig.currencyCode,
              availability: 'https://schema.org/InStock',
            },
          }),
        }}
      />

      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <nav
          aria-label="Breadcrumb"
          className="text-xs text-[#6E5A5D] flex items-center gap-2 truncate"
        >
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="velora-link-underline hover:text-[#3D0F18] transition-colors"
          >
            Home
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="velora-link-underline hover:text-[#3D0F18] transition-colors"
          >
            Shop
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            onClick={() => onNavigate('shop', { category: product.category })}
            className="velora-link-underline hover:text-[#3D0F18] transition-colors"
          >
            {product.category}
          </button>
          <span aria-hidden="true">/</span>
          <span className="text-[#3D0F18] font-medium truncate">{product.title}</span>
        </nav>

        <button
          type="button"
          onClick={() => onNavigate('shop')}
          className="group inline-flex items-center gap-1.5 text-xs font-medium text-[#6E5A5D] hover:text-[#3D0F18] shrink-0 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-250 group-hover:-translate-x-1" />
          <span>Back to Catalog</span>
        </button>
      </div>

      {/* Main Two-Column Product Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* LEFT: Large Product Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="group aspect-[4/3] w-full rounded-xs overflow-hidden bg-[#F3EAE4] border border-[#E6DAD2] velora-surface-card">
            <ResilientImage
              key={images[activeImageIndex] || images[0]}
              src={images[activeImageIndex] || images[0]}
              alt={product.title}
              fallbackTitle={product.title}
              fallbackSubtitle={product.category}
              className="w-full h-full object-cover transition-transform duration-700 ease-velora group-hover:scale-[1.03]"
            />
          </div>

          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 h-16 rounded-xs overflow-hidden border shrink-0 transition-all duration-250 ease-velora ${
                    activeImageIndex === idx
                      ? 'border-[#3D0F18] ring-1 ring-[#3D0F18] scale-[1.02]'
                      : 'border-[#E6DAD2] opacity-70 hover:opacity-100'
                  }`}
                >
                  <ResilientImage
                    src={imgUrl}
                    alt={`${product.title} view ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Contiguous Luxury Purchase Module */}
        <div className="lg:col-span-5 bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-8 space-y-6 velora-surface-card">
          <div>
            <div className="flex items-center flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-[#7A545B] font-semibold mb-2">
              <span>{product.category}</span>
              <span aria-hidden="true">·</span>
              <span>Instant Download</span>
              {product.new && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#3D0F18]">New Release</span>
                </>
              )}
              {product.bestseller && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#C59B6D]">Bestseller</span>
                </>
              )}
            </div>

            <h1 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#231518]">
              {product.title}
            </h1>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-2xl font-mono-tabular font-bold text-[#3D0F18]">
                {homepageConfig.currencySymbol}
                {calculatedTotal.toLocaleString()}
              </span>
              {product.oldPrice && product.oldPrice > (product.jpgPrice ?? 0) && (
                <span className="text-sm font-mono-tabular text-[#6E5A5D] line-through">
                  {homepageConfig.currencySymbol}
                  {(product.oldPrice || 0).toLocaleString()}
                </span>
              )}
            </div>

            {product.description && (
              <p className="mt-4 text-sm text-[#5C474B] leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          {/* Purchase Selector: JPG ONLY vs JPG + PSD */}
          <div className="space-y-3 pt-4 border-t border-[#E6DAD2]">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#231518]">
              Select File Package
            </label>

            {/* Option 1: JPG ONLY */}
            <button
              type="button"
              onClick={() => setSelectedFormat('JPG_ONLY')}
              className={`w-full p-4 rounded-xs border text-left transition-all duration-250 ease-velora flex items-start justify-between gap-4 ${
                selectedFormat === 'JPG_ONLY'
                  ? 'border-[#3D0F18] bg-[#FAF6F3] ring-1 ring-[#3D0F18]'
                  : 'border-[#E6DAD2] bg-white hover:border-[#3D0F18]/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <FileImage className="w-4 h-4 text-[#3D0F18] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#231518]">
                    JPG ONLY
                  </p>
                  <p className="text-xs text-[#6E5A5D] mt-0.5">
                    Ready-to-use high-resolution design file
                  </p>
                </div>
              </div>
              <span className="text-sm font-mono-tabular font-semibold text-[#231518] whitespace-nowrap">
                {homepageConfig.currencySymbol}
                {jpgPrice.toLocaleString()}
              </span>
            </button>

            {/* Option 2: JPG + PSD */}
            {product.hasPsd && (
              <button
                type="button"
                onClick={() => setSelectedFormat('JPG_PLUS_PSD')}
                className={`w-full p-4 rounded-xs border text-left transition-all duration-250 ease-velora flex items-start justify-between gap-4 ${
                  selectedFormat === 'JPG_PLUS_PSD'
                    ? 'border-[#3D0F18] bg-[#FAF6F3] ring-1 ring-[#3D0F18]'
                    : 'border-[#E6DAD2] bg-white hover:border-[#3D0F18]/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Layers className="w-4 h-4 text-[#C59B6D] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#3D0F18]">
                      JPG + PSD
                    </p>
                    <p className="text-xs text-[#6E5A5D] mt-0.5">
                      Standard ready-to-use JPG + Editable layered PSD source file
                    </p>
                  </div>
                </div>
                <span className="text-sm font-mono-tabular font-semibold text-[#3D0F18] whitespace-nowrap">
                  +{homepageConfig.currencySymbol}
                  {psdUpgradePrice.toLocaleString()}
                </span>
              </button>
            )}

            {/* Dynamic Price Calculation Summary */}
            <div className="bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs p-3.5 space-y-1.5 text-xs font-mono-tabular">
              <div className="flex items-center justify-between text-[#6E5A5D]">
                <span>JPG — Base Price</span>
                <span>
                  {homepageConfig.currencySymbol}
                  {jpgPrice.toLocaleString()}
                </span>
              </div>
              {selectedFormat === 'JPG_PLUS_PSD' && product.hasPsd && (
                <div className="flex items-center justify-between text-[#6E5A5D]">
                  <span>PSD Upgrade — Editable Source</span>
                  <span>
                    +{homepageConfig.currencySymbol}
                    {psdUpgradePrice.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="pt-1.5 border-t border-[#E6DAD2] flex items-center justify-between font-semibold text-[#3D0F18] text-sm">
                <span>TOTAL</span>
                <span>
                  {homepageConfig.currencySymbol}
                  {calculatedTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddClick}
                className={`btn-velora-primary flex-1 py-3.5 px-5 text-xs font-semibold uppercase tracking-[0.18em] rounded-xs flex items-center justify-center gap-2 whitespace-nowrap ${
                  justAdded
                    ? 'bg-emerald-900 text-white'
                    : 'bg-[#3D0F18] text-[#FAF6F3] hover:bg-[#521521]'
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>ADDED TO CART</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>ADD TO CART</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleWishlistToggle}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                className={`p-3.5 rounded-xs border transition-all duration-300 ease-velora ${
                  isWishlisted
                    ? 'bg-[#3D0F18] text-[#FAF6F3] border-[#3D0F18]'
                    : 'bg-white text-[#231518] border-[#E6DAD2] hover:border-[#3D0F18]'
                } ${heartPop ? 'animate-heart-pop' : ''}`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onBuyNow(product, selectedFormat)}
              className="btn-velora-secondary w-full py-3.5 px-5 bg-[#F3EAE4] hover:bg-[#E6DAD2] border border-[#E6DAD2] hover:border-[#3D0F18]/40 text-[#231518] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Zap className="w-4 h-4 text-[#3D0F18]" />
              <span>BUY NOW — INSTANT CHECKOUT</span>
            </button>
          </div>

          <div className="pt-3 border-t border-[#E6DAD2] flex items-center gap-2 text-xs text-[#6E5A5D]">
            <ShieldCheck className="w-4 h-4 text-[#C59B6D] shrink-0" />
            <span>Protected digital delivery · Signed download links unlocked upon payment</span>
          </div>
        </div>
      </div>

      {/* BELOW THE FOLD: WHAT'S INCLUDED, PRODUCT DETAILS, HOW IT WORKS */}
      <div className="mt-16 pt-12 border-t border-[#E6DAD2] grid grid-cols-1 md:grid-cols-3 gap-8">
        <RevealOnScroll delayMs={0}>
          <div className="bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-7 h-full velora-surface-card">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3D0F18] mb-4">
              WHAT&apos;S INCLUDED
            </h2>
            <ul className="space-y-3 text-sm text-[#5C474B]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#3D0F18] mt-0.5 shrink-0" />
                <span>
                  <strong className="text-[#231518]">Standard JPG File:</strong> High-resolution
                  ready-to-use design ({product.jpgFileName || `${product.slug}.jpg`})
                </span>
              </li>
              {product.hasPsd && (
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#C59B6D] mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-[#231518]">Optional PSD Upgrade:</strong> Layered source
                    file ({product.psdFileName || `${product.slug}.psd`}) unlocked when JPG + PSD is
                    selected
                  </span>
                </li>
              )}
              {product.whatsIncluded?.map((inc, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#3D0F18] mt-0.5 shrink-0" />
                  <span>{inc}</span>
                </li>
              ))}
            </ul>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delayMs={70}>
          <div className="bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-7 h-full velora-surface-card">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3D0F18] mb-4">
              PRODUCT DETAILS
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 pb-2.5 border-b border-[#E6DAD2]/60">
                <dt className="text-[#6E5A5D]">Dimensions</dt>
                <dd className="font-mono-tabular font-medium text-[#231518] text-right">
                  {product.dimensions || '3000 × 3000 px'}
                </dd>
              </div>
              <div className="flex justify-between gap-4 pb-2.5 border-b border-[#E6DAD2]/60">
                <dt className="text-[#6E5A5D]">File Format</dt>
                <dd className="font-medium text-[#231518] text-right">
                  JPG {product.hasPsd ? '+ Optional PSD' : 'Only'}
                </dd>
              </div>
              <div className="flex justify-between gap-4 pb-2.5 border-b border-[#E6DAD2]/60">
                <dt className="text-[#6E5A5D]">Usage</dt>
                <dd className="font-medium text-[#231518] text-right">
                  {product.usageRights || 'Commercial & Personal Use'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#6E5A5D]">Compatibility</dt>
                <dd className="font-medium text-[#231518] text-right">
                  {product.compatibility || 'All Devices / Adobe Photoshop'}
                </dd>
              </div>
            </dl>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delayMs={140}>
          <div className="bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-7 h-full velora-surface-card">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3D0F18] mb-4">
              HOW IT WORKS
            </h2>
            <ol className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="font-mono-tabular text-xs font-semibold text-[#C59B6D] mt-0.5">
                  01.
                </span>
                <div>
                  <p className="font-semibold text-[#231518]">Purchase</p>
                  <p className="text-xs text-[#6E5A5D] mt-0.5">
                    Select JPG Only or JPG + PSD and complete guest or account checkout.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-mono-tabular text-xs font-semibold text-[#C59B6D] mt-0.5">
                  02.
                </span>
                <div>
                  <p className="font-semibold text-[#231518]">Payment Confirmation</p>
                  <p className="text-xs text-[#6E5A5D] mt-0.5">
                    Your payment is verified securely on the server.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-mono-tabular text-xs font-semibold text-[#C59B6D] mt-0.5">
                  03.
                </span>
                <div>
                  <p className="font-semibold text-[#231518]">Instant Download</p>
                  <p className="text-xs text-[#6E5A5D] mt-0.5">
                    Download your high-resolution JPG (and PSD if purchased) immediately.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </RevealOnScroll>
      </div>

      {/* RELATED DESIGNS */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 pt-12 border-t border-[#E6DAD2]">
          <RevealOnScroll>
            <div className="text-center mb-10">
              <h2 className="text-lg sm:text-xl font-semibold uppercase tracking-[0.24em] text-[#231518]">
                RELATED DESIGNS
              </h2>
              <OrnamentalDivider />
            </div>
          </RevealOnScroll>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((rel, idx) => (
              <RevealOnScroll key={rel.id} delayMs={idx * 60}>
                <ProductCard
                  product={rel}
                  currencySymbol={homepageConfig.currencySymbol}
                  isWishlisted={wishlist.includes(rel.id)}
                  onToggleWishlist={onToggleWishlist}
                  onQuickView={onQuickView}
                  onSelectProduct={onSelectProduct}
                  onAddToCart={onAddToCart}
                />
              </RevealOnScroll>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
