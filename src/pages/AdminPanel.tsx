import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  Package,
  FolderKanban,
  ShoppingCart,
  Settings,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Lock,
  LogOut,
  ExternalLink,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  FileImage,
  Layers,
  AlertCircle,
  ChevronRight,
  Calendar,
  TrendingUp,
  Award,
  Mail,
  KeyRound,
  ShieldCheck,
  XCircle,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import {
  Product,
  Category,
  Order,
  HomepageConfig,
  AdminStats,
  PaymentStatus,
} from '../types/velora';
import { ResilientImage } from '../components/VeloraLogo';
import { NavigationPage } from '../components/Header';
import { getApiUrl } from '../services/api';

interface AdminPanelProps {
  storefrontProducts: Product[];
  storefrontCategories: Category[];
  storefrontHomepageConfig: HomepageConfig;
  onStorefrontUpdated: () => Promise<void>;
  onNavigate: (page: NavigationPage, params?: { slug?: string }) => void;
  onNotify: (msg: string) => void;
}

const DEFAULT_CATEGORY_IMAGE =
  '/src/assets/images/velora_social_studio_clean_1790691323998.jpg';

type IncomePeriodFilter =
  | 'today'
  | 'week'
  | 'month'
  | 'year'
  | 'custom'
  | 'best';

