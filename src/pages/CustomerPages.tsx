import React, { useState, useEffect } from 'react';
import {
  Heart,
  User,
  Package,
  Download,
  LogOut,
  Phone,
  Mail,
  Send,
  CheckCircle2,
  FileImage,
  Layers,
  RefreshCw,
  LogIn,
  UserPlus,
  Calendar,
  ShieldCheck,
  Loader2,
  Clock,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import {
  Product,
  Order,
  CustomerProfile,
  HomepageConfig,
  ProductFormatSelection,
  DownloadRecord,
} from '../types/velora';
import { ProductCard } from '../components/ProductCard';
import { OrnamentalDivider, ResilientImage } from '../components/VeloraLogo';
import { NavigationPage, AccountSectionTab } from '../components/Header';
import { RevealOnScroll } from '../components/MotionPrimitives';
import { triggerRealFileDownload } from './CheckoutPage';
import { supabaseSignUp, supabaseSignIn } from '../services/supabase';

// ============================================================================
// WISHLIST PAGE — YOUR SAVED DESIGNS
// ============================================================================

interface WishlistPageProps {
  products: Product[];
  wishlist: string[];
  homepageConfig: HomepageConfig;
  onToggleWishlist: (productId: string) => void;
  onQuickView: (product: Product) => void;
  onSelectProduct: (slug: string) => void;
  onAddToCart: (product: Product, format: ProductFormatSelection) => void;
  onNavigate: (page: NavigationPage) => void;
}

export function WishlistPage({
  products,
  wishlist,
  homepageConfig,
  onToggleWishlist,
  onQuickView,
  onSelectProduct,
  onAddToCart,
  onNavigate,
}: WishlistPageProps) {
  const savedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-12 sm:py-16">
      <div className="pb-8 border-b border-[#E6DAD2] text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7A545B] mb-1">
          PERSONAL ARCHIVE
        </p>
        <h1 className="font-serif-editorial text-3xl sm:text-5xl font-normal text-[#231518]">
          Your Saved Designs
        </h1>
        <OrnamentalDivider />
        <p className="text-xs font-mono-tabular text-[#6E5A5D]">
          {savedProducts.length} {savedProducts.length === 1 ? 'Design' : 'Designs'} Saved
        </p>
      </div>

      {savedProducts.length > 0 ? (
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {savedProducts.map((product, idx) => (
            <RevealOnScroll key={product.id} delayMs={idx * 60}>
              <ProductCard
                product={product}
                currencySymbol={homepageConfig.currencySymbol}
                isWishlisted={true}
                onToggleWishlist={onToggleWishlist}
                onQuickView={onQuickView}
                onSelectProduct={onSelectProduct}
                onAddToCart={onAddToCart}
              />
            </RevealOnScroll>
          ))}
        </div>
      ) : (
        <div className="mt-12 bg-white border border-[#E6DAD2] rounded-xs p-10 sm:p-16 text-center max-w-xl mx-auto velora-surface-card">
          <div className="w-12 h-12 rounded-full bg-[#FAF6F3] border border-[#E6DAD2] flex items-center justify-center mx-auto mb-4">
            <Heart className="w-5 h-5 text-[#3D0F18]" />
          </div>
          <h2 className="font-serif-editorial text-2xl font-semibold text-[#231518]">
            No Saved Designs Yet
          </h2>
          <p className="mt-2 text-sm text-[#6E5A5D]">
            Tap the heart icon on any DesignHub PK digital design to save it here for quick access.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="btn-velora-primary mt-6 px-7 py-3.5 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs hover:bg-[#521521]"
          >
            DISCOVER THE COLLECTION
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ACCOUNT & MY INVENTORY PAGE
// ============================================================================

interface InventoryCardItem {
  key: string;
  orderId: string;
  productId: string;
  productTitle: string;
  previewImage: string;
  purchaseDate: string;
  amountPaid: number;
  selectedFormat: ProductFormatSelection;
  jpgDownload?: DownloadRecord;
  psdDownload?: DownloadRecord;
}

interface AccountPageProps {
  customer: CustomerProfile | null;
  inventoryOrders: Order[];
  products: Product[];
  wishlist: string[];
  homepageConfig: HomepageConfig;
  initialTab?: AccountSectionTab;
  localGuestOrders: Array<{ orderId: string; orderAccessToken: string }>;
  pendingCartProduct?: {
    product: Product;
    format: ProductFormatSelection;
    mode: 'cart' | 'buy-now';
  } | null;
  onCustomerAuthSuccess: (
    token: string,
    customer: CustomerProfile,
    orders?: Order[]
  ) => void;
  onCustomerLogout: () => void;
  onCustomerUpdateProfile: (name: string, phone: string) => Promise<void>;
  onCancelPaymentRequest?: (orderId: string, token?: string, email?: string) => Promise<boolean>;
  onOpenOrderDetails: (order: Order) => void;
  onToggleWishlist: (productId: string) => void;
  onQuickView: (product: Product) => void;
  onSelectProduct: (slug: string) => void;
  onAddToCart: (product: Product, format: ProductFormatSelection) => void;
  onNavigate: (
    page: NavigationPage,
    params?: { accountTab?: AccountSectionTab }
  ) => void;
  onNotify: (msg: string) => void;
}

export function AccountPage({
  customer,
  inventoryOrders,
  products,
  homepageConfig,
  initialTab,
  localGuestOrders,
  pendingCartProduct,
  onCustomerAuthSuccess,
  onCustomerLogout,
  onCustomerUpdateProfile,
  onCancelPaymentRequest,
  onOpenOrderDetails,
  onSelectProduct,
  onNavigate,
  onNotify,
}: AccountPageProps) {
  const [activeTab, setActiveTab] = useState<'my-inventory' | 'my-orders' | 'my-account' | 'switch-account'>(
    () => {
      if (initialTab === 'my-orders') return 'my-orders';
      if (initialTab === 'my-inventory') return 'my-inventory';
      if (initialTab === 'switch-account') return 'switch-account';
      if (initialTab === 'my-account') return 'my-account';
      return 'my-inventory';
    }
  );

  const [authMode, setAuthMode] = useState<'login' | 'register'>(() =>
    initialTab === 'create-account' ? 'register' : 'login'
  );
  const [guestViewMode, setGuestViewMode] = useState<'auth' | 'inventory'>(() =>
    initialTab === 'my-inventory' ? 'inventory' : 'auth'
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [editName, setEditName] = useState(customer?.name || '');
  const [editPhone, setEditPhone] = useState(customer?.phone || '');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Customer Forgot Password State
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotResetToken, setForgotResetToken] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatusMessage, setForgotStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab === 'my-orders') {
      setActiveTab('my-orders');
    } else if (initialTab === 'my-inventory') {
      setActiveTab('my-inventory');
      setGuestViewMode('inventory');
    } else if (initialTab === 'switch-account') {
      setActiveTab('switch-account');
      setAuthMode('login');
    } else if (initialTab === 'create-account') {
      setAuthMode('register');
      setGuestViewMode('auth');
    } else if (initialTab === 'sign-in') {
      setAuthMode('login');
      setGuestViewMode('auth');
    } else if (initialTab === 'my-account') {
      setActiveTab('my-account');
    }
  }, [initialTab]);

  useEffect(() => {
    setEditName(customer?.name || '');
    setEditPhone(customer?.phone || '');
  }, [customer]);

  // Build clean list of purchased items for My Inventory
  const isOrderPaid = (status: string) => status === 'PAID' || status === 'Paid';
  const isOrderRejected = (status: string) => status === 'PAYMENT REJECTED' || status === 'Failed';
  const isOrderCancelled = (status: string) =>
    status === 'PAYMENT REQUEST CANCELLED' || status === 'Payment Request Cancelled';
  const isOrderPending = (status: string) =>
    !isOrderPaid(status) && !isOrderRejected(status) && !isOrderCancelled(status);

  const paidOrders = inventoryOrders.filter((o) => isOrderPaid(o.paymentStatus));
  const pendingVerificationOrders = inventoryOrders.filter((o) => isOrderPending(o.paymentStatus));
  const rejectedOrders = inventoryOrders.filter((o) => isOrderRejected(o.paymentStatus));
  const cancelledOrders = inventoryOrders.filter((o) => isOrderCancelled(o.paymentStatus));

  const inventoryItems: InventoryCardItem[] = paidOrders.flatMap((order) =>
    order.items.map((item, idx) => {
      const matchedProduct = products.find((p) => p.id === item.productId);
      const previewImg =
        item.previewImage || matchedProduct?.previewImages?.[0] || '';

      const jpgDl = (order.downloads || []).find(
        (d) => d.productId === item.productId && d.format === 'JPG'
      );
      // Strictly only attach PSD download if the purchase explicitly includes JPG_PLUS_PSD
      const psdDl =
        item.selectedFormat === 'JPG_PLUS_PSD'
          ? (order.downloads || []).find(
              (d) => d.productId === item.productId && d.format === 'PSD'
            )
          : undefined;

      return {
        key: `${order.orderId}-${item.productId}-${idx}`,
        orderId: order.orderId,
        productId: item.productId,
        productTitle: item.title,
        previewImage: previewImg,
        purchaseDate: order.createdAt,
        amountPaid: item.itemTotal || order.total,
        selectedFormat: item.selectedFormat,
        jpgDownload: jpgDl,
        psdDownload: psdDl,
      };
    })
  );

  const handleDownloadFile = async (dl: DownloadRecord) => {
    if (!dl.signedUrl) {
      onNotify('Download link is being prepared. Please refresh the page.');
      return;
    }
    setDownloadingId(dl.downloadId);
    try {
      const ext = dl.format === 'PSD' ? 'psd' : 'jpg';
      const fallbackName =
        dl.fileName ||
        `DesignHub-PK-${dl.productTitle.replace(/[^a-zA-Z0-9]+/g, '-')}.${ext}`;
      const ok = await triggerRealFileDownload(dl.signedUrl, fallbackName);
      if (ok) {
        onNotify(`Downloading ${fallbackName}...`);
      } else {
        onNotify('Could not verify download authorization. Please try again.');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      // If switching accounts while logged in, properly terminate previous session first
      if (activeTab === 'switch-account' || customer) {
        const prevToken = localStorage.getItem('velora_customer_token');
        if (prevToken) {
          try {
            await fetch('/api/customer/logout', {
              method: 'POST',
              headers: { Authorization: `Bearer ${prevToken}` },
            });
          } catch {
            // ignore network errors on logout
          }
        }
      }

      // Synchronize with Supabase Auth
      try {
        if (authMode === 'register') {
          await supabaseSignUp(email, password, name, phone);
        } else {
          await supabaseSignIn(email, password);
        }
      } catch {
        // Fallback to backend API if Supabase connection is pending DNS
      }

      const endpoint =
        authMode === 'login' ? '/api/customer/login' : '/api/customer/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          claimOrders: localGuestOrders,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || 'Authentication failed.');
        return;
      }

      // If Admin credentials (Contact Gmail + Admin Password) were entered, route directly to Admin Login / Admin Panel
      if (data.isAdmin && data.adminToken) {
        setEmail('');
        setPassword('');
        onNotify('Redirecting to DesignHub PK Studio Admin.');
        onNavigate('admin');
        return;
      }

      onCustomerAuthSuccess(data.token, data.customer, data.orders);
      setEditName(data.customer.name);
      setEditPhone(data.customer.phone || '');
      setPassword('');
      setActiveTab('my-inventory');
      onNotify(
        authMode === 'login'
          ? `Signed in as ${data.customer.name}.`
          : `Account created for ${data.customer.name}.`
      );
    } catch {
      onNotify('Network error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRequestCustomerReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      onNotify('Please enter your registered email address.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch('/api/customer/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || 'Unable to process request.');
        return;
      }
      setForgotResetToken(data.resetToken || '');
      setForgotStatusMessage(
        data.message ||
          'If an account is registered with this email, you may now create a new password below.'
      );
      setForgotStep('reset');
    } catch {
      onNotify('Network error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmCustomerReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotNewPassword.length < 6) {
      onNotify('New password must be at least 6 characters.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      onNotify('New password and confirmation password do not match.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch('/api/customer/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken: forgotResetToken,
          newPassword: forgotNewPassword,
          confirmPassword: forgotConfirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || 'Unable to reset password.');
        return;
      }
      setEmail(forgotEmail.trim());
      setPassword('');
      setForgotPasswordOpen(false);
      setForgotStep('request');
      setForgotResetToken('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotStatusMessage(null);
      setAuthMode('login');
      onNotify(data.message || 'Password updated. Please sign in with your new password.');
    } catch {
      onNotify('Network error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const renderInventoryGrid = () => {
    return (
      <div className="space-y-6">
        {/* Pending JazzCash Payment Verification Notice */}
        {pendingVerificationOrders.length > 0 && (
          <div className="bg-amber-50/90 border border-amber-300 rounded-xs p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-800 animate-pulse" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900">
                JazzCash Payment Verification Pending ({pendingVerificationOrders.length})
              </h3>
            </div>
            <p className="text-xs text-amber-950/80 leading-relaxed">
              We received your order and payment details for JazzCash Number: <strong className="text-amber-950">03192644717</strong>.
              Our admin verifies each JazzCash payment manually. As soon as approved, your download buttons will unlock below automatically.
            </p>
            <div className="space-y-2 pt-1">
              {pendingVerificationOrders.map((ord) => (
                <div
                  key={ord.orderId}
                  className="bg-white/90 border border-amber-200 rounded-xs p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div>
                      <span className="font-mono-tabular font-bold text-[#3D0F18]">
                        Order #{ord.orderId}
                      </span>
                      <span className="text-[#6E5A5D]"> · TID: </span>
                      <strong className="font-mono-tabular text-[#231518]">
                        {ord.paymentReference || 'Pending'}
                      </strong>
                    </div>
                    <p className="text-[11px] text-[#6E5A5D]">
                      {ord.items.map((i) => i.title).join(', ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-xs font-semibold text-[10px] uppercase tracking-wider self-start sm:self-auto inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                      <span>Awaiting Admin Verification</span>
                    </span>
                    {onCancelPaymentRequest && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            window.confirm(
                              `Are you sure you want to cancel and withdraw payment verification for Order #${ord.orderId}? This order will be withdrawn from the verification queue and digital files will remain locked.`
                            )
                          ) {
                            await onCancelPaymentRequest(ord.orderId, ord.orderAccessToken, ord.email);
                          }
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-red-50 border border-red-300 text-red-700 text-[10px] font-semibold uppercase tracking-wider rounded-xs cursor-pointer transition-colors"
                      >
                        Cancel / Withdraw Request
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancelled JazzCash Payment Requests Notice */}
        {cancelledOrders.length > 0 && (
          <div className="bg-stone-50 border border-stone-200 rounded-xs p-5 space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-stone-600" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-800">
                Cancelled Payment Requests ({cancelledOrders.length})
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              The following payment verification requests were cancelled by you. The order records are preserved in your history, but digital file downloads remain locked.
            </p>
            <div className="space-y-2 pt-1">
              {cancelledOrders.map((ord) => (
                <div
                  key={ord.orderId}
                  className="bg-white border border-stone-200 rounded-xs p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div>
                      <span className="font-mono-tabular font-bold text-[#3D0F18]">
                        Order #{ord.orderId}
                      </span>
                      <span className="text-[#6E5A5D]"> · TID: </span>
                      <strong className="font-mono-tabular text-[#231518]">
                        {ord.paymentReference || 'N/A'}
                      </strong>
                    </div>
                    <p className="text-[11px] text-[#6E5A5D]">
                      {ord.items.map((i) => i.title).join(', ')}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-stone-100 text-stone-700 rounded-xs font-semibold text-[10px] uppercase tracking-wider self-start sm:self-auto inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                    <span>Request Cancelled</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejected JazzCash Payment Verification Notice */}
        {rejectedOrders.length > 0 && (
          <div className="bg-red-50/90 border border-red-200 rounded-xs p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-700" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-red-900">
                Payment Verification Notice ({rejectedOrders.length})
              </h3>
            </div>
            <p className="text-xs text-red-950/80 leading-relaxed">
              Payment verification was rejected for one or more orders. Please verify you sent payment to JazzCash Number <strong>03192644717</strong> and that your Transaction ID (TID) matches your SMS from 8558. You can contact support at <a href="mailto:waizsiddiqui.business@gmail.com" className="font-semibold underline">waizsiddiqui.business@gmail.com</a> with your proof of payment for manual reconciliation.
            </p>
            <div className="space-y-2 pt-1">
              {rejectedOrders.map((ord) => (
                <div
                  key={ord.orderId}
                  className="bg-white/90 border border-red-200 rounded-xs p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div>
                      <span className="font-mono-tabular font-bold text-[#3D0F18]">
                        Order #{ord.orderId}
                      </span>
                      <span className="text-[#6E5A5D]"> · TID: </span>
                      <strong className="font-mono-tabular text-[#231518]">
                        {ord.paymentReference || 'N/A'}
                      </strong>
                    </div>
                    <p className="text-[11px] text-[#6E5A5D]">
                      {ord.items.map((i) => i.title).join(', ')}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-red-100 text-red-900 rounded-xs font-semibold text-[10px] uppercase tracking-wider self-start sm:self-auto inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                    <span>Payment Rejected</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {inventoryItems.length === 0 ? (
          <div className="bg-white border border-[#E6DAD2] rounded-xs p-10 sm:p-16 text-center max-w-xl mx-auto velora-surface-card">
            <div className="w-12 h-12 rounded-full bg-[#FAF6F3] border border-[#E6DAD2] flex items-center justify-center mx-auto mb-4">
              <Package className="w-5 h-5 text-[#3D0F18]" />
            </div>
            <h2 className="font-serif-editorial text-2xl sm:text-3xl font-semibold text-[#231518]">
              {pendingVerificationOrders.length > 0
                ? 'Your Purchased Files Are Being Verified'
                : 'Your Inventory is Empty'}
            </h2>
            <p className="mt-2 text-sm text-[#6E5A5D] leading-relaxed">
              {pendingVerificationOrders.length > 0
                ? 'Your digital files will appear here ready for download once the admin approves your JazzCash payment.'
                : 'Whenever you purchase a digital design on DesignHub PK, it is automatically saved here for permanent JPG and PSD access anytime.'}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="btn-velora-primary mt-6 px-7 py-3.5 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs hover:bg-[#521521]"
            >
              BROWSE DIGITAL DESIGNS
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {inventoryItems.map((item) => {
          const hasPsdPurchased =
            item.selectedFormat === 'JPG_PLUS_PSD' && Boolean(item.psdDownload);
          const matchedProduct = products.find((p) => p.id === item.productId);

          return (
            <div
              key={item.key}
              className="bg-white border border-[#E6DAD2] rounded-xs p-5 sm:p-6 flex flex-col sm:flex-row gap-5 velora-surface-card"
            >
              {/* Product Preview */}
              <div
                onClick={() => {
                  if (matchedProduct?.slug) {
                    onSelectProduct(matchedProduct.slug);
                  }
                }}
                className={`w-full sm:w-36 h-44 sm:h-40 rounded-xs overflow-hidden bg-[#F3EAE4] border border-[#E6DAD2] shrink-0 ${
                  matchedProduct?.slug ? 'cursor-pointer group' : ''
                }`}
              >
                <ResilientImage
                  src={item.previewImage}
                  alt={item.productTitle}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Product Details & Download Buttons */}
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-mono-tabular text-[#6E5A5D] inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#3D0F18]" />
                      <span>
                        Purchased{' '}
                        {new Date(item.purchaseDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </span>
                    <span className="text-xs font-mono-tabular font-bold text-[#3D0F18]">
                      {homepageConfig.currencySymbol}
                      {item.amountPaid.toLocaleString()}
                    </span>
                  </div>

                  <h3 className="mt-1.5 font-serif-editorial text-xl sm:text-2xl font-semibold text-[#231518] truncate">
                    {item.productTitle}
                  </h3>

                  {/* Available File Formats */}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#5C474B]">
                    <span className="font-semibold text-[#231518]">Available Formats:</span>
                    <span className="inline-flex items-center gap-1 text-[#3D0F18] font-medium">
                      <FileImage className="w-3.5 h-3.5" />
                      <span>JPG</span>
                    </span>
                    {hasPsdPurchased && (
                      <>
                        <span className="text-[#C59B6D]">·</span>
                        <span className="inline-flex items-center gap-1 text-[#3D0F18] font-semibold">
                          <Layers className="w-3.5 h-3.5 text-[#C59B6D]" />
                          <span>PSD (Editable Upgrade)</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Download Buttons — Strictly enforces JPG vs JPG + PSD access */}
                <div className="mt-5 pt-4 border-t border-[#E6DAD2] flex flex-wrap items-center gap-2.5">
                  {item.jpgDownload && (
                    <button
                      type="button"
                      disabled={downloadingId === item.jpgDownload.downloadId}
                      onClick={() => handleDownloadFile(item.jpgDownload!)}
                      className="btn-velora-primary px-4 py-2.5 bg-[#3D0F18] text-[#FAF6F3] hover:bg-[#521521] text-xs font-semibold uppercase tracking-[0.15em] rounded-xs inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {downloadingId === item.jpgDownload.downloadId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Download JPG</span>
                    </button>
                  )}

                  {hasPsdPurchased && item.psdDownload && (
                    <button
                      type="button"
                      disabled={downloadingId === item.psdDownload.downloadId}
                      onClick={() => handleDownloadFile(item.psdDownload!)}
                      className="px-4 py-2.5 bg-[#231518] text-[#FAF6F3] hover:bg-[#3D0F18] border border-[#C59B6D]/40 text-xs font-semibold uppercase tracking-[0.15em] rounded-xs inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {downloadingId === item.psdDownload.downloadId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C59B6D]" />
                      ) : (
                        <Layers className="w-3.5 h-3.5 text-[#C59B6D]" />
                      )}
                      <span>Download PSD</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // LOGGED-OUT VIEW (Sign In / Create Account / Guest Session Inventory)
  // ============================================================================
  if (!customer) {
    return (
      <div className="max-w-[1140px] mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <div className="pb-6 border-b border-[#E6DAD2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7A545B]">
              DESIGNHUB PK ACCOUNT
            </p>
            <h1 className="mt-1 font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#231518]">
              Account
            </h1>
          </div>

          {/* Simple Top Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setGuestViewMode('auth');
                setAuthMode('login');
              }}
              className={`px-4 py-2.5 rounded-xs text-xs font-semibold uppercase tracking-[0.15em] inline-flex items-center gap-2 transition-colors ${
                guestViewMode === 'auth' && authMode === 'login'
                  ? 'bg-[#3D0F18] text-[#FAF6F3]'
                  : 'bg-white border border-[#E6DAD2] text-[#5C474B] hover:text-[#3D0F18]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setGuestViewMode('auth');
                setAuthMode('register');
              }}
              className={`px-4 py-2.5 rounded-xs text-xs font-semibold uppercase tracking-[0.15em] inline-flex items-center gap-2 transition-colors ${
                guestViewMode === 'auth' && authMode === 'register'
                  ? 'bg-[#3D0F18] text-[#FAF6F3]'
                  : 'bg-white border border-[#E6DAD2] text-[#5C474B] hover:text-[#3D0F18]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>

            <button
              type="button"
              onClick={() => setGuestViewMode('inventory')}
              className={`px-4 py-2.5 rounded-xs text-xs font-semibold uppercase tracking-[0.15em] inline-flex items-center gap-2 transition-colors ${
                guestViewMode === 'inventory'
                  ? 'bg-[#3D0F18] text-[#FAF6F3]'
                  : 'bg-white border border-[#E6DAD2] text-[#5C474B] hover:text-[#3D0F18]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>My Inventory ({inventoryItems.length})</span>
            </button>
          </div>
        </div>

        {guestViewMode === 'inventory' ? (
          <div className="mt-8 space-y-6">
            <div className="bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#3D0F18] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#231518]">
                    Save Your Inventory Across All Devices
                  </p>
                  <p className="text-xs text-[#6E5A5D] mt-0.5">
                    Sign in or create a DesignHub PK account to permanently link your purchased designs to
                    your personal account.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGuestViewMode('auth');
                  setAuthMode('login');
                }}
                className="px-4 py-2 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.15em] rounded-xs shrink-0 self-start sm:self-auto"
              >
                Sign In / Create Account
              </button>
            </div>

            {renderInventoryGrid()}
          </div>
        ) : forgotPasswordOpen ? (
          <div className="mt-8 max-w-lg mx-auto bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-10 space-y-6 velora-surface-card">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7A545B]">
                PASSWORD RECOVERY
              </p>
              <h2 className="mt-1 font-serif-editorial text-3xl font-semibold text-[#231518]">
                {forgotStep === 'request' ? 'Forgot Password' : 'Create New Password'}
              </h2>
              <p className="mt-1.5 text-xs text-[#6E5A5D]">
                {forgotStep === 'request'
                  ? 'Enter your registered email address to reset your account password.'
                  : forgotStatusMessage ||
                    'Enter and confirm your new password below to complete the reset.'}
              </p>
            </div>

            {forgotStep === 'request' ? (
              <form onSubmit={handleRequestCustomerReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#231518] mb-1">
                    Registered Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn-velora-primary w-full py-3.5 bg-[#3D0F18] text-[#FAF6F3] hover:bg-[#521521] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs transition-colors"
                >
                  {forgotLoading ? 'PLEASE WAIT...' : 'CONTINUE TO PASSWORD RESET'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotPasswordOpen(false);
                    setForgotStep('request');
                  }}
                  className="w-full py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#6E5A5D] hover:text-[#3D0F18] transition-colors"
                >
                  Back to Sign In
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmCustomerReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#231518] mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#231518] mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn-velora-primary w-full py-3.5 bg-[#3D0F18] text-[#FAF6F3] hover:bg-[#521521] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs transition-colors"
                >
                  {forgotLoading ? 'SAVING NEW PASSWORD...' : 'SAVE NEW PASSWORD'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotPasswordOpen(false);
                    setForgotStep('request');
                  }}
                  className="w-full py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#6E5A5D] hover:text-[#3D0F18] transition-colors"
                >
                  Cancel &amp; Back to Sign In
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="mt-8 max-w-lg mx-auto space-y-5">
            {pendingCartProduct && (
              <div className="bg-[#3D0F18] text-[#FAF6F3] border border-[#C59B6D]/45 rounded-xs p-4 sm:p-5 shadow-md space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xs overflow-hidden bg-[#26090F] border border-[#C59B6D]/35 shrink-0">
                    <ResilientImage
                      src={pendingCartProduct.product.previewImages[0]}
                      alt={pendingCartProduct.product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C59B6D]">
                      ACCOUNT REQUIRED BEFORE ADDING TO CART
                    </p>
                    <h3 className="mt-0.5 font-serif-editorial text-lg font-semibold text-[#FAF6F3] truncate">
                      {pendingCartProduct.product.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#FAF6F3]/80">
                      Please <strong>Create a New Account</strong> or <strong>Sign In</strong> to your existing account below. Your selected design (
                      {pendingCartProduct.format === 'JPG_PLUS_PSD' ? 'JPG + PSD' : 'JPG'}) will be added to your cart automatically.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-10 space-y-6 velora-surface-card">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7A545B]">
                  {authMode === 'login' ? 'WELCOME BACK' : 'NEW ACCOUNT'}
                </p>
                <h2 className="mt-1 font-serif-editorial text-3xl font-semibold text-[#231518]">
                  {authMode === 'login' ? 'Sign In to Your Account' : 'Create New Account'}
                </h2>
                <p className="mt-1.5 text-xs text-[#6E5A5D]">
                  {pendingCartProduct
                    ? 'Sign in with an existing account or create a new account to add items to your cart and save purchases to My Inventory.'
                    : 'Access your My Inventory purchases and download your JPG and PSD files anytime.'}
                </p>
              </div>

            <div className="inline-flex p-1 bg-[#F3EAE4] rounded-xs w-full">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 text-xs font-semibold uppercase tracking-[0.14em] rounded-xs transition-colors ${
                  authMode === 'login'
                    ? 'bg-[#3D0F18] text-[#FAF6F3] shadow-2xs'
                    : 'text-[#6E5A5D]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 text-xs font-semibold uppercase tracking-[0.14em] rounded-xs transition-colors ${
                  authMode === 'register'
                    ? 'bg-[#3D0F18] text-[#FAF6F3] shadow-2xs'
                    : 'text-[#6E5A5D]'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-[#231518] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#231518] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm"
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-[#231518] mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0300..."
                    className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm font-mono-tabular"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[#231518]">
                    Password *
                  </label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setForgotStep('request');
                        setForgotPasswordOpen(true);
                      }}
                      className="text-xs font-semibold text-[#3D0F18] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="btn-velora-primary w-full py-3.5 bg-[#3D0F18] text-[#FAF6F3] hover:bg-[#521521] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs transition-colors"
              >
                {authLoading
                  ? 'PLEASE WAIT...'
                  : authMode === 'login'
                  ? 'SIGN IN & CONTINUE'
                  : 'CREATE ACCOUNT & CONTINUE'}
              </button>
            </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // LOGGED-IN VIEW (My Inventory, My Account, Switch Account, Logout)
  // ============================================================================
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-14">
      <div className="pb-6 border-b border-[#E6DAD2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7A545B]">
            ACCOUNT
          </p>
          <h1 className="mt-1 font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#231518]">
            {customer.name}
          </h1>
          <p className="text-xs text-[#6E5A5D] mt-0.5">{customer.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('switch-account')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E6DAD2] hover:border-[#3D0F18] rounded-xs text-xs font-semibold uppercase tracking-[0.15em] text-[#231518] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#3D0F18]" />
            <span>Change / Switch Account</span>
          </button>

          <button
            type="button"
            onClick={onCustomerLogout}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E6DAD2] hover:border-red-700 hover:text-red-700 rounded-xs text-xs font-semibold uppercase tracking-[0.15em] text-[#231518] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-[#3D0F18]" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Clean Navigation Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-[#E6DAD2] pb-4">
        <button
          type="button"
          onClick={() => setActiveTab('my-inventory')}
          className={`px-5 py-2.5 rounded-xs text-xs font-semibold uppercase tracking-[0.16em] inline-flex items-center gap-2 transition-colors ${
            activeTab === 'my-inventory'
              ? 'bg-[#3D0F18] text-[#FAF6F3]'
              : 'bg-white border border-[#E6DAD2] text-[#6E5A5D] hover:text-[#3D0F18]'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>My Inventory ({inventoryItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my-orders')}
          className={`px-5 py-2.5 rounded-xs text-xs font-semibold uppercase tracking-[0.16em] inline-flex items-center gap-2 transition-colors ${
            activeTab === 'my-orders'
              ? 'bg-[#3D0F18] text-[#FAF6F3]'
              : 'bg-white border border-[#E6DAD2] text-[#6E5A5D] hover:text-[#3D0F18]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>My Orders / Transaction History ({inventoryOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my-account')}
          className={`px-5 py-2.5 rounded-xs text-xs font-semibold uppercase tracking-[0.16em] inline-flex items-center gap-2 transition-colors ${
            activeTab === 'my-account'
              ? 'bg-[#3D0F18] text-[#FAF6F3]'
              : 'bg-white border border-[#E6DAD2] text-[#6E5A5D] hover:text-[#3D0F18]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>My Account</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('switch-account')}
          className={`px-5 py-2.5 rounded-xs text-xs font-semibold uppercase tracking-[0.16em] inline-flex items-center gap-2 transition-colors ${
            activeTab === 'switch-account'
              ? 'bg-[#3D0F18] text-[#FAF6F3]'
              : 'bg-white border border-[#E6DAD2] text-[#6E5A5D] hover:text-[#3D0F18]'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Switch Account</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'my-inventory' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif-editorial text-2xl sm:text-3xl font-semibold text-[#231518]">
                  My Inventory
                </h2>
                <p className="text-xs text-[#6E5A5D] mt-0.5">
                  All your purchased digital products are permanently stored here for instant download.
                </p>
              </div>
              <span className="text-xs font-mono-tabular text-[#6E5A5D]">
                {inventoryItems.length}{' '}
                {inventoryItems.length === 1 ? 'Purchased Product' : 'Purchased Products'}
              </span>
            </div>

            {renderInventoryGrid()}
          </div>
        )}

        {activeTab === 'my-orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif-editorial text-2xl sm:text-3xl font-semibold text-[#231518]">
                  My Orders &amp; Transaction History
                </h2>
                <p className="text-xs text-[#6E5A5D] mt-0.5">
                  Real-time status of your orders, JazzCash payment verifications, and digital purchase receipts.
                </p>
              </div>
              <span className="text-xs font-mono-tabular text-[#6E5A5D]">
                {inventoryOrders.length}{' '}
                {inventoryOrders.length === 1 ? 'Total Order' : 'Total Orders'}
              </span>
            </div>

            {inventoryOrders.length === 0 ? (
              <div className="bg-white border border-[#E6DAD2] rounded-xs p-10 sm:p-14 text-center max-w-xl mx-auto velora-surface-card">
                <div className="w-12 h-12 rounded-full bg-[#FAF6F3] border border-[#E6DAD2] flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-5 h-5 text-[#3D0F18]" />
                </div>
                <h3 className="font-serif-editorial text-2xl font-semibold text-[#231518]">
                  No Orders Yet
                </h3>
                <p className="mt-2 text-sm text-[#6E5A5D]">
                  You have not placed any orders with this account yet.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('shop')}
                  className="btn-velora-primary mt-6 px-7 py-3.5 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs hover:bg-[#521521]"
                >
                  DISCOVER THE COLLECTION
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {inventoryOrders.map((ord) => {
                  const isPaid = isOrderPaid(ord.paymentStatus);
                  const isRejected = isOrderRejected(ord.paymentStatus);
                  const isCancelled = isOrderCancelled(ord.paymentStatus);
                  const isPending = !isPaid && !isRejected && !isCancelled;

                  return (
                    <div
                      key={ord.orderId}
                      className="bg-white border border-[#E6DAD2] rounded-xs p-5 sm:p-6 space-y-5 velora-surface-card"
                    >
                      {/* Order Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6DAD2]">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono-tabular font-bold text-sm text-[#3D0F18]">
                              Order #{ord.orderId}
                            </span>
                            <span className="text-[#E6DAD2]">|</span>
                            <span className="text-xs font-mono-tabular text-[#6E5A5D] flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#3D0F18]" />
                              {new Date(ord.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-[#6E5A5D]">
                            Customer: <strong className="text-[#231518]">{ord.customerName || customer.name}</strong> ({ord.email})
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div className="self-start sm:self-auto">
                          {isPaid ? (
                            <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xs font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>PAYMENT ACCEPTED / PAID</span>
                            </span>
                          ) : isRejected ? (
                            <span className="px-3 py-1.5 bg-red-50 border border-red-300 text-red-800 rounded-xs font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs">
                              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                              <span>PAYMENT REJECTED</span>
                            </span>
                          ) : isCancelled ? (
                            <span className="px-3 py-1.5 bg-stone-100 border border-stone-300 text-stone-700 rounded-xs font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs">
                              <XCircle className="w-3.5 h-3.5 text-stone-500" />
                              <span>PAYMENT REQUEST CANCELLED</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xs font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs animate-pulse">
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              <span>PAYMENT VERIFICATION PENDING</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Payment Details Box */}
                      <div className="bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7A545B]">
                            Payment Method
                          </p>
                          <p className="mt-1 font-semibold text-[#231518] capitalize">
                            {ord.paymentMethod === 'jazzcash' ? 'JazzCash Manual Transfer' : ord.paymentMethod}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7A545B]">
                            JazzCash Receiver
                          </p>
                          <p className="mt-1 font-mono-tabular font-semibold text-[#231518]">
                            03192644717
                          </p>
                          <p className="text-[10px] text-[#6E5A5D]">Title: waiz siddiqui</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7A545B]">
                            Transaction ID (TID)
                          </p>
                          <p className="mt-1 font-mono-tabular font-bold text-[#3D0F18]">
                            {ord.paymentReference || 'N/A'}
                          </p>
                          {(ord.senderPhone || ord.phone) && (
                            <p className="text-[10px] text-[#6E5A5D]">
                              Sender: {ord.senderPhone || ord.phone}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7A545B]">
                            Total Amount
                          </p>
                          <p className="mt-1 font-mono-tabular font-bold text-sm text-[#3D0F18]">
                            {homepageConfig.currencySymbol}
                            {ord.total.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Payment Screenshot if uploaded */}
                      {ord.paymentScreenshot && (
                        <div className="flex items-center gap-3 p-3 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs">
                          <div className="w-12 h-12 rounded-xs overflow-hidden border border-[#E6DAD2] shrink-0 bg-white">
                            <img
                              src={ord.paymentScreenshot}
                              alt="Proof of payment"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#231518]">
                              Proof of Payment Uploaded
                            </p>
                            <p className="text-[11px] text-[#6E5A5D]">
                              Screenshot attached with payment verification request.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Items in Order */}
                      <div className="space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#7A545B]">
                          Order Items ({ord.items.length})
                        </p>
                        <div className="divide-y divide-[#E6DAD2]">
                          {ord.items.map((item, idx) => {
                            const matchedProduct = products.find((p) => p.id === item.productId);
                            const img = item.previewImage || matchedProduct?.previewImages?.[0] || '';
                            const jpgDl = (ord.downloads || []).find(
                              (d) => d.productId === item.productId && d.format === 'JPG'
                            );
                            const psdDl =
                              item.selectedFormat === 'JPG_PLUS_PSD'
                                ? (ord.downloads || []).find(
                                    (d) => d.productId === item.productId && d.format === 'PSD'
                                  )
                                : undefined;

                            return (
                              <div
                                key={`${item.productId}-${idx}`}
                                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-xs overflow-hidden bg-[#F3EAE4] border border-[#E6DAD2] shrink-0">
                                    <ResilientImage
                                      src={img}
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-semibold text-[#231518]">
                                      {item.title}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-[#6E5A5D] mt-0.5">
                                      <span>
                                        Format:{' '}
                                        <strong className="text-[#3D0F18]">
                                          {item.selectedFormat === 'JPG_PLUS_PSD'
                                            ? 'JPG + PSD'
                                            : 'JPG'}
                                        </strong>
                                      </span>
                                      <span>·</span>
                                      <span className="font-mono-tabular">
                                        {homepageConfig.currencySymbol}
                                        {item.itemTotal.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Order Item Downloads (Only if PAID) */}
                                {isPaid && (
                                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                                    {jpgDl && (
                                      <button
                                        type="button"
                                        disabled={downloadingId === jpgDl.downloadId}
                                        onClick={() => handleDownloadFile(jpgDl)}
                                        className="px-3 py-1.5 bg-[#3D0F18] text-[#FAF6F3] hover:bg-[#521521] text-xs font-semibold uppercase tracking-wider rounded-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                                      >
                                        {downloadingId === jpgDl.downloadId ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Download className="w-3.5 h-3.5" />
                                        )}
                                        <span>Download JPG</span>
                                      </button>
                                    )}

                                    {item.selectedFormat === 'JPG_PLUS_PSD' && psdDl && (
                                      <button
                                        type="button"
                                        disabled={downloadingId === psdDl.downloadId}
                                        onClick={() => handleDownloadFile(psdDl)}
                                        className="px-3 py-1.5 bg-[#231518] text-[#FAF6F3] hover:bg-[#3D0F18] border border-[#C59B6D]/40 text-xs font-semibold uppercase tracking-wider rounded-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                                      >
                                        {downloadingId === psdDl.downloadId ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C59B6D]" />
                                        ) : (
                                          <Layers className="w-3.5 h-3.5 text-[#C59B6D]" />
                                        )}
                                        <span>Download PSD</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Footer Actions / Notices */}
                      <div className="pt-4 border-t border-[#E6DAD2] flex flex-wrap items-center justify-between gap-3">
                        <div>
                          {isPaid && (
                            <p className="text-xs text-emerald-800 font-medium inline-flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Payment verified by Admin. All purchased designs are in your Inventory.</span>
                            </p>
                          )}
                          {isPending && (
                            <p className="text-xs text-amber-900 inline-flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-amber-700 animate-pulse" />
                              <span>Manual verification in progress by Admin. Downloads unlock automatically once approved.</span>
                            </p>
                          )}
                          {isRejected && (
                            <p className="text-xs text-red-900 inline-flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <span>Payment verification could not be validated. Contact waizsiddiqui.business@gmail.com for help.</span>
                            </p>
                          )}
                          {isCancelled && (
                            <p className="text-xs text-stone-600 inline-flex items-center gap-1.5">
                              <XCircle className="w-4 h-4 text-stone-500" />
                              <span>Payment verification request was cancelled. Digital files remain locked.</span>
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {isPaid && (
                            <button
                              type="button"
                              onClick={() => setActiveTab('my-inventory')}
                              className="px-3.5 py-1.5 bg-[#FAF6F3] border border-[#E6DAD2] hover:border-[#3D0F18] text-[#3D0F18] text-xs font-semibold uppercase tracking-wider rounded-xs inline-flex items-center gap-1.5 transition-colors"
                            >
                              <Package className="w-3.5 h-3.5" />
                              <span>View in My Inventory</span>
                            </button>
                          )}

                          {isPending && onCancelPaymentRequest && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    `Are you sure you want to cancel payment verification for Order #${ord.orderId}?`
                                  )
                                ) {
                                  await onCancelPaymentRequest(ord.orderId, ord.orderAccessToken, ord.email);
                                }
                              }}
                              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold uppercase tracking-wider rounded-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5 text-stone-600" />
                              <span>Cancel Request</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenOrderDetails(ord)}
                            className="px-3.5 py-1.5 bg-white border border-[#E6DAD2] hover:border-[#3D0F18] text-[#231518] text-xs font-semibold uppercase tracking-wider rounded-xs inline-flex items-center gap-1.5 transition-colors"
                          >
                            <span>Receipt &amp; Summary</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'my-account' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-[#E6DAD2] rounded-xs p-6 velora-surface-card space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3D0F18]">
                  Account Summary
                </h2>
                <div className="pt-2 border-t border-[#E6DAD2] space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#6E5A5D]">Signed In As</span>
                    <span className="font-semibold text-[#231518]">{customer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6E5A5D]">Email</span>
                    <span className="font-mono-tabular text-[#231518]">{customer.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6E5A5D]">Products in Inventory</span>
                    <span className="font-mono-tabular font-bold text-[#3D0F18]">
                      {inventoryItems.length}
                    </span>
                  </div>
                </div>
                <div className="pt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('my-inventory')}
                    className="btn-velora-primary px-4 py-2.5 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.15em] rounded-xs inline-flex items-center gap-2"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Open My Inventory</span>
                  </button>
                  <button
                    type="button"
                    onClick={onCustomerLogout}
                    className="px-4 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] hover:border-red-700 hover:text-red-700 text-xs font-semibold uppercase tracking-[0.15em] rounded-xs inline-flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-8 space-y-4 velora-surface-card">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3D0F18]">
                Profile Details
              </h2>
              <div>
                <label className="block text-xs font-medium text-[#231518] mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#231518] mb-1">Email</label>
                <input
                  type="email"
                  disabled
                  value={customer.email}
                  className="w-full px-3.5 py-2.5 bg-[#F3EAE4] border border-[#E6DAD2] rounded-xs text-sm text-[#6E5A5D]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#231518] mb-1">Phone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm font-mono-tabular"
                />
              </div>
              <button
                type="button"
                onClick={() => onCustomerUpdateProfile(editName, editPhone)}
                className="btn-velora-primary px-6 py-2.5 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.16em] rounded-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'switch-account' && (
          <div className="max-w-lg mx-auto bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-10 space-y-6 velora-surface-card">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7A545B]">
                CHANGE / SWITCH ACCOUNT
              </p>
              <h2 className="mt-1 font-serif-editorial text-2xl sm:text-3xl font-semibold text-[#231518]">
                Switch to Another Account
              </h2>
              <p className="mt-1.5 text-xs text-[#6E5A5D]">
                Currently signed in as <strong className="text-[#231518]">{customer.email}</strong>.
                Sign in with a different account or create a new one below.
              </p>
            </div>

            <div className="inline-flex p-1 bg-[#F3EAE4] rounded-xs w-full">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 text-xs font-semibold uppercase tracking-[0.14em] rounded-xs transition-colors ${
                  authMode === 'login'
                    ? 'bg-[#3D0F18] text-[#FAF6F3] shadow-2xs'
                    : 'text-[#6E5A5D]'
                }`}
              >
                Sign In to Existing
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 text-xs font-semibold uppercase tracking-[0.14em] rounded-xs transition-colors ${
                  authMode === 'register'
                    ? 'bg-[#3D0F18] text-[#FAF6F3] shadow-2xs'
                    : 'text-[#6E5A5D]'
                }`}
              >
                Create New Account
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-[#231518] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#231518] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="another@email.com"
                  className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#231518] mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="btn-velora-primary w-full py-3.5 bg-[#3D0F18] text-[#FAF6F3] hover:bg-[#521521] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs transition-colors"
              >
                {authLoading
                  ? 'SWITCHING ACCOUNT...'
                  : authMode === 'login'
                  ? 'SWITCH ACCOUNT'
                  : 'CREATE & SWITCH ACCOUNT'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// INFORMATIONAL PAGES (About, Contact, FAQ, Terms, Privacy, Refund)
// ============================================================================

export function InfoPage({
  page,
  onNavigate,
  onNotify,
}: {
  page: 'about' | 'contact' | 'faq' | 'terms' | 'privacy' | 'refund';
  onNavigate: (page: NavigationPage) => void;
  onNotify: (msg: string) => void;
}) {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          subject: contactSubject,
          message: contactMessage,
        }),
      });
      if (res.ok) {
        setSentSuccess(true);
        setContactName('');
        setContactEmail('');
        setContactSubject('');
        setContactMessage('');
        onNotify('Your message has been sent to DesignHub PK.');
      } else {
        const d = await res.json();
        onNotify(d.error || 'Could not send message.');
      }
    } catch {
      onNotify('Network error.');
    } finally {
      setSending(false);
    }
  };

  if (page === 'contact') {
    return (
      <div className="max-w-[1140px] mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7A545B]">
              GET IN TOUCH
            </p>
            <h1 className="font-serif-editorial text-4xl sm:text-5xl font-normal text-[#231518]">
              Contact DesignHub PK
            </h1>
            <p className="text-sm text-[#5C474B] leading-relaxed">
              Have a question regarding a digital design, format specifications, or an order? Reach
              out directly using our official contact channels below.
            </p>

            <div className="bg-white border border-[#E6DAD2] rounded-xs p-6 space-y-4 velora-surface-card">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xs bg-[#FAF6F3] border border-[#E6DAD2] flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-[#3D0F18]" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#6E5A5D]">Phone</p>
                  <a
                    href="tel:03192644717"
                    className="text-sm font-mono-tabular font-semibold text-[#3D0F18] hover:underline"
                  >
                    03192644717
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3.5 pt-4 border-t border-[#E6DAD2]">
                <div className="w-10 h-10 rounded-xs bg-[#FAF6F3] border border-[#E6DAD2] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-[#3D0F18]" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#6E5A5D]">Email</p>
                  <a
                    href="mailto:baigrahim12345@gmail.com"
                    className="text-sm font-semibold text-[#3D0F18] hover:underline break-all"
                  >
                    baigrahim12345@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-10 velora-surface-card">
            <h2 className="font-serif-editorial text-2xl font-semibold text-[#231518] mb-6">
              Send an Inquiry
            </h2>
            {sentSuccess ? (
              <div className="p-6 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
                <p className="font-serif-editorial text-xl font-semibold text-[#231518]">
                  Message Received
                </p>
                <p className="text-xs text-[#6E5A5D]">
                  Thank you for contacting DesignHub PK. We will respond to your inquiry shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setSentSuccess(false)}
                  className="btn-velora-primary px-5 py-2.5 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.16em] rounded-xs"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#231518] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#231518] mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#231518] mb-1">Subject</label>
                  <input
                    type="text"
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    placeholder="Order inquiry, format question..."
                    className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#231518] mb-1">
                    Message *
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    className="velora-input w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="btn-velora-primary px-7 py-3.5 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs inline-flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sending ? 'SENDING...' : 'SEND MESSAGE'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-12 sm:py-16">
      <div className="bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-12 space-y-6 velora-surface-card">
        {page === 'about' && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7A545B]">
              DIGITAL DESIGN STUDIO
            </p>
            <h1 className="font-serif-editorial text-4xl sm:text-5xl font-normal text-[#231518]">
              About DesignHub PK
            </h1>
            <p className="text-base text-[#5C474B] leading-relaxed">
              DesignHub PK is a luxury digital design studio offering downloadable creative products for
              modern creators, businesses, and brands in Pakistan and internationally.
            </p>
            <p className="text-sm text-[#6E5A5D] leading-relaxed">
              Our studio focuses on four core disciplines: Social Media Designs, Printables, Logos,
              and Digital Design Assets. Every product is delivered in a ready-to-use high-resolution
              JPG format as standard, with optional editable PSD source upgrades available for
              selected designs when you need complete layer-level control.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="btn-velora-primary px-7 py-3.5 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs"
              >
                DISCOVER THE COLLECTION
              </button>
            </div>
          </>
        )}

        {page === 'faq' && (
          <>
            <h1 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#231518]">
              Frequently Asked Questions
            </h1>
            <div className="space-y-5 pt-2">
              <div className="pb-4 border-b border-[#E6DAD2]">
                <h2 className="text-base font-semibold text-[#231518]">
                  What file format do I receive when I purchase a design?
                </h2>
                <p className="mt-1.5 text-sm text-[#6E5A5D]">
                  Every DesignHub PK design includes a high-resolution, ready-to-use JPG file as standard.
                  For eligible products, you can also select the optional paid PSD upgrade at
                  checkout to receive both the JPG and the editable Adobe Photoshop (PSD) source
                  file.
                </p>
              </div>
              <div className="pb-4 border-b border-[#E6DAD2]">
                <h2 className="text-base font-semibold text-[#231518]">
                  Do I have to buy the PSD file?
                </h2>
                <p className="mt-1.5 text-sm text-[#6E5A5D]">
                  No. Purchasing the PSD file is completely optional. You can purchase the standard
                  ready-to-use JPG at the base product price.
                </p>
              </div>
              <div className="pb-4 border-b border-[#E6DAD2]">
                <h2 className="text-base font-semibold text-[#231518]">
                  How do I access my purchased files later?
                </h2>
                <p className="mt-1.5 text-sm text-[#6E5A5D]">
                  Every completed purchase is automatically added to your My Inventory section inside
                  your Account, where you can download your JPG (and PSD if purchased) anytime.
                </p>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#231518]">
                  Can I switch accounts or log out without losing my purchases?
                </h2>
                <p className="mt-1.5 text-sm text-[#6E5A5D]">
                  Yes. Your purchased products are permanently saved to your account and remain
                  available whenever you sign back in.
                </p>
              </div>
            </div>
          </>
        )}

        {page === 'terms' && (
          <>
            <h1 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#231518]">
              Terms &amp; Conditions
            </h1>
            <div className="space-y-4 text-sm text-[#6E5A5D] leading-relaxed">
              <p>
                All products available on DesignHub PK are digital downloadable design assets. Upon
                verified payment, you are granted a non-exclusive license to use the downloaded JPG
                (and PSD if purchased) files for your personal or business creative projects.
              </p>
              <p>
                Reselling, redistributing, or sharing the original source files as standalone
                digital templates is prohibited.
              </p>
            </div>
          </>
        )}

        {page === 'privacy' && (
          <>
            <h1 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#231518]">
              Privacy Policy
            </h1>
            <div className="space-y-4 text-sm text-[#6E5A5D] leading-relaxed">
              <p>
                DesignHub PK collects only the essential information required to process your order,
                verify payment, and deliver your digital downloads.
              </p>
              <p>
                For privacy inquiries, contact us at{' '}
                <strong className="text-[#3D0F18]">baigrahim12345@gmail.com</strong> or{' '}
                <strong className="text-[#3D0F18]">03192644717</strong>.
              </p>
            </div>
          </>
        )}

        {page === 'refund' && (
          <>
            <h1 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#231518]">
              Refund Policy
            </h1>
            <div className="space-y-4 text-sm text-[#6E5A5D] leading-relaxed">
              <p>
                Because DesignHub PK products are instant digital downloads, completed downloads are
                generally non-refundable once accessed. However, if you experience a technical file
                issue or duplicate payment, please contact{' '}
                <strong className="text-[#3D0F18]">baigrahim12345@gmail.com</strong> or{' '}
                <strong className="text-[#3D0F18]">03192644717</strong> and our team will resolve it
                promptly.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
