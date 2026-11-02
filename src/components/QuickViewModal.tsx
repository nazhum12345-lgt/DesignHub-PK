import React, { useState } from 'react';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import { Product, ProductFormatSelection } from '../types/velora';
import { ResilientImage } from './VeloraLogo';

interface QuickViewModalProps {
  product: Product | null;
  currencySymbol: string;
  onClose: () => void;
  onAddToCart: (product: Product, format: ProductFormatSelection) => void;
  onViewFullDetails: (slug: string) => void;
}

export function QuickViewModal({
  product,
  currencySymbol,
  onClose,
  onAddToCart,
  onViewFullDetails,
}: QuickViewModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ProductFormatSelection>('JPG_ONLY');

  if (!product) return null;

  const baseJpgPrice = product.jpgPrice ?? (product as any).priceJpg ?? 0;
  const psdUpgrade = product.psdUpgradePrice ?? (product as any).priceJpgPsd ?? 0;
  const psdAdd =
    selectedFormat === 'JPG_PLUS_PSD' && product.hasPsd && psdUpgrade
      ? psdUpgrade
      : 0;
  const totalPrice = baseJpgPrice + psdAdd;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-title"
    >
      <div
        className="fixed inset-0 bg-[#26090F]/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative bg-[#FAF6F3] border border-[#E6DAD2] rounded-sm max-w-3xl w-full overflow-hidden shadow-[0_28px_70px_-12px_rgba(38,9,15,0.38)] z-10 grid grid-cols-1 md:grid-cols-2 max-h-[90vh] overflow-y-auto animate-velora-page">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-full bg-white/95 text-[#231518] hover:bg-[#3D0F18] hover:text-[#FAF6F3] flex items-center justify-center transition-all duration-250 ease-velora shadow-xs"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left Image */}
        <div className="bg-[#F3EAE4] aspect-[4/3] md:aspect-auto md:h-full overflow-hidden">
          <ResilientImage
            src={product.previewImages[0]}
            alt={product.title}
            fallbackTitle={product.title}
            fallbackSubtitle={product.category}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right Details */}
        <div className="p-6 sm:p-8 flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[#7A545B] font-semibold mb-2">
              <span>{product.category}</span>
              <span aria-hidden="true">·</span>
              <span>DesignHub PK Studio</span>
            </div>

            <h2
              id="quick-view-title"
              className="font-serif-editorial text-2xl sm:text-3xl font-semibold text-[#231518] leading-snug"
            >
              {product.title}
            </h2>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-xl font-mono-tabular font-semibold text-[#3D0F18]">
                {currencySymbol}
                {(totalPrice || 0).toLocaleString()}
              </span>
              {product.oldPrice && product.oldPrice > (baseJpgPrice || 0) && (
                <span className="text-sm font-mono-tabular text-[#6E5A5D] line-through">
                  {currencySymbol}
                  {(product.oldPrice || 0).toLocaleString()}
                </span>
              )}
            </div>

            {product.description && (
              <p className="mt-3 text-sm text-[#6E5A5D] leading-relaxed line-clamp-3">
                {product.description}
              </p>
            )}

            {/* Format Selector */}
            <div className="mt-5 space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#231518]">
                Select File Format
              </p>

              <button
                type="button"
                onClick={() => setSelectedFormat('JPG_ONLY')}
                className={`w-full p-3.5 rounded-xs border text-left transition-all duration-250 ease-velora flex items-center justify-between ${
                  selectedFormat === 'JPG_ONLY'
                    ? 'border-[#3D0F18] bg-[#FAF6F3] ring-1 ring-[#3D0F18]'
                    : 'border-[#E6DAD2] hover:border-[#3D0F18]/40'
                }`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#231518]">
                    JPG ONLY
                  </p>
                  <p className="text-xs text-[#6E5A5D]">Ready-to-use high-resolution design</p>
                </div>
                <span className="text-sm font-mono-tabular font-semibold text-[#231518]">
                  {currencySymbol}
                  {(baseJpgPrice || 0).toLocaleString()}
                </span>
              </button>

              {product.hasPsd && (
                <button
                  type="button"
                  onClick={() => setSelectedFormat('JPG_PLUS_PSD')}
                  className={`w-full p-3.5 rounded-xs border text-left transition-all duration-250 ease-velora flex items-center justify-between ${
                    selectedFormat === 'JPG_PLUS_PSD'
                      ? 'border-[#3D0F18] bg-[#FAF6F3] ring-1 ring-[#3D0F18]'
                      : 'border-[#E6DAD2] hover:border-[#3D0F18]/40'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#3D0F18]">
                      JPG + PSD EDITABLE
                    </p>
                    <p className="text-xs text-[#6E5A5D]">
                      Includes standard JPG + editable layered PSD source file
                    </p>
                  </div>
                  <span className="text-sm font-mono-tabular font-semibold text-[#3D0F18]">
                    +{currencySymbol}
                    {(product.psdUpgradePrice || 0).toLocaleString()}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-[#E6DAD2] space-y-3">
            <button
              type="button"
              onClick={() => {
                onAddToCart(product, selectedFormat);
                onClose();
              }}
              className="btn-velora-primary w-full py-3.5 px-5 bg-[#3D0F18] text-[#FAF6F3] hover:bg-[#521521] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>
                Add to Cart — {currencySymbol}
                {totalPrice.toLocaleString()}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onViewFullDetails(product.slug);
              }}
              className="group w-full py-2 text-xs font-medium text-[#6E5A5D] hover:text-[#3D0F18] flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="velora-link-underline">View Full Product Specifications</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-250 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
