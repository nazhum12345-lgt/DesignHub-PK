export type ProductFormatSelection = 'JPG_ONLY' | 'JPG_PLUS_PSD';

export type PaymentStatus =
  | 'Payment Verification Pending'
  | 'PAID'
  | 'PAYMENT REJECTED'
  | 'PAYMENT REQUEST CANCELLED'
  | 'Payment Request Cancelled'
  | 'Pending'
  | 'Processing'
  | 'Paid'
  | 'Failed'
  | 'Refunded';

export type PaymentGatewayMethod = 'jazzcash' | 'easypaisa' | 'card_gateway';

export interface Product {
  id: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  previewImages: string[];
  jpgFileName: string;
  jpgPrice: number;
  oldPrice?: number | null;
  hasPsd: boolean;
  psdFileName?: string;
  psdUpgradePrice?: number | null;
  dimensions: string;
  compatibility: string;
  usageRights: string;
  whatsIncluded: string[];
  tags: string[];
  featured: boolean;
  bestseller: boolean;
  new: boolean;
  limited: boolean;
  featuredInStudio?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  selectedFormat: ProductFormatSelection;
}

export interface OrderItem {
  productId: string;
  title: string;
  slug: string;
  category: string;
  previewImage: string;
  selectedFormat: ProductFormatSelection;
  jpgPrice: number;
  psdUpgradePrice: number;
  itemTotal: number;
}

export interface DownloadRecord {
  downloadId: string;
  orderId: string;
  customerEmail: string;
  customerId?: string;
  productId: string;
  productTitle: string;
  format: 'JPG' | 'PSD';
  fileName?: string;
  signedUrl: string;
  expiresAt: string;
  downloadCount: number;
  downloadStatus: 'Ready' | 'Downloaded' | 'Expired' | 'Locked';
  createdAt: string;
}

export interface Order {
  orderId: string;
  customerId?: string;
  customerName: string;
  email: string;
  phone?: string;
  country: string;
  billingCity?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  total: number;
  paymentMethod: PaymentGatewayMethod;
  recipientJazzCashNumber?: string;
  senderPhone?: string;
  senderName?: string;
  paymentReference?: string;
  paymentScreenshot?: string;
  paymentNotes?: string;
  paymentStatus: PaymentStatus;
  orderAccessToken?: string;
  downloads?: DownloadRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  wishlist: string[];
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  expiresAt?: string;
  usageLimit?: number | null;
  usedCount: number;
  restrictedCategory?: string;
  restrictedProductId?: string;
  active: boolean;
  createdAt: string;
}

export interface HomepageConfig {
  announcementText: string;
  showAnnouncement: boolean;
  showFeaturedSection: boolean;
  showMostLovedSection: boolean;
  showPsdUpgradeSection: boolean;
  showPromoBanner: boolean;
  promoHeadline: string;
  promoSubtext: string;
  currencyCode: string;
  currencySymbol: string;
  studioFeaturedProductIds?: string[];
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface AdminStats {
  revenue: number;
  ordersCount: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  productsCount: number;
  customersCount: number;
  downloadsCount: number;
  activeDownloadsCount: number;
}
