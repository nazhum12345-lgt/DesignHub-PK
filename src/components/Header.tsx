import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Heart,
  User,
  ShoppingBag,
  Menu,
  X,
  ArrowRight,
  SlidersHorizontal,
  Sparkles,
  Package,
  Clock,
  LogOut,
  RefreshCw,
  LogIn,
  UserPlus,
  ChevronDown,
} from 'lucide-react';
import { Product, Category, HomepageConfig } from '../types/velora';
import { VeloraWordmark, VeloraMonogram, ResilientImage } from './VeloraLogo';

export type NavigationPage =
  | 'home'
  | 'studio'
  | 'shop'
  | 'categories'
  | 'product'
  | 'checkout'
  | 'order-success'
  | 'wishlist'
  | 'account'
  | 'about'
  | 'contact'
  | 'faq'
  | 'terms'
  | 'privacy'
  | 'refund'
  | 'admin';

export type AccountSectionTab = 'my-account' | 'my-inventory' | 'my-orders' | 'sign-in' | 'create-account' | 'switch-account';

interface HeaderProps {
  currentPage: NavigationPage;
  onNavigate: (
    page: NavigationPage,
    params?: {
      slug?: string;
      category?: string;
      format?: string;
      search?: string;
      accountTab?: AccountSectionTab;
    }
  ) => void;
  cartCount: number;
  wishlistCount: number;
  inventoryCount?: number;
  onOpenCart: () => void;
  products: Product[];
  categories: Category[];
  homepageConfig: HomepageConfig;
  isCustomerLoggedIn: boolean;
  customerName?: string;
  onCustomerLogout?: () => void;
}

