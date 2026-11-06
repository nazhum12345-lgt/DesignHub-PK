import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  Product,
  Category,
  CartItem,
  Order,
  CustomerProfile,
  HomepageConfig,
  ProductFormatSelection,
} from './types/velora';
import { Header, NavigationPage, AccountSectionTab } from './components/Header';
import { Footer } from './components/Footer';
import { QuickViewModal } from './components/QuickViewModal';
import { CartDrawer } from './components/CartDrawer';
import { VeloraCustomCursor, VeloraStudioPreloader } from './components/MotionPrimitives';
import { HomePage } from './pages/HomePage';
import { StudioPage } from './pages/StudioPage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CheckoutPage, OrderSuccessPage } from './pages/CheckoutPage';
import { WishlistPage, AccountPage, InfoPage } from './pages/CustomerPages';
import { AdminPanel } from './pages/AdminPanel';
import { getApiUrl } from './services/api';
import { supabaseSignOut, onSupabaseAuthStateChange } from './services/supabase';

const DEFAULT_HOMEPAGE_CONFIG: HomepageConfig = {
  announcementText: 'NEW DIGITAL DESIGNS — INSTANT DOWNLOADS',
  showAnnouncement: true,
  showFeaturedSection: true,
  showMostLovedSection: true,
  showPsdUpgradeSection: true,
  showPromoBanner: true,
  promoHeadline: 'Because your brand deserves something exquisite.',
  promoSubtext:
    'Explore premium digital assets created for modern creators, businesses, and brands.',
  currencyCode: 'PKR',
  currencySymbol: 'PKR ',
};

const PAGE_TO_PATH: Record<NavigationPage, string> = {
  studio: '/',
  home: '/store',
  shop: '/shop',
  categories: '/categories',
  product: '/product',
  checkout: '/checkout',
  'order-success': '/order-success',
  wishlist: '/wishlist',
  account: '/account',
  about: '/about',
  contact: '/contact',
  faq: '/faq',
  terms: '/terms',
  privacy: '/privacy',
  refund: '/refund',
  admin: '/admin',
};

