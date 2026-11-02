import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  Download,
  AlertCircle,
  ArrowLeft,
  Copy,
  Check,
  Smartphone,
  RefreshCw,
  Sparkles,
  FileImage,
  Layers,
  Loader2,
  Package,
  Clock,
  Info,
  Upload,
  X,
  Eye,
  Image as ImageIcon,
  XCircle,
} from 'lucide-react';
import {
  CartItem,
  Product,
  Order,
  CustomerProfile,
  HomepageConfig,
} from '../types/velora';
import { ResilientImage, VeloraDiamondDivider } from '../components/VeloraLogo';
import { NavigationPage, AccountSectionTab } from '../components/Header';

export const VELORA_JAZZCASH_NUMBER = '03192644717';

/**
 * Helper to trigger a real binary file download in the browser using the authenticated
 * signed download endpoint (`/api/downloads/:downloadId/file`).
 */
export async function triggerRealFileDownload(
  signedUrl: string,
  fallbackFileName: string
): Promise<boolean> {
  if (!signedUrl) return false;
  try {
    const res = await fetch(signedUrl, {
      method: 'GET',
      credentials: 'same-origin',
    });
    if (!res.ok) {
      throw new Error(`Download failed with status ${res.status}`);
    }
    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.setAttribute('download', fallbackFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 8000);
    return true;
  } catch {
    try {
      const link = document.createElement('a');
      link.href = signedUrl;
      link.setAttribute('download', fallbackFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch {
      return false;
    }
  }
}

interface CheckoutPageProps {
  cart: CartItem[];
  products: Product[];
  customer?: CustomerProfile | null;
  customerToken: string | null;
  homepageConfig: HomepageConfig;
  onOrderCreated: (order: Order, triggerAutoDownload?: boolean) => void;
  onNavigate: (page: NavigationPage) => void;
  onNotify: (msg: string) => void;
}

export function CheckoutPage({
  cart,
  products,
  customer,
  customerToken,
  homepageConfig,
  onOrderCreated,
  onNavigate,
  onNotify,
}: CheckoutPageProps) {
  // Manual JazzCash payment form state
  const [senderPhone, setSenderPhone] = useState(customer?.phone || '');
  const [senderName, setSenderName] = useState(customer?.name || '');
  const [transactionId, setTransactionId] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [paymentNotes, setPaymentNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copiedNumber, setCopiedNumber] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('Payment screenshot must be smaller than 8MB.');
      onNotify('Image file size exceeds 8MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentScreenshot(reader.result as string);
      onNotify('Payment proof screenshot attached.');
    };
    reader.readAsDataURL(file);
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(VELORA_JAZZCASH_NUMBER);
    setCopiedNumber(true);
    onNotify('JazzCash number copied to clipboard: 03192644717');
    setTimeout(() => {
      if (isMountedRef.current) setCopiedNumber(false);
    }, 2500);
  };

  const detailedItems = cart
    .map((ci) => {
      const product = products.find((p) => p.id === ci.productId);
      if (!product) return null;
      const psdUpgrade =
        ci.selectedFormat === 'JPG_PLUS_PSD' && product.hasPsd
          ? product.psdUpgradePrice || 0
          : 0;
      return {
        product,
        selectedFormat: ci.selectedFormat,
        jpgPrice: product.jpgPrice,
        psdUpgrade,
        itemTotal: product.jpgPrice + psdUpgrade,
      };
    })
    .filter(Boolean) as Array<{
    product: Product;
    selectedFormat: 'JPG_ONLY' | 'JPG_PLUS_PSD';
    jpgPrice: number;
    psdUpgrade: number;
    itemTotal: number;
  }>;

  const subtotal = detailedItems.reduce((sum, item) => sum + item.itemTotal, 0);
  const finalTotal = subtotal;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (detailedItems.length === 0) {
      onNotify('Your shopping bag is empty.');
      return;
    }

    if (!senderName.trim()) {
      setErrorMessage('Please enter your Customer Name.');
      return;
    }

    if (!senderPhone.trim()) {
      setErrorMessage('Please enter the JazzCash phone number you sent payment from.');
      return;
    }

    if (!transactionId.trim()) {
      setErrorMessage('Please enter the JazzCash Transaction ID (TID / Reference) received via SMS.');
      return;
    }

    setSubmitting(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customerToken) {
        headers.Authorization = `Bearer ${customerToken}`;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: cart,
          paymentMethod: 'jazzcash',
          recipientJazzCashNumber: VELORA_JAZZCASH_NUMBER,
          senderPhone: senderPhone.trim(),
          senderName: senderName.trim(),
          customerName: senderName.trim(),
          paymentReference: transactionId.trim(),
          paymentScreenshot: paymentScreenshot || undefined,
          paymentNotes: paymentNotes.trim(),
          email: customer?.email || '',
          phone: senderPhone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Could not submit your order. Please check details and try again.');
        onNotify(data.error || 'Failed to submit order.');
        setSubmitting(false);
        return;
      }

      onNotify('Order submitted! Payment verification pending.');
      // Direct customer to the Order Confirmation Page (with status 'Payment Verification Pending')
      onOrderCreated(data.order, false);
    } catch {
      setErrorMessage('Network connection error. Please check your internet connection.');
      onNotify('Network error submitting order.');
      setSubmitting(false);
    }
  };

  if (detailedItems.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-20 text-center">
        <h1 className="font-serif-editorial text-3xl font-semibold text-[#231518]">
          Your Shopping Bag is Empty
        </h1>
        <p className="mt-2 text-sm text-[#6E5A5D]">
          Explore the DesignHub PK digital catalog to add editorial brand designs to your order.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('shop')}
          className="btn-velora-primary mt-6 px-7 py-3 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs"
        >
          EXPLORE COLLECTION
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-10 sm:py-16">
      {/* Top Header */}
      <div className="pb-8 border-b border-[#E6DAD2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="inline-flex items-center gap-1.5 text-xs text-[#6E5A5D] hover:text-[#3D0F18] uppercase tracking-[0.15em] mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Collection</span>
          </button>
          <h1 className="font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#231518]">
            Checkout &amp; Payment
          </h1>
          <p className="text-xs text-[#6E5A5D] mt-1">
            Manual JazzCash transfer with direct order verification.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-xs text-[#3D0F18]">
          <ShieldCheck className="w-4 h-4 text-[#C59B6D]" />
          <span className="font-medium">Direct JazzCash Transfer</span>
        </div>
      </div>

      {/* Main Checkout Form */}
      <form onSubmit={handleSubmitOrder} className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Items + Manual JazzCash Setup */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Review Purchased Designs */}
          <div className="bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-8 space-y-4 velora-surface-card">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DAD2]">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3D0F18]">
                1. Selected Digital Design{detailedItems.length > 1 ? 's' : ''}
              </h2>
              <span className="text-xs font-mono-tabular text-[#6E5A5D]">
                {detailedItems.length} {detailedItems.length === 1 ? 'Design' : 'Designs'}
              </span>
            </div>

            <div className="space-y-4 divide-y divide-[#E6DAD2]">
              {detailedItems.map((item, idx) => (
                <div key={idx} className="pt-4 first:pt-0 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xs bg-[#F3EAE4] overflow-hidden shrink-0 border border-[#E6DAD2]">
                    <ResilientImage
                      src={item.product.previewImages[0]}
                      alt={item.product.title}
                      fallbackTitle={item.product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif-editorial text-base font-semibold text-[#231518] truncate">
                      {item.product.title}
                    </h3>
                    <p className="text-xs text-[#6E5A5D]">
                      Format:{' '}
                      <span className="text-[#3D0F18] font-medium">
                        {item.selectedFormat === 'JPG_PLUS_PSD' ? 'JPG + Editable PSD Source' : 'High-Res JPG'}
                      </span>
                    </p>
                    <p className="text-[11px] text-[#6E5A5D] font-mono-tabular mt-0.5">
                      {homepageConfig.currencySymbol}
                      {item.itemTotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Add Your JazzCash Payment Information */}
          <div className="bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-8 space-y-6 velora-surface-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E6DAD2]">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7A545B] block mb-0.5">
                  Payment Method
                </span>
                <h2 className="font-serif-editorial text-2xl font-bold text-[#231518]">
                  Add Your JazzCash Payment Information
                </h2>
                <p className="text-xs text-[#6E5A5D] mt-0.5">
                  Send payment to our verified JazzCash account, then submit your transaction details below.
                </p>
              </div>
              <span className="px-3 py-1 bg-[#3D0F18] text-[#FAF6F3] rounded-xs text-[10px] font-semibold uppercase tracking-wider self-start sm:self-auto shrink-0">
                JazzCash Manual
              </span>
            </div>

            {/* Official JazzCash Account Card: Number & Exact Order Amount */}
            <div className="bg-[#FAF6F3] border-2 border-[#3D0F18] rounded-xs p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6DAD2]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xs bg-[#3D0F18] text-[#FAF6F3] flex items-center justify-center shrink-0">
                    <Smartphone className="w-6 h-6 text-[#C59B6D]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7A545B]">
                      Official Receiving Account
                    </span>
                    <h3 className="font-serif-editorial text-2xl font-bold text-[#231518]">
                      JazzCash
                    </h3>
                  </div>
                </div>

                <div className="sm:text-right">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7A545B] block">
                    Exact Order Amount
                  </span>
                  <span className="font-mono-tabular text-2xl sm:text-3xl font-bold text-[#3D0F18]">
                    {homepageConfig.currencySymbol}
                    {finalTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* JazzCash Number with One-Click Copy */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6E5A5D] mb-1.5">
                  JazzCash Payment Number:
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 bg-white border border-[#E6DAD2] rounded-xs px-4 py-3 flex items-center justify-between font-mono-tabular text-xl sm:text-2xl font-bold text-[#3D0F18] tracking-widest shadow-2xs">
                    <span>{VELORA_JAZZCASH_NUMBER}</span>
                    <span className="text-xs font-sans font-normal text-[#6E5A5D] hidden sm:inline">
                      Account Title: DesignHub PK
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyNumber}
                    className="px-5 py-3 bg-[#3D0F18] hover:bg-[#521521] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.14em] rounded-xs transition-colors inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                  >
                    {copiedNumber ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[#C59B6D]" />
                        <span>COPY NUMBER</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step-by-Step Payment Instructions */}
              <div className="bg-white/80 border border-[#E6DAD2] rounded-xs p-4 space-y-2 text-xs text-[#5C474B]">
                <p className="font-semibold text-[#231518] uppercase tracking-[0.12em] text-[11px] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#3D0F18]" />
                  <span>How to Send Payment:</span>
                </p>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed pl-1">
                  <li>
                    Open your <strong>JazzCash App</strong> or dial <strong>*786#</strong>.
                  </li>
                  <li>
                    Select <strong>Send Money</strong> &rarr; <strong>To JazzCash Account</strong>.
                  </li>
                  <li>
                    Enter JazzCash Number: <strong className="text-[#3D0F18] font-mono-tabular font-bold">03192644717</strong>.
                  </li>
                  <li>
                    Enter exact Amount: <strong className="text-[#3D0F18] font-mono-tabular font-bold">{homepageConfig.currencySymbol}{finalTotal.toLocaleString()}</strong>.
                  </li>
                  <li>
                    Confirm transfer. You will receive an SMS from <strong>8558</strong> with your <strong>Transaction ID (TID)</strong>.
                  </li>
                  <li>
                    Enter your Transaction ID and attach the payment screenshot below.
                  </li>
                </ol>
              </div>
            </div>

            {/* Input Fields for JazzCash Payment Information */}
            <div className="space-y-4 pt-2">
              <div className="pb-2 border-b border-[#E6DAD2]">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3D0F18]">
                  Enter Payment &amp; Reference Details
                </h3>
                <p className="text-xs text-[#6E5A5D] mt-0.5">
                  Please provide the details from your JazzCash payment confirmation for admin verification.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xs text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1 & 2: Customer Name and Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#231518] mb-1.5">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g. Muhammad Ali"
                    className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm focus:outline-none focus:border-[#3D0F18]"
                  />
                  <p className="text-[10px] text-[#6E5A5D] mt-1">
                    Your full name for this digital license order.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#231518] mb-1.5">
                    Phone Number (JazzCash Sender) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="e.g. 0312-3456789"
                    className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm font-mono-tabular focus:outline-none focus:border-[#3D0F18]"
                  />
                  <p className="text-[10px] text-[#6E5A5D] mt-1">
                    The mobile number you used to send the payment.
                  </p>
                </div>
              </div>

              {/* 3 & 4: Exact Order Amount and Transaction ID / Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#231518] mb-1.5">
                    Exact Order Amount *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={`${homepageConfig.currencySymbol} ${finalTotal.toLocaleString()}`}
                      className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm font-mono-tabular font-bold text-[#3D0F18] focus:outline-none cursor-default"
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-xs">
                      Exact Amount
                    </span>
                  </div>
                  <p className="text-[10px] text-[#6E5A5D] mt-1">
                    Total amount to transfer to JazzCash: 03192644717
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#231518] mb-1.5">
                    Transaction ID / Reference Number (TID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 8291048291 (from 8558 SMS)"
                    className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm font-mono-tabular focus:outline-none focus:border-[#3D0F18]"
                  />
                  <p className="text-[10px] text-[#6E5A5D] mt-1">
                    TID from your JazzCash payment confirmation SMS.
                  </p>
                </div>
              </div>

              {/* 5: Payment Screenshot / Proof Upload Field */}
              <div>
                <label className="block text-xs font-semibold text-[#231518] mb-1.5 flex items-center justify-between">
                  <span>Payment Screenshot / Proof</span>
                  {paymentScreenshot && (
                    <button
                      type="button"
                      onClick={() => setPaymentScreenshot(null)}
                      className="text-[11px] text-red-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Remove Screenshot</span>
                    </button>
                  )}
                </label>

                {paymentScreenshot ? (
                  <div className="border border-[#E6DAD2] rounded-xs p-3 bg-[#FAF6F3] flex items-center gap-3">
                    <img
                      src={paymentScreenshot}
                      alt="JazzCash payment screenshot proof"
                      className="w-16 h-16 object-cover rounded-xs border border-[#E6DAD2] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#231518] truncate">
                        Payment proof attached
                      </p>
                      <p className="text-[11px] text-[#6E5A5D]">
                        This screenshot will be verified by the admin to unlock your digital files.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaymentScreenshot(null)}
                      className="p-1.5 text-[#6E5A5D] hover:text-red-700 rounded-xs cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#E6DAD2] hover:border-[#3D0F18] rounded-xs p-4 bg-[#FAF6F3]/50 text-center cursor-pointer transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleScreenshotChange}
                    />
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Upload className="w-5 h-5 text-[#3D0F18]" />
                      <p className="text-xs font-semibold text-[#231518]">
                        Attach JazzCash Payment Screenshot / Receipt Proof
                      </p>
                      <p className="text-[10px] text-[#6E5A5D]">
                        Click to upload screenshot from JazzCash App or SMS (PNG, JPG, WEBP up to 8MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Note */}
              <div>
                <label className="block text-xs font-medium text-[#231518] mb-1.5">
                  Payment Note / Reference (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Any additional notes for the verification team..."
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm focus:outline-none focus:border-[#3D0F18]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Order Summary & Place Order */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-8 space-y-6 sticky top-24 velora-surface-card">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DAD2]">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3D0F18]">
                Order Summary
              </h2>
              <span className="text-xs font-mono-tabular text-[#6E5A5D]">
                {detailedItems.length} {detailedItems.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 text-xs font-mono-tabular text-[#6E5A5D]">
              <div className="flex justify-between">
                <span className="font-sans">Subtotal</span>
                <span className="font-semibold text-[#231518]">
                  {homepageConfig.currencySymbol}
                  {subtotal.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="font-sans">Payment Method</span>
                <span className="font-sans font-semibold text-[#3D0F18]">
                  JazzCash (Manual)
                </span>
              </div>

              <div className="flex justify-between">
                <span className="font-sans">JazzCash Number</span>
                <span className="font-mono-tabular font-bold text-[#231518]">
                  {VELORA_JAZZCASH_NUMBER}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="font-sans">Order Status</span>
                <span className="font-sans text-amber-700 font-semibold inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>Verification Pending</span>
                </span>
              </div>

              <div className="pt-3 border-t border-[#E6DAD2] flex justify-between text-base font-bold text-[#3D0F18]">
                <span className="font-sans text-[#231518]">Total Payable</span>
                <span>
                  {homepageConfig.currencySymbol}
                  {finalTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-velora-primary w-full py-4 px-6 bg-[#3D0F18] text-[#FAF6F3] hover:bg-[#521521] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C59B6D]" />
                    <span>SUBMITTING ORDER...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#C59B6D]" />
                    <span>SUBMIT JAZZCASH ORDER</span>
                  </>
                )}
              </button>

              <div className="bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs p-3.5 space-y-1.5 text-[11px] text-[#6E5A5D] leading-relaxed">
                <div className="flex items-center gap-1.5 font-semibold text-[#231518] uppercase tracking-wider text-[10px]">
                  <Lock className="w-3 h-3 text-[#C59B6D]" />
                  <span>Manual Verification Process</span>
                </div>
                <p>
                  Upon submission, your order will be placed with status{' '}
                  <strong className="text-[#3D0F18]">&ldquo;Payment Verification Pending&rdquo;</strong>.
                  Our admin verifies the JazzCash transaction manually and marks the order as{' '}
                  <strong className="text-emerald-800">&ldquo;Paid&rdquo;</strong>, instantly unlocking your high-resolution JPG &amp; PSD digital files.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// ORDER CONFIRMATION / DOWNLOAD STATUS PAGE
// ============================================================================

interface OrderSuccessPageProps {
  order: Order | null;
  homepageConfig: HomepageConfig;
  shouldAutoDownload?: boolean;
  onConsumeAutoDownload?: () => void;
  onRefreshOrder: (orderId: string, token?: string, email?: string) => Promise<void>;
  onCancelPaymentRequest?: (orderId: string, token?: string, email?: string) => Promise<boolean>;
  onNavigate: (
    page: NavigationPage,
    params?: { accountTab?: AccountSectionTab }
  ) => void;
  onNotify: (msg: string) => void;
}

export function OrderSuccessPage({
  order,
  homepageConfig,
  shouldAutoDownload = false,
  onConsumeAutoDownload,
  onRefreshOrder,
  onCancelPaymentRequest,
  onNavigate,
  onNotify,
}: OrderSuccessPageProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const handleManualDownload = useCallback(
    async (signedUrl: string, fileName: string, label: string, key: string) => {
      if (!signedUrl) {
        onNotify('Download is locked until JazzCash payment verification is complete.');
        return;
      }
      setDownloadingKey(key);
      onNotify(`Downloading ${fileName}...`);
      const ok = await triggerRealFileDownload(signedUrl, fileName);
      setDownloadingKey(null);
      if (!ok) {
        onNotify(`Could not start download for ${label}. Please try again.`);
      }
    },
    [onNotify]
  );

  // Automatic JPG Download if already Paid
  useEffect(() => {
    if (!order || order.paymentStatus !== 'Paid' || !shouldAutoDownload) {
      return;
    }

    const storageGuardKey = `velora_auto_jpg_downloaded_${order.orderId}`;
    try {
      if (sessionStorage.getItem(storageGuardKey) === '1') {
        onConsumeAutoDownload?.();
        return;
      }
      sessionStorage.setItem(storageGuardKey, '1');
    } catch {
      // continue
    }

    onConsumeAutoDownload?.();

    const jpgRecords = (order.downloads || []).filter(
      (d) => d.format === 'JPG' && Boolean(d.signedUrl)
    );

    if (jpgRecords.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const rec of jpgRecords) {
        if (cancelled) break;
        const cleanFileName =
          rec.fileName ||
          `${rec.productTitle.replace(/[^a-zA-Z0-9_-]+/g, '-')}.jpg`;
        await triggerRealFileDownload(rec.signedUrl, cleanFileName);
      }
      if (!cancelled) {
        onNotify('Payment Verified — Automatically downloaded purchased JPG files.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [order, shouldAutoDownload, onConsumeAutoDownload, onNotify]);

  if (!order) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-20 text-center">
        <h1 className="font-serif-editorial text-3xl font-semibold text-[#231518]">
          No Active Order Found
        </h1>
        <p className="mt-2 text-sm text-[#6E5A5D]">
          Select digital designs from the DesignHub PK collection to place a new order.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('shop')}
          className="btn-velora-primary mt-6 px-7 py-3 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs"
        >
          EXPLORE DESIGNS
        </button>
      </div>
    );
  }

  const [viewScreenshotModal, setViewScreenshotModal] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState(false);

  const isPaid = order.paymentStatus === 'Paid' || order.paymentStatus === 'PAID';
  const isRejected = order.paymentStatus === 'PAYMENT REJECTED' || order.paymentStatus === 'Failed';
  const isCancelled =
    order.paymentStatus === 'PAYMENT REQUEST CANCELLED' ||
    order.paymentStatus === 'Payment Request Cancelled';
  const isPending = !isPaid && !isRejected && !isCancelled;

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await onRefreshOrder(order.orderId, order.orderAccessToken, order.email);
    setRefreshing(false);
    onNotify('Order status checked with DesignHub PK server.');
  };

  const handleCancelPayment = async () => {
    if (!order) return;
    if (
      !window.confirm(
        `Are you sure you want to cancel and withdraw your payment request for Order #${order.orderId}? This order will be removed from active verification and digital files will remain locked.`
      )
    ) {
      return;
    }
    setCancellingRequest(true);
    await onCancelPaymentRequest?.(order.orderId, order.orderAccessToken, order.email);
    setCancellingRequest(false);
  };

  return (
    <div className="max-w-[1040px] mx-auto px-4 sm:px-8 py-12 sm:py-16">
      <div className="bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-10 space-y-8 velora-surface-card">
        {/* Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-8 border-b border-[#E6DAD2]">
          <div className="space-y-3">
            {isPaid ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xs text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>PAYMENT VERIFIED &amp; PAID</span>
              </div>
            ) : isRejected ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-xs text-xs font-semibold uppercase tracking-[0.18em] text-red-800">
                <XCircle className="w-4 h-4 text-red-700" />
                <span>PAYMENT REJECTED</span>
              </div>
            ) : isCancelled ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-100 border border-stone-300 rounded-xs text-xs font-semibold uppercase tracking-[0.18em] text-stone-700">
                <XCircle className="w-4 h-4 text-stone-600" />
                <span>PAYMENT REQUEST CANCELLED</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-300 rounded-xs text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
                <Clock className="w-4 h-4 text-amber-700 animate-pulse" />
                <span>PAYMENT VERIFICATION PENDING</span>
              </div>
            )}

            <h1 className="font-serif-editorial text-3xl sm:text-5xl font-semibold text-[#231518]">
              {isPaid
                ? 'Payment Verified — Digital Files Ready'
                : isRejected
                ? 'Payment Verification Rejected'
                : isCancelled
                ? 'Payment Request Cancelled / Withdrawn'
                : 'Order Placed — Payment Verification Pending'}
            </h1>

            <p className="text-sm sm:text-base font-medium text-[#231518]">
              {isPaid
                ? 'Your JazzCash payment has been verified by the DesignHub PK team. Your purchased design files are ready for instant download.'
                : isRejected
                ? 'Your JazzCash payment for this order could not be verified by the admin.'
                : isCancelled
                ? 'You have cancelled / withdrawn this JazzCash payment verification request.'
                : 'Thank you! We have received your JazzCash payment details. Our team is manually verifying the transaction and will approve your order shortly.'}
            </p>

            <p className="text-xs sm:text-sm text-[#6E5A5D] leading-relaxed max-w-2xl">
              {isPaid ? (
                <>
                  You can download your files immediately below or access them anytime from{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('account', { accountTab: 'my-inventory' })}
                    className="font-semibold text-[#3D0F18] underline hover:text-[#521521] cursor-pointer"
                  >
                    Account &rarr; My Inventory
                  </button>
                  .
                </>
              ) : isRejected ? (
                <>
                  Please ensure that payment was sent to JazzCash Number <strong>03192644717</strong> and your Transaction ID (TID) matches the 8558 SMS. If you have already paid, please reach out with your receipt to{' '}
                  <a
                    href="mailto:waizsiddiqui.business@gmail.com"
                    className="font-semibold text-[#3D0F18] underline hover:text-[#521521]"
                  >
                    waizsiddiqui.business@gmail.com
                  </a>
                  .
                </>
              ) : isCancelled ? (
                <>
                  This payment request was cancelled and withdrawn from active verification. The order record is kept in your history, but digital files remain locked.
                </>
              ) : (
                <>
                  Once the admin verifies your payment sent to <strong>03192644717</strong>, this page will update to <strong>PAID</strong> and download buttons will unlock. You can also click <strong>Refresh Status</strong> below at any time.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start">
            <button
              type="button"
              onClick={handleManualRefresh}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] hover:border-[#3D0F18] rounded-xs text-xs font-semibold uppercase tracking-[0.14em] text-[#231518] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#3D0F18] ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Checking...' : 'Refresh Status'}</span>
            </button>

            {/* Customer Cancel / Withdraw Payment Request — Available ONLY while pending and NOT approved */}
            {isPending && onCancelPaymentRequest && (
              <button
                type="button"
                disabled={cancellingRequest}
                onClick={handleCancelPayment}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-red-300 hover:bg-red-50 text-red-700 rounded-xs text-xs font-semibold uppercase tracking-[0.14em] transition-colors cursor-pointer disabled:opacity-60"
              >
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                <span>{cancellingRequest ? 'Cancelling...' : 'Cancel / Withdraw Payment Request'}</span>
              </button>
            )}

            {isPaid && (
              <button
                type="button"
                onClick={() => onNavigate('account', { accountTab: 'my-inventory' })}
                className="btn-velora-primary inline-flex items-center gap-2 px-4 py-2.5 bg-[#3D0F18] text-[#FAF6F3] rounded-xs text-xs font-semibold uppercase tracking-[0.14em] cursor-pointer"
              >
                <Package className="w-3.5 h-3.5 text-[#C59B6D]" />
                <span>My Inventory</span>
              </button>
            )}
          </div>
        </div>

        {/* Transaction Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs p-5 text-xs">
          <div>
            <span className="text-[#6E5A5D] block mb-1">Order Reference</span>
            <span className="font-mono-tabular font-bold text-[#3D0F18] text-sm">
              {order.orderId}
            </span>
          </div>
          <div>
            <span className="text-[#6E5A5D] block mb-1">Payment Method</span>
            <span className="font-semibold text-[#231518]">
              JazzCash
            </span>
          </div>
          <div>
            <span className="text-[#6E5A5D] block mb-1">JazzCash Number</span>
            <span className="font-mono-tabular font-semibold text-[#231518]">
              {order.recipientJazzCashNumber || VELORA_JAZZCASH_NUMBER}
            </span>
          </div>
          <div>
            <span className="text-[#6E5A5D] block mb-1">Transaction ID (TID)</span>
            <span className="font-mono-tabular font-bold text-[#3D0F18]">
              {order.paymentReference || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-[#6E5A5D] block mb-1">Status</span>
            <span
              className={`inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.12em] ${
                isPaid
                  ? 'text-emerald-700'
                  : isRejected
                  ? 'text-red-700'
                  : isCancelled
                  ? 'text-stone-700'
                  : 'text-amber-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isPaid
                    ? 'bg-emerald-600'
                    : isRejected
                    ? 'bg-red-600'
                    : isCancelled
                    ? 'bg-stone-500'
                    : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span>
                {isPaid
                  ? 'PAID'
                  : isRejected
                  ? 'PAYMENT REJECTED'
                  : isCancelled
                  ? 'PAYMENT REQUEST CANCELLED'
                  : 'Payment Verification Pending'}
              </span>
            </span>
          </div>
        </div>

        {/* Sender details notice + screenshot proof preview */}
        <div className="p-4 bg-[#FAF6F3]/80 border border-[#E6DAD2] rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div>
              <span className="text-[#6E5A5D]">Customer: </span>
              <strong className="text-[#231518]">{order.customerName || order.senderName || 'Valued Customer'}</strong>
              {order.senderPhone && (
                <>
                  <span className="text-[#6E5A5D]"> · JazzCash Mobile: </span>
                  <strong className="text-[#231518] font-mono-tabular">{order.senderPhone}</strong>
                </>
              )}
            </div>
            {order.paymentScreenshot && (
              <div className="flex items-center gap-2 pt-1">
                <img
                  src={order.paymentScreenshot}
                  alt="Payment proof screenshot"
                  className="w-10 h-10 object-cover rounded-xs border border-[#E6DAD2] cursor-pointer"
                  onClick={() => setViewScreenshotModal(true)}
                />
                <button
                  type="button"
                  onClick={() => setViewScreenshotModal(true)}
                  className="text-xs font-semibold text-[#3D0F18] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Attached Payment Screenshot</span>
                </button>
              </div>
            )}
          </div>
          <div className="font-mono-tabular font-bold text-base text-[#3D0F18] sm:text-right shrink-0">
            <span className="text-[10px] text-[#7A545B] block uppercase tracking-wider font-sans font-normal">
              Total Amount
            </span>
            {homepageConfig.currencySymbol}
            {order.total.toLocaleString()}
          </div>
        </div>

        {/* Modal for viewing payment screenshot */}
        {viewScreenshotModal && order.paymentScreenshot && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white max-w-2xl w-full rounded-xs p-6 space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[#E6DAD2]">
                <h3 className="font-serif-editorial text-lg font-bold text-[#231518]">
                  JazzCash Payment Proof — Order #{order.orderId}
                </h3>
                <button
                  type="button"
                  onClick={() => setViewScreenshotModal(false)}
                  className="p-1.5 text-[#6E5A5D] hover:text-[#231518] rounded-xs cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto flex items-center justify-center bg-[#FAF6F3] p-2 rounded-xs border border-[#E6DAD2]">
                <img
                  src={order.paymentScreenshot}
                  alt="JazzCash payment screenshot proof"
                  className="max-h-[60vh] max-w-full object-contain rounded-xs shadow-xs"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-[#6E5A5D] pt-2">
                <span>TID: <strong className="text-[#3D0F18] font-mono-tabular">{order.paymentReference || 'N/A'}</strong></span>
                <button
                  type="button"
                  onClick={() => setViewScreenshotModal(false)}
                  className="px-4 py-2 bg-[#3D0F18] text-[#FAF6F3] rounded-xs text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Purchased Products & Download Links */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3D0F18]">
              Purchased Digital Design Files
            </h2>
            <span className="text-[11px] font-mono-tabular text-[#6E5A5D]">
              {new Date(order.createdAt).toLocaleString()}
            </span>
          </div>

          <div className="space-y-4">
            {order.items.map((item, idx) => {
              const jpgDownload = order.downloads?.find(
                (d) => d.productId === item.productId && d.format === 'JPG'
              );
              const psdDownload = order.downloads?.find(
                (d) => d.productId === item.productId && d.format === 'PSD'
              );

              const jpgFileName =
                jpgDownload?.fileName || `${item.slug || 'Velora-Design'}.jpg`;
              const psdFileName =
                psdDownload?.fileName || `${item.slug || 'Velora-Design'}.psd`;

              return (
                <div
                  key={idx}
                  className="border border-[#E6DAD2] bg-[#FAF6F3]/40 rounded-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xs bg-[#F3EAE4] overflow-hidden shrink-0 border border-[#E6DAD2]">
                      <ResilientImage
                        src={item.previewImage}
                        alt={item.title}
                        fallbackTitle={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7A545B]">
                        {item.category}
                      </span>
                      <h3 className="font-serif-editorial text-xl sm:text-2xl font-semibold text-[#231518]">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#6E5A5D] mt-0.5">
                        Format:{' '}
                        <strong className="text-[#231518]">
                          {item.selectedFormat === 'JPG_PLUS_PSD'
                            ? 'JPG + Editable PSD Source'
                            : 'High-Resolution JPG'}
                        </strong>{' '}
                        · File: <span className="font-mono-tabular">{jpgFileName}</span>
                      </p>
                      <p className="text-xs font-mono-tabular text-[#3D0F18] font-semibold mt-1">
                        Amount: {homepageConfig.currencySymbol}
                        {item.itemTotal.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Download Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    {isPaid && jpgDownload?.signedUrl ? (
                      <button
                        type="button"
                        disabled={downloadingKey === `jpg-${idx}`}
                        onClick={() =>
                          handleManualDownload(
                            jpgDownload.signedUrl,
                            jpgFileName,
                            item.title,
                            `jpg-${idx}`
                          )
                        }
                        className="btn-velora-primary px-6 py-3.5 bg-[#3D0F18] text-[#FAF6F3] hover:bg-[#521521] text-xs font-semibold uppercase tracking-[0.16em] rounded-xs transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                      >
                        <FileImage className="w-4 h-4 text-[#C59B6D]" />
                        <span>
                          {downloadingKey === `jpg-${idx}`
                            ? 'DOWNLOADING JPG...'
                            : 'Download JPG'}
                        </span>
                      </button>
                    ) : (
                      <span className="px-4 py-2.5 bg-[#F3EAE4] border border-[#E6DAD2] text-[#6E5A5D] text-xs font-semibold uppercase tracking-[0.12em] rounded-xs inline-flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-[#7A545B]" />
                        <span>
                          {isRejected
                            ? 'DOWNLOAD LOCKED (Payment Rejected)'
                            : isCancelled
                            ? 'DOWNLOAD LOCKED (Request Cancelled)'
                            : 'DOWNLOAD LOCKED (Verification Pending)'}
                        </span>
                      </span>
                    )}

                    {/* PSD Download Button ONLY if JPG_PLUS_PSD was purchased */}
                    {item.selectedFormat === 'JPG_PLUS_PSD' && (
                      <>
                        {isPaid && psdDownload?.signedUrl ? (
                          <button
                            type="button"
                            disabled={downloadingKey === `psd-${idx}`}
                            onClick={() =>
                              handleManualDownload(
                                psdDownload.signedUrl,
                                psdFileName,
                                `${item.title} (PSD)`,
                                `psd-${idx}`
                              )
                            }
                            className="btn-velora-secondary px-5 py-3.5 bg-[#C59B6D] text-[#231518] hover:bg-[#D4AD82] text-xs font-semibold uppercase tracking-[0.16em] rounded-xs transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                          >
                            <Layers className="w-4 h-4" />
                            <span>
                              {downloadingKey === `psd-${idx}`
                                ? 'DOWNLOADING PSD...'
                                : 'Download PSD'}
                            </span>
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
