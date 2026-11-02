import React, { useEffect, useRef, useState } from 'react';
import { VeloraMonogram, VeloraWordmark } from './VeloraLogo';

export type RevealAnimationVariant =
  | 'fade-up'
  | 'clip-up'
  | 'scale-blur'
  | 'slide-left'
  | 'slide-right';

interface RevealOnScrollProps {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
  yOffset?: number;
  variant?: RevealAnimationVariant;
}

/**
 * Multi-style scroll-triggered reveal using IntersectionObserver and GPU transforms.
 */
export function RevealOnScroll({
  children,
  delayMs = 0,
  className = '',
  yOffset = 20,
  variant = 'fade-up',
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsVisible(true);
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -32px 0px',
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const getStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      transitionDelay: `${delayMs}ms`,
      transitionProperty: 'transform, opacity, clip-path, filter',
      transitionDuration: '680ms',
      transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
    };

    if (isVisible) {
      return {
        ...base,
        opacity: 1,
        transform: 'translate3d(0, 0, 0) scale(1)',
        clipPath: 'inset(0% 0% 0% 0%)',
        filter: 'blur(0px)',
      };
    }

    switch (variant) {
      case 'clip-up':
        return {
          ...base,
          opacity: 0,
          transform: `translate3d(0, ${yOffset}px, 0)`,
          clipPath: 'inset(0% 0% 100% 0%)',
        };
      case 'scale-blur':
        return {
          ...base,
          opacity: 0,
          transform: `translate3d(0, ${yOffset * 0.6}px, 0) scale(0.96)`,
          filter: 'blur(5px)',
        };
      case 'slide-left':
        return {
          ...base,
          opacity: 0,
          transform: 'translate3d(-24px, 0, 0)',
        };
      case 'slide-right':
        return {
          ...base,
          opacity: 0,
          transform: 'translate3d(24px, 0, 0)',
        };
      case 'fade-up':
      default:
        return {
          ...base,
          opacity: 0,
          transform: `translate3d(0, ${yOffset}px, 0)`,
        };
    }
  };

  return (
    <div ref={ref} style={getStyle()} className={`will-change-[transform,opacity] ${className}`}>
      {children}
    </div>
  );
}

interface AnimatedHeadingProps {
  text: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  baseDelayMs?: number;
  staggerMs?: number;
  triggerOnScroll?: boolean;
}

/**
 * Word-by-word masked typography reveal with subtle blur-to-sharp entrance
 */
export function AnimatedHeading({
  text,
  as: Tag = 'h2',
  className = '',
  baseDelayMs = 50,
  staggerMs = 45,
  triggerOnScroll = true,
}: AnimatedHeadingProps) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(!triggerOnScroll);

  useEffect(() => {
    if (!triggerOnScroll) {
      setIsVisible(true);
      return;
    }
    if (typeof window === 'undefined') {
      setIsVisible(true);
      return;
    }
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -20px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [triggerOnScroll]);

  const words = text.split(' ');

  return (
    <Tag ref={ref as React.RefObject<HTMLHeadingElement>} className={className} aria-label={text}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="inline-block overflow-hidden align-bottom mr-[0.25em] last:mr-0 pb-[0.06em]"
          aria-hidden="true"
        >
          <span
            style={{
              transitionDelay: `${baseDelayMs + index * staggerMs}ms`,
              transform: isVisible ? 'translate3d(0, 0%, 0)' : 'translate3d(0, 105%, 0)',
              opacity: isVisible ? 1 : 0,
              filter: isVisible ? 'blur(0px)' : 'blur(3px)',
              transitionProperty: 'transform, opacity, filter',
              transitionDuration: '680ms',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="inline-block will-change-[transform,opacity]"
          >
            {word}
          </span>
        </span>
      ))}
    </Tag>
  );
}

interface InteractiveTiltProps {
  children: React.ReactNode;
  className?: string;
  maxTiltDeg?: number;
  scaleOnHover?: number;
  enableSpotlight?: boolean;
}

/**
 * 3D perspective tilt + cursor-following ambient champagne spotlight reflection.
 * Automatically disabled on touch devices and when prefers-reduced-motion is enabled.
 */