function resolveInitialPageFromPath(): NavigationPage {
  if (typeof window === 'undefined') return 'studio';
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (path === '/' || path === '') return 'studio';
  if (path === '/studio') return 'studio';
  if (path === '/home' || path === '/store') return 'home';
  if (path === '/shop') return 'shop';
  if (path === '/categories' || path === '/collections') return 'categories';
  if (path === '/account' || path.startsWith('/account/')) return 'account';
  if (path === '/wishlist') return 'wishlist';
  if (path === '/checkout') return 'checkout';
  if (path === '/order-success' || path.startsWith('/order-success/')) return 'order-success';
  if (path === '/about') return 'about';
  if (path === '/contact') return 'contact';
  if (path === '/faq') return 'faq';
  if (path === '/terms') return 'terms';
  if (path === '/privacy') return 'privacy';
  if (path === '/refund') return 'refund';
  if (path === '/admin' || path.startsWith('/admin/')) return 'admin';
  return 'studio';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>(() =>
    resolveInitialPageFromPath()
  );
  const [selectedProductSlug, setSelectedProductSlug] = useState<string>('');
  const [shopCategoryFilter, setShopCategoryFilter] = useState<string>('All');
  const [shopFormatFilter, setShopFormatFilter] = useState<string>('All');
  const [shopSearchFilter, setShopSearchFilter] = useState<string>('');
  const [accountInitialTab, setAccountInitialTab] =
    useState<AccountSectionTab>('my-inventory');
  const [pendingCartProduct, setPendingCartProduct] = useState<{
    product: Product;
    format: ProductFormatSelection;
    mode: 'cart' | 'buy-now';
  } | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [homepageConfig, setHomepageConfig] =
    useState<HomepageConfig>(DEFAULT_HOMEPAGE_CONFIG);
  const [isLoadingStorefront, setIsLoadingStorefront] = useState<boolean>(true);

  // Cart & Wishlist State
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('velora_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('velora_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Quick View Modal
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Active Order (for Order Success / Download Page)
  const [activeOrder, setActiveOrder] = useState<Order | null>(() => {
    try {
      const saved = sessionStorage.getItem('velora_active_order');
      if (!saved) return null;
      const parsed = JSON.parse(saved) as Order;
      if (parsed?.orderId?.startsWith('VLR-')) {
        sessionStorage.removeItem('velora_active_order');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [autoDownloadOrderId, setAutoDownloadOrderId] = useState<string | null>(null);

  // Customer Account & Persistent User Inventory State
  const [customerToken, setCustomerToken] = useState<string | null>(() =>
    localStorage.getItem('velora_customer_token')
  );
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [inventoryOrders, setInventoryOrders] = useState<Order[]>([]);

  // Local Guest Purchase Receipts (persists guest purchases across refreshes and links them upon Sign In / Create Account)
  const [localGuestOrders, setLocalGuestOrders] = useState<
    Array<{ orderId: string; orderAccessToken: string }>
  >(() => {
    try {
      const saved = localStorage.getItem('velora_guest_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Subtle Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3400);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    try {
      localStorage.setItem('velora_cart', JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('velora_wishlist', JSON.stringify(wishlist));
    } catch {
      // ignore storage errors
    }
  }, [wishlist]);

  useEffect(() => {
    try {
      localStorage.setItem('velora_guest_orders', JSON.stringify(localGuestOrders));
    } catch {
      // ignore storage errors
    }
  }, [localGuestOrders]);

  const fetchStorefront = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl('/api/storefront'));
      if (!res.ok) return;
      const data = await res.json();
      setProducts(data.products || []);
      setCategories(data.categories || []);
      if (data.homepageConfig) {
        setHomepageConfig(data.homepageConfig);
      }
    } catch {
      // ignore initial network error
    } finally {
      setIsLoadingStorefront(false);
    }
  }, []);

  const syncInventoryAndSession = useCallback(async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (customerToken) {
        headers.Authorization = `Bearer ${customerToken}`;
      }

      const res = await fetch(getApiUrl('/api/inventory'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          localOrders: localGuestOrders,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setInventoryOrders(data.orders || []);
        if (data.customer) {
          setCustomer(data.customer);
          // Once guest orders are claimed by an authenticated account, clear the unclaimed guest queue
          if (localGuestOrders.length > 0) {
            setLocalGuestOrders([]);
          }
        } else if (customerToken) {
          // Token expired or invalid
          localStorage.removeItem('velora_customer_token');
          setCustomerToken(null);
          setCustomer(null);
        }
      }
    } catch {
      // ignore network error
    }
  }, [customerToken, localGuestOrders]);

  useEffect(() => {
    fetchStorefront();
  }, [fetchStorefront]);

  useEffect(() => {
    syncInventoryAndSession();
    if (customerToken || currentPage === 'account' || currentPage === 'order-success') {
      const interval = setInterval(() => {
        syncInventoryAndSession();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [syncInventoryAndSession, customerToken, currentPage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname.toLowerCase() === '/cart') {
      setCartDrawerOpen(true);
    }
    const handlePopState = () => {
      setCurrentPage(resolveInitialPageFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (
    page: NavigationPage,
    params?: {
      slug?: string;
      category?: string;
      format?: string;
      search?: string;
      accountTab?: AccountSectionTab;
    }
  ) => {
    if (params?.slug) {
      setSelectedProductSlug(params.slug);
    }
    if (page === 'shop' || page === 'categories') {
      setShopCategoryFilter(params?.category || 'All');
      setShopFormatFilter(params?.format || 'All');
      setShopSearchFilter(params?.search || '');
    }
    if (page === 'account' && params?.accountTab) {
      setAccountInitialTab(params.accountTab);
    }
    setCurrentPage(page);
    try {
      const targetPath = PAGE_TO_PATH[page] || '/';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ page }, '', targetPath);
      }
    } catch {
      // ignore history errors in restricted environments
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (slug: string) => {
    setSelectedProductSlug(slug);
    setCurrentPage('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleWishlist = async (productId: string) => {
    const exists = wishlist.includes(productId);
    const next = exists ? wishlist.filter((id) => id !== productId) : [...wishlist, productId];
    setWishlist(next);
    showNotification(exists ? 'Removed from Saved Designs.' : 'Saved to your DesignHub PK Wishlist.');

    if (customerToken) {
      try {
        await fetch(getApiUrl('/api/customer/profile'), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${customerToken}`,
          },
          body: JSON.stringify({ wishlist: next }),
        });
      } catch {
        // ignore background sync error
      }
    }
  };

  const handleAddToCart = (
    product: Product,
    format: ProductFormatSelection
  ): boolean => {
    const validFormat: ProductFormatSelection =
      format === 'JPG_PLUS_PSD' && product.hasPsd ? 'JPG_PLUS_PSD' : 'JPG_ONLY';

    // Require Sign In / Create Account before adding any item to cart
    if (!customerToken || !customer) {
      setPendingCartProduct({
        product,
        format: validFormat,
        mode: 'cart',
      });
      setQuickViewProduct(null);
      setAccountInitialTab('create-account');
      setCurrentPage('account');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showNotification(
        'Please Create an Account or Sign In first to add items to your cart.'
      );
      return false;
    }

    setCart((prev) => [...prev, { productId: product.id, selectedFormat: validFormat }]);
    showNotification(
      `Added to bag — ${product.title} (${
        validFormat === 'JPG_PLUS_PSD' ? 'JPG + PSD' : 'JPG'
      })`
    );
    setCartDrawerOpen(true);
    return true;
  };

  const handleBuyNow = (product: Product, format: ProductFormatSelection) => {
    const validFormat: ProductFormatSelection =
      format === 'JPG_PLUS_PSD' && product.hasPsd ? 'JPG_PLUS_PSD' : 'JPG_ONLY';

    // Require Sign In / Create Account before purchasing
    if (!customerToken || !customer) {
      setPendingCartProduct({
        product,
        format: validFormat,
        mode: 'buy-now',
      });
      setQuickViewProduct(null);
      setAccountInitialTab('create-account');
      setCurrentPage('account');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showNotification(
        'Please Create an Account or Sign In first to continue with your purchase.'
      );
      return;
    }

    setCart((prev) => [...prev, { productId: product.id, selectedFormat: validFormat }]);
    setCurrentPage('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateCartFormat = (index: number, format: ProductFormatSelection) => {
    setCart((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, selectedFormat: format } : item))
    );
  };

  const handleRemoveCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleOrderCreated = (order: Order, triggerAutoDownload = false) => {
    setActiveOrder(order);
    try {
      sessionStorage.setItem('velora_active_order', JSON.stringify(order));
    } catch {
      // ignore storage errors
    }

    // Automatically remove purchased products from cart, keeping unpurchased products
    setCart((prevCart) => {
      const purchasedProductIds = new Set((order.items || []).map((i) => i.productId));
      const remainingCart = prevCart.filter((ci) => !purchasedProductIds.has(ci.productId));
      try {
        localStorage.setItem('velora_cart', JSON.stringify(remainingCart));
      } catch {
        // ignore storage errors
      }
      return remainingCart;
    });

    // Add order to inventory/order history immediately
    setInventoryOrders((prev) => {
      const filtered = prev.filter((o) => o.orderId !== order.orderId);
      return [order, ...filtered];
    });

    // If purchased while not logged in, store the access token locally
    if (!customerToken && order.orderAccessToken) {
      setLocalGuestOrders((prev) => {
        const exists = prev.some((x) => x.orderId === order.orderId);
        if (exists) return prev;
        return [
          { orderId: order.orderId, orderAccessToken: order.orderAccessToken! },
          ...prev,
        ];
      });
    }

    if (order.paymentStatus === 'Paid' || order.paymentStatus === 'PAID') {
      setAutoDownloadOrderId(triggerAutoDownload ? order.orderId : null);
    } else {
      setAutoDownloadOrderId(null);
    }

    setCurrentPage('order-success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelPaymentRequest = async (
    orderId: string,
    token?: string,
    email?: string
  ): Promise<boolean> => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (customerToken) {
        headers.Authorization = `Bearer ${customerToken}`;
      }

      const res = await fetch(getApiUrl(`/api/orders/${encodeURIComponent(orderId)}/cancel-payment`), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          token: token || activeOrder?.orderAccessToken,
          email: email || activeOrder?.email || customer?.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || 'Could not cancel payment request.');
        return false;
      }

      showNotification('Payment verification request has been cancelled.');
      if (activeOrder && activeOrder.orderId === orderId) {
        setActiveOrder(data.order);
        try {
          sessionStorage.setItem('velora_active_order', JSON.stringify(data.order));
        } catch {
          // ignore
        }
      }

      setInventoryOrders((prev) => {
        const filtered = prev.filter((o) => o.orderId !== orderId);
        return [data.order, ...filtered];
      });
      return true;
    } catch {
      showNotification('Network error while cancelling payment request.');
      return false;
    }
  };

  const handleRefreshOrder = async (orderId: string, token?: string, email?: string) => {
    try {
      const qs = new URLSearchParams();
      if (token) qs.set('token', token);
      if (email) qs.set('email', email);

      const headers: Record<string, string> = {};
      if (customerToken) {
        headers.Authorization = `Bearer ${customerToken}`;
      }

      const res = await fetch(getApiUrl(`/api/orders/${encodeURIComponent(orderId)}?${qs.toString()}`), {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setActiveOrder(data.order);
        setInventoryOrders((prev) => {
          const filtered = prev.filter((o) => o.orderId !== data.order.orderId);
          return [data.order, ...filtered];
        });

        if (data.order.paymentStatus === 'Paid' || data.order.paymentStatus === 'PAID') {
          showNotification('Payment verified by Admin! Your digital files are ready to download.');
        } else if (
          data.order.paymentStatus === 'PAYMENT REJECTED' ||
          data.order.paymentStatus === 'Failed'
        ) {
          showNotification('Payment verification rejected by Admin.');
        } else if (data.order.paymentStatus === 'PAYMENT REQUEST CANCELLED') {
          showNotification('Payment verification request was cancelled.');
        } else {
          showNotification(
            `Current payment status: ${
              data.order.paymentStatus === 'Pending'
                ? 'Verification Pending'
                : data.order.paymentStatus
            }`
          );
        }
      }
    } catch {
      showNotification('Could not refresh order status.');
    }
  };

  const handleCustomerLogout = async () => {
    try {
      await supabaseSignOut();
    } catch {
      // ignore
    }
    if (customerToken) {
      try {
        await fetch(getApiUrl('/api/customer/logout'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${customerToken}` },
        });
      } catch {
        // ignore
      }
    }
    localStorage.removeItem('velora_customer_token');
    setCustomerToken(null);
    setCustomer(null);
    setInventoryOrders([]);
    showNotification('Logged out of your account.');
  };

  const currentProduct =
    products.find((p) => p.slug === selectedProductSlug || p.id === selectedProductSlug) ||
    null;

  const totalInventoryItemsCount = inventoryOrders
    .filter((o) => o.paymentStatus === 'Paid' || o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + (o.items?.length || 0), 0);

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#FAF6F3] text-[#231518]">
      <VeloraStudioPreloader />
      <VeloraCustomCursor />

      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        cartCount={cart.length}
        wishlistCount={wishlist.length}
        inventoryCount={totalInventoryItemsCount}
        onOpenCart={() => setCartDrawerOpen(true)}
        products={products}
        categories={categories}
        homepageConfig={homepageConfig}
        isCustomerLoggedIn={Boolean(customer)}
        customerName={customer?.name}
        onCustomerLogout={handleCustomerLogout}
      />

      {/* Smooth Page Transition Container */}
      <main
        key={`${currentPage}-${selectedProductSlug}-${shopCategoryFilter}`}
        className="flex-1 animate-velora-page"
      >
        {currentPage === 'studio' && (
          <StudioPage
            products={products}
            categories={categories}
            homepageConfig={homepageConfig}
            customer={customer}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'home' && (
          <HomePage
            products={products}
            categories={categories}
            homepageConfig={homepageConfig}
            isLoadingStorefront={isLoadingStorefront}
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onQuickView={(prod) => setQuickViewProduct(prod)}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            onNavigate={handleNavigate}
            onNotify={showNotification}
          />
        )}

        {(currentPage === 'shop' || currentPage === 'categories') && (
          <ShopPage
            products={products}
            categories={categories}
            homepageConfig={homepageConfig}
            isLoadingStorefront={isLoadingStorefront}
            initialCategory={shopCategoryFilter}
            initialFormat={shopFormatFilter}
            initialSearch={shopSearchFilter}
            showCategoriesOverview={currentPage === 'categories'}
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onQuickView={(prod) => setQuickViewProduct(prod)}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'product' && (
          <ProductDetailPage
            product={currentProduct}
            allProducts={products}
            homepageConfig={homepageConfig}
            isWishlisted={currentProduct ? wishlist.includes(currentProduct.id) : false}
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onQuickView={(prod) => setQuickViewProduct(prod)}
            onSelectProduct={handleSelectProduct}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'checkout' && (
          <CheckoutPage
            cart={cart}
            products={products}
            customer={customer}
            customerToken={customerToken}
            homepageConfig={homepageConfig}
            onOrderCreated={handleOrderCreated}
            onNavigate={handleNavigate}
            onNotify={showNotification}
          />
        )}

        {currentPage === 'order-success' && (
          <OrderSuccessPage
            order={activeOrder}
            homepageConfig={homepageConfig}
            shouldAutoDownload={
              Boolean(activeOrder && autoDownloadOrderId === activeOrder.orderId)
            }
            onConsumeAutoDownload={() => setAutoDownloadOrderId(null)}
            onRefreshOrder={handleRefreshOrder}
            onCancelPaymentRequest={handleCancelPaymentRequest}
            onNavigate={handleNavigate}
            onNotify={showNotification}
          />
        )}

        {currentPage === 'wishlist' && (
          <WishlistPage
            products={products}
            wishlist={wishlist}
            homepageConfig={homepageConfig}
            onToggleWishlist={handleToggleWishlist}
            onQuickView={(prod) => setQuickViewProduct(prod)}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'account' && (
          <AccountPage
            customer={customer}
            inventoryOrders={inventoryOrders}
            products={products}
            wishlist={wishlist}
            homepageConfig={homepageConfig}
            initialTab={accountInitialTab}
            localGuestOrders={localGuestOrders}
            pendingCartProduct={pendingCartProduct}
            onCustomerAuthSuccess={(token, cust, orders) => {
              localStorage.setItem('velora_customer_token', token);
              setCustomerToken(token);
              setCustomer(cust);
              if (orders) {
                setInventoryOrders(orders);
              }
              if (localGuestOrders.length > 0) {
                setLocalGuestOrders([]);
              }
              if (pendingCartProduct) {
                const itemToAdd = pendingCartProduct;
                setPendingCartProduct(null);
                setCart((prev) => [
                  ...prev,
                  {
                    productId: itemToAdd.product.id,
                    selectedFormat: itemToAdd.format,
                  },
                ]);
                if (itemToAdd.mode === 'buy-now') {
                  setCurrentPage('checkout');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  setCartDrawerOpen(true);
                  showNotification(
                    `Signed in as ${cust.name} — Added ${itemToAdd.product.title} to your cart.`
                  );
                }
              } else {
                setCurrentPage('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                showNotification(`Welcome to DesignHub PK, ${cust.name}! Entering storefront...`);
              }
            }}
            onCustomerLogout={handleCustomerLogout}
            onCustomerUpdateProfile={async (name, phone) => {
              if (!customerToken) return;
              const res = await fetch(getApiUrl('/api/customer/profile'), {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${customerToken}`,
                },
                body: JSON.stringify({ name, phone, wishlist }),
              });
              if (res.ok) {
                const d = await res.json();
                setCustomer(d.customer);
                showNotification('Profile updated.');
              }
            }}
            onCancelPaymentRequest={handleCancelPaymentRequest}
            onOpenOrderDetails={(ord) => {
              setActiveOrder(ord);
              setAutoDownloadOrderId(null);
              try {
                sessionStorage.setItem('velora_active_order', JSON.stringify(ord));
              } catch {
                // ignore storage errors
              }
              setCurrentPage('order-success');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onToggleWishlist={handleToggleWishlist}
            onQuickView={(prod) => setQuickViewProduct(prod)}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            onNavigate={handleNavigate}
            onNotify={showNotification}
          />
        )}

        {(currentPage === 'about' ||
          currentPage === 'contact' ||
          currentPage === 'faq' ||
          currentPage === 'terms' ||
          currentPage === 'privacy' ||
          currentPage === 'refund') && (
          <InfoPage
            page={currentPage}
            onNavigate={handleNavigate}
            onNotify={showNotification}
          />
        )}

        {currentPage === 'admin' && (
          <AdminPanel
            storefrontProducts={products}
            storefrontCategories={categories}
            storefrontHomepageConfig={homepageConfig}
            onStorefrontUpdated={fetchStorefront}
            onNavigate={handleNavigate}
            onNotify={showNotification}
          />
        )}
      </main>

      <Footer onNavigate={handleNavigate} />

      {/* Product Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        currencySymbol={homepageConfig.currencySymbol}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={handleAddToCart}
        onViewFullDetails={(slug) => handleSelectProduct(slug)}
      />

      {/* Shopping Bag Slide-Over Drawer */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        cart={cart}
        products={products}
        currencySymbol={homepageConfig.currencySymbol}
        onUpdateFormat={handleUpdateCartFormat}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={() => {
          setCurrentPage('checkout');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onExploreDesigns={() => {
          setCurrentPage('shop');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Elegant Animated Toast Notification */}
      {toastMessage && (
        <div
          key={toastMessage}
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#26090F] text-[#FAF6F3] px-4 py-3.5 rounded-xs shadow-[0_18px_42px_rgba(38,9,15,0.38)] border border-[#C59B6D]/35 text-xs font-medium tracking-wide flex items-center gap-2.5 animate-velora-toast"
        >
          <CheckCircle2 className="w-4 h-4 text-[#C59B6D] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
