import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Layers } from 'lucide-react';
import { CartItem, Product, ProductFormatSelection } from '../types/velora';
import { ResilientImage } from './VeloraLogo';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  currencySymbol: string;
  onUpdateFormat: (index: number, format: ProductFormatSelection) => void;
  onRemoveItem: (index: number) => void;
  onProceedToCheckout: () => void;
  onExploreDesigns: () => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  cart,
  products,
  currencySymbol,
  onUpdateFormat,
  onRemoveItem,
  onProceedToCheckout,
  onExploreDesigns,
}: CartDrawerProps) {
  if (!isOpen) return null;

  const detailedItems = cart
    .map((item, idx) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const psdUpgrade =
        item.selectedFormat === 'JPG_PLUS_PSD' && product.hasPsd
          ? product.psdUpgradePrice || 0
          : 0;
      const itemTotal = product.jpgPrice + psdUpgrade;
      return {
        index: idx,
        product,
        selectedFormat: item.selectedFormat,
        jpgPrice: product.jpgPrice,
        psdUpgrade,
        itemTotal,
      };
    })
    .filter(Boolean) as Array<{
    index: number;
    product: Product;
    selectedFormat: ProductFormatSelection;
    jpgPrice: number;
    psdUpgrade: number;
    itemTotal: number;
  }>;

  const subtotal = detailedItems.reduce((sum, i) => sum + i.itemTotal, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-[#26090F]/55 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-[#FAF6F3] h-full shadow-2xl z-10 flex flex-col justify-between animate-velora-page border-l border-[#E6DAD2]">
        {/* Header */}
        <div className="px-6 py-5 bg-[#3D0F18] text-[#FAF6F3] border-b border-[#C59B6D]/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4 text-[#C59B6D]" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em]">
              DesignHub PK Shopping Bag ({detailedItems.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shopping bag"
            className="p-1.5 text-[#FAF6F3]/70 hover:text-[#FAF6F3] rounded-xs transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Content */}
        {detailedItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#F3EAE4] border border-[#E6DAD2] flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6 text-[#3D0F18]" />
            </div>
            <h3 className="font-serif-editorial text-2xl font-semibold text-[#231518]">
              Your Shopping Bag is Empty
            </h3>
            <p className="mt-2 text-sm text-[#6E5A5D] max-w-xs">
              Discover timeless digital designs created by DesignHub PK.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onExploreDesigns();
              }}
              className="btn-velora-primary mt-6 px-7 py-3.5 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs hover:bg-[#521521] whitespace-nowrap"
            >
              DISCOVER THE COLLECTION
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {detailedItems.map((item) => (
                <div
                  key={`${item.product.id}-${item.index}`}
                  className="bg-white border border-[#E6DAD2] rounded-xs p-4 space-y-3 velora-surface-card"
                >
                  <div className="flex gap-3.5">
                    <div className="w-20 h-16 rounded-xs bg-[#F3EAE4] overflow-hidden shrink-0">
                      <ResilientImage
                        src={item.product.previewImages[0]}
                        alt={item.product.title}
                        fallbackTitle={item.product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-serif-editorial text-base font-semibold text-[#231518] truncate">
                          {item.product.title}
                        </h4>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.index)}
                          aria-label={`Remove ${item.product.title}`}
                          className="text-[#6E5A5D] hover:text-red-700 p-1 -mr-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#7A545B]">
                        {item.product.category}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between text-xs font-mono-tabular">
                        <span className="text-[#6E5A5D]">
                          {item.selectedFormat === 'JPG_PLUS_PSD'
                            ? 'JPG + Editable PSD'
                            : 'Standard JPG'}
                        </span>
                        <span className="font-semibold text-[#3D0F18]">
                          {currencySymbol}
                          {item.itemTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Optional PSD Upgrade Switcher inside Cart */}
                  {item.product.hasPsd && (
                    <div className="pt-2.5 border-t border-[#E6DAD2]/70 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#6E5A5D] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#C59B6D]" />
                        <span>Format Option:</span>
                      </span>
                      <div className="inline-flex rounded-xs p-0.5 bg-[#F3EAE4]">
                        <button
                          type="button"
                          onClick={() => onUpdateFormat(item.index, 'JPG_ONLY')}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-xs transition-all duration-200 whitespace-nowrap ${
                            item.selectedFormat === 'JPG_ONLY'
                              ? 'bg-white text-[#231518] shadow-2xs'
                              : 'text-[#6E5A5D] hover:text-[#231518]'
                          }`}
                        >
                          JPG Only
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateFormat(item.index, 'JPG_PLUS_PSD')}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-xs transition-all duration-200 whitespace-nowrap ${
                            item.selectedFormat === 'JPG_PLUS_PSD'
                              ? 'bg-[#3D0F18] text-[#FAF6F3]'
                              : 'text-[#6E5A5D] hover:text-[#231518]'
                          }`}
                        >
                          +PSD ({currencySymbol}
                          {(item.product.psdUpgradePrice || 0).toLocaleString()})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer Summary */}
            <div className="p-6 bg-white border-t border-[#E6DAD2] space-y-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between text-[#6E5A5D]">
                  <span>Delivery</span>
                  <span>Instant Digital Download</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold text-[#231518] pt-2 border-t border-[#E6DAD2]">
                  <span>Subtotal</span>
                  <span className="font-mono-tabular text-[#3D0F18]">
                    {currencySymbol}
                    {subtotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onProceedToCheckout();
                }}
                className="btn-velora-primary w-full py-3.5 px-6 bg-[#3D0F18] text-[#FAF6F3] hover:bg-[#521521] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>PROCEED TO CHECKOUT</span>
                <ArrowRight className="w-4 h-4 btn-arrow" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
