import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Téléphone uniquement → iframe. Tablette et PC → canvas (avec pagination Page précédente/suivante). */
export function isMobileOrTablet(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const mobileRegex = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
  // iPad et tablettes (>=768px) → canvas pour avoir la pagination
  if (/iPad/i.test(ua)) return false;
  if (mobileRegex.test(ua) && window.innerWidth >= 768) return false; // tablette
  if (mobileRegex.test(ua)) return true; // téléphone
  return window.innerWidth < 768; // écran étroit = iframe
}
