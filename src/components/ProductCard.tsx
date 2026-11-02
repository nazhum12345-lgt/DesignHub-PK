import React, { useState } from 'react';
import { Heart, Eye, Check } from 'lucide-react';
import { Product, ProductFormatSelection } from '../types/velora';
import { ResilientImage } from './VeloraLogo';

interface ProductCardProps {
  product: Product;
  currencySymbol: string;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
  onQuickView: (product: Product) => void;
  onSelectProduct: (slug: string) => void;
  onAddToCart: (product: Product, format: ProductFormatSelection) => boolean | void;
}

export function ProductCard({
  product,
  currencySymbol,
  isWishlisted,
  onToggleWishlist,
  onQuickView,
  onSelectProduct,
  onAddToCart,
}: ProductCardProps) {
  const [justAdded, setJustAdded] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState(false);

  const statusBadge = product.new
    ? 'NEW'
    : product.bestseller
    ? 'BESTSELLER'
    : product.limited
    ? 'LIMITED'
    : null;

  const hasValidDiscount =
    typeof product.oldPrice === 'number' && product.oldPrice > (product.jpgPrice ?? 0);

  const secondaryImage =
    product.previewImages && product.previewImages.length > 1 ? product.previewImages[1] : null;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHeartAnimating(true);
    onToggleWishlist(product.id);
    setTimeout(() => setHeartAnimating(false), 400);
  };

  const handleAddClick = () => {
    const added = onAddToCart(product, 'JPG_ONLY');
    if (added !== false) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1200);
    }
  };

  return (
    <article className="group bg-white border border-[#E6DAD2] hover:border-[#C59B6D] rounded-xs overflow-hidden flex flex-col justify-between p-3.5 sm:p-4 velora-surface-card velora-surface-card-hover">
      <div>
        {/* Product Image Frame */}
        <div className="relative aspect-[4/3] bg-[#F8F2EE] overflow-hidden rounded-xs">
          <button
            type="button"
            onClick={() => onSelectProduct(product.slug)}
            className="w-full h-full block text-left focus-visible:outline-2 focus-visible:outline-[#3D0F18]"
          >
            <ResilientImage
              src={product.previewImages?.[0] || ''}
              alt={product.title}
              fallbackTitle={product.title}
              fallbackSubtitle={product.category}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-[680ms] ease-velora group-hover:scale-[1.06]"
            />

            {secondaryImage && (
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-velora pointer-events-none">
                <ResilientImage
                  src={secondaryImage}
                  alt={`${product.title} alternate view`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-[680ms] ease-velora group-hover:scale-[1.06]"
                />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#26090F]/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 ease-velora pointer-events-none" />
          </button>

          {/* Status Badge */}
          {statusBadge && (
            <div className="absolute top-2.5 left-2.5 bg-[#3D0F18] text-[#FAF6F3] text-[9px] tracking-[0.18em] uppercase font-semibold px-2.5 py-1 rounded-xs pointer-events-none">
              {statusBadge}
            </div>
          )}

          {/* Top-Right Heart Icon (Matching Reference Image Product Card) */}
          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleWishlistClick}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ease-velora ${
                isWishlisted
                  ? 'bg-[#3D0F18] text-[#FAF6F3] shadow-xs'
                  : 'bg-white/90 text-[#6E5A5D] hover:bg-[#3D0F18] hover:text-[#FAF6F3] shadow-2xs'
              } ${heartAnimating ? 'animate-heart-pop' : ''}`}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-transform ${
                  isWishlisted ? 'fill-current' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickView(product);
              }}
              aria-label={`Quick view ${product.title}`}
              className="sm:hidden w-8 h-8 rounded-full bg-white/90 text-[#231518] flex items-center justify-center shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Desktop Slide-Up Quick View Trigger */}
          <div className="hidden sm:block absolute inset-x-2.5 bottom-2.5 translate-y-2.5 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100 transition-all duration-350 ease-velora">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickView(product);
              }}
              className="w-full py-2 px-3 bg-[#FAF6F3]/95 hover:bg-[#26090F] text-[#231518] hover:text-[#FAF6F3] backdrop-blur-xs rounded-xs shadow-md text-[10px] font-semibold uppercase tracking-[0.18em] flex items-center justify-center gap-1.5 transition-colors duration-250 whitespace-nowrap"
            >
              <Eye className="w-3 h-3" />
              <span>QUICK VIEW</span>
            </button>
          </div>
        </div>

        {/* Centered Editorial Typography Stack (Inspired by Reference Image Product Cards) */}
        <div className="pt-4 pb-3.5 px-1 text-center flex flex-col items-center">
          <h3 className="font-serif-editorial text-lg sm:text-[19px] font-semibold uppercase tracking-[0.06em] text-[#231518] leading-snug line-clamp-1">
            <button
              type="button"
              onClick={() => onSelectProduct(product.slug)}
              className="velora-link-underline hover:text-[#3D0F18] transition-colors focus-visible:outline-none"
            >
              {product.title}
            </button>
          </h3>

          {/* Unboxed Format & Category Sub-caption */}
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#7A545B] font-medium">
            {product.category} · JPG {product.hasPsd ? '+ PSD OPTION' : 'STANDARD'}
          </p>

          {/* Price Row */}
          <div className="mt-2.5 flex items-baseline justify-center gap-2">
            <span className="text-sm font-mono-tabular font-semibold text-[#231518]">
              {currencySymbol}
              {(product.jpgPrice ?? (product as any).priceJpg ?? 0).toLocaleString()}
            </span>
            {hasValidDiscount && (
              <span className="text-xs font-mono-tabular text-[#6E5A5D] line-through">
                {currencySymbol}
                {(product.oldPrice ?? 0).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Clean Editorial Full-Width VIEW DESIGN Button — Prevents unintended auto-adding to cart */}
      <button
        type="button"
        onClick={() => onSelectProduct(product.slug)}
        className="btn-velora-primary w-full py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] rounded-xs transition-all duration-300 ease-velora flex items-center justify-center gap-2 whitespace-nowrap bg-[#3D0F18] hover:bg-[#521521] text-[#FAF6F3]"
      >
        <span>VIEW DESIGN</span>
      </button>
    </article>
  );
}
