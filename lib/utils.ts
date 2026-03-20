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

/**
 * Format FR: `xx xx xx xx xx` (5 paires de 2 chiffres).
 * Supporte aussi `+33...` (on conserve les 10 chiffres FR).
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');

  // +33 (ou 33...) -> garder les 10 chiffres FR
  let localDigits = digits;
  if (localDigits.length === 12 && localDigits.startsWith('33')) {
    localDigits = localDigits.slice(2);
  }

  if (localDigits.length !== 10) return phone.trim();

  return localDigits.match(/.{1,2}/g)?.join(' ') ?? phone.trim();
}

export function formatSIRETNumber(siret: string | null | undefined): string {
  if (!siret) return '';
  const digits = siret.replace(/\D/g, '');

  if (digits.length >= 14) {
    const siren = digits.substring(0, 9);
    const nic = digits.substring(9, 14);
    const block1 = siren.substring(0, 3);
    const block2 = siren.substring(3, 6);
    const block3 = siren.substring(6, 9);
    return `${block1} ${block2} ${block3} ${nic}`;
  }

  if (digits.length >= 9) {
    const siren = digits.substring(0, 9);
    const block1 = siren.substring(0, 3);
    const block2 = siren.substring(3, 6);
    const block3 = siren.substring(6, 9);
    return `${block1} ${block2} ${block3} ${digits.substring(9)}`;
  }

  return siret;
}

export function formatTVANumber(tva: string | null | undefined): string {
  if (!tva) return '';
  let cleaned = tva.replace(/\s/g, '').toUpperCase();

  if (cleaned.startsWith('FR')) {
    const countryCode = cleaned.substring(0, 2);
    const rest = cleaned.substring(2);
    if (rest.length >= 2) {
      const key = rest.substring(0, 2);
      const siren = rest.substring(2).replace(/\D/g, '');
      if (siren.length > 0) return `${countryCode} ${key} ${siren}`;
      return `${countryCode} ${key}`;
    }
  }

  return cleaned;
}
