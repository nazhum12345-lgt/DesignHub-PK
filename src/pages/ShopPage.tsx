import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  Product,
  Category,
  ProductFormatSelection,
  HomepageConfig,
} from '../types/velora';
import { ProductCard } from '../components/ProductCard';
import { NavigationPage } from '../components/Header';
import { ResilientImage, OrnamentalDivider } from '../components/VeloraLogo';
import {
  RevealOnScroll,
  AnimatedHeading,
  ProductCardSkeleton,
} from '../components/MotionPrimitives';

interface ShopPageProps {
  products: Product[];
  categories: Category[];
  homepageConfig: HomepageConfig;
  isLoadingStorefront?: boolean;
  initialCategory?: string;
  initialFormat?: string;
  initialSearch?: string;
  showCategoriesOverview?: boolean;
  wishlist: string[];
  onToggleWishlist: (productId: string) => void;
  onQuickView: (product: Product) => void;
  onSelectProduct: (slug: string) => void;
  onAddToCart: (product: Product, format: ProductFormatSelection) => void;
  onNavigate: (page: NavigationPage, params?: { category?: string; format?: string }) => void;
}

export function ShopPage({
  products,
  categories,
  homepageConfig,
  isLoadingStorefront = false,
  initialCategory = 'All',
  initialFormat = 'All',
  initialSearch = '',
  showCategoriesOverview = false,
  wishlist,
  onToggleWishlist,
  onQuickView,
  onSelectProduct,
  onAddToCart,
  onNavigate,
}: ShopPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'All');
  const [selectedFormat, setSelectedFormat] = useState<string>(initialFormat || 'All');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch || '');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [maxPriceFilter, setMaxPriceFilter] = useState<string>('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    setSelectedCategory(initialCategory || 'All');
  }, [initialCategory]);

  useEffect(() => {
    setSelectedFormat(initialFormat || 'All');
  }, [initialFormat]);

  useEffect(() => {
    setSearchQuery(initialSearch || '');
  }, [initialSearch]);

  const hasBestsellers = useMemo(
    () => products.some((p) => p.bestseller),
    [products]
  );

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of categories) {
      if (c.name) set.add(c.name);
    }
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return ['All', ...Array.from(set)];
  }, [categories, products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (
          selectedCategory !== 'All' &&
          p.category.toLowerCase() !== selectedCategory.toLowerCase()
        ) {
          return false;
        }
        if (selectedFormat === 'PSD' && !p.hasPsd) {
          return false;
        }
        if (
          maxPriceFilter !== '' &&
          !isNaN(Number(maxPriceFilter)) &&
          Number(maxPriceFilter) > 0
        ) {
          if (p.jpgPrice > Number(maxPriceFilter)) return false;
        }
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchCat = p.category.toLowerCase().includes(q);
          const matchDesc = p.description.toLowerCase().includes(q);
          const matchTag = p.tags.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchCat && !matchDesc && !matchTag) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'price-asc') {
          return a.jpgPrice - b.jpgPrice;
        }
        if (sortBy === 'price-desc') {
          return b.jpgPrice - a.jpgPrice;
        }
        if (sortBy === 'bestselling') {
          return Number(b.bestseller) - Number(a.bestseller);
        }
        return Number(b.featured) - Number(a.featured);
      });
  }, [products, selectedCategory, selectedFormat, maxPriceFilter, searchQuery, sortBy]);

  const resetFilters = () => {
    setSelectedCategory('All');
    setSelectedFormat('All');
    setSearchQuery('');
    setMaxPriceFilter('');
    setSortBy('featured');
  };

  const renderFilterControls = () => (
    <div className="space-y-7 bg-white border border-[#E6DAD2] p-5 sm:p-6 rounded-xs velora-surface-card">
      {/* Search within shop */}
      <div>
        <label
          htmlFor="shop-search-input"
          className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#231518] mb-2.5"
        >
          Search Archive
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-[#7A545B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="shop-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Keyword, tag, title..."
            className="velora-input w-full pl-9 pr-3 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm text-[#231518] placeholder:text-[#6E5A5D]/70"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#231518] mb-3">
          Collection
        </h3>
        <div className="space-y-1.5">
          {categoryOptions.map((cat) => {
            const active = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xs text-xs uppercase tracking-[0.14em] font-semibold transition-all duration-250 ease-velora flex items-center justify-between ${
                  active
                    ? 'bg-[#3D0F18] text-[#FAF6F3] shadow-xs'
                    : 'text-[#6E5A5D] hover:text-[#3D0F18] hover:bg-[#FAF6F3]'
                }`}
              >
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Format Filter */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#231518] mb-3">
          File Format
        </h3>
        <div className="space-y-1.5">
          {[
            { label: 'All Formats', value: 'All' },
            { label: 'JPG (Standard)', value: 'JPG' },
            { label: 'PSD Available (Editable)', value: 'PSD' },
          ].map((fmt) => {
            const active = selectedFormat === fmt.value;
            return (
              <button
                key={fmt.value}
                type="button"
                onClick={() => setSelectedFormat(fmt.value)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xs text-xs uppercase tracking-[0.12em] font-semibold transition-all duration-250 ease-velora ${
                  active
                    ? 'bg-[#3D0F18] text-[#FAF6F3] shadow-xs'
                    : 'text-[#6E5A5D] hover:text-[#3D0F18] hover:bg-[#FAF6F3]'
                }`}
              >
                {fmt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Filter */}
      <div>
        <label
          htmlFor="shop-max-price"
          className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#231518] mb-2.5"
        >
          Max Base Price ({homepageConfig.currencyCode})
        </label>
        <input
          id="shop-max-price"
          type="number"
          min="0"
          value={maxPriceFilter}
          onChange={(e) => setMaxPriceFilter(e.target.value)}
          placeholder="No maximum limit"
          className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm font-mono-tabular text-[#231518] placeholder:text-[#6E5A5D]/70"
        />
      </div>

      {(selectedCategory !== 'All' ||
        selectedFormat !== 'All' ||
        searchQuery !== '' ||
        maxPriceFilter !== '') && (
        <button
          type="button"
          onClick={resetFilters}
          className="btn-velora-secondary w-full py-2.5 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#3D0F18] border border-[#3D0F18]/30 bg-[#FAF6F3] hover:bg-[#3D0F18] hover:text-[#FAF6F3] rounded-xs"
        >
          Reset Filters
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-14">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="text-xs text-[#6E5A5D] mb-4 flex items-center justify-center gap-2"
      >
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="velora-link-underline hover:text-[#3D0F18] transition-colors"
        >
          Home
        </button>
        <span aria-hidden="true">/</span>
        <span className="text-[#3D0F18] font-medium">
          {showCategoriesOverview ? 'Collections' : 'Shop'}
        </span>
      </nav>

      {/* Editorial Centered Page Heading */}
      <div className="pb-8 border-b border-[#E6DAD2] text-center">
        <AnimatedHeading
          as="h1"
          text={showCategoriesOverview ? 'Explore the Collections' : 'DesignHub PK Digital Collection'}
          triggerOnScroll={false}
          className="font-serif-editorial text-3xl sm:text-5xl font-normal text-[#231518]"
        />
        <OrnamentalDivider />
        <p className="mt-2 text-sm text-[#6E5A5D] max-w-xl mx-auto">
          Curated downloadable digital designs crafted for brands, studios, and creators. Standard
          high-resolution JPG included with optional editable PSD source upgrades.
        </p>

        {/* Sort & Mobile Filter Trigger Row */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E6DAD2]/60">
          <p className="text-xs uppercase tracking-[0.16em] text-[#7A545B] font-semibold">
            Showing {filteredProducts.length} Design{filteredProducts.length === 1 ? '' : 's'}
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#E6DAD2] rounded-xs text-xs font-semibold uppercase tracking-[0.16em] text-[#231518]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#3D0F18]" />
              <span>Filters</span>
            </button>

            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <label
                htmlFor="shop-sort-select"
                className="text-xs text-[#6E5A5D] whitespace-nowrap"
              >
                Sort by:
              </label>
              <select
                id="shop-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="velora-input w-full sm:w-auto px-3.5 py-2 bg-white border border-[#E6DAD2] rounded-xs text-xs font-medium text-[#231518]"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price Low to High</option>
                <option value="price-desc">Price High to Low</option>
                {hasBestsellers && <option value="bestselling">Best Selling</option>}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Visual Cards Strip when on Collections tab */}
      {showCategoriesOverview && categories.length > 0 && (
        <div className="py-8 border-b border-[#E6DAD2] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat, idx) => {
            const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
            return (
              <RevealOnScroll key={cat.id} delayMs={idx * 60}>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`group w-full text-left rounded-xs overflow-hidden border velora-surface-card velora-surface-card-hover ${
                    isSelected
                      ? 'border-[#3D0F18] ring-1 ring-[#3D0F18] bg-white'
                      : 'border-[#E6DAD2] bg-white hover:border-[#C59B6D]'
                  }`}
                >
                  <div className="aspect-[16/10] bg-[#F3EAE4] overflow-hidden">
                    <ResilientImage
                      src={cat.image}
                      alt={cat.name}
                      fallbackTitle={cat.name}
                      className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-velora"
                    />
                  </div>
                  <div className="p-4 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="font-serif-editorial text-lg font-semibold uppercase tracking-[0.06em] text-[#231518] group-hover:text-[#3D0F18] transition-colors">
                        {cat.name}
                      </h2>
                      <p className="text-xs text-[#6E5A5D] line-clamp-1 mt-0.5">
                        {cat.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#3D0F18] shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </button>
              </RevealOnScroll>
            );
          })}
        </div>
      )}

      {/* Main Content Layout: Desktop Sidebar + Product Grid */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        <aside className="hidden lg:block lg:col-span-3">{renderFilterControls()}</aside>

        <div className="lg:col-span-9">
          {isLoadingStorefront ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <ProductCardSkeleton key={n} />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product, idx) => (
                <RevealOnScroll key={product.id} delayMs={(idx % 6) * 55}>
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
          ) : products.length === 0 ? (
            <div className="bg-white border border-[#E6DAD2] rounded-xs p-8 sm:p-14 text-center velora-surface-card">
              <div className="w-12 h-12 rounded-full bg-[#FAF6F3] border border-[#E6DAD2] flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-5 h-5 text-[#C59B6D]" />
              </div>
              <h2 className="font-serif-editorial text-2xl font-semibold text-[#231518]">
                New Designs Coming Soon
              </h2>
              <p className="mt-2 text-sm text-[#6E5A5D] max-w-md mx-auto leading-relaxed">
                Our official digital design catalog is currently being prepared with fresh releases. Check back soon!
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#E6DAD2] rounded-xs p-8 sm:p-14 text-center velora-surface-card">
              <h2 className="font-serif-editorial text-2xl font-semibold text-[#231518]">
                No products found
              </h2>
              <p className="mt-2 text-sm text-[#6E5A5D] max-w-md mx-auto">
                No products match your current search or filter criteria. Try clearing your search or
                selecting another collection.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="btn-velora-primary mt-6 px-6 py-3 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs hover:bg-[#521521]"
              >
                CLEAR ALL FILTERS
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#26090F]/55 backdrop-blur-xs animate-velora-page"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="relative w-full max-w-xs bg-[#FAF6F3] h-full shadow-2xl z-10 p-6 overflow-y-auto flex flex-col justify-between animate-velora-page">
            <div>
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E6DAD2]">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#231518]">
                  Filter Designs
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  aria-label="Close filters"
                  className="p-1.5 text-[#6E5A5D] hover:text-[#3D0F18]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {renderFilterControls()}
            </div>

            <div className="pt-6 mt-6 border-t border-[#E6DAD2]">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="btn-velora-primary w-full py-3 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs"
              >
                Apply Filters ({filteredProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