export function InteractiveTilt({
  children,
  className = '',
  maxTiltDeg = 2.2,
  scaleOnHover = 1.006,
  enableSpotlight = true,
}: InteractiveTiltProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState<string>(
    'perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
  );
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50, opacity: 0 });
  const [isInteractive, setIsInteractive] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setIsInteractive(!isCoarse && !isReduced);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isInteractive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const x = relX - 0.5;
    const y = relY - 0.5;
    const rotateY = (x * maxTiltDeg * 2).toFixed(2);
    const rotateX = (-y * maxTiltDeg * 2).toFixed(2);

    setTransformStyle(
      `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scaleOnHover}, ${scaleOnHover}, 1)`
    );
    if (enableSpotlight) {
      setSpotlightPos({ x: relX * 100, y: relY * 100, opacity: 1 });
    }
  };

  const handleMouseLeave = () => {
    if (!isInteractive) return;
    setTransformStyle('perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    if (enableSpotlight) {
      setSpotlightPos((prev) => ({ ...prev, opacity: 0 }));
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transition: 'transform 480ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      className={`relative will-change-transform ${className}`}
    >
      {children}
      {isInteractive && enableSpotlight && (
        <div
          aria-hidden="true"
          style={{
            opacity: spotlightPos.opacity,
            background: `radial-gradient(420px circle at ${spotlightPos.x}% ${spotlightPos.y}%, rgba(197, 155, 109, 0.16), transparent 65%)`,
            transition: 'opacity 360ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          className="pointer-events-none absolute inset-0 rounded-[inherit] z-20"
        />
      )}
    </div>
  );
}

interface MagneticButtonWrapperProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

/**
 * Subtle magnetic cursor pull for primary interactive buttons on desktop.
 */
export function MagneticButtonWrapper({
  children,
  className = '',
  strength = 5.5,
}: MagneticButtonWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEnabled(!isCoarse && !isReduced);
  }, []);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const nx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const ny = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setOffset({ x: nx * strength, y: ny * strength });
  };

  const handleLeave = () => {
    if (!enabled) return;
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        transform: `translate3d(${offset.x.toFixed(1)}px, ${offset.y.toFixed(1)}px, 0)`,
        transition: 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      className={`inline-block ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Luxury Desktop Custom Cursor Follower in Burgundy & Champagne Gold.
 * Automatically disabled on touch devices and reduced-motion setups.
 */
export function VeloraCustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isFine = window.matchMedia('(pointer: fine)').matches;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFine || isReduced) return;

    setEnabled(true);

    const onMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest('button, a, input, select, textarea, [role="button"]');
        setIsHoveringInteractive(Boolean(interactive));
      }
    };

    const onMouseLeave = () => setIsVisible(false);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  if (!enabled || !isVisible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        transition: 'transform 85ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      className="pointer-events-none fixed top-0 left-0 z-[60] hidden lg:block -translate-x-1/2 -translate-y-1/2"
    >
      <div
        className={`rounded-full border transition-all duration-300 ease-velora flex items-center justify-center ${
          isHoveringInteractive
            ? 'w-10 h-10 border-[#C59B6D] bg-[#3D0F18]/10 scale-110'
            : 'w-5 h-5 border-[#3D0F18]/35 bg-transparent scale-100'
        }`}
      >
        <span
          className={`rounded-full bg-[#3D0F18] transition-all duration-250 ${
            isHoveringInteractive ? 'w-1.5 h-1.5 opacity-90' : 'w-1 h-1 opacity-50'
          }`}
        />
      </div>
    </div>
  );
}

/**
 * Brief, Non-Blocking VELORA Brand Entrance Preloader Curtain
 */
export function VeloraStudioPreloader() {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[70] bg-[#26090F] text-[#FAF6F3] flex flex-col items-center justify-center animate-preloader-curtain"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="p-2.5 rounded-lg border border-[#C59B6D]/30 bg-[#3D0F18] shadow-2xl">
          <VeloraMonogram className="w-10 h-10" />
        </div>
        <VeloraWordmark light showSubtext className="text-3xl sm:text-4xl" />
      </div>
    </div>
  );
}

/**
 * Editorial Skeleton Loader matching the reference-style centered ProductCard layout
 */
export function ProductCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-white border border-[#E6DAD2] rounded-xs overflow-hidden flex flex-col justify-between p-4 sm:p-5 velora-surface-card"
    >
      <div className="aspect-[4/3] w-full rounded-xs velora-skeleton" />
      <div className="pt-5 pb-3 flex flex-col items-center space-y-2.5">
        <div className="h-5 w-3/5 rounded-xs velora-skeleton" />
        <div className="h-3 w-2/5 rounded-xs velora-skeleton" />
        <div className="h-4 w-1/4 rounded-xs velora-skeleton" />
      </div>
      <div className="h-10 w-full rounded-xs velora-skeleton" />
    </div>
  );
}
