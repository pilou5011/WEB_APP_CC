import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** PC et téléphone → iframe (vue grise, pivoter, imprimer). Tablette uniquement → canvas (pagination). */
export function isMobileOrTablet(): boolean {
  if (typeof window === 'undefined') return true;
  const ua = navigator.userAgent;
  const mobileRegex = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
  // iPad (classic ou iPadOS 13+ en mode "Macintosh")
  if (/iPad/i.test(ua)) return false;
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 0) return false; // iPad iPadOS 13+
  // Autres tablettes Android
  if (mobileRegex.test(ua) && window.innerWidth >= 768) return false;
  // PC et téléphone → iframe (vue native grise)
  return true;
}
