// ==========================================
// SCANGATE - International Identifier Normalization
// ==========================================
const DEFAULT_COUNTRY_CODE = '+91';

export function normalizeIdentifier(
  type,
  rawValue,
  countryCode = DEFAULT_COUNTRY_CODE
) {
  if (typeof type !== 'string' || typeof rawValue !== 'string') {
    return null;
  }

  const normalizedType = type.trim().toLowerCase();
  const cleaned = rawValue.trim();
  if (!cleaned) return null;

  switch (normalizedType) {
    // ------------------------------------------
    // UPI
    // ------------------------------------------
    case 'upi': {
      const upiRegex = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/;
      return upiRegex.test(cleaned) ? cleaned.toLowerCase() : null;
    }

    // ------------------------------------------
    // EMAIL
    // ------------------------------------------
    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(cleaned) ? cleaned.toLowerCase() : null;
    }

    // ------------------------------------------
    // PHONE
    // ------------------------------------------
    case 'phone': {
      if (typeof countryCode !== 'string') return null;
      let normalizedCountryCode = countryCode.trim();

      if (!normalizedCountryCode.startsWith('+')) {
        normalizedCountryCode = '+' + normalizedCountryCode;
      }
      if (!/^\+\d{1,4}$/.test(normalizedCountryCode)) {
        return null;
      }

      let value = cleaned.replace(/[^\d+]/g, '');

      // Convert 00 international prefix to +
      if (value.startsWith('00')) {
        value = '+' + value.slice(2);
      }

      // Already international format
      if (value.startsWith('+')) {
        if (!/^\+\d{8,15}$/.test(value)) {
          return null;
        }
        return value;
      }

      // Local number formatting
      const localDigits = value.replace(/^0+/, '');
      if (!/^\d{7,12}$/.test(localDigits)) {
        return null;
      }

      const result = normalizedCountryCode + localDigits;
      return /^\+\d{8,15}$/.test(result) ? result : null;
    }

    // ------------------------------------------
    // WEBSITE / DOMAIN
    // ------------------------------------------
    case 'website': {
      try {
        let url = cleaned;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }

        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return null;
        }
        if (!parsed.hostname) return null;

        // SCANGATE uses domain-level identity for reputation lookup
        return parsed.hostname
          .toLowerCase()
          .replace(/^www\./, '');
      } catch {
        return null;
      }
    }

    // ------------------------------------------
    // DEFAULT
    // ------------------------------------------
    default:
      return cleaned.toLowerCase();
  }
}
