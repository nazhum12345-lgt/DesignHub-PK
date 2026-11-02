import React, { useState } from 'react';
import { Layers } from 'lucide-react';

export function VeloraMonogram({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="8" fill="#3D0F18" />
      {/* Monogram for DesignHub PK */}
      <path d="M14 17H26C31.5 17 35.5 20.8 35.5 26.5V37.5C35.5 43.2 31.5 47 26 47H14V17ZM20 23V41H25.5C28.2 41 30 39.2 30 36.5V27.5C30 24.8 28.2 23 25.5 23H20Z" fill="#FAF6F3" />
      <path d="M38 17H44V29.5H48V17H54V47H48V34.5H44V47H38V17Z" fill="#C59B6D" />
    </svg>
  );
}

/**
 * Editorial Serif Brand Lockup:
 * Display serif "DesignHub PK" with optional "DIGITAL DESIGN STUDIO" sub-caption.
 */
export function VeloraWordmark({
  className = '',
  light = false,
  showSubtext = false,
  align = 'center',
}: {
  className?: string;
  light?: boolean;
  showSubtext?: boolean;
  align?: 'left' | 'center';
}) {
  return (
    <span
      className={`inline-flex flex-col select-none leading-none ${
        align === 'center' ? 'items-center text-center' : 'items-start text-left'
      }`}
    >
      <span
        className={`font-serif-editorial tracking-[0.05em] font-semibold ${
          light ? 'text-[#FAF6F3]' : 'text-[#231518]'
        } ${className}`}
      >
        DesignHub <span className={light ? 'text-[#C59B6D]' : 'text-[#3D0F18]'}>PK</span>
      </span>
      {showSubtext && (
        <span
          className={`mt-1 text-[8.5px] sm:text-[9.5px] font-sans font-semibold uppercase tracking-[0.32em] ${
            light ? 'text-[#C59B6D]' : 'text-[#7A545B]'
          }`}
        >
          DIGITAL DESIGN STUDIO
        </span>
      )}
    </span>
  );
}

/**
 * Ornamental Diamond Section Divider directly inspired by the reference image (`─── ◆ ───`)
 */
export function OrnamentalDivider({
  light = false,
  className = '',
}: {
  light?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center gap-2.5 my-3 ${className}`}
    >
      <span
        className={`h-px w-12 sm:w-16 ${
          light
            ? 'bg-gradient-to-r from-transparent to-[#C59B6D]/60'
            : 'bg-gradient-to-r from-transparent to-[#C59B6D]/70'
        }`}
      />
      <span className="w-1.5 h-1.5 rotate-45 bg-[#C59B6D] shrink-0" />
      <span
        className={`h-px w-12 sm:w-16 ${
          light
            ? 'bg-gradient-to-l from-transparent to-[#C59B6D]/60'
            : 'bg-gradient-to-l from-transparent to-[#C59B6D]/70'
        }`}
      />
    </div>
  );
}

export const VeloraDiamondDivider = OrnamentalDivider;

interface ResilientImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
  fallbackSubtitle?: string;
}

/**
 * Resolves and normalizes image asset URLs for both Vite dev server and Vercel production
 */
function resolveAssetUrl(src?: string): string {
  if (!src) return '';
  const trimmed = src.trim();
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  let clean = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
  return clean;
}

export function ResilientImage({
  src,
  alt,
  fallbackTitle = 'DesignHub PK Digital Design',
  fallbackSubtitle = 'DesignHub PK Studio Asset',
  className = '',
  ...rest
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [fallbackAttempt, setFallbackAttempt] = useState(0);
  const [activeSrc, setActiveSrc] = useState(() => resolveAssetUrl(src));
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  React.useEffect(() => {
    const nextSrc = resolveAssetUrl(src);
    setActiveSrc(nextSrc);
    setHasError(false);
    setFallbackAttempt(0);
    // Check if browser already has the image cached
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [src]);

  const handleRef = React.useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (node && node.complete && node.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, []);

  const handleError = () => {
    if (typeof activeSrc === 'string') {
      if (fallbackAttempt === 0 && activeSrc.includes('/src/assets/images/')) {
        setFallbackAttempt(1);
        setActiveSrc(activeSrc.replace('/src/assets/images/', '/assets/images/'));
        return;
      }
      if (fallbackAttempt === 0 && activeSrc.includes('/assets/images/')) {
        setFallbackAttempt(1);
        setActiveSrc(activeSrc.replace('/assets/images/', '/src/assets/images/'));
        return;
      }
      if (fallbackAttempt === 1 && !activeSrc.includes('/images/')) {
        setFallbackAttempt(2);
        const filename = activeSrc.split('/').pop() || '';
        setActiveSrc(`/images/${filename}`);
        return;
      }
    }
    setHasError(true);
  };

  if (!activeSrc || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F5ECE6] via-[#EFE1D8] to-[#E5D3C8] text-[#231518] p-6 text-center select-none ${className}`}
        role="img"
        aria-label={alt || fallbackTitle}
      >
        <div className="w-10 h-10 rounded-full border border-[#3D0F18]/20 flex items-center justify-center mb-3 bg-[#FAF6F3]/80">
          <Layers className="w-4 h-4 text-[#3D0F18]" />
        </div>
        <span className="text-[10px] tracking-[0.22em] uppercase text-[#7A545B] mb-1 font-semibold">
          {fallbackSubtitle}
        </span>
        <span className="font-serif-editorial text-base font-medium text-[#231518] max-w-[22ch] line-clamp-2">
          {fallbackTitle}
        </span>
      </div>
    );
  }

  return (
    <img
      ref={handleRef}
      src={activeSrc}
      alt={alt || fallbackTitle}
      referrerPolicy="no-referrer"
      onLoad={() => setIsLoaded(true)}
      onError={handleError}
      className={`transition-[opacity,transform] duration-[400ms] ease-velora ${
        isLoaded ? 'opacity-100 scale-100' : 'opacity-90'
      } ${className}`}
      {...rest}
    />
  );
}
