/**
 * Phone number utility functions
 * Handles multiple country codes (+91 for India, +1 for US/Canada)
 */

/**
 * Normalize phone number to E.164 format
 * Supports both Indian (+91) and US/Canada (+1) numbers
 * 
 * @param {string} phone - Raw phone number
 * @returns {string} - Normalized phone in E.164 format (e.g., +918884180740 or +15551234567)
 */
export function normalizePhoneNumber(phone) {
    if (!phone) return '';

    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Already has country code
    if (phone.startsWith('+')) {
        return phone.replace(/\D/g, '').replace(/^/, '+');
    }

    // Determine country code based on length and pattern
    if (cleaned.length === 10) {
        // Could be US/Canada or Indian number without country code
        // Default to +91 (India) if starts with 6-9, otherwise +1 (US)
        const firstDigit = cleaned[0];
        if (firstDigit >= '6' && firstDigit <= '9') {
            return '+91' + cleaned;
        } else {
            return '+1' + cleaned;
        }
    } else if (cleaned.length === 11) {
        // Likely US number with leading 1
        if (cleaned.startsWith('1')) {
            return '+' + cleaned;
        }
        // Or Indian number starting with 91
        if (cleaned.startsWith('91')) {
            return '+' + cleaned;
        }
    } else if (cleaned.length === 12) {
        // Likely has country code already
        if (cleaned.startsWith('91')) {
            return '+' + cleaned;
        }
        if (cleaned.startsWith('1')) {
            return '+' + cleaned;
        }
    }

    // Default: add +91 (India) for numbers that look Indian
    if (cleaned.length === 10 && cleaned[0] >= '6') {
        return '+91' + cleaned;
    }

    // Default: add +1 (US) for other 10-digit numbers
    if (cleaned.length === 10) {
        return '+1' + cleaned;
    }

    // Fallback: return with + prefix
    return '+' + cleaned;
}

/**
 * Generate all possible phone number variations for searching
 * Now includes +1 variations for US/Canada numbers
 * 
 * Example for +918884180740:
 * Returns: ['+918884180740', '918884180740', '8884180740', '+15551234567', '15551234567', '5551234567', ...]
 * 
 * @param {string} phone - Phone number in any format
 * @returns {string[]} - Array of phone number variations
 */
export function generatePhoneVariations(phone) {
    if (!phone) return [];

    // Clean the number
    const cleaned = phone.replace(/\D/g, '');
    const variations = new Set();

    // Add original cleaned number
    variations.add(cleaned);

    // ==================== INDIAN NUMBER VARIATIONS (+91) ====================
    
    // Full format with +91
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        variations.add('+' + cleaned); // +918884180740
        variations.add(cleaned.substring(2)); // 8884180740 (remove 91)
    } else if (cleaned.length === 10) {
        // 10 digit number - could be Indian
        variations.add('+91' + cleaned); // +918884180740
        variations.add('91' + cleaned); // 918884180740
    }

    // Without country code
    if (cleaned.startsWith('91') && cleaned.length >= 10) {
        variations.add(cleaned.substring(2)); // 8884180740
    }

    // Different prefix lengths for Indian numbers
    if (cleaned.length >= 10) {
        const last10 = cleaned.slice(-10);
        variations.add(last10); // 8884180740
        variations.add('+91' + last10); // +918884180740
        variations.add('91' + last10); // 918884180740
        
        // Shorter variations (sometimes stored without leading digits)
        if (last10.startsWith('0')) {
            variations.add(last10.substring(1)); // 884180740 (9 digits)
        }
        
        // Even shorter (sometimes area codes removed)
        const last9 = last10.substring(1);
        variations.add(last9); // 884180740
        
        const last8 = last9.substring(1);
        variations.add(last8); // 84180740
    }

    // ==================== US/CANADA NUMBER VARIATIONS (+1) ====================
    
    // Full format with +1
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        variations.add('+' + cleaned); // +15551234567
        variations.add(cleaned.substring(1)); // 5551234567 (remove 1)
    } else if (cleaned.length === 10 && !cleaned.startsWith('91')) {
        // 10 digit number - could be US/Canada
        variations.add('+1' + cleaned); // +15551234567
        variations.add('1' + cleaned); // 15551234567
    }

    // Without country code
    if (cleaned.startsWith('1') && cleaned.length === 11) {
        variations.add(cleaned.substring(1)); // 5551234567
    }

    // Different prefix lengths for US/Canada numbers
    if (cleaned.length >= 10 && !cleaned.startsWith('91')) {
        const last10 = cleaned.slice(-10);
        variations.add(last10); // 5551234567
        variations.add('+1' + last10); // +15551234567
        variations.add('1' + last10); // 15551234567
    }

    // ==================== INTERNATIONAL FORMAT VARIATIONS ====================
    
    // If original had + prefix, add with and without
    if (phone.startsWith('+')) {
        variations.add(phone);
        variations.add(phone.substring(1));
    } else {
        variations.add('+' + cleaned);
    }

    // Return as sorted array (shortest to longest for efficient searching)
    return Array.from(variations).sort((a, b) => a.length - b.length);
}