export function Header({
  currentPage,
  onNavigate,
  cartCount,
  wishlistCount,
  inventoryCount = 0,
  onOpenCart,
  products,
  categories,
  homepageConfig,
  isCustomerLoggedIn,
  customerName,
  onCustomerLogout,
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartPulse, setCartPulse] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const prevCartCountRef = useRef(cartCount);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 20);
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (y / docHeight) * 100)));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (cartCount > prevCartCountRef.current) {
      setCartPulse(true);
      const timer = setTimeout(() => setCartPulse(false), 500);
      prevCartCountRef.current = cartCount;
      return () => clearTimeout(timer);
    }
    prevCartCountRef.current = cartCount;
  }, [cartCount]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = searchQuery.trim()
    ? products
        .filter((p) => {
          const q = searchQuery.toLowerCase();
          return (
            p.title.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q))
          );
        })
        .slice(0, 5)
    : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    onNavigate('shop', { search: searchQuery.trim() });
  };

  const leftNavItems: Array<{
    label: string;
    page: NavigationPage;
    params?: { format?: string };
  }> = [
    { label: 'STUDIO', page: 'studio' },
    { label: 'STOREFRONT', page: 'home' },
    { label: 'SHOP', page: 'shop' },
    { label: 'COLLECTIONS', page: 'categories' },
  ];

  const rightNavItems: Array<{ label: string; page: NavigationPage }> = [
    { label: 'ABOUT', page: 'about' },
    { label: 'CONTACT', page: 'contact' },
  ];

  return (
    <>
      <div className="sticky top-0 z-40 w-full animate-velora-page">
        {/* Primary Luxury Header — Starts directly at top of viewport */}
        <header
          className={`relative w-full transition-all duration-350 ease-velora ${
            isScrolled
              ? 'bg-[#FAF6F3]/95 backdrop-blur-md border-b border-[#E6DAD2] shadow-[0_6px_28px_-6px_rgba(61,15,24,0.07)] h-16 sm:h-[72px]'
              : 'bg-[#FAF6F3]/90 backdrop-blur-xs border-b border-[#E6DAD2]/80 h-18 sm:h-[84px]'
          }`}
        >
          <div className="relative max-w-[1440px] mx-auto h-full px-4 sm:px-8 lg:px-12 flex items-center justify-between">
            {/* LEFT ZONE: Navigation Links (Desktop) & Mobile Hamburger */}
            <div className="flex-1 flex items-center gap-1 sm:gap-4 lg:gap-6 z-10 pr-6 lg:pr-12">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                className="md:hidden p-2 -ml-2 text-[#231518] hover:bg-[#3D0F18]/5 rounded-md transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <nav
                aria-label="Primary Collections Navigation"
                className="hidden md:flex items-center gap-3 lg:gap-5 xl:gap-7 text-[10.5px] lg:text-[11px] font-semibold tracking-[0.11em] lg:tracking-[0.16em] uppercase text-[#5C474B]"
              >
                {leftNavItems.map((item) => {
                  const active = currentPage === item.page && !item.params;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => onNavigate(item.page, item.params)}
                      className={`group relative py-1.5 whitespace-nowrap shrink-0 transition-colors duration-250 ease-velora hover:text-[#3D0F18] ${
                        active ? 'text-[#3D0F18]' : ''
                      }`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={`absolute left-0 right-0 bottom-0 h-[1.5px] bg-[#3D0F18] origin-left transition-transform duration-300 ease-velora ${
                          active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                        }`}
                      />
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* CENTER ZONE: Exactly Centered Editorial Brand Lockup */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto z-20">
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('studio');
                  setMobileMenuOpen(false);
                }}
                className="group inline-flex flex-col items-center justify-center transition-transform duration-300 ease-velora hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-[#3D0F18] px-3 py-1"
              >
                <VeloraWordmark
                  showSubtext
                  className="text-2xl sm:text-3xl lg:text-[34px] text-[#231518] group-hover:text-[#3D0F18] transition-colors"
                />
              </a>
            </div>

            {/* RIGHT ZONE: Secondary Links + Account Dropdown + Utility Icons */}
            <div className="flex-1 flex items-center justify-end gap-1 sm:gap-2 lg:gap-3 xl:gap-4 z-10 pl-6 lg:pl-12">
              <nav
                aria-label="Studio Information Navigation"
                className="hidden 2xl:flex items-center gap-5 text-[11px] font-semibold tracking-[0.16em] uppercase text-[#5C474B] mr-1"
              >
                {rightNavItems.map((item) => {
                  const active = currentPage === item.page;
                  return (
                    <button
                      key={item.page}
                      type="button"
                      onClick={() => onNavigate(item.page)}
                      className={`group relative py-1.5 whitespace-nowrap shrink-0 transition-colors duration-250 ease-velora hover:text-[#3D0F18] ${
                        active ? 'text-[#3D0F18]' : ''
                      }`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={`absolute left-0 right-0 bottom-0 h-[1.5px] bg-[#3D0F18] origin-left transition-transform duration-300 ease-velora ${
                          active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                        }`}
                      />
                    </button>
                  );
                })}
              </nav>

              <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
                {/* Simplified "Account" Button & Menu */}
                <div ref={accountMenuRef} className="relative hidden sm:block">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((prev) => !prev)}
                    aria-label="Account"
                    aria-expanded={accountMenuOpen}
                    className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-[11px] font-semibold uppercase tracking-[0.16em] transition-all duration-250 ease-velora border ${
                      currentPage === 'account' || isCustomerLoggedIn
                        ? 'text-[#3D0F18] bg-[#F3EAE4] border-[#C59B6D]/45'
                        : 'text-[#231518] border-transparent hover:text-[#3D0F18] hover:bg-[#3D0F18]/5'
                    }`}
                  >
                    <User className="w-4 h-4 shrink-0" />
                    <span>Account</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${
                        accountMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {accountMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white border border-[#E6DAD2] rounded-xs shadow-[0_18px_45px_rgba(38,9,15,0.16)] py-2 z-50 animate-velora-page">
                      {isCustomerLoggedIn ? (
                        <>
                          {customerName && (
                            <div className="px-4 py-2.5 border-b border-[#E6DAD2] bg-[#FAF6F3]">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7A545B]">
                                Signed In
                              </p>
                              <p className="text-xs font-semibold text-[#231518] truncate mt-0.5">
                                {customerName}
                              </p>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setAccountMenuOpen(false);
                              onNavigate('account', { accountTab: 'my-account' });
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#231518] hover:bg-[#FAF6F3] hover:text-[#3D0F18] flex items-center gap-2.5 transition-colors"
                          >
                            <User className="w-3.5 h-3.5 text-[#3D0F18]" />
                            <span>My Account</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAccountMenuOpen(false);
                              onNavigate('account', { accountTab: 'my-inventory' });
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#231518] hover:bg-[#FAF6F3] hover:text-[#3D0F18] flex items-center justify-between transition-colors"
                          >
                            <span className="flex items-center gap-2.5">
                              <Package className="w-3.5 h-3.5 text-[#3D0F18]" />
                              <span>My Inventory</span>
                            </span>
                            {inventoryCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-[#3D0F18] text-[#FAF6F3] text-[10px] font-mono-tabular rounded-xs">
                                {inventoryCount}
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAccountMenuOpen(false);
                              onNavigate('account', { accountTab: 'my-orders' });
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#231518] hover:bg-[#FAF6F3] hover:text-[#3D0F18] flex items-center gap-2.5 transition-colors"
                          >
                            <Clock className="w-3.5 h-3.5 text-[#3D0F18]" />
                            <span>My Orders / Transaction History</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAccountMenuOpen(false);
                              onNavigate('account', { accountTab: 'switch-account' });
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#231518] hover:bg-[#FAF6F3] hover:text-[#3D0F18] flex items-center gap-2.5 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-[#3D0F18]" />
                            <span>Change / Switch Account</span>
                          </button>

                          <div className="my-1 border-t border-[#E6DAD2]" />

                          <button
                            type="button"
                            onClick={() => {
                              setAccountMenuOpen(false);
                              onCustomerLogout?.();
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs font-semibold text-red-700 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Logout</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setAccountMenuOpen(false);
                              onNavigate('account', { accountTab: 'sign-in' });
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#231518] hover:bg-[#FAF6F3] hover:text-[#3D0F18] flex items-center gap-2.5 transition-colors"
                          >
                            <LogIn className="w-3.5 h-3.5 text-[#3D0F18]" />
                            <span>Sign In</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAccountMenuOpen(false);
                              onNavigate('account', { accountTab: 'create-account' });
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#231518] hover:bg-[#FAF6F3] hover:text-[#3D0F18] flex items-center gap-2.5 transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5 text-[#3D0F18]" />
                            <span>Create Account</span>
                          </button>

                          {inventoryCount > 0 && (
                            <>
                              <div className="my-1 border-t border-[#E6DAD2]" />
                              <button
                                type="button"
                                onClick={() => {
                                  setAccountMenuOpen(false);
                                  onNavigate('account', { accountTab: 'my-inventory' });
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#3D0F18] hover:bg-[#FAF6F3] flex items-center justify-between transition-colors"
                              >
                                <span className="flex items-center gap-2.5">
                                  <Package className="w-3.5 h-3.5 text-[#3D0F18]" />
                                  <span>My Inventory</span>
                                </span>
                                <span className="px-1.5 py-0.5 bg-[#3D0F18] text-[#FAF6F3] text-[10px] font-mono-tabular rounded-xs">
                                  {inventoryCount}
                                </span>
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSearchOpen((prev) => !prev)}
                  aria-label="Search digital designs"
                  className="group p-2 text-[#231518] hover:text-[#3D0F18] hover:bg-[#3D0F18]/5 rounded-full transition-all duration-250 ease-velora"
                >
                  <Search className="w-[18px] h-[18px] transition-transform duration-250 ease-velora group-hover:scale-110" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('wishlist')}
                  aria-label="Saved designs wishlist"
                  className="group hidden sm:inline-flex relative p-2 text-[#231518] hover:text-[#3D0F18] hover:bg-[#3D0F18]/5 rounded-full transition-all duration-250 ease-velora"
                >
                  <Heart className="w-[18px] h-[18px] transition-transform duration-250 ease-velora group-hover:scale-110" />
                  {wishlistCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#C59B6D] text-[#231518] text-[10px] font-mono-tabular font-semibold rounded-full flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onOpenCart}
                  aria-label={`Shopping bag with ${cartCount} items`}
                  className={`group relative p-2 text-[#231518] hover:text-[#3D0F18] hover:bg-[#3D0F18]/5 rounded-full transition-all duration-250 ease-velora flex items-center ${
                    cartPulse ? 'animate-cart-pulse' : ''
                  }`}
                >
                  <ShoppingBag className="w-[18px] h-[18px] transition-transform duration-250 ease-velora group-hover:scale-110" />
                  <span
                    className={`-ml-1 -mt-2.5 min-w-[17px] h-[17px] px-1 bg-[#3D0F18] text-[#FAF6F3] text-[10px] font-mono-tabular font-semibold rounded-full flex items-center justify-center transition-transform duration-300 ease-velora ${
                      cartPulse ? 'scale-120 bg-[#C59B6D] text-[#231518]' : ''
                    }`}
                  >
                    {cartCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  title="DesignHub PK Studio Admin"
                  className={`hidden lg:inline-flex items-center gap-1.5 ml-1 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] font-semibold rounded-xs border transition-all duration-250 ease-velora whitespace-nowrap shrink-0 ${
                    currentPage === 'admin'
                      ? 'bg-[#3D0F18] text-[#FAF6F3] border-[#3D0F18]'
                      : 'border-[#E6DAD2] text-[#6E5A5D] hover:text-[#3D0F18] hover:border-[#3D0F18]/40 hover:bg-white'
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Admin</span>
                </button>
              </div>
            </div>
          </div>

          {/* Subtle Champagne Gold Scroll Progress Bar */}
          <div
            aria-hidden="true"
            style={{ width: `${scrollProgress}%` }}
            className="absolute bottom-0 left-0 h-[1.5px] bg-gradient-to-r from-[#3D0F18] via-[#C59B6D] to-[#3D0F18] transition-[width] duration-150 ease-out pointer-events-none"
          />
        </header>

        {/* Expandable Search Overlay */}
        {searchOpen && (
          <div className="bg-white border-b border-[#E6DAD2] shadow-[0_20px_50px_rgba(61,15,24,0.12)] animate-velora-page">
            <div className="max-w-[1040px] mx-auto px-4 sm:px-8 py-5">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-3">
                <Search className="w-5 h-5 text-[#7A545B] shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search DesignHub PK designs by title, category, format, or keyword..."
                  className="w-full bg-transparent text-base text-[#231518] placeholder:text-[#6E5A5D]/70 focus:outline-none py-1.5"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-[#6E5A5D] hover:text-[#3D0F18] px-2 py-1 whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="submit"
                  className="btn-velora-primary px-5 py-2 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold tracking-[0.16em] uppercase rounded-xs hover:bg-[#521521] whitespace-nowrap shrink-0"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                  className="p-2 text-[#6E5A5D] hover:text-[#3D0F18]"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>

              {searchQuery.trim() !== '' && (
                <div className="mt-4 pt-4 border-t border-[#E6DAD2]">
                  {filteredSuggestions.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7A545B] mb-2 font-semibold">
                        Matching DesignHub PK Digital Designs
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredSuggestions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSearchOpen(false);
                              onNavigate('product', { slug: item.slug });
                            }}
                            className="flex items-center gap-3 p-2.5 rounded-xs hover:bg-[#FAF6F3] text-left transition-all duration-200 group border border-transparent hover:border-[#E6DAD2]"
                          >
                            <div className="w-14 h-11 rounded-xs overflow-hidden bg-[#F3EAE4] shrink-0">
                              <ResilientImage
                                src={item.previewImages[0]}
                                alt={item.title}
                                fallbackTitle={item.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-serif-editorial text-base font-semibold text-[#231518] truncate group-hover:text-[#3D0F18]">
                                {item.title}
                              </p>
                              <p className="text-xs text-[#6E5A5D] truncate">
                                {item.category} · JPG {item.hasPsd ? '· PSD Available' : ''}
                              </p>
                            </div>
                            <span className="text-xs font-mono-tabular font-semibold text-[#3D0F18] whitespace-nowrap">
                              {homepageConfig.currencySymbol}
                              {(item.jpgPrice ?? (item as any).priceJpg ?? 0).toLocaleString()}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-sm text-[#6E5A5D]">
                        No digital designs match &ldquo;{searchQuery}&rdquo;.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {searchQuery.trim() === '' && categories.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#E6DAD2]/60 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#6E5A5D] mr-1">Collections:</span>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        onNavigate('shop', { category: cat.name });
                      }}
                      className="text-xs text-[#231518] hover:bg-[#3D0F18] hover:text-[#FAF6F3] transition-colors duration-200 px-3 py-1 rounded-xs bg-[#FAF6F3] border border-[#E6DAD2] whitespace-nowrap"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#26090F]/55 backdrop-blur-xs animate-velora-page"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-full max-w-xs bg-[#FAF6F3] h-full shadow-2xl flex flex-col justify-between overflow-y-auto z-10 animate-velora-page border-r border-[#E6DAD2]">
            <div className="p-5">
              <div className="flex items-center justify-between pb-5 border-b border-[#E6DAD2]">
                <div className="flex items-center gap-2.5">
                  <VeloraMonogram className="w-7 h-7" />
                  <VeloraWordmark align="left" showSubtext className="text-xl" />
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-2 text-[#231518] hover:bg-[#3D0F18]/5 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-6 space-y-1.5">
                {[
                  { label: 'Studio (Main)', page: 'studio' as NavigationPage },
                  { label: 'Storefront', page: 'home' as NavigationPage },
                  { label: 'Shop All', page: 'shop' as NavigationPage },
                  { label: 'Collections', page: 'categories' as NavigationPage },
                  { label: 'About', page: 'about' as NavigationPage },
                  { label: 'Contact', page: 'contact' as NavigationPage },
                ].map((item) => (
                  <button
                    key={item.page}
                    type="button"
                    onClick={() => {
                      onNavigate(item.page);
                      setMobileMenuOpen(false);
                    }}
                    className={`group w-full flex items-center justify-between px-3.5 py-3 rounded-xs text-left text-sm uppercase tracking-[0.14em] font-semibold transition-all duration-200 ${
                      currentPage === item.page
                        ? 'bg-[#3D0F18] text-[#FAF6F3]'
                        : 'text-[#231518] hover:bg-[#F3EAE4]'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="w-4 h-4 opacity-60 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                ))}
              </nav>

              {/* Simplified Mobile Account Section */}
              <div className="mt-6 pt-6 border-t border-[#E6DAD2] space-y-2">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7A545B]">
                  Account
                </p>

                {isCustomerLoggedIn ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('account', { accountTab: 'my-account' });
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-[#231518] hover:bg-[#F3EAE4] rounded-xs transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-[#3D0F18]" />
                        <span>My Account</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('account', { accountTab: 'my-inventory' });
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-[#231518] hover:bg-[#F3EAE4] rounded-xs transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <Package className="w-4 h-4 text-[#3D0F18]" />
                        <span>My Inventory</span>
                      </span>
                      {inventoryCount > 0 && (
                        <span className="font-mono-tabular text-xs text-[#3D0F18] font-semibold">
                          {inventoryCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('account', { accountTab: 'my-orders' });
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-[#231518] hover:bg-[#F3EAE4] rounded-xs transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-[#3D0F18]" />
                        <span>My Orders / Transaction History</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('account', { accountTab: 'switch-account' });
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-[#231518] hover:bg-[#F3EAE4] rounded-xs transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <RefreshCw className="w-4 h-4 text-[#3D0F18]" />
                        <span>Change Account</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onCustomerLogout?.();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-red-700 hover:bg-red-50 rounded-xs transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('account', { accountTab: 'sign-in' });
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-[#231518] hover:bg-[#F3EAE4] rounded-xs transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <LogIn className="w-4 h-4 text-[#3D0F18]" />
                        <span>Sign In</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('account', { accountTab: 'create-account' });
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-[#231518] hover:bg-[#F3EAE4] rounded-xs transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <UserPlus className="w-4 h-4 text-[#3D0F18]" />
                        <span>Create Account</span>
                      </span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onNavigate('wishlist');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-[#231518] hover:bg-[#F3EAE4] rounded-xs transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Heart className="w-4 h-4 text-[#3D0F18]" />
                    <span>Saved Designs</span>
                  </span>
                  <span className="font-mono-tabular text-xs text-[#6E5A5D]">{wishlistCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onNavigate('admin');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-[#6E5A5D] hover:text-[#3D0F18] hover:bg-[#F3EAE4] rounded-xs transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Studio Admin Panel</span>
                  </span>
                </button>
              </div>
            </div>

            <div className="p-5 border-t border-[#E6DAD2] bg-[#F3EAE4]/70 text-xs text-[#6E5A5D] space-y-1">
              <p className="font-semibold text-[#3D0F18] uppercase tracking-[0.14em]">
                DesignHub PK Digital Studio
              </p>
              <p className="font-mono-tabular">Phone: 03192644717</p>
              <p className="truncate">baigrahim12345@gmail.com</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
