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
  // Tablette uniquement → canvas (pagination Page précédente/suivante)
  if (/iPad/i.test(ua)) return false;
  if (mobileRegex.test(ua) && window.innerWidth >= 768) return false;
  // PC et téléphone → iframe (vue native grise)
  return true;
}
