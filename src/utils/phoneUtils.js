/**
 * Phone number normalization and formatting utilities
 * Handles international phone numbers with or without country codes
 */

/**
 * Default country code to use when none is provided
 * Can be configured via environment variable
 */
const DEFAULT_COUNTRY_CODE = process.env.DEFAULT_COUNTRY_CODE || '+91'; // US by default

/**
 * Common country codes
 */
export const COUNTRY_CODES = {
    US: '+1',
    CA: '+1',
    IN: '+91',
    UK: '+44',
    AU: '+61',
    // Add more as needed
};

/**
 * Clean phone number - remove all non-digit characters except leading +
 * @param {string} phone - Raw phone number
 * @returns {string} - Cleaned phone number
 */
export function cleanPhoneNumber(phone) {
    if (!phone) return '';
    
    // Convert to string and trim
    phone = String(phone).trim();
    
    // If starts with +, preserve it and remove all other non-digits
    if (phone.startsWith('+')) {
        return '+' + phone.substring(1).replace(/\D/g, '');
    }
    
    // Remove all non-digits
    return phone.replace(/\D/g, '');
}

/**
 * Normalize phone number to E.164 format with country code
 * @param {string} phone - Phone number (with or without country code)
 * @param {string} defaultCountryCode - Default country code to use (e.g., '+1', '+91')
 * @returns {string} - Normalized phone number with country code
 */
export function normalizePhoneNumber(phone, defaultCountryCode = DEFAULT_COUNTRY_CODE) {
    if (!phone) return '';
    
    const cleaned = cleanPhoneNumber(phone);
    
    // Already has a country code
    if (cleaned.startsWith('+')) {
        return cleaned;
    }
    
    // Add default country code
    return defaultCountryCode + cleaned;
}

/**
 * Generate all possible phone number formats for searching
 * This is useful when searching databases where the format might be inconsistent
 * 
 * @param {string} phone - Phone number (with or without country code)
 * @param {string[]} countryCodes - Array of country codes to try (e.g., ['+1', '+91'])
 * @returns {string[]} - Array of possible phone number formats
 */
export function generatePhoneVariations(phone, countryCodes = ['+1', '+91']) {
    if (!phone) return [];
    
    const cleaned = cleanPhoneNumber(phone);
    const variations = new Set();
    
    // If already has country code, add as-is
    if (cleaned.startsWith('+')) {
        variations.add(cleaned);
        // Also add without + for some systems
        variations.add(cleaned.substring(1));
        // Also add just the number without country code
        const withoutCode = cleaned.substring(1);
        // Try to extract the local number (assuming country code is 1-3 digits)
        for (let i = 1; i <= 3; i++) {
            if (withoutCode.length > i) {
                variations.add(withoutCode.substring(i));
            }
        }
    } else {
        // Add the raw cleaned number
        variations.add(cleaned);
        
        // Add with each country code
        countryCodes.forEach(code => {
            variations.add(code + cleaned);
            variations.add(code.substring(1) + cleaned); // Without +
        });
    }
    
    // Filter out empty strings and return unique values
    return Array.from(variations).filter(v => v && v.length > 0);
}

/**
 * Smart phone number matching
 * Tries to match phone numbers even if formats differ
 * 
 * @param {string} phone1 - First phone number
 * @param {string} phone2 - Second phone number
 * @returns {boolean} - True if numbers match
 */
export function phonesMatch(phone1, phone2) {
    if (!phone1 || !phone2) return false;
    
    const clean1 = cleanPhoneNumber(phone1);
    const clean2 = cleanPhoneNumber(phone2);
    
    // Direct match
    if (clean1 === clean2) return true;
    
    // Try matching without country codes
    const variations1 = generatePhoneVariations(clean1);
    const variations2 = generatePhoneVariations(clean2);
    
    // Check if any variation matches
    return variations1.some(v1 => variations2.includes(v1));
}

/**
 * Format phone number for display (human-readable)
 * @param {string} phone - Phone number
 * @param {string} format - Format type ('us', 'international', 'raw')
 * @returns {string} - Formatted phone number
 */
export function formatPhoneForDisplay(phone, format = 'international') {
    if (!phone) return '';
    
    const cleaned = cleanPhoneNumber(phone);
    
    if (format === 'raw') {
        return cleaned;
    }
    
    // US format: (555) 123-4567
    if (format === 'us') {
        const match = cleaned.match(/^(\+?1)?(\d{3})(\d{3})(\d{4})$/);
        if (match) {
            return `(${match[2]}) ${match[3]}-${match[4]}`;
        }
    }
    
    // International format: +1 555 123 4567
    if (format === 'international') {
        if (cleaned.startsWith('+1')) {
            const number = cleaned.substring(2);
            if (number.length === 10) {
                return `+1 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
            }
        } else if (cleaned.startsWith('+91')) {
            const number = cleaned.substring(3);
            return `+91 ${number}`;
        }
    }
    
    // Default: return as-is
    return cleaned;
}

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @param {string} countryCode - Expected country code (optional)
 * @returns {boolean} - True if valid
 */
export function isValidPhoneNumber(phone, countryCode = null) {
    if (!phone) return false;
    
    const cleaned = cleanPhoneNumber(phone);
    
    // Must have at least 10 digits (typical minimum)
    if (cleaned.replace(/\D/g, '').length < 10) {
        return false;
    }
    
    // If country code specified, check it matches
    if (countryCode && !cleaned.startsWith(countryCode)) {
        return false;
    }
    
    return true;
}

/**
 * Extract country code from phone number
 * @param {string} phone - Phone number
 * @returns {string|null} - Country code or null
 */
export function extractCountryCode(phone) {
    if (!phone) return null;
    
    const cleaned = cleanPhoneNumber(phone);
    
    if (!cleaned.startsWith('+')) {
        return null;
    }
    
    // Try common country code lengths (1-3 digits)
    for (let len = 1; len <= 3; len++) {
        const code = cleaned.substring(0, len + 1); // +1 position + length
        // Check if it's a known country code
        if (Object.values(COUNTRY_CODES).includes(code)) {
            return code;
        }
    }
    
    return null;
}

/**
 * Detect likely country code based on phone number length and format
 * @param {string} phone - Phone number
 * @returns {string} - Detected or default country code
 */
export function detectCountryCode(phone) {
    if (!phone) return DEFAULT_COUNTRY_CODE;
    
    const cleaned = cleanPhoneNumber(phone);
    
    // Already has country code
    if (cleaned.startsWith('+')) {
        const extracted = extractCountryCode(cleaned);
        return extracted || DEFAULT_COUNTRY_CODE;
    }
    
    // Detect based on length
    const digitCount = cleaned.length;
    
    // 10 digits typically means US/Canada
    if (digitCount === 10) {
        return '+1';
    }
    
    // 11 digits starting with 1 means US/Canada with country code
    if (digitCount === 11 && cleaned.startsWith('1')) {
        return '+1';
    }
    
    // 10 digits means India (mobile)
    if (digitCount === 10 && cleaned.startsWith('6,7,8,9')) {
        return '+91';
    }
    
    // Default
    return DEFAULT_COUNTRY_CODE;
}

export default {
    cleanPhoneNumber,
    normalizePhoneNumber,
    generatePhoneVariations,
    phonesMatch,
    formatPhoneForDisplay,
    isValidPhoneNumber,
    extractCountryCode,
    detectCountryCode,
    COUNTRY_CODES
};