function toLocalDateKey(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatFullDisplayDate(dateKey: string): string {
  if (!dateKey) return '';
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateKey;
  const [year, month, day] = parts;
  const dateObj = new Date(year, month - 1, day);
  return dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function AdminPanel({
  storefrontProducts,
  storefrontCategories,
  storefrontHomepageConfig,
  onStorefrontUpdated,
  onNavigate,
  onNotify,
}: AdminPanelProps) {
  const [adminToken, setAdminTokenState] = useState<string | null>(() => {
    try {
      return (
        sessionStorage.getItem('velora_admin_token') ||
        localStorage.getItem('velora_admin_token') ||
        null
      );
    } catch {
      return null;
    }
  });

  const setAdminToken = (token: string | null) => {
    setAdminTokenState(token);
    try {
      if (token) {
        sessionStorage.setItem('velora_admin_token', token);
        localStorage.setItem('velora_admin_token', token);
      } else {
        sessionStorage.removeItem('velora_admin_token');
        localStorage.removeItem('velora_admin_token');
      }
    } catch {
      // ignore storage errors
    }
  };

  const [adminEmail, setAdminEmailState] = useState<string>(() => {
    try {
      return (
        sessionStorage.getItem('velora_admin_email') ||
        localStorage.getItem('velora_admin_email') ||
        ''
      );
    } catch {
      return '';
    }
  });

  const setAdminEmail = (email: string) => {
    setAdminEmailState(email);
    try {
      if (email) {
        sessionStorage.setItem('velora_admin_email', email);
        localStorage.setItem('velora_admin_email', email);
      } else {
        sessionStorage.removeItem('velora_admin_email');
        localStorage.removeItem('velora_admin_email');
      }
    } catch {
      // ignore storage errors
    }
  };
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Admin Forgot Password State (Admin Login -> Forgot Password -> Secure Password Reset -> New Password -> Admin Login)
  const [adminForgotOpen, setAdminForgotOpen] = useState(false);
  const [adminForgotStep, setAdminForgotStep] = useState<'request' | 'reset'>('request');
  const [adminForgotEmail, setAdminForgotEmail] = useState('');
  const [adminResetToken, setAdminResetToken] = useState('');
  const [adminResetNewPassword, setAdminResetNewPassword] = useState('');
  const [adminResetConfirmPassword, setAdminResetConfirmPassword] = useState('');
  const [adminForgotLoading, setAdminForgotLoading] = useState(false);
  const [adminForgotMessage, setAdminForgotMessage] = useState<string | null>(null);

  // Admin Income Dashboard Filter State
  const [incomeFilter, setIncomeFilter] = useState<IncomePeriodFilter>('today');
  const [customIncomeDate, setCustomIncomeDate] = useState<string>(() =>
    toLocalDateKey(new Date())
  );

  // Admin Settings: Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Admin Settings: Change Email / Change Gmail State
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [newAdminEmailInput, setNewAdminEmailInput] = useState('');
  const [confirmAdminEmailInput, setConfirmAdminEmailInput] = useState('');
  const [emailVerificationToken, setEmailVerificationToken] = useState('');
  const [pendingVerifiedEmail, setPendingVerifiedEmail] = useState('');
  const [emailChangeStep, setEmailChangeStep] = useState<'verify' | 'confirm'>('verify');
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'products' | 'categories' | 'orders' | 'homepage'
  >('dashboard');

  const [loadingData, setLoadingData] = useState(false);
  const [stats, setStats] = useState<AdminStats>({
    revenue: 0,
    ordersCount: 0,
    paidOrdersCount: 0,
    pendingOrdersCount: 0,
    productsCount: storefrontProducts.length,
    customersCount: 0,
    downloadsCount: 0,
    activeDownloadsCount: 0,
  });

  // Single source of truth synced with customer storefront + backend database
  const [products, setProducts] = useState<Product[]>(storefrontProducts);
  const [categories, setCategories] = useState<Category[]>(storefrontCategories);
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminViewingScreenshot, setAdminViewingScreenshot] = useState<{
    url: string;
    orderId: string;
    customerName: string;
    tid: string;
    amount: number;
    paymentStatus: PaymentStatus;
  } | null>(null);
  const [homepageConfig, setHomepageConfig] =
    useState<HomepageConfig>(storefrontHomepageConfig);

  useEffect(() => {
    setProducts(storefrontProducts);
    setStats((prev) => ({ ...prev, productsCount: storefrontProducts.length }));
  }, [storefrontProducts]);

  useEffect(() => {
    setCategories(storefrontCategories);
  }, [storefrontCategories]);

  useEffect(() => {
    setHomepageConfig(storefrontHomepageConfig);
  }, [storefrontHomepageConfig]);

  // Simplified Beginner-Friendly Product Form State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [formValidationMessage, setFormValidationMessage] = useState<string | null>(null);

  // 1. Product Name
  const [pTitle, setPTitle] = useState('');
  // 2. Category
  const [pCategory, setPCategory] = useState('Social Media');
  // 3. Product Preview
  const [pPreviewImage, setPPreviewImage] = useState('');
  const [pPreviewImageName, setPPreviewImageName] = useState('');
  // 4. Description
  const [pDescription, setPDescription] = useState('');
  // 5. JPG File (Main / Default Product File)
  const [pJpgFileName, setPJpgFileName] = useState('');
  const [pJpgFileDataUrl, setPJpgFileDataUrl] = useState('');
  // 6. JPG Price
  const [pJpgPrice, setPJpgPrice] = useState('');
  // 7. PSD Upgrade — Optional
  const [pHasPsd, setPHasPsd] = useState(false);
  const [pPsdUpgradePrice, setPPsdUpgradePrice] = useState('');
  const [pPsdFileName, setPPsdFileName] = useState('');
  const [pPsdFileDataUrl, setPPsdFileDataUrl] = useState('');

  const [savingProduct, setSavingProduct] = useState(false);

  // Hidden file input refs for clean, large beginner-friendly upload buttons
  const previewInputRef = useRef<HTMLInputElement | null>(null);
  const jpgFileInputRef = useRef<HTMLInputElement | null>(null);
  const psdFileInputRef = useRef<HTMLInputElement | null>(null);
  const catImageInputRef = useRef<HTMLInputElement | null>(null);

  // Category Form State
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catImage, setCatImage] = useState('');
  const [catImageName, setCatImageName] = useState('');

  const fetchAdminDashboard = useCallback(
    async (isSilent = false) => {
      if (!adminToken) return;
      if (!isSilent) setLoadingData(true);
      try {
        const res = await fetch(getApiUrl('/api/admin/dashboard'), {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (res.status === 401) {
          setAdminToken(null);
          return;
        }
        const data = await res.json();
        if (res.ok) {
          if (data.adminEmail) {
            setAdminEmail(data.adminEmail);
          }
          setStats(data.stats);
          setProducts(data.products || []);
          const deletedLocal: string[] = (() => {
            try {
              return JSON.parse(localStorage.getItem('velora_deleted_categories') || '[]');
            } catch {
              return [];
            }
          })();
          const filteredCategories = (data.categories || []).filter((c: any) => {
            const idLower = (c.id || '').toLowerCase();
            const slugLower = (c.slug || '').toLowerCase();
            const nameLower = (c.name || '').toLowerCase();
            return !deletedLocal.some(
              (d) => d.toLowerCase() === idLower || d.toLowerCase() === slugLower || d.toLowerCase() === nameLower
            );
          });
          setCategories(filteredCategories);
          setOrders(data.orders || []);
          if (data.homepageConfig) {
            setHomepageConfig(data.homepageConfig);
          }
        }
      } catch (err) {
        console.error('[Admin Dashboard Error]:', err);
        if (!isSilent) {
          onNotify('Could not load dashboard data.');
        }
      } finally {
        if (!isSilent) {
          setLoadingData(false);
        }
      }
    },
    [adminToken, onNotify]
  );

  useEffect(() => {
    if (adminToken) {
      fetchAdminDashboard(false);
      const interval = setInterval(() => {
        fetchAdminDashboard(true);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [adminToken, fetchAdminDashboard]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim();
    const cleanPassword = passwordInput;
    if (!cleanEmail || !cleanPassword) {
      onNotify('Please enter both admin email and password.');
      return;
    }
    setLoginLoading(true);
    try {
      const loginUrl = getApiUrl('/api/admin/login');
      const res = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          data = {};
        }
      } else {
        const text = await res.text();
        data = { error: `Server response (HTTP ${res.status}): ${text.slice(0, 100)}` };
      }

      if (!res.ok) {
        onNotify(data.error || `Admin login failed (HTTP ${res.status}).`);
        return;
      }

      if (!data.token) {
        onNotify('Authentication succeeded but no security token was returned.');
        return;
      }

      setAdminToken(data.token);
      if (data.adminEmail) {
        setAdminEmail(data.adminEmail);
      }
      setEmailInput('');
      setPasswordInput('');
      onNotify('Signed in to DesignHub PK Studio Admin.');
    } catch (err: any) {
      console.error('[Admin Login Error]:', err);
      onNotify(`Network error: ${err?.message || 'Unable to connect to server.'}`);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRequestAdminPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForgotEmail.trim()) {
      onNotify('Please enter the registered Admin email address.');
      return;
    }
    setAdminForgotLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/admin/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminForgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || 'Unable to initiate password reset.');
        return;
      }
      setAdminResetToken(data.resetToken || '');
      setAdminForgotMessage(
        data.message ||
          'Enter and confirm your new Admin password below to complete the reset.'
      );
      setAdminForgotStep('reset');
    } catch {
      onNotify('Network error.');
    } finally {
      setAdminForgotLoading(false);
    }
  };

  const handleConfirmAdminPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminResetNewPassword.length < 6) {
      onNotify('New Admin password must be at least 6 characters.');
      return;
    }
    if (adminResetNewPassword !== adminResetConfirmPassword) {
      onNotify('New password and confirmation password do not match.');
      return;
    }
    setAdminForgotLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/admin/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken: adminResetToken,
          newPassword: adminResetNewPassword,
          confirmPassword: adminResetConfirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || 'Unable to reset Admin password.');
        return;
      }
      setEmailInput('');
      setPasswordInput('');
      setAdminForgotEmail('');
      setAdminForgotOpen(false);
      setAdminForgotStep('request');
      setAdminResetToken('');
      setAdminResetNewPassword('');
      setAdminResetConfirmPassword('');
      setAdminForgotMessage(null);
      onNotify(data.message || 'Admin password updated. Please sign in with your new password.');
    } catch {
      onNotify('Network error.');
    } finally {
      setAdminForgotLoading(false);
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);
    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newAdminPassword.length < 6) {
      setPasswordFeedback({
        type: 'error',
        text: 'New password must be at least 6 characters.',
      });
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      setPasswordFeedback({
        type: 'error',
        text: 'New password and confirmation password do not match.',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch(getApiUrl('/api/admin/password'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword: newAdminPassword,
          confirmPassword: confirmAdminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || 'Could not update password.';
        setPasswordFeedback({ type: 'error', text: errMsg });
        onNotify(errMsg);
        return;
      }
      if (data.token) {
        setAdminToken(data.token);
      }
      setCurrentPassword('');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
      const successMsg = data.message || 'Admin password updated successfully.';
      setPasswordFeedback({ type: 'success', text: successMsg });
      onNotify(successMsg);
    } catch {
      setPasswordFeedback({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleVerifyEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailFeedback(null);
    if (!emailCurrentPassword) {
      setEmailFeedback({
        type: 'error',
        text: 'Please enter your current password to verify.',
      });
      return;
    }
    if (!newAdminEmailInput.trim() || !newAdminEmailInput.includes('@')) {
      setEmailFeedback({
        type: 'error',
        text: 'Please enter a valid new email address.',
      });
      return;
    }
    if (
      newAdminEmailInput.trim().toLowerCase() !==
      confirmAdminEmailInput.trim().toLowerCase()
    ) {
      setEmailFeedback({
        type: 'error',
        text: 'New email and confirmation email do not match.',
      });
      return;
    }

    setChangingEmail(true);
    try {
      const res = await fetch(getApiUrl('/api/admin/email/verify-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          currentPassword: emailCurrentPassword,
          newEmail: newAdminEmailInput.trim(),
          confirmEmail: confirmAdminEmailInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || 'Could not verify password for email change.';
        setEmailFeedback({ type: 'error', text: errMsg });
        onNotify(errMsg);
        return;
      }
      setEmailVerificationToken(data.verificationToken || '');
      setPendingVerifiedEmail(data.pendingEmail || newAdminEmailInput.trim().toLowerCase());
      setEmailChangeStep('confirm');
      setEmailFeedback({
        type: 'success',
        text:
          data.message ||
          'Current password verified. Please confirm the new Admin email below.',
      });
    } catch {
      setEmailFeedback({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setChangingEmail(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    setEmailFeedback(null);
    setChangingEmail(true);
    try {
      const res = await fetch(getApiUrl('/api/admin/email/confirm'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          verificationToken: emailVerificationToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || 'Could not update Admin email.';
        setEmailFeedback({ type: 'error', text: errMsg });
        onNotify(errMsg);
        return;
      }
      if (data.token) {
        setAdminToken(data.token);
      }
      if (data.adminEmail) {
        setAdminEmail(data.adminEmail);
      }
      setEmailInput('');
      setEmailCurrentPassword('');
      setNewAdminEmailInput('');
      setConfirmAdminEmailInput('');
      setEmailVerificationToken('');
      setPendingVerifiedEmail('');
      setEmailChangeStep('verify');
      const successMsg =
        data.message || `Admin login email updated to ${data.adminEmail}.`;
      setEmailFeedback({ type: 'success', text: successMsg });
      onNotify(successMsg);
    } catch {
      setEmailFeedback({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setChangingEmail(false);
    }
  };

  const handleFileUploadToDataUrl = (
    file: File,
    onLoaded: (dataUrl: string, fileName: string) => void
  ) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onLoaded(reader.result, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setFormValidationMessage(null);
    setPTitle('');
    setPCategory(categories[0]?.name || '');
    setPPreviewImage('');
    setPPreviewImageName('');
    setPDescription('');
    setPJpgFileName('');
    setPJpgFileDataUrl('');
    setPJpgPrice('');
    setPHasPsd(false);
    setPPsdUpgradePrice('');
    setPPsdFileName('');
    setPPsdFileDataUrl('');
  };

  const handleEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setFormValidationMessage(null);
    setPTitle(prod.title);
    setPCategory(prod.category);
    setPPreviewImage(prod.previewImages[0] || '');
    setPPreviewImageName('Current product preview image');
    setPDescription(prod.description);
    setPJpgFileName(prod.jpgFileName || `${prod.title}.jpg`);
    setPJpgFileDataUrl('');
    setPJpgPrice(String(prod.jpgPrice));
    setPHasPsd(prod.hasPsd);
    setPPsdUpgradePrice(prod.psdUpgradePrice ? String(prod.psdUpgradePrice) : '');
    setPPsdFileName(prod.psdFileName || (prod.hasPsd ? `${prod.title}.psd` : ''));
    setPPsdFileDataUrl('');
    setShowProductForm(true);
    setActiveTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationMessage(null);

    // Simple, helpful, non-technical validation
    if (!pTitle.trim()) {
      const msg = 'Please enter a product name before publishing.';
      setFormValidationMessage(msg);
      onNotify(msg);
      return;
    }

    if (!pPreviewImage) {
      const msg = 'Please upload a product preview image before publishing.';
      setFormValidationMessage(msg);
      onNotify(msg);
      return;
    }

    if (!editingProductId && !pJpgFileDataUrl && !pJpgFileName) {
      const msg = 'Please upload a JPG file before publishing.';
      setFormValidationMessage(msg);
      onNotify(msg);
      return;
    }

    if (pJpgPrice === '' || isNaN(Number(pJpgPrice)) || Number(pJpgPrice) <= 0) {
      const msg = 'Please enter a valid JPG price before publishing.';
      setFormValidationMessage(msg);
      onNotify(msg);
      return;
    }

    if (pHasPsd) {
      if (pPsdUpgradePrice === '' || isNaN(Number(pPsdUpgradePrice)) || Number(pPsdUpgradePrice) <= 0) {
        const msg = 'Please enter a PSD upgrade price, or turn off "Offer PSD upgrade?".';
        setFormValidationMessage(msg);
        onNotify(msg);
        return;
      }
      if (!editingProductId && !pPsdFileDataUrl && !pPsdFileName) {
        const msg = 'Please upload a PSD file for the PSD upgrade before publishing.';
        setFormValidationMessage(msg);
        onNotify(msg);
        return;
      }
    }

    setSavingProduct(true);
    try {
      const existingProduct = editingProductId
        ? products.find((p) => p.id === editingProductId)
        : undefined;

      const payload = {
        title: pTitle.trim(),
        category: pCategory,
        description: pDescription.trim(),
        previewImages: [pPreviewImage],
        jpgPrice: Number(pJpgPrice),
        jpgFileName: pJpgFileName.trim() || undefined,
        jpgFileDataUrl: pJpgFileDataUrl || undefined,
        hasPsd: pHasPsd,
        psdUpgradePrice: pHasPsd ? Number(pPsdUpgradePrice) : null,
        psdFileName: pHasPsd ? pPsdFileName.trim() || undefined : undefined,
        psdFileDataUrl: pHasPsd && pPsdFileDataUrl ? pPsdFileDataUrl : undefined,
        // Smart background defaults so the admin never has to configure technical settings
        featured: existingProduct ? existingProduct.featured : true,
        bestseller: existingProduct ? existingProduct.bestseller : false,
        isNew: existingProduct ? existingProduct.new : true,
        limited: existingProduct ? existingProduct.limited : false,
      };

      const url = editingProductId
        ? getApiUrl(`/api/admin/products/${editingProductId}`)
        : getApiUrl('/api/admin/products');
      const method = editingProductId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const friendlyMsg =
          data.error || 'Could not publish product. Please check your fields and try again.';
        setFormValidationMessage(friendlyMsg);
        onNotify(friendlyMsg);
        return;
      }

      onNotify(
        editingProductId
          ? 'Product updated and published to storefront.'
          : 'Product created and published to storefront!'
      );
      resetProductForm();
      setShowProductForm(false);
      await fetchAdminDashboard();
      await onStorefrontUpdated();
    } catch {
      const msg = 'Could not save product right now. Please try again.';
      setFormValidationMessage(msg);
      onNotify(msg);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/admin/products/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        onNotify('Product deleted — storefront updated.');
        await fetchAdminDashboard();
        await onStorefrontUpdated();
      }
    } catch {
      onNotify('Could not delete product.');
    }
  };

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCatName('');
    setCatDescription('');
    setCatImage('');
    setCatImageName('');
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatDescription(cat.description);
    setCatImage(cat.image || '');
    setCatImageName('Current category image');
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      onNotify('Please enter a category name.');
      return;
    }
    try {
      const url = editingCategoryId
        ? getApiUrl(`/api/admin/categories/${editingCategoryId}`)
        : getApiUrl('/api/admin/categories');
      const method = editingCategoryId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: catName.trim(),
          description: catDescription.trim(),
          image: catImage || DEFAULT_CATEGORY_IMAGE,
        }),
      });
      if (res.ok) {
        // Clear from local tombstones if recreated
        try {
          const currentDeleted: string[] = JSON.parse(
            localStorage.getItem('velora_deleted_categories') || '[]'
          );
          const nameLower = catName.trim().toLowerCase();
          const updated = currentDeleted.filter((d) => d.toLowerCase() !== nameLower);
          localStorage.setItem('velora_deleted_categories', JSON.stringify(updated));
        } catch {}

        onNotify(editingCategoryId ? 'Category updated.' : 'Category created.');
        resetCategoryForm();
        await fetchAdminDashboard();
        await onStorefrontUpdated();
      }
    } catch {
      onNotify('Error saving category.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const catToDelete = categories.find(
        (c) => c.id === id || c.slug === id || c.name.toLowerCase() === id.toLowerCase()
      );
      const res = await fetch(getApiUrl(`/api/admin/categories/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onNotify('Category permanently deleted.');

        // Record permanent tombstone in browser storage
        try {
          const currentDeleted: string[] = JSON.parse(
            localStorage.getItem('velora_deleted_categories') || '[]'
          );
          const toAdd = [
            id,
            catToDelete?.id,
            catToDelete?.slug,
            catToDelete?.name,
          ].filter(Boolean) as string[];
          for (const item of toAdd) {
            if (!currentDeleted.includes(item)) currentDeleted.push(item);
            if (!currentDeleted.includes(item.toLowerCase())) currentDeleted.push(item.toLowerCase());
          }
          localStorage.setItem('velora_deleted_categories', JSON.stringify(currentDeleted));
        } catch {}

        setCategories((prev) =>
          prev.filter(
            (c) =>
              c.id !== id &&
              c.slug !== id &&
              c.name.toLowerCase() !== id.toLowerCase() &&
              (!catToDelete ||
                (c.id !== catToDelete.id &&
                  c.slug !== catToDelete.slug &&
                  c.name.toLowerCase() !== catToDelete.name.toLowerCase()))
          )
        );
        await fetchAdminDashboard();
        await onStorefrontUpdated();
      } else {
        onNotify(data.error || 'Could not delete category.');
      }
    } catch (err: any) {
      onNotify(`Could not delete category: ${err?.message || 'Network error'}`);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
    try {
      const res = await fetch(getApiUrl(`/api/admin/orders/${orderId}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ paymentStatus }),
      });
      if (res.ok) {
        onNotify(
          paymentStatus === 'PAID' || paymentStatus === 'Paid'
            ? `Order ${orderId} verified & marked as PAID. Customer downloads unlocked!`
            : paymentStatus === 'PAYMENT REJECTED'
            ? `Order ${orderId} marked as PAYMENT REJECTED. Downloads remain locked.`
            : `Order ${orderId} status updated to ${paymentStatus}.`
        );
        if (adminViewingScreenshot && adminViewingScreenshot.orderId === orderId) {
          setAdminViewingScreenshot((prev) =>
            prev ? { ...prev, paymentStatus } : null
          );
        }
        await fetchAdminDashboard();
      }
    } catch {
      onNotify('Failed to update transaction status.');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm(`Are you sure you want to delete Transaction #${orderId}?`)) {
      return;
    }
    try {
      const res = await fetch(getApiUrl(`/api/admin/orders/${encodeURIComponent(orderId)}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        onNotify(`Transaction ${orderId} removed.`);
        await fetchAdminDashboard();
      }
    } catch {
      onNotify('Could not remove transaction.');
    }
  };

  const handleClearAllOrders = async () => {
    if (
      !window.confirm(
        'Are you sure you want to clear all transaction and order history from the database? This cannot be undone.'
      )
    ) {
      return;
    }
    try {
      const res = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        onNotify('Transaction history cleared.');
        await fetchAdminDashboard();
      }
    } catch {
      onNotify('Could not clear transaction history.');
    }
  };

  const handleSaveHomepageConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(getApiUrl('/api/admin/homepage'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(homepageConfig),
      });
      if (res.ok) {
        onNotify('Storefront configuration saved.');
        await onStorefrontUpdated();
      }
    } catch {
      onNotify('Error saving configuration.');
    }
  };

  // Calculate completed/paid purchases for the Income Dashboard (never counts Cancelled, Failed, or Unpaid orders)
  const completedPaidOrders = orders.filter(
    (o) => o.paymentStatus === 'Paid' && Number(o.total) > 0
  );

  const nowDate = new Date();
  const todayKey = toLocalDateKey(nowDate);
  const currentYear = nowDate.getFullYear();
  const currentMonth = nowDate.getMonth();

  // Start of current week (Monday-based or Sunday-based within the last 7 days of current week)
  const startOfWeekDate = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate() - nowDate.getDay()
  );
  startOfWeekDate.setHours(0, 0, 0, 0);

  // Group completed revenue by calendar day for Best Revenue Day & Custom Date
  const revenueByDateMap = new Map<string, { revenue: number; count: number }>();
  for (const ord of completedPaidOrders) {
    const key = toLocalDateKey(ord.createdAt);
    if (!key) continue;
    const prev = revenueByDateMap.get(key) || { revenue: 0, count: 0 };
    revenueByDateMap.set(key, {
      revenue: prev.revenue + (Number(ord.total) || 0),
      count: prev.count + 1,
    });
  }

  let bestRevenueDayEntry: { dateKey: string; revenue: number; count: number } | null = null;
  for (const [dateKey, info] of revenueByDateMap.entries()) {
    if (!bestRevenueDayEntry || info.revenue > bestRevenueDayEntry.revenue) {
      bestRevenueDayEntry = { dateKey, revenue: info.revenue, count: info.count };
    }
  }

  const getFilteredCompletedOrders = (): Order[] => {
    switch (incomeFilter) {
      case 'today':
        return completedPaidOrders.filter((o) => toLocalDateKey(o.createdAt) === todayKey);
      case 'week':
        return completedPaidOrders.filter((o) => {
          const d = new Date(o.createdAt);
          return !isNaN(d.getTime()) && d >= startOfWeekDate && d <= nowDate;
        });
      case 'month':
        return completedPaidOrders.filter((o) => {
          const d = new Date(o.createdAt);
          return (
            !isNaN(d.getTime()) &&
            d.getFullYear() === currentYear &&
            d.getMonth() === currentMonth
          );
        });
      case 'year':
        return completedPaidOrders.filter((o) => {
          const d = new Date(o.createdAt);
          return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
        });
      case 'custom':
        return completedPaidOrders.filter(
          (o) => toLocalDateKey(o.createdAt) === customIncomeDate
        );
      case 'best':
        if (!bestRevenueDayEntry) return [];
        return completedPaidOrders.filter(
          (o) => toLocalDateKey(o.createdAt) === bestRevenueDayEntry!.dateKey
        );
      default:
        return completedPaidOrders;
    }
  };

  const filteredCompletedOrders = getFilteredCompletedOrders();
  const filteredIncomeTotal = filteredCompletedOrders.reduce(
    (sum, o) => sum + (Number(o.total) || 0),
    0
  );

  if (!adminToken) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="bg-white border border-[#E6DAD2] rounded-xs p-8 space-y-6 velora-surface-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xs bg-[#3D0F18] text-[#FAF6F3] flex items-center justify-center">
              <Lock className="w-4 h-4 text-[#C59B6D]" />
            </div>
            <div>
              <h1 className="font-serif-editorial text-2xl font-semibold text-[#231518]">
                {adminForgotOpen
                  ? adminForgotStep === 'request'
                    ? 'Admin Password Reset'
                    : 'Set New Admin Password'
                  : 'DesignHub PK Studio Admin'}
              </h1>
              <p className="text-xs text-[#6E5A5D]">
                {adminForgotOpen
                  ? 'Secure Admin Account Recovery'
                  : 'Protected Store Management'}
              </p>
            </div>
          </div>

          {adminForgotOpen ? (
            adminForgotStep === 'request' ? (
              <form
                onSubmit={handleRequestAdminPasswordReset}
                autoComplete="off"
                className="space-y-4"
              >
                <p className="text-xs text-[#6E5A5D] leading-relaxed">
                  Enter the registered DesignHub PK Admin email address to initiate a secure password
                  reset for the Admin account.
                </p>

                <div>
                  <label className="block text-xs font-medium text-[#231518] mb-1.5">
                    Admin Email (Gmail) *
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    value={adminForgotEmail}
                    onChange={(e) => setAdminForgotEmail(e.target.value)}
                    placeholder="Enter registered admin Gmail"
                    className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm focus:outline-none focus:border-[#3D0F18]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={adminForgotLoading}
                  className="btn-velora-primary w-full py-3 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs hover:bg-[#521521] transition-colors"
                >
                  {adminForgotLoading ? 'VERIFYING...' : 'CONTINUE TO PASSWORD RESET'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminForgotOpen(false);
                    setAdminForgotStep('request');
                    setAdminForgotEmail('');
                  }}
                  className="w-full py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#6E5A5D] hover:text-[#3D0F18] transition-colors"
                >
                  Back to Admin Login
                </button>
              </form>
            ) : (
              <form
                onSubmit={handleConfirmAdminPasswordReset}
                autoComplete="off"
                className="space-y-4"
              >
                <p className="text-xs text-[#6E5A5D] leading-relaxed">
                  {adminForgotMessage ||
                    'Create and confirm your new Admin password below.'}
                </p>

                <div>
                  <label className="block text-xs font-medium text-[#231518] mb-1.5">
                    New Admin Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={adminResetNewPassword}
                    onChange={(e) => setAdminResetNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm focus:outline-none focus:border-[#3D0F18]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#231518] mb-1.5">
                    Confirm New Admin Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={adminResetConfirmPassword}
                    onChange={(e) => setAdminResetConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm focus:outline-none focus:border-[#3D0F18]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={adminForgotLoading}
                  className="btn-velora-primary w-full py-3 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs hover:bg-[#521521] transition-colors"
                >
                  {adminForgotLoading ? 'SAVING NEW PASSWORD...' : 'SAVE NEW ADMIN PASSWORD'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminForgotOpen(false);
                    setAdminForgotStep('request');
                    setAdminForgotEmail('');
                  }}
                  className="w-full py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#6E5A5D] hover:text-[#3D0F18] transition-colors"
                >
                  Cancel &amp; Back to Admin Login
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#231518] mb-1.5">
                  Admin Email (Gmail)
                </label>
                <input
                  type="email"
                  name="velora_admin_email_manual"
                  required
                  autoComplete="username"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter your admin email"
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm focus:outline-none focus:border-[#3D0F18]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[#231518]">
                    Admin Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminForgotEmail('');
                      setAdminForgotStep('request');
                      setAdminForgotOpen(true);
                    }}
                    className="text-xs font-semibold text-[#3D0F18] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="velora_admin_password_manual"
                    required
                    autoComplete="current-password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter your admin password"
                    className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm pr-10 focus:outline-none focus:border-[#3D0F18]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A7C] hover:text-[#231518] transition-colors p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="btn-velora-primary w-full py-3 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.18em] rounded-xs hover:bg-[#521521] transition-colors"
              >
                {loginLoading ? 'VERIFYING...' : 'ACCESS ADMIN PANEL'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-12">
      {/* Top Bar */}
      <div className="pb-6 border-b border-[#E6DAD2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7A545B]">
            DESIGNHUB PK MANAGEMENT CONSOLE
          </p>
          <h1 className="mt-1 font-serif-editorial text-3xl sm:text-4xl font-semibold text-[#231518]">
            Studio Admin Panel
          </h1>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              resetProductForm();
              setShowProductForm(true);
              setActiveTab('products');
            }}
            className="btn-velora-primary px-4 py-2 bg-[#3D0F18] text-[#FAF6F3] rounded-xs text-xs font-semibold uppercase tracking-[0.14em] inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Product</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              await fetchAdminDashboard();
              await onStorefrontUpdated();
            }}
            className="px-3.5 py-2 bg-white border border-[#E6DAD2] hover:border-[#3D0F18] rounded-xs text-xs font-medium text-[#231518] inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('velora_admin_token');
              setEmailInput('');
              setPasswordInput('');
              setAdminToken(null);
            }}
            className="px-3.5 py-2 bg-white border border-[#E6DAD2] hover:border-[#3D0F18] rounded-xs text-xs font-medium text-[#231518] inline-flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock Admin</span>
          </button>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="mt-6 flex flex-wrap gap-2 pb-4 border-b border-[#E6DAD2]">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'products', label: `Products (${products.length})`, icon: Package },
          { id: 'categories', label: `Categories (${categories.length})`, icon: FolderKanban },
          {
            id: 'orders',
            label: `Transactions & Orders (${orders.length})`,
            icon: ShoppingCart,
          },
          { id: 'homepage', label: 'Settings', icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as typeof activeTab)}
              className={`px-4 py-2.5 rounded-xs text-xs font-semibold uppercase tracking-[0.13em] inline-flex items-center gap-2 transition-colors ${
                active
                  ? 'bg-[#3D0F18] text-[#FAF6F3]'
                  : 'bg-white border border-[#E6DAD2] text-[#6E5A5D] hover:text-[#231518]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: DASHBOARD & INCOME OVERVIEW
      ===================================================================== */}
      {activeTab === 'dashboard' && (
        <div className="mt-8 space-y-8">
          {/* Admin Income Dashboard Section */}
          <div className="bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-8 space-y-6 velora-surface-card">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#E6DAD2]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7A545B]">
                  REVENUE ANALYTICS
                </p>
                <h2 className="mt-1 font-serif-editorial text-2xl sm:text-3xl font-semibold text-[#231518]">
                  Admin Income Dashboard
                </h2>
                <p className="text-xs text-[#6E5A5D] mt-0.5">
                  Calculated automatically from completed and paid DesignHub PK purchases.
                </p>
              </div>

              {/* Simple Income Filter Bar: Today | This Week | This Month | This Year | Custom Date | Best Revenue Day */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF6F3] p-1.5 border border-[#E6DAD2] rounded-xs">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'week', label: 'This Week' },
                  { id: 'month', label: 'This Month' },
                  { id: 'year', label: 'This Year' },
                  { id: 'custom', label: 'Custom Date' },
                  { id: 'best', label: 'Best Revenue Day' },
                ].map((tab) => {
                  const active = incomeFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setIncomeFilter(tab.id as IncomePeriodFilter)}
                      className={`px-3.5 py-2 rounded-xs text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                        active
                          ? 'bg-[#3D0F18] text-[#FAF6F3] shadow-2xs'
                          : 'text-[#5C474B] hover:text-[#3D0F18] hover:bg-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Date Selector */}
            {incomeFilter === 'custom' && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs p-4">
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#231518] inline-flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#3D0F18]" />
                  <span>Select Specific Date:</span>
                </label>
                <input
                  type="date"
                  value={customIncomeDate}
                  onChange={(e) => setCustomIncomeDate(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-[#E6DAD2] rounded-xs text-xs font-mono-tabular text-[#231518] focus:outline-none focus:border-[#3D0F18]"
                />
              </div>
            )}

            {/* Selected Period Income Result Display */}
            <div className="bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs p-6 sm:p-8">
              {incomeFilter === 'custom' ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A545B]">
                    CUSTOM DATE INCOME
                  </p>
                  <p className="font-serif-editorial text-2xl sm:text-3xl font-semibold text-[#231518]">
                    Income on {formatFullDisplayDate(customIncomeDate)}:{' '}
                    <span className="font-mono-tabular font-bold text-[#3D0F18]">
                      {homepageConfig.currencySymbol}
                      {filteredIncomeTotal.toLocaleString()}
                    </span>
                  </p>
                  {filteredCompletedOrders.length === 0 ? (
                    <p className="text-xs font-medium text-[#6E5A5D]">
                      No completed sales for this period.
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-700 font-medium">
                      {filteredCompletedOrders.length} completed{' '}
                      {filteredCompletedOrders.length === 1 ? 'sale' : 'sales'} on{' '}
                      {formatFullDisplayDate(customIncomeDate)}
                    </p>
                  )}
                </div>
              ) : incomeFilter === 'best' ? (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#3D0F18]">
                    <Award className="w-4 h-4 text-[#C59B6D]" />
                    <span>Best Revenue Day</span>
                  </div>
                  {bestRevenueDayEntry ? (
                    <div className="space-y-1.5">
                      <p className="font-serif-editorial text-2xl sm:text-3xl font-semibold text-[#231518]">
                        {formatFullDisplayDate(bestRevenueDayEntry.dateKey)}
                      </p>
                      <p className="text-base sm:text-lg font-semibold text-[#231518]">
                        Total Income:{' '}
                        <span className="font-mono-tabular font-bold text-[#3D0F18]">
                          {homepageConfig.currencySymbol}
                          {bestRevenueDayEntry.revenue.toLocaleString()}
                        </span>
                      </p>
                      <p className="text-xs text-emerald-700 font-medium">
                        {bestRevenueDayEntry.count} completed{' '}
                        {bestRevenueDayEntry.count === 1 ? 'sale' : 'sales'} recorded on this day
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-[#6E5A5D]">
                      No completed sales for this period.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#7A545B]">
                    <TrendingUp className="w-4 h-4 text-[#3D0F18]" />
                    <span>
                      {incomeFilter === 'today'
                        ? `Today (${formatFullDisplayDate(todayKey)})`
                        : incomeFilter === 'week'
                        ? 'This Week'
                        : incomeFilter === 'month'
                        ? 'This Month'
                        : 'This Year'}
                    </span>
                  </div>
                  <p className="text-3xl sm:text-4xl font-mono-tabular font-bold text-[#3D0F18]">
                    {homepageConfig.currencySymbol}
                    {filteredIncomeTotal.toLocaleString()}
                  </p>
                  {filteredCompletedOrders.length === 0 ? (
                    <p className="text-xs font-medium text-[#6E5A5D]">
                      No completed sales for this period.
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-700 font-medium">
                      From {filteredCompletedOrders.length} completed{' '}
                      {filteredCompletedOrders.length === 1 ? 'purchase' : 'purchases'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-[#E6DAD2] rounded-xs p-5 velora-surface-card">
              <p className="text-xs uppercase tracking-[0.14em] text-[#6E5A5D]">
                Published Products
              </p>
              <p className="mt-2 text-2xl font-mono-tabular font-bold text-[#231518]">
                {products.length}
              </p>
              <p className="mt-1 text-[11px] text-emerald-700 font-medium">
                Live on Customer Storefront
              </p>
            </div>

            <div className="bg-white border border-[#E6DAD2] rounded-xs p-5 velora-surface-card">
              <p className="text-xs uppercase tracking-[0.14em] text-[#6E5A5D]">
                Categories
              </p>
              <p className="mt-2 text-2xl font-mono-tabular font-bold text-[#231518]">
                {categories.length}
              </p>
              <p className="mt-1 text-[11px] text-[#6E5A5D]">Product collections</p>
            </div>

            <div className="bg-white border border-[#E6DAD2] rounded-xs p-5 velora-surface-card">
              <p className="text-xs uppercase tracking-[0.14em] text-[#6E5A5D]">
                Orders &amp; Transactions
              </p>
              <p className="mt-2 text-2xl font-mono-tabular font-bold text-[#231518]">
                {orders.length}
              </p>
              <p className="mt-1 text-[11px] text-[#6E5A5D]">
                {stats.paidOrdersCount} verified paid orders
              </p>
            </div>

            <div className="bg-white border border-[#E6DAD2] rounded-xs p-5 velora-surface-card">
              <p className="text-xs uppercase tracking-[0.14em] text-[#6E5A5D]">
                Total Revenue
              </p>
              <p className="mt-2 text-2xl font-mono-tabular font-bold text-[#3D0F18]">
                {homepageConfig.currencySymbol}
                {stats.revenue.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-[#6E5A5D]">
                {stats.downloadsCount} files downloaded
              </p>
            </div>
          </div>

          {/* Quick Actions & Recent Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 bg-white border border-[#E6DAD2] rounded-xs p-6 space-y-4 velora-surface-card">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3D0F18]">
                Quick Actions
              </h2>
              <p className="text-xs text-[#6E5A5D] leading-relaxed">
                Add new digital designs in under a minute. Everything you publish here automatically
                appears on the customer website.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetProductForm();
                    setShowProductForm(true);
                    setActiveTab('products');
                  }}
                  className="btn-velora-primary px-4 py-2.5 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.14em] rounded-xs inline-flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Product</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className="px-4 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] hover:border-[#3D0F18] text-[#231518] text-xs font-semibold uppercase tracking-[0.14em] rounded-xs"
                >
                  View Products ({products.length})
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white border border-[#E6DAD2] rounded-xs p-6 velora-surface-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3D0F18]">
                    Recent Transaction History
                  </h2>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live sync active" />
                </div>
                {orders.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllOrders}
                    className="text-[11px] font-semibold text-red-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All History</span>
                  </button>
                )}
              </div>

              {orders.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#6E5A5D] bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs">
                  0 Transactions recorded. Real customer purchases will appear here automatically.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((o) => (
                    <div
                      key={o.orderId}
                      className="p-3.5 rounded-xs bg-[#FAF6F3] border border-[#E6DAD2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-tabular font-bold text-[#3D0F18]">
                            {o.paymentReference || o.orderId}
                          </span>
                          <span className="text-[#6E5A5D]">·</span>
                          <span className="font-mono-tabular text-[11px] text-[#6E5A5D]">
                            {new Date(o.createdAt).toLocaleString()}
                          </span>
                          {o.customerName && (
                            <>
                              <span className="text-[#6E5A5D]">·</span>
                              <span className="text-[#231518] font-medium">{o.customerName}</span>
                            </>
                          )}
                        </div>
                        <p className="text-[#231518] font-medium">
                          {o.items.map((i) => i.title).join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono-tabular font-semibold text-[#231518]">
                          {homepageConfig.currencySymbol}
                          {o.total.toLocaleString()}
                        </span>
                        <span
                          className={`font-semibold uppercase text-[11px] px-2 py-0.5 rounded-xs ${
                            o.paymentStatus === 'PAID' || o.paymentStatus === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : o.paymentStatus === 'PAYMENT REJECTED'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : o.paymentStatus === 'PAYMENT REQUEST CANCELLED'
                              ? 'bg-stone-100 text-stone-700 border border-stone-300'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {o.paymentStatus}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(o.orderId)}
                          className="p-1.5 text-[#6E5A5D] hover:text-red-700 cursor-pointer"
                          title="Remove transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: PRODUCTS (Simple, Beginner-Friendly Product Creation + Synced List)
      ===================================================================== */}
      {activeTab === 'products' && (
        <div className="mt-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif-editorial text-2xl sm:text-3xl font-semibold text-[#231518]">
                {showProductForm
                  ? editingProductId
                    ? 'Edit Product'
                    : 'Create New Product'
                  : `Products (${products.length})`}
              </h2>
              <p className="text-xs sm:text-sm text-[#6E5A5D] mt-0.5">
                {showProductForm
                  ? 'Fill in the basic details below, upload your JPG file, set your price, and publish.'
                  : 'All products shown here are automatically synced with the customer website.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (showProductForm) {
                  resetProductForm();
                  setShowProductForm(false);
                } else {
                  resetProductForm();
                  setShowProductForm(true);
                }
              }}
              className={`px-5 py-3 text-xs font-semibold uppercase tracking-[0.15em] rounded-xs inline-flex items-center gap-2 self-start sm:self-auto transition-colors ${
                showProductForm
                  ? 'bg-[#F3EAE4] text-[#231518] hover:bg-[#E6DAD2]'
                  : 'btn-velora-primary bg-[#3D0F18] text-[#FAF6F3]'
              }`}
            >
              {showProductForm ? (
                <span>Back to Product List</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Product</span>
                </>
              )}
            </button>
          </div>

          {/* =================================================================
              SIMPLE BEGINNER-FRIENDLY CREATE / EDIT PRODUCT FORM
              Visual Flow: Product Details -> Product Files -> Pricing -> Publish
          ================================================================= */}
          {showProductForm && (
            <form
              onSubmit={handleSaveProduct}
              noValidate
              className="max-w-3xl mx-auto bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-10 space-y-8 velora-surface-card"
            >
              {/* Clear Visual Step Flow Bar */}
              <div className="pb-6 border-b border-[#E6DAD2]">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    { step: '1', label: 'Product Details' },
                    { step: '2', label: 'Product Files' },
                    { step: '3', label: 'Pricing' },
                    { step: '4', label: 'Publish' },
                  ].map((item, idx) => (
                    <div
                      key={item.step}
                      className="flex items-center gap-2.5 bg-[#FAF6F3] border border-[#E6DAD2] px-3.5 py-2.5 rounded-xs"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#3D0F18] text-[#FAF6F3] text-[11px] font-semibold flex items-center justify-center shrink-0">
                        {item.step}
                      </span>
                      <span className="font-semibold text-[#231518] truncate">{item.label}</span>
                      {idx < 3 && (
                        <ChevronRight className="w-3.5 h-3.5 text-[#6E5A5D] ml-auto hidden sm:block shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Simple Helpful Validation Message */}
              {formValidationMessage && (
                <div
                  role="alert"
                  className="bg-[#FFF5F5] border border-red-300 rounded-xs p-4 flex items-center gap-3 text-red-800 text-sm"
                >
                  <AlertCircle className="w-5 h-5 text-red-700 shrink-0" />
                  <span className="font-medium">{formValidationMessage}</span>
                </div>
              )}

              {/* STEP 1: PRODUCT DETAILS */}
              <div className="space-y-5">
                <div className="border-b border-[#E6DAD2] pb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7A545B]">
                    Step 1
                  </span>
                  <h3 className="font-serif-editorial text-2xl font-semibold text-[#231518]">
                    Product Details
                  </h3>
                </div>

                {/* 1. Product Name */}
                <div>
                  <label className="block text-sm font-semibold text-[#231518] mb-1.5">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={pTitle}
                    onChange={(e) => {
                      setPTitle(e.target.value);
                      if (formValidationMessage) setFormValidationMessage(null);
                    }}
                    placeholder='Example: "Instagram Post Template Pack"'
                    className="w-full px-4 py-3 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm text-[#231518] focus:outline-none focus:border-[#3D0F18]"
                  />
                </div>

                {/* 2. Category */}
                <div>
                  <label className="block text-sm font-semibold text-[#231518] mb-1.5">
                    Category *
                  </label>
                  {categories.length === 0 ? (
                    <input
                      type="text"
                      value={pCategory}
                      onChange={(e) => setPCategory(e.target.value)}
                      placeholder="Enter category name (or add in Categories tab)..."
                      className="w-full px-4 py-3 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm text-[#231518] focus:outline-none focus:border-[#3D0F18]"
                    />
                  ) : (
                    <select
                      value={pCategory}
                      onChange={(e) => setPCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm text-[#231518] focus:outline-none focus:border-[#3D0F18]"
                    >
                      <option value="">Select a category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* STEP 2: PRODUCT FILES (Upload Image First -> Then Generate or Write Description) */}
              <div className="space-y-6 pt-2">
                <div className="border-b border-[#E6DAD2] pb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7A545B]">
                    Step 2
                  </span>
                  <h3 className="font-serif-editorial text-2xl font-semibold text-[#231518]">
                    Product Image &amp; Downloadable Files
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 3. Product Preview */}
                  <div className="p-6 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-[#3D0F18]" />
                        <label className="text-sm font-semibold text-[#231518]">
                          Product Preview *
                        </label>
                      </div>
                      <p className="text-xs text-[#6E5A5D]">
                        This image is shown to customers on the shop and product page.
                      </p>
                    </div>

                    <input
                      ref={previewInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUploadToDataUrl(file, (dataUrl, name) => {
                            setPPreviewImage(dataUrl);
                            setPPreviewImageName(name);
                            if (formValidationMessage) setFormValidationMessage(null);
                          });
                        }
                      }}
                      className="hidden"
                    />

                    {pPreviewImage ? (
                      <div className="space-y-3">
                        <div className="w-full h-44 rounded-xs overflow-hidden border border-[#E6DAD2] bg-white">
                          <ResilientImage
                            src={pPreviewImage}
                            alt="Product preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-emerald-700 font-medium truncate">
                            {pPreviewImageName || 'Preview image ready'}
                          </span>
                          <button
                            type="button"
                            onClick={() => previewInputRef.current?.click()}
                            className="px-3.5 py-2 bg-white border border-[#E6DAD2] hover:border-[#3D0F18] rounded-xs text-xs font-semibold text-[#231518] shrink-0"
                          >
                            Change Image
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => previewInputRef.current?.click()}
                        className="border-2 border-dashed border-[#D5C3B8] hover:border-[#3D0F18] bg-white rounded-xs p-6 text-center cursor-pointer transition-colors space-y-3"
                      >
                        <div className="w-11 h-11 rounded-full bg-[#F3EAE4] text-[#3D0F18] flex items-center justify-center mx-auto">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              previewInputRef.current?.click();
                            }}
                            className="px-4 py-2 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.14em] rounded-xs"
                          >
                            Upload Image
                          </button>
                          <p className="text-[11px] text-[#6E5A5D] mt-2">
                            JPG or PNG preview image
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. JPG File (Main / Default Product File) */}
                  <div className="p-6 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileImage className="w-4 h-4 text-[#3D0F18]" />
                          <label className="text-sm font-semibold text-[#231518]">
                            JPG File *
                          </label>
                        </div>
                        <span className="px-2 py-0.5 bg-[#3D0F18] text-[#FAF6F3] text-[10px] font-semibold uppercase tracking-wider rounded-xs">
                          Main / Default File
                        </span>
                      </div>
                      <p className="text-xs text-[#6E5A5D]">
                        Upload the actual downloadable JPG file customers will receive after purchase.
                      </p>
                    </div>

                    <input
                      ref={jpgFileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,image/jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUploadToDataUrl(file, (dataUrl, name) => {
                            setPJpgFileDataUrl(dataUrl);
                            setPJpgFileName(name);
                            if (formValidationMessage) setFormValidationMessage(null);
                          });
                        }
                      }}
                      className="hidden"
                    />

                    {pJpgFileName ? (
                      <div className="bg-white border border-emerald-200 rounded-xs p-5 space-y-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                              Main JPG File Ready
                            </p>
                            <p className="text-sm font-medium text-[#231518] truncate mt-0.5">
                              {pJpgFileName}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => jpgFileInputRef.current?.click()}
                          className="w-full py-2 px-3.5 bg-[#FAF6F3] border border-[#E6DAD2] hover:border-[#3D0F18] rounded-xs text-xs font-semibold text-[#231518]"
                        >
                          Replace JPG File
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => jpgFileInputRef.current?.click()}
                        className="border-2 border-dashed border-[#D5C3B8] hover:border-[#3D0F18] bg-white rounded-xs p-6 text-center cursor-pointer transition-colors space-y-3"
                      >
                        <div className="w-11 h-11 rounded-full bg-[#F3EAE4] text-[#3D0F18] flex items-center justify-center mx-auto">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              jpgFileInputRef.current?.click();
                            }}
                            className="px-4 py-2 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.14em] rounded-xs"
                          >
                            Upload JPG File
                          </button>
                          <p className="text-[11px] text-[#6E5A5D] mt-2">
                            High-resolution downloadable .JPG file
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Description — Write Manually */}
                <div className="p-6 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#231518]">
                      Product Description
                    </label>
                    <p className="text-xs text-[#6E5A5D] mt-0.5">
                      Write the description for your product.
                    </p>
                  </div>

                  <textarea
                    rows={3}
                    value={pDescription}
                    onChange={(e) => {
                      setPDescription(e.target.value);
                    }}
                    placeholder="Write a description for your product..."
                    className="w-full px-4 py-3 bg-white border border-[#E6DAD2] rounded-xs text-sm text-[#231518] focus:outline-none focus:border-[#3D0F18]"
                  />
                </div>
              </div>

              {/* STEP 3: PRICING & OPTIONAL PSD UPGRADE */}
              <div className="space-y-6 pt-2">
                <div className="border-b border-[#E6DAD2] pb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7A545B]">
                    Step 3
                  </span>
                  <h3 className="font-serif-editorial text-2xl font-semibold text-[#231518]">
                    Pricing
                  </h3>
                </div>

                {/* 6. JPG Price */}
                <div className="max-w-sm">
                  <label className="block text-sm font-semibold text-[#231518] mb-1.5">
                    JPG Price ({homepageConfig.currencyCode}) *
                  </label>
                  <div className="relative flex items-center">
                    <span className="px-4 py-3 bg-[#F3EAE4] border border-r-0 border-[#E6DAD2] rounded-l-xs text-sm font-semibold text-[#3D0F18]">
                      {homepageConfig.currencyCode}
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={pJpgPrice}
                      onChange={(e) => {
                        setPJpgPrice(e.target.value);
                        if (formValidationMessage) setFormValidationMessage(null);
                      }}
                      placeholder="e.g. 2500"
                      className="w-full px-4 py-3 bg-[#FAF6F3] border border-[#E6DAD2] rounded-r-xs text-sm font-mono-tabular text-[#231518] focus:outline-none focus:border-[#3D0F18]"
                    />
                  </div>
                  <p className="text-xs text-[#6E5A5D] mt-1">
                    Standard price for the main JPG design.
                  </p>
                </div>

                {/* 7. PSD Upgrade — Optional */}
                <div className="p-6 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#3D0F18]" />
                        <span className="text-sm font-semibold text-[#231518]">
                          Offer PSD upgrade?
                        </span>
                        <span className="text-xs text-[#6E5A5D]">(Optional)</span>
                      </div>
                      <p className="text-xs text-[#6E5A5D]">
                        Turn this on only if you want customers to be able to buy an editable PSD file.
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={pHasPsd}
                      onClick={() => {
                        setPHasPsd((prev) => !prev);
                        if (formValidationMessage) setFormValidationMessage(null);
                      }}
                      className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        pHasPsd ? 'bg-[#3D0F18]' : 'bg-[#D5C3B8]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                          pHasPsd ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Only show PSD Price and PSD File Upload if enabled */}
                  {pHasPsd && (
                    <div className="pt-4 border-t border-[#E6DAD2] grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      {/* PSD Price */}
                      <div>
                        <label className="block text-sm font-semibold text-[#231518] mb-1.5">
                          PSD Upgrade Price ({homepageConfig.currencyCode}) *
                        </label>
                        <div className="relative flex items-center">
                          <span className="px-4 py-3 bg-[#F3EAE4] border border-r-0 border-[#E6DAD2] rounded-l-xs text-sm font-semibold text-[#3D0F18]">
                            {homepageConfig.currencyCode}
                          </span>
                          <input
                            type="number"
                            min="1"
                            value={pPsdUpgradePrice}
                            onChange={(e) => {
                              setPPsdUpgradePrice(e.target.value);
                              if (formValidationMessage) setFormValidationMessage(null);
                            }}
                            placeholder="e.g. 1500"
                            className="w-full px-4 py-3 bg-white border border-[#E6DAD2] rounded-r-xs text-sm font-mono-tabular text-[#231518] focus:outline-none focus:border-[#3D0F18]"
                          />
                        </div>
                        <p className="text-xs text-[#6E5A5D] mt-1">
                          Extra amount added when a customer selects JPG + PSD.
                        </p>
                      </div>

                      {/* PSD File Upload */}
                      <div>
                        <label className="block text-sm font-semibold text-[#231518] mb-1.5">
                          PSD File Upload *
                        </label>
                        <input
                          ref={psdFileInputRef}
                          type="file"
                          accept=".psd,.psb,application/octet-stream"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUploadToDataUrl(file, (dataUrl, name) => {
                                setPPsdFileDataUrl(dataUrl);
                                setPPsdFileName(name);
                                if (formValidationMessage) setFormValidationMessage(null);
                              });
                            }
                          }}
                          className="hidden"
                        />

                        {pPsdFileName ? (
                          <div className="bg-white border border-emerald-200 rounded-xs p-3.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span className="text-xs font-medium text-[#231518] truncate">
                                {pPsdFileName}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => psdFileInputRef.current?.click()}
                              className="px-3 py-1.5 bg-[#FAF6F3] border border-[#E6DAD2] hover:border-[#3D0F18] rounded-xs text-xs font-semibold text-[#231518] shrink-0"
                            >
                              Change PSD
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => psdFileInputRef.current?.click()}
                            className="w-full py-3 px-4 bg-white border-2 border-dashed border-[#D5C3B8] hover:border-[#3D0F18] rounded-xs text-xs font-semibold text-[#3D0F18] flex items-center justify-center gap-2 transition-colors"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Upload PSD File (.PSD)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 4: PUBLISH */}
              <div className="pt-6 border-t border-[#E6DAD2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-[#6E5A5D]">
                  Your product will be immediately published to the DesignHub PK store after clicking below.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      resetProductForm();
                      setShowProductForm(false);
                    }}
                    className="px-5 py-3.5 bg-[#F3EAE4] hover:bg-[#E6DAD2] text-[#231518] text-xs font-semibold uppercase tracking-[0.14em] rounded-xs transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="btn-velora-primary px-7 py-3.5 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.16em] rounded-xs hover:bg-[#521521] transition-colors"
                  >
                    {savingProduct
                      ? 'Publishing...'
                      : editingProductId
                      ? 'Update & Publish Product'
                      : 'Create & Publish Product'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Synced Product List */}
          {products.length === 0 ? (
            <div className="bg-white border border-[#E6DAD2] rounded-xs p-12 text-center space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#231518]">
                No Products Yet
              </p>
              <p className="text-xs text-[#6E5A5D] max-w-md mx-auto">
                Click &ldquo;Create Product&rdquo; above to add your first digital design.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#E6DAD2] rounded-xs overflow-hidden velora-surface-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF6F3] border-b border-[#E6DAD2] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6E5A5D]">
                      <th className="py-3.5 px-4">Product</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">JPG Price</th>
                      <th className="py-3.5 px-4">PSD Upgrade</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6DAD2]">
                    {products.map((prod) => (
                      <tr key={prod.id} className="hover:bg-[#FAF6F3]/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-16 h-12 rounded-xs bg-[#F3EAE4] overflow-hidden border border-[#E6DAD2] shrink-0">
                              <ResilientImage
                                src={prod.previewImages[0]}
                                alt={prod.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-serif-editorial text-base font-semibold text-[#231518]">
                                {prod.title}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 bg-[#F3EAE4] text-[#3D0F18] rounded-xs text-[11px] font-medium">
                            {prod.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono-tabular font-bold text-[#231518]">
                          {homepageConfig.currencySymbol}
                          {prod.jpgPrice.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          {prod.hasPsd ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#3D0F18] text-[#FAF6F3] rounded-xs text-[11px] font-mono-tabular">
                              <span>Available</span>
                              <span className="text-[#C59B6D]">
                                (+{homepageConfig.currencySymbol}
                                {(prod.psdUpgradePrice || 0).toLocaleString()})
                              </span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-[#FAF6F3] border border-[#E6DAD2] text-[#6E5A5D] rounded-xs text-[11px]">
                              JPG Only
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xs text-[10px] font-semibold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span>Published</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onNavigate('product', { slug: prod.slug })}
                              className="p-2 text-[#6E5A5D] hover:text-[#3D0F18] hover:bg-[#F3EAE4] rounded-xs"
                              title="View on Website"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditProduct(prod)}
                              className="p-2 text-[#231518] hover:bg-[#F3EAE4] rounded-xs"
                              title="Edit Product"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="p-2 text-red-700 hover:bg-red-50 rounded-xs"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: CATEGORIES
      ===================================================================== */}
      {activeTab === 'categories' && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={handleAddCategory}
            className="lg:col-span-5 bg-white border border-[#E6DAD2] rounded-xs p-6 space-y-5 self-start velora-surface-card"
          >
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3D0F18]">
              {editingCategoryId ? 'Edit Category' : 'Add Category'}
            </h2>

            <div>
              <label className="block text-xs font-semibold text-[#231518] mb-1.5">
                Category Name *
              </label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Brand Guidelines"
                className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-sm focus:outline-none focus:border-[#3D0F18]"
              />
            </div>

            {/* Category Image Upload & Preview */}
            <div className="p-4 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#3D0F18]" />
                  <label className="text-xs font-semibold text-[#231518]">
                    Category Image
                  </label>
                </div>
                <span className="text-[11px] text-[#6E5A5D]">Shown on collection cards</span>
              </div>

              <input
                ref={catImageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUploadToDataUrl(file, (dataUrl, name) => {
                      setCatImage(dataUrl);
                      setCatImageName(name);
                    });
                  }
                }}
                className="hidden"
              />

              {catImage ? (
                <div className="space-y-2.5">
                  <div className="w-full h-36 rounded-xs overflow-hidden border border-[#E6DAD2] bg-white">
                    <ResilientImage
                      src={catImage}
                      alt="Category preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-emerald-700 font-medium truncate">
                      {catImageName || 'Category image selected'}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => catImageInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white border border-[#E6DAD2] hover:border-[#3D0F18] rounded-xs text-xs font-semibold text-[#231518]"
                      >
                        Change Image
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCatImage('');
                          setCatImageName('');
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => catImageInputRef.current?.click()}
                  className="border-2 border-dashed border-[#D5C3B8] hover:border-[#3D0F18] bg-white rounded-xs p-5 text-center cursor-pointer transition-colors space-y-2.5"
                >
                  <div className="w-9 h-9 rounded-full bg-[#F3EAE4] text-[#3D0F18] flex items-center justify-center mx-auto">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        catImageInputRef.current?.click();
                      }}
                      className="px-4 py-2 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.14em] rounded-xs"
                    >
                      Upload Category Image
                    </button>
                    <p className="text-[11px] text-[#6E5A5D] mt-1.5">
                      JPG, PNG, or WebP cover image
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Category Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#231518]">
                Description
              </label>
              <textarea
                rows={2}
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                placeholder="Write a summary or description for this category..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#E6DAD2] rounded-xs text-sm text-[#231518] focus:outline-none focus:border-[#3D0F18]"
              />
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="submit"
                className="btn-velora-primary flex-1 py-3 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.14em] rounded-xs"
              >
                {editingCategoryId ? 'Update Category' : 'Add Category'}
              </button>
              {editingCategoryId && (
                <button
                  type="button"
                  onClick={resetCategoryForm}
                  className="px-4 py-3 bg-[#F3EAE4] hover:bg-[#E6DAD2] text-[#231518] text-xs font-semibold uppercase tracking-[0.14em] rounded-xs"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white border border-[#E6DAD2] rounded-xs p-4 flex items-center justify-between gap-4 velora-surface-card"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-12 rounded-xs bg-[#F3EAE4] border border-[#E6DAD2] overflow-hidden shrink-0">
                    <ResilientImage
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#231518]">{cat.name}</h3>
                    <p className="text-xs text-[#6E5A5D]">{cat.description}</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleEditCategory(cat)}
                    className="p-2 text-[#231518] hover:bg-[#F3EAE4] rounded-xs"
                    title="Edit category & image"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-2 text-[#6E5A5D] hover:text-red-700"
                    title="Delete category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: CUSTOMER ORDERS & JAZZCASH PAYMENT VERIFICATION
      ===================================================================== */}
      {activeTab === 'orders' && (
        <div className="mt-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif-editorial text-2xl font-semibold text-[#231518]">
                  Orders &amp; JazzCash Payment Verification ({orders.length})
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xs text-[10px] font-semibold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync (4s)
                </span>
                {orders.some((o) => o.paymentStatus !== 'PAID' && o.paymentStatus !== 'Paid') && (
                  <span className="px-2.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-xs text-[10px] font-semibold uppercase tracking-wider animate-pulse">
                    Action Needed
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6E5A5D] mt-0.5">
                Verify customer payments sent to JazzCash Number: <strong className="text-[#3D0F18]">03192644717</strong>.
                Approving an order immediately unlocks digital download links for the customer and adds products to their inventory.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchAdminDashboard(false)}
                className="px-3 py-2 bg-white border border-[#E6DAD2] hover:border-[#3D0F18] rounded-xs text-xs font-medium text-[#231518] inline-flex items-center gap-1.5 cursor-pointer"
                title="Refresh transactions from backend"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                <span>Refresh Transactions</span>
              </button>
              {orders.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllOrders}
                  className="px-3.5 py-2 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-xs font-semibold uppercase tracking-[0.14em] rounded-xs inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Orders</span>
                </button>
              )}
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="bg-white border border-[#E6DAD2] rounded-xs p-12 text-center velora-surface-card">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#231518]">
                0 Transactions in History
              </p>
              <p className="mt-1 text-xs text-[#6E5A5D]">
                Real customer orders and JazzCash payment verification requests submitted on the storefront will appear here automatically in real time.
              </p>
            </div>
          ) : (
            orders.map((ord) => {
              const isPaid = ord.paymentStatus === 'PAID' || ord.paymentStatus === 'Paid';
              const isRejected = ord.paymentStatus === 'PAYMENT REJECTED' || ord.paymentStatus === 'Failed';
              const isCancelled =
                ord.paymentStatus === 'PAYMENT REQUEST CANCELLED' ||
                ord.paymentStatus === 'Payment Request Cancelled';
              const isPending = !isPaid && !isRejected && !isCancelled;

              return (
                <div
                  key={ord.orderId}
                  className={`bg-white border rounded-xs p-6 space-y-5 velora-surface-card transition-all ${
                    isPending
                      ? 'border-amber-400/90 shadow-sm'
                      : isRejected
                      ? 'border-red-300'
                      : isCancelled
                      ? 'border-stone-300'
                      : 'border-[#E6DAD2]'
                  }`}
                >
                  {/* Top Bar: Order ID, Time, Total, Actions */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E6DAD2]">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono-tabular font-bold text-sm text-[#3D0F18]">
                          Order #{ord.orderId}
                        </span>
                        <span className="text-xs text-[#6E5A5D]">·</span>
                        <span className="text-xs font-mono-tabular text-[#6E5A5D]">
                          {new Date(ord.createdAt).toLocaleString()}
                        </span>
                        <span className="text-xs text-[#6E5A5D]">·</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#3D0F18] text-[#FAF6F3] text-[10px] font-semibold uppercase tracking-wider rounded-xs">
                          JazzCash Manual
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E5A5D]">
                        <span>Customer: <strong className="text-[#231518]">{ord.customerName || ord.senderName || 'Customer'}</strong></span>
                        <span>· Mobile: <strong className="text-[#231518] font-mono-tabular">{ord.phone || ord.senderPhone || 'Not provided'}</strong></span>
                        <span>· Email: <strong className="text-[#231518]">{ord.email || 'None (Guest checkout)'}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-right mr-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7A545B] block">
                          Total Amount
                        </span>
                        <span className="font-mono-tabular font-bold text-base text-[#3D0F18]">
                          {homepageConfig.currencySymbol}
                          {ord.total.toLocaleString()}
                        </span>
                      </div>

                      {/* Explicit Action: APPROVE PAYMENT */}
                      {!isPaid && (
                        <button
                          type="button"
                          onClick={() => handleUpdateOrderStatus(ord.orderId, 'PAID')}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold uppercase tracking-wider rounded-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>APPROVE PAYMENT</span>
                        </button>
                      )}

                      {/* Explicit Action: REJECT PAYMENT / REVOKE PAYMENT */}
                      {isPaid ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Are you sure you want to REVOKE approval for Order #${ord.orderId}? This will change the status from PAID to PAYMENT REJECTED, lock digital downloads, and remove the products from the customer's inventory.`
                              )
                            ) {
                              handleUpdateOrderStatus(ord.orderId, 'PAYMENT REJECTED');
                            }
                          }}
                          className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold uppercase tracking-wider rounded-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>REVOKE PAYMENT / REJECT</span>
                        </button>
                      ) : !isRejected ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateOrderStatus(ord.orderId, 'PAYMENT REJECTED')}
                          className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold uppercase tracking-wider rounded-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>REJECT PAYMENT</span>
                        </button>
                      ) : null}

                      {/* Status Selector Dropdown for custom state changes */}
                      <select
                        value={ord.paymentStatus}
                        onChange={(e) => {
                          const nextStatus = e.target.value as PaymentStatus;
                          if (
                            isPaid &&
                            (nextStatus === 'PAYMENT REJECTED' ||
                              nextStatus === 'Payment Verification Pending')
                          ) {
                            if (
                              !window.confirm(
                                `Are you sure you want to change status from PAID to ${nextStatus}? This will lock the customer's digital downloads.`
                              )
                            ) {
                              return;
                            }
                          }
                          handleUpdateOrderStatus(ord.orderId, nextStatus);
                        }}
                        className={`px-3 py-1.5 border rounded-xs text-xs font-semibold ${
                          isPaid
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : isRejected
                            ? 'bg-red-50 border-red-300 text-red-800'
                            : isCancelled
                            ? 'bg-stone-50 border-stone-300 text-stone-700'
                            : 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                        }`}
                      >
                        <option value="Payment Verification Pending">Payment Verification Pending</option>
                        <option value="PAID">PAID</option>
                        <option value="PAYMENT REJECTED">PAYMENT REJECTED</option>
                        <option value="PAYMENT REQUEST CANCELLED">PAYMENT REQUEST CANCELLED</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteOrder(ord.orderId)}
                        className="p-2 text-red-700 hover:bg-red-50 rounded-xs cursor-pointer"
                        title="Delete order"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* JazzCash Transaction Verification Details Box */}
                  <div className="bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
                    <div>
                      <span className="text-[#6E5A5D] block mb-0.5">JazzCash Receiving Number</span>
                      <span className="font-mono-tabular font-bold text-[#3D0F18] text-sm">
                        {ord.recipientJazzCashNumber || '03192644717'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#6E5A5D] block mb-0.5">Customer Sender Mobile</span>
                      <span className="font-mono-tabular font-bold text-[#231518] text-sm">
                        {ord.senderPhone || ord.phone || 'Not provided'}
                      </span>
                      {ord.senderName && (
                        <span className="text-[11px] text-[#6E5A5D] block">Title: {ord.senderName}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[#6E5A5D] block mb-0.5">Transaction ID (TID)</span>
                      <span className="font-mono-tabular font-bold text-[#3D0F18] text-sm bg-white px-2 py-0.5 border border-[#E6DAD2] rounded-xs inline-block">
                        {ord.paymentReference || 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#6E5A5D] block mb-0.5">Payment Screenshot</span>
                      {ord.paymentScreenshot ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={ord.paymentScreenshot}
                            alt="Payment Proof"
                            className="w-8 h-8 object-cover rounded-xs border border-[#E6DAD2] cursor-pointer"
                            onClick={() =>
                              setAdminViewingScreenshot({
                                url: ord.paymentScreenshot!,
                                orderId: ord.orderId,
                                customerName: ord.customerName || ord.senderName || 'Customer',
                                tid: ord.paymentReference || 'N/A',
                                amount: ord.total,
                                paymentStatus: ord.paymentStatus,
                              })
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setAdminViewingScreenshot({
                                url: ord.paymentScreenshot!,
                                orderId: ord.orderId,
                                customerName: ord.customerName || ord.senderName || 'Customer',
                                tid: ord.paymentReference || 'N/A',
                                amount: ord.total,
                                paymentStatus: ord.paymentStatus,
                              })
                            }
                            className="text-[11px] font-semibold text-[#3D0F18] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Proof</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#8C7A7D] italic text-[11px]">No screenshot attached</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[#6E5A5D] block mb-0.5">Verification Status</span>
                      <span
                        className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs ${
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
                              ? 'bg-stone-400'
                              : 'bg-amber-500 animate-pulse'
                          }`}
                        />
                        <span>
                          {isPaid
                            ? 'PAID (Downloads Active)'
                            : isRejected
                            ? 'PAYMENT REJECTED'
                            : isCancelled
                            ? 'PAYMENT REQUEST CANCELLED (Customer Withdrew Request)'
                            : 'Payment Verification Pending'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {ord.paymentNotes && (
                    <div className="p-3 bg-white border border-[#E6DAD2] rounded-xs text-xs text-[#5C474B]">
                      <strong>Customer Note:</strong> {ord.paymentNotes}
                    </div>
                  )}

                  {/* Associated Products & Download Delivery Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                    <div>
                      <p className="font-semibold text-[#231518] mb-2 uppercase tracking-[0.1em] text-[11px]">
                        Purchased Digital Items ({ord.items.length}):
                      </p>
                      <div className="space-y-2">
                        {ord.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xs bg-[#F3EAE4] overflow-hidden border border-[#E6DAD2] shrink-0">
                              <ResilientImage
                                src={item.previewImage}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-[#231518]">{item.title}</p>
                              <p className="text-[#6E5A5D]">
                                {item.selectedFormat === 'JPG_PLUS_PSD' ? 'JPG + PSD Upgrade' : 'JPG Only'} ·{' '}
                                <span className="font-mono-tabular">
                                  {homepageConfig.currencySymbol}
                                  {item.itemTotal.toLocaleString()}
                                </span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-[#231518] mb-2 uppercase tracking-[0.1em] text-[11px]">
                        Customer File Access Status:
                      </p>
                      <ul className="space-y-1.5 text-[#6E5A5D]">
                        {(ord.downloads || []).map((dl) => (
                          <li key={dl.downloadId} className="flex items-center justify-between font-mono-tabular bg-[#FAF6F3] p-2 rounded-xs border border-[#E6DAD2]">
                            <span className="truncate pr-2">
                              [{dl.format}] {dl.productTitle}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-xs text-[10px] font-semibold uppercase tracking-wider ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isRejected
                                  ? 'bg-red-100 text-red-800'
                                  : isCancelled
                                  ? 'bg-stone-100 text-stone-700'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {isPaid
                                ? 'Ready'
                                : isRejected
                                ? 'Locked (Rejected)'
                                : isCancelled
                                ? 'Locked (Cancelled)'
                                : 'Locked (Pending)'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Admin Payment Screenshot Inspection Modal */}
          {adminViewingScreenshot && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
              <div className="bg-white max-w-2xl w-full rounded-xs p-6 space-y-4 max-h-[92vh] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-[#E6DAD2]">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A545B] block">
                      Payment Proof Verification
                    </span>
                    <h3 className="font-serif-editorial text-lg font-bold text-[#231518]">
                      Order #{adminViewingScreenshot.orderId} · {adminViewingScreenshot.customerName}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdminViewingScreenshot(null)}
                    className="p-1.5 text-[#6E5A5D] hover:text-[#231518] rounded-xs cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* High-Resolution Screenshot Image Display */}
                <div className="flex-1 overflow-auto flex items-center justify-center bg-[#FAF6F3] p-3 rounded-xs border border-[#E6DAD2]">
                  <img
                    src={adminViewingScreenshot.url}
                    alt={`Screenshot proof for order ${adminViewingScreenshot.orderId}`}
                    className="max-h-[62vh] max-w-full object-contain rounded-xs shadow-xs"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#E6DAD2]">
                  <div className="text-xs text-[#5C474B]">
                    <span>TID: <strong className="font-mono-tabular font-bold text-[#3D0F18]">{adminViewingScreenshot.tid}</strong></span>
                    <span className="mx-2">·</span>
                    <span>Amount: <strong className="font-mono-tabular font-bold text-[#3D0F18]">{homepageConfig.currencySymbol}{adminViewingScreenshot.amount.toLocaleString()}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    {adminViewingScreenshot.paymentStatus === 'PAID' ||
                    adminViewingScreenshot.paymentStatus === 'Paid' ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to REVOKE approval for Order #${adminViewingScreenshot.orderId}? This will change the status to PAYMENT REJECTED, lock digital downloads, and remove the products from the customer's inventory.`
                            )
                          ) {
                            handleUpdateOrderStatus(adminViewingScreenshot.orderId, 'PAYMENT REJECTED');
                          }
                        }}
                        className="px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xs text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Revoke Payment</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateOrderStatus(adminViewingScreenshot.orderId, 'PAYMENT REJECTED');
                          }}
                          className="px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xs text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject Payment</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateOrderStatus(adminViewingScreenshot.orderId, 'PAID');
                          }}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xs text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve Payment</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setAdminViewingScreenshot(null)}
                      className="px-3 py-2 bg-[#FAF6F3] border border-[#E6DAD2] text-[#231518] hover:bg-[#F3EAE4] rounded-xs text-xs font-semibold uppercase tracking-wider cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 5: SETTINGS (Change Password, Change Gmail, & Storefront Settings)
      ===================================================================== */}
      {activeTab === 'homepage' && (
        <div className="mt-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 1. Admin Settings -> Change Password */}
            <form
              onSubmit={handleChangeAdminPassword}
              className="bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-8 space-y-5 velora-surface-card"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-[#E6DAD2]">
                <div className="w-9 h-9 rounded-xs bg-[#FAF6F3] border border-[#E6DAD2] flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4 text-[#3D0F18]" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3D0F18]">
                    Settings &rarr; Change Password
                  </h2>
                  <p className="text-xs text-[#6E5A5D] mt-0.5">
                    Update your Admin login password securely.
                  </p>
                </div>
              </div>

              {passwordFeedback && (
                <div
                  className={`p-3.5 rounded-xs text-xs font-medium flex items-center gap-2 ${
                    passwordFeedback.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  {passwordFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
                  )}
                  <span>{passwordFeedback.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#231518] mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current Admin password"
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-xs focus:outline-none focus:border-[#3D0F18]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#231518] mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-xs focus:outline-none focus:border-[#3D0F18]"
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
                  value={confirmAdminPassword}
                  onChange={(e) => setConfirmAdminPassword(e.target.value)}
                  placeholder="Re-enter new Admin password"
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-xs focus:outline-none focus:border-[#3D0F18]"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="btn-velora-primary px-6 py-3 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.16em] rounded-xs hover:bg-[#521521] transition-colors"
              >
                {changingPassword ? 'SAVING...' : 'Save New Password'}
              </button>
            </form>

            {/* 2. Admin Settings -> Change Email / Change Gmail */}
            <div className="bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-8 space-y-5 velora-surface-card">
              <div className="flex items-center gap-3 pb-4 border-b border-[#E6DAD2]">
                <div className="w-9 h-9 rounded-xs bg-[#FAF6F3] border border-[#E6DAD2] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-[#3D0F18]" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3D0F18]">
                    Settings &rarr; Change Email / Change Gmail
                  </h2>
                  <p className="text-xs text-[#6E5A5D] mt-0.5">
                    Current Admin Login Email:{' '}
                    <strong className="font-mono-tabular text-[#231518]">{adminEmail}</strong>
                  </p>
                </div>
              </div>

              {emailFeedback && (
                <div
                  className={`p-3.5 rounded-xs text-xs font-medium flex items-center gap-2 ${
                    emailFeedback.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  {emailFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
                  )}
                  <span>{emailFeedback.text}</span>
                </div>
              )}

              {emailChangeStep === 'verify' ? (
                <form onSubmit={handleVerifyEmailChange} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#231518] mb-1">
                      Current Password Verification *
                    </label>
                    <input
                      type="password"
                      required
                      value={emailCurrentPassword}
                      onChange={(e) => setEmailCurrentPassword(e.target.value)}
                      placeholder="Enter current Admin password"
                      className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-xs focus:outline-none focus:border-[#3D0F18]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#231518] mb-1">
                      New Admin Email / Gmail *
                    </label>
                    <input
                      type="email"
                      required
                      value={newAdminEmailInput}
                      onChange={(e) => setNewAdminEmailInput(e.target.value)}
                      placeholder="newadmin@gmail.com"
                      className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-xs focus:outline-none focus:border-[#3D0F18]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#231518] mb-1">
                      Confirm New Email / Gmail *
                    </label>
                    <input
                      type="email"
                      required
                      value={confirmAdminEmailInput}
                      onChange={(e) => setConfirmAdminEmailInput(e.target.value)}
                      placeholder="Re-enter new Admin email"
                      className="w-full px-3.5 py-2.5 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-xs focus:outline-none focus:border-[#3D0F18]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changingEmail}
                    className="btn-velora-primary px-6 py-3 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.16em] rounded-xs hover:bg-[#521521] transition-colors"
                  >
                    {changingEmail ? 'VERIFYING...' : 'Verify & Continue'}
                  </button>
                </form>
              ) : (
                <div className="space-y-4 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs p-5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#3D0F18] shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-[#231518] uppercase tracking-[0.12em]">
                        Confirm Admin Email Update
                      </p>
                      <p className="text-[#6E5A5D]">
                        Your Admin login email will be changed from{' '}
                        <strong className="text-[#231518]">{adminEmail}</strong> to{' '}
                        <strong className="text-[#3D0F18]">{pendingVerifiedEmail}</strong>. The
                        previous email will no longer be used for Admin sign-in.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={changingEmail}
                      onClick={handleConfirmEmailChange}
                      className="btn-velora-primary px-5 py-2.5 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.15em] rounded-xs hover:bg-[#521521]"
                    >
                      {changingEmail ? 'UPDATING...' : 'Confirm & Update Email'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailChangeStep('verify');
                        setEmailVerificationToken('');
                        setPendingVerifiedEmail('');
                      }}
                      className="px-4 py-2.5 bg-white border border-[#E6DAD2] text-xs font-semibold uppercase tracking-[0.14em] text-[#6E5A5D] hover:text-[#231518] rounded-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <form
            onSubmit={handleSaveHomepageConfig}
            className="bg-white border border-[#E6DAD2] rounded-xs p-6 sm:p-8 max-w-2xl space-y-5 velora-surface-card"
          >
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3D0F18]">
              Homepage Sections &amp; Currency Settings
            </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#231518] mb-1">Currency Code</label>
              <input
                type="text"
                value={homepageConfig.currencyCode}
                onChange={(e) =>
                  setHomepageConfig({ ...homepageConfig, currencyCode: e.target.value })
                }
                className="w-full px-3.5 py-2 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#231518] mb-1">
                Currency Display Prefix
              </label>
              <input
                type="text"
                value={homepageConfig.currencySymbol}
                onChange={(e) =>
                  setHomepageConfig({ ...homepageConfig, currencySymbol: e.target.value })
                }
                className="w-full px-3.5 py-2 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-xs font-mono-tabular"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#231518] mb-1">
              Promotional Banner Headline
            </label>
            <input
              type="text"
              value={homepageConfig.promoHeadline}
              onChange={(e) =>
                setHomepageConfig({ ...homepageConfig, promoHeadline: e.target.value })
              }
              className="w-full px-3.5 py-2 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs text-xs"
            />
          </div>

          {/* DesignHub PK Studio Landing Page — Showcase Designs (3–4 PSD / JPG) */}
          <div className="pt-4 border-t border-[#E6DAD2]">
            <div className="mb-3">
              <label className="block text-sm font-semibold text-[#231518]">
                Studio Landing Page Showcase Designs (PSD & JPG)
              </label>
              <p className="text-xs text-[#6E5A5D] mt-0.5">
                Select 3 to 4 products to feature on the DesignHub PK Studio landing page. You can choose any PSD or JPG design.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-3 bg-[#FAF6F3] border border-[#E6DAD2] rounded-xs">
              {products.map((p) => {
                const isSelected = (homepageConfig.studioFeaturedProductIds || []).includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-start gap-3 p-2.5 rounded-xs border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#3D0F18]/5 border-[#3D0F18]'
                        : 'bg-white border-[#E6DAD2] hover:border-[#C59B6D]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const current = homepageConfig.studioFeaturedProductIds || [];
                        const next = e.target.checked
                          ? [...current, p.id]
                          : current.filter((id) => id !== p.id);
                        setHomepageConfig({
                          ...homepageConfig,
                          studioFeaturedProductIds: next,
                        });
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#231518] truncate">{p.title}</p>
                      <p className="text-[10px] text-[#7A545B] uppercase tracking-wider mt-0.5">
                        {p.category} · {p.hasPsd ? 'JPG + PSD' : 'JPG Only'} · Rs. {p.jpgPrice.toLocaleString()}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-[#7A545B] mt-2">
              Selected: {(homepageConfig.studioFeaturedProductIds || []).length} items. Recommended: 3 or 4 designs.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <label className="flex items-center gap-2.5 text-xs font-medium text-[#231518]">
              <input
                type="checkbox"
                checked={homepageConfig.showFeaturedSection}
                onChange={(e) =>
                  setHomepageConfig({ ...homepageConfig, showFeaturedSection: e.target.checked })
                }
              />
              <span>Show Featured Designs Section</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-medium text-[#231518]">
              <input
                type="checkbox"
                checked={homepageConfig.showMostLovedSection}
                onChange={(e) =>
                  setHomepageConfig({ ...homepageConfig, showMostLovedSection: e.target.checked })
                }
              />
              <span>Show Most Loved (Bestsellers) Section when Bestsellers exist</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-medium text-[#231518]">
              <input
                type="checkbox"
                checked={homepageConfig.showPsdUpgradeSection}
                onChange={(e) =>
                  setHomepageConfig({ ...homepageConfig, showPsdUpgradeSection: e.target.checked })
                }
              />
              <span>Show Editable PSD Upgrade Informational Section</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-medium text-[#231518]">
              <input
                type="checkbox"
                checked={homepageConfig.showPromoBanner}
                onChange={(e) =>
                  setHomepageConfig({ ...homepageConfig, showPromoBanner: e.target.checked })
                }
              />
              <span>Show Editorial Promotional Banner</span>
            </label>
          </div>

          <button
            type="submit"
            className="btn-velora-primary px-6 py-3 bg-[#3D0F18] text-[#FAF6F3] text-xs font-semibold uppercase tracking-[0.16em] rounded-xs"
          >
            Save Storefront Settings
          </button>
        </form>
        </div>
      )}
    </div>
  );
}
