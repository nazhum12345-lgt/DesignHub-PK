import React from 'react';
import { Phone, Mail, Download, Layers, ShieldCheck } from 'lucide-react';
import { NavigationPage } from './Header';
import { VeloraWordmark } from './VeloraLogo';

interface FooterProps {
  onNavigate: (
    page: NavigationPage,
    params?: { category?: string; format?: string; accountTab?: 'my-account' | 'my-inventory' }
  ) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-[#26090F] text-[#FAF6F3] border-t border-[#C59B6D]/20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-16 lg:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Column 1: VELORA Luxury Brand Lockup (3 cols) */}
          <div className="lg:col-span-3 space-y-5">
            <VeloraWordmark light showSubtext align="left" className="text-3xl sm:text-4xl" />
            <p className="font-serif-editorial italic text-lg text-[#FAF6F3]/85 leading-snug">
              Timeless digital designs.
              <br />
              Unforgettable brand presence.
            </p>
            <div className="pt-1 space-y-2 text-xs text-[#FAF6F3]/75">
              <a
                href="tel:03192644717"
                className="group flex items-center gap-2.5 hover:text-[#C59B6D] transition-colors duration-250 font-mono-tabular"
              >
                <Phone className="w-3.5 h-3.5 text-[#C59B6D] shrink-0" />
                <span className="velora-link-underline">03192644717</span>
              </a>
              <a
                href="mailto:baigrahim12345@gmail.com"
                className="group flex items-center gap-2.5 hover:text-[#C59B6D] transition-colors duration-250 break-all"
              >
                <Mail className="w-3.5 h-3.5 text-[#C59B6D] shrink-0" />
                <span className="velora-link-underline">baigrahim12345@gmail.com</span>
              </a>
            </div>
          </div>

          {/* Column 2: SHOP (2 cols) */}
          <div className="lg:col-span-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C59B6D] mb-4">
              SHOP
            </h3>
            <ul className="space-y-2.5 text-xs text-[#FAF6F3]/75">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop')}
                  className="velora-link-underline hover:text-white transition-colors duration-250"
                >
                  All Digital Designs
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop', { category: 'Social Media' })}
                  className="velora-link-underline hover:text-white transition-colors duration-250"
                >
                  Social Media
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop', { category: 'Printables' })}
                  className="velora-link-underline hover:text-white transition-colors duration-250"
                >
                  Printables
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop', { category: 'Logos' })}
                  className="velora-link-underline hover:text-white transition-colors duration-250"
                >
                  Logos &amp; Identity
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop', { format: 'PSD' })}
                  className="velora-link-underline hover:text-white transition-colors duration-250"
                >
                  Editable PSD Upgrades
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: COLLECTIONS (2 cols) */}
          <div className="lg:col-span-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C59B6D] mb-4">
              COLLECTIONS
            </h3>
            <ul className="space-y-2.5 text-xs text-[#FAF6F3]/75">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('categories')}
                  className="velora-link-underline hover:text-white transition-colors duration-250"
                >
                  Explore All Collections
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop', { category: 'Social Media' })}
                  className="velora-link-underline hover:text-white transition-colors duration-250"
                >
                  Social Content Suite
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop', { category: 'Printables' })}
                  className="velora-link-underline hover:text-white transition-colors duration-250"
                >
                  Editorial Printables
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop', { category: 'Logos' })}
                  className="velora-link-underline hover:text-white transition-colors duration-250"
                >
                  Modern Brand Marks
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: CUSTOMER CARE & STUDIO (2 cols) */}
          <div className="lg:col-span-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C59B6D] mb-4">
              CUSTOMER CARE
            </h3>
            <ul className="space-y-2.5 text-xs text-[#FAF6F3]/75">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('account', { accountTab: 'my-account' })}
                  className="velora-link-underline hover:text-white transition-colors duration-250"
                >
                  Account
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('account', { accountTab: 'my-inventory' })}
                  className="velora-link-underline hover:text-white transition-colors duration-250"
                >
                  My Inventory
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('wishlist')}
                  className="velora-link-underline hover:text-white transition-colors duration-250"
                >
                  Saved Wishlist
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('studio')}
                  className="velora-link-underline hover:text-white transition-colors duration-250"
                >
                  DesignHub PK Studio
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="velora-link-underline hover:text-white transition-colors duration-250"
                >
                  About DesignHub PK
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('faq')}
                  className="velora-link-underline hover:text-white transition-colors duration-250"
                >
                  FAQs
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="velora-link-underline hover:text-white transition-colors duration-250"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Column 5: Reference-Style Right Trust Callout Column with Vertical Divider (3 cols) */}
          <div className="lg:col-span-3 lg:border-l lg:border-[#C59B6D]/20 lg:pl-8 space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xs border border-[#C59B6D]/35 flex items-center justify-center shrink-0 text-[#C59B6D]">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FAF6F3]">
                  INSTANT DIGITAL DELIVERY
                </h4>
                <p className="text-xs text-[#FAF6F3]/65 mt-0.5">
                  Unlocked immediately upon verified payment
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xs border border-[#C59B6D]/35 flex items-center justify-center shrink-0 text-[#C59B6D]">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FAF6F3]">
                  JPG + OPTIONAL PSD
                </h4>
                <p className="text-xs text-[#FAF6F3]/65 mt-0.5">
                  Standard high-res JPG with editable PSD upgrades
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xs border border-[#C59B6D]/35 flex items-center justify-center shrink-0 text-[#C59B6D]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FAF6F3]">
                  SECURE PAYMENTS
                </h4>
                <p className="text-xs text-[#FAF6F3]/65 mt-0.5">
                  Shop with confidence &amp; authenticated links
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Legal Links Bar (Matching Reference Image Footer Bottom) */}
        <div className="mt-14 pt-7 border-t border-[#C59B6D]/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#FAF6F3]/55">
          <p>© 2026 DesignHub PK. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('privacy')}
              className="hover:text-[#FAF6F3] transition-colors"
            >
              Privacy Policy
            </button>
            <span className="text-[#C59B6D]/40">|</span>
            <button
              type="button"
              onClick={() => onNavigate('terms')}
              className="hover:text-[#FAF6F3] transition-colors"
            >
              Terms &amp; Conditions
            </button>
            <span className="text-[#C59B6D]/40">|</span>
            <button
              type="button"
              onClick={() => onNavigate('refund')}
              className="hover:text-[#FAF6F3] transition-colors"
            >
              Refund Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