/**
 * Validate phone number format
 * Supports both Indian and US/Canada numbers
 * 
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
export function isValidPhoneNumber(phone) {
    if (!phone) return false;

    const cleaned = phone.replace(/\D/g, '');

    // Indian number patterns
    const indianPatterns = [
        /^\+?91[6-9]\d{9}$/, // +91XXXXXXXXXX (starts with 6-9)
        /^[6-9]\d{9}$/ // XXXXXXXXXX (10 digits starting with 6-9)
    ];

    // US/Canada number patterns
    const usPatterns = [
        /^\+?1[2-9]\d{9}$/, // +1XXXXXXXXXX
        /^[2-9]\d{9}$/ // XXXXXXXXXX (10 digits starting with 2-9)
    ];

    // Check against all patterns
    const allPatterns = [...indianPatterns, ...usPatterns];
    
    return allPatterns.some(pattern => {
        // Test against original format
        if (pattern.test(phone)) return true;
        // Test against cleaned format
        if (pattern.test(cleaned)) return true;
        // Test against cleaned with +
        if (pattern.test('+' + cleaned)) return true;
        return false;
    });
}

/**
 * Format phone number for display
 * 
 * @param {string} phone - Phone number
 * @param {string} style - Display style: 'international', 'national', 'compact'
 * @returns {string} - Formatted phone number
 */
export function formatPhoneNumber(phone, style = 'international') {
    if (!phone) return '';

    const normalized = normalizePhoneNumber(phone);
    const cleaned = normalized.replace(/\D/g, '');

    if (style === 'international') {
        // +91 888-418-0740 or +1 (555) 123-4567
        if (cleaned.startsWith('91') && cleaned.length === 12) {
            return `+91 ${cleaned.substring(2, 5)}-${cleaned.substring(5, 8)}-${cleaned.substring(8)}`;
        } else if (cleaned.startsWith('1') && cleaned.length === 11) {
            return `+1 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`;
        }
    } else if (style === 'national') {
        // (888) 418-0740 or (555) 123-4567
        if (cleaned.startsWith('91') && cleaned.length === 12) {
            return `${cleaned.substring(2, 5)}-${cleaned.substring(5, 8)}-${cleaned.substring(8)}`;
        } else if (cleaned.startsWith('1') && cleaned.length === 11) {
            return `(${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`;
        }
    } else if (style === 'compact') {
        // Just return normalized
        return normalized;
    }

    return normalized;
}

/**
 * Detect country from phone number
 * 
 * @param {string} phone - Phone number
 * @returns {string} - Country code ('IN', 'US', 'CA', or 'UNKNOWN')
 */
export function detectCountry(phone) {
    if (!phone) return 'UNKNOWN';

    const normalized = normalizePhoneNumber(phone);
    
    if (normalized.startsWith('+91')) {
        return 'IN'; // India
    } else if (normalized.startsWith('+1')) {
        // Could be US or Canada - both use +1
        return 'US'; // Default to US (can't distinguish without area code lookup)
    }

    return 'UNKNOWN';
}

/**
 * Compare two phone numbers for equality
 * Handles different formats
 * 
 * @param {string} phone1 - First phone number
 * @param {string} phone2 - Second phone number
 * @returns {boolean} - True if numbers are the same
 */
export function arePhoneNumbersEqual(phone1, phone2) {
    if (!phone1 || !phone2) return false;

    const normalized1 = normalizePhoneNumber(phone1);
    const normalized2 = normalizePhoneNumber(phone2);

    // Direct comparison
    if (normalized1 === normalized2) return true;

    // Generate variations and check for overlap
    const variations1 = new Set(generatePhoneVariations(phone1));
    const variations2 = new Set(generatePhoneVariations(phone2));

    for (const v1 of variations1) {
        if (variations2.has(v1)) return true;
    }

    return false;
}

export default {
    normalizePhoneNumber,
    generatePhoneVariations,
    isValidPhoneNumber,
    formatPhoneNumber,
    detectCountry,
    arePhoneNumbersEqual
};