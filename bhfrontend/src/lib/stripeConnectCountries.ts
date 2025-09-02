// Stripe Connect country-specific configurations
// Based on Stripe's supported countries and their requirements

export interface CountryConfig {
  code: string;
  name: string;
  currency: string;
  supportedBusinessTypes: ('individual' | 'company')[];
  
  // Address requirements
  hasStates: boolean;
  stateLabel: string;
  stateRequired: boolean;
  postalCodeLabel: string;
  postalCodeRequired: boolean;
  postalCodePattern?: string;
  postalCodePlaceholder: string;
  
  // Bank account requirements
  bankAccountType: 'us_bank_account' | 'iban' | 'au_becs_debit' | 'ca_bank_account' | 'gb_bank_account';
  bankAccountFields: BankAccountField[];
  
  // Individual requirements
  requiresSSN: boolean;
  ssnLabel: string;
  
  // Business requirements
  requiresTaxId: boolean;
  taxIdLabel: string;
  
  // Phone number format
  phonePattern?: string;
  phonePlaceholder: string;
  
  // States/provinces (if applicable)
  states?: { value: string; label: string }[];
}

export interface BankAccountField {
  name: string;
  label: string;
  type: 'text' | 'select';
  required: boolean;
  pattern?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  maxLength?: number;
  minLength?: number;
}

export const STRIPE_CONNECT_COUNTRIES: Record<string, CountryConfig> = {
  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    supportedBusinessTypes: ['individual', 'company'],
    hasStates: true,
    stateLabel: 'State',
    stateRequired: true,
    postalCodeLabel: 'ZIP Code',
    postalCodeRequired: true,
    postalCodePattern: '^[0-9]{5}(-[0-9]{4})?$',
    postalCodePlaceholder: '12345 or 12345-6789',
    bankAccountType: 'us_bank_account',
    bankAccountFields: [
      {
        name: 'accountHolderName',
        label: 'Account Holder Name',
        type: 'text',
        required: true,
        placeholder: 'Name on bank account'
      },
      {
        name: 'routingNumber',
        label: 'Routing Number',
        type: 'text',
        required: true,
        pattern: '^[0-9]{9}$',
        placeholder: '9-digit routing number',
        maxLength: 9,
        minLength: 9
      },
      {
        name: 'accountNumber',
        label: 'Account Number',
        type: 'text',
        required: true,
        placeholder: 'Account number',
        maxLength: 17,
        minLength: 4
      }
    ],
    requiresSSN: true,
    ssnLabel: 'Social Security Number',
    requiresTaxId: true,
    taxIdLabel: 'EIN (Employer Identification Number)',
    phonePattern: '^\\+?1?[2-9][0-8][0-9][2-9][0-9]{6}$',
    phonePlaceholder: '+1 (555) 123-4567',
    states: [
      { value: 'AL', label: 'Alabama' },
      { value: 'AK', label: 'Alaska' },
      { value: 'AZ', label: 'Arizona' },
      { value: 'AR', label: 'Arkansas' },
      { value: 'CA', label: 'California' },
      { value: 'CO', label: 'Colorado' },
      { value: 'CT', label: 'Connecticut' },
      { value: 'DE', label: 'Delaware' },
      { value: 'FL', label: 'Florida' },
      { value: 'GA', label: 'Georgia' },
      { value: 'HI', label: 'Hawaii' },
      { value: 'ID', label: 'Idaho' },
      { value: 'IL', label: 'Illinois' },
      { value: 'IN', label: 'Indiana' },
      { value: 'IA', label: 'Iowa' },
      { value: 'KS', label: 'Kansas' },
      { value: 'KY', label: 'Kentucky' },
      { value: 'LA', label: 'Louisiana' },
      { value: 'ME', label: 'Maine' },
      { value: 'MD', label: 'Maryland' },
      { value: 'MA', label: 'Massachusetts' },
      { value: 'MI', label: 'Michigan' },
      { value: 'MN', label: 'Minnesota' },
      { value: 'MS', label: 'Mississippi' },
      { value: 'MO', label: 'Missouri' },
      { value: 'MT', label: 'Montana' },
      { value: 'NE', label: 'Nebraska' },
      { value: 'NV', label: 'Nevada' },
      { value: 'NH', label: 'New Hampshire' },
      { value: 'NJ', label: 'New Jersey' },
      { value: 'NM', label: 'New Mexico' },
      { value: 'NY', label: 'New York' },
      { value: 'NC', label: 'North Carolina' },
      { value: 'ND', label: 'North Dakota' },
      { value: 'OH', label: 'Ohio' },
      { value: 'OK', label: 'Oklahoma' },
      { value: 'OR', label: 'Oregon' },
      { value: 'PA', label: 'Pennsylvania' },
      { value: 'RI', label: 'Rhode Island' },
      { value: 'SC', label: 'South Carolina' },
      { value: 'SD', label: 'South Dakota' },
      { value: 'TN', label: 'Tennessee' },
      { value: 'TX', label: 'Texas' },
      { value: 'UT', label: 'Utah' },
      { value: 'VT', label: 'Vermont' },
      { value: 'VA', label: 'Virginia' },
      { value: 'WA', label: 'Washington' },
      { value: 'WV', label: 'West Virginia' },
      { value: 'WI', label: 'Wisconsin' },
      { value: 'WY', label: 'Wyoming' }
    ]
  },

  CA: {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    supportedBusinessTypes: ['individual', 'company'],
    hasStates: true,
    stateLabel: 'Province',
    stateRequired: true,
    postalCodeLabel: 'Postal Code',
    postalCodeRequired: true,
    postalCodePattern: '^[A-Za-z][0-9][A-Za-z] [0-9][A-Za-z][0-9]$',
    postalCodePlaceholder: 'A1A 1A1',
    bankAccountType: 'ca_bank_account',
    bankAccountFields: [
      {
        name: 'accountHolderName',
        label: 'Account Holder Name',
        type: 'text',
        required: true,
        placeholder: 'Name on bank account'
      },
      {
        name: 'institutionNumber',
        label: 'Institution Number',
        type: 'text',
        required: true,
        pattern: '^[0-9]{3}$',
        placeholder: '3-digit institution number',
        maxLength: 3,
        minLength: 3
      },
      {
        name: 'transitNumber',
        label: 'Transit Number',
        type: 'text',
        required: true,
        pattern: '^[0-9]{5}$',
        placeholder: '5-digit transit number',
        maxLength: 5,
        minLength: 5
      },
      {
        name: 'accountNumber',
        label: 'Account Number',
        type: 'text',
        required: true,
        placeholder: 'Account number',
        maxLength: 12,
        minLength: 7
      }
    ],
    requiresSSN: true,
    ssnLabel: 'Social Insurance Number (SIN)',
    requiresTaxId: true,
    taxIdLabel: 'Business Number (BN)',
    phonePattern: '^\\+?1?[2-9][0-8][0-9][2-9][0-9]{6}$',
    phonePlaceholder: '+1 (555) 123-4567',
    states: [
      { value: 'AB', label: 'Alberta' },
      { value: 'BC', label: 'British Columbia' },
      { value: 'MB', label: 'Manitoba' },
      { value: 'NB', label: 'New Brunswick' },
      { value: 'NL', label: 'Newfoundland and Labrador' },
      { value: 'NS', label: 'Nova Scotia' },
      { value: 'ON', label: 'Ontario' },
      { value: 'PE', label: 'Prince Edward Island' },
      { value: 'QC', label: 'Quebec' },
      { value: 'SK', label: 'Saskatchewan' },
      { value: 'NT', label: 'Northwest Territories' },
      { value: 'NU', label: 'Nunavut' },
      { value: 'YT', label: 'Yukon' }
    ]
  },

  GB: {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    supportedBusinessTypes: ['individual', 'company'],
    hasStates: false,
    stateLabel: 'County',
    stateRequired: false,
    postalCodeLabel: 'Postcode',
    postalCodeRequired: true,
    postalCodePattern: '^[A-Za-z]{1,2}[0-9Rr][0-9A-Za-z]? [0-9][ABD-HJLNP-UW-Zabd-hjlnp-uw-z]{2}$',
    postalCodePlaceholder: 'SW1A 1AA',
    bankAccountType: 'gb_bank_account',
    bankAccountFields: [
      {
        name: 'accountHolderName',
        label: 'Account Holder Name',
        type: 'text',
        required: true,
        placeholder: 'Name on bank account'
      },
      {
        name: 'sortCode',
        label: 'Sort Code',
        type: 'text',
        required: true,
        pattern: '^[0-9]{6}$',
        placeholder: '6-digit sort code (e.g., 123456)',
        maxLength: 6,
        minLength: 6
      },
      {
        name: 'accountNumber',
        label: 'Account Number',
        type: 'text',
        required: true,
        pattern: '^[0-9]{8}$',
        placeholder: '8-digit account number',
        maxLength: 8,
        minLength: 8
      }
    ],
    requiresSSN: false,
    ssnLabel: 'National Insurance Number',
    requiresTaxId: true,
    taxIdLabel: 'Company Registration Number',
    phonePattern: '^\\+?44[1-9][0-9]{8,9}$',
    phonePlaceholder: '+44 20 7123 4567'
  },

  AU: {
    code: 'AU',
    name: 'Australia',
    currency: 'AUD',
    supportedBusinessTypes: ['individual', 'company'],
    hasStates: true,
    stateLabel: 'State',
    stateRequired: true,
    postalCodeLabel: 'Postcode',
    postalCodeRequired: true,
    postalCodePattern: '^[0-9]{4}$',
    postalCodePlaceholder: '1234',
    bankAccountType: 'au_becs_debit',
    bankAccountFields: [
      {
        name: 'accountHolderName',
        label: 'Account Holder Name',
        type: 'text',
        required: true,
        placeholder: 'Name on bank account'
      },
      {
        name: 'bsbNumber',
        label: 'BSB Number',
        type: 'text',
        required: true,
        pattern: '^[0-9]{6}$',
        placeholder: '6-digit BSB number',
        maxLength: 6,
        minLength: 6
      },
      {
        name: 'accountNumber',
        label: 'Account Number',
        type: 'text',
        required: true,
        placeholder: 'Account number',
        maxLength: 9,
        minLength: 6
      }
    ],
    requiresSSN: false,
    ssnLabel: 'Tax File Number (TFN)',
    requiresTaxId: true,
    taxIdLabel: 'Australian Business Number (ABN)',
    phonePattern: '^\\+?61[2-9][0-9]{8}$',
    phonePlaceholder: '+61 2 1234 5678',
    states: [
      { value: 'NSW', label: 'New South Wales' },
      { value: 'VIC', label: 'Victoria' },
      { value: 'QLD', label: 'Queensland' },
      { value: 'WA', label: 'Western Australia' },
      { value: 'SA', label: 'South Australia' },
      { value: 'TAS', label: 'Tasmania' },
      { value: 'ACT', label: 'Australian Capital Territory' },
      { value: 'NT', label: 'Northern Territory' }
    ]
  },

  // European countries using IBAN
  DE: {
    code: 'DE',
    name: 'Germany',
    currency: 'EUR',
    supportedBusinessTypes: ['individual', 'company'],
    hasStates: false,
    stateLabel: 'State',
    stateRequired: false,
    postalCodeLabel: 'Postal Code',
    postalCodeRequired: true,
    postalCodePattern: '^[0-9]{5}$',
    postalCodePlaceholder: '12345',
    bankAccountType: 'iban',
    bankAccountFields: [
      {
        name: 'accountHolderName',
        label: 'Account Holder Name',
        type: 'text',
        required: true,
        placeholder: 'Name on bank account'
      },
      {
        name: 'iban',
        label: 'IBAN',
        type: 'text',
        required: true,
        pattern: '^DE[0-9]{20}$',
        placeholder: 'DE89 3704 0044 0532 0130 00',
        maxLength: 27, // Allow for spaces in formatted IBAN
        minLength: 22
      }
    ],
    requiresSSN: false,
    ssnLabel: 'Tax ID',
    requiresTaxId: true,
    taxIdLabel: 'Tax Number (Steuernummer)',
    phonePattern: '^\\+?49[1-9][0-9]{6,11}$',
    phonePlaceholder: '+49 30 12345678'
  },

  FR: {
    code: 'FR',
    name: 'France',
    currency: 'EUR',
    supportedBusinessTypes: ['individual', 'company'],
    hasStates: false,
    stateLabel: 'Department',
    stateRequired: false,
    postalCodeLabel: 'Postal Code',
    postalCodeRequired: true,
    postalCodePattern: '^[0-9]{5}$',
    postalCodePlaceholder: '75001',
    bankAccountType: 'iban',
    bankAccountFields: [
      {
        name: 'accountHolderName',
        label: 'Account Holder Name',
        type: 'text',
        required: true,
        placeholder: 'Name on bank account'
      },
      {
        name: 'iban',
        label: 'IBAN',
        type: 'text',
        required: true,
        pattern: '^FR[0-9A-Z]{25}$',
        placeholder: 'FR14 2004 1010 0505 0001 3M02 606',
        maxLength: 34, // Allow for spaces in formatted IBAN
        minLength: 27
      }
    ],
    requiresSSN: false,
    ssnLabel: 'Social Security Number',
    requiresTaxId: true,
    taxIdLabel: 'SIRET Number',
    phonePattern: '^\\+?33[1-9][0-9]{8}$',
    phonePlaceholder: '+33 1 23 45 67 89'
  },

  BG: {
    code: 'BG',
    name: 'Bulgaria',
    currency: 'BGN',
    supportedBusinessTypes: ['individual', 'company'],
    hasStates: false,
    stateLabel: 'Region',
    stateRequired: false,
    postalCodeLabel: 'Postal Code',
    postalCodeRequired: true,
    postalCodePattern: '^[0-9]{4}$',
    postalCodePlaceholder: '1000',
    bankAccountType: 'iban',
    bankAccountFields: [
      {
        name: 'accountHolderName',
        label: 'Account Holder Name',
        type: 'text',
        required: true,
        placeholder: 'Name on bank account'
      },
      {
        name: 'iban',
        label: 'IBAN',
        type: 'text',
        required: true,
        pattern: '^BG[0-9A-Z]{20}$',
        placeholder: 'BG80 BNBG 9661 1020 3456 78',
        maxLength: 27, // Allow for spaces in formatted IBAN
        minLength: 22
      }
    ],
    requiresSSN: false,
    ssnLabel: 'Personal Number (EGN)',
    requiresTaxId: true,
    taxIdLabel: 'UIC (Unified Identification Code)',
    phonePattern: '^\\+?359[2-9][0-9]{7,8}$',
    phonePlaceholder: '+359 2 123 4567'
  }
};

// Helper functions
export const getCountryConfig = (countryCode: string): CountryConfig => {
  return STRIPE_CONNECT_COUNTRIES[countryCode] || STRIPE_CONNECT_COUNTRIES.US;
};

export const getSupportedCountries = (): CountryConfig[] => {
  return Object.values(STRIPE_CONNECT_COUNTRIES);
};

export const isCountrySupported = (countryCode: string): boolean => {
  return countryCode in STRIPE_CONNECT_COUNTRIES;
};

export const formatPhoneNumber = (phone: string, countryCode: string): string => {
  // Basic formatting - can be enhanced with more sophisticated formatting
  return phone.replace(/\D/g, ''); // Remove non-digits for now
};

export const validatePostalCode = (postalCode: string, countryCode: string): boolean => {
  const config = getCountryConfig(countryCode);
  if (!config.postalCodeRequired) return true;
  if (!config.postalCodePattern) return postalCode.length > 0;

  const regex = new RegExp(config.postalCodePattern);
  return regex.test(postalCode);
};

// IBAN formatting patterns for different countries
const IBAN_FORMATS: Record<string, { length: number; pattern: string }> = {
  BG: { length: 22, pattern: 'AAAA AAAA AAAA AAAA AAAA AA' }, // BG80 BNBG 9661 1020 3456 78
  DE: { length: 22, pattern: 'AAAA AAAA AAAA AAAA AAAA AA' }, // DE89 3704 0044 0532 0130 00
  FR: { length: 27, pattern: 'AAAA AAAA AAAA AAAA AAAA AAA AAAA' }, // FR14 2004 1010 0505 0001 3M02 606
  GB: { length: 22, pattern: 'AAAA AAAA AAAA AAAA AAAA AA' }, // GB29 NWBK 6016 1331 9268 19
  IT: { length: 27, pattern: 'AAAA AAAA AAAA AAAA AAAA AAA AAAA' }, // IT60 X054 2811 1010 0000 0123 456
  ES: { length: 24, pattern: 'AAAA AAAA AAAA AAAA AAAA AAAA' }, // ES91 2100 0418 4502 0005 1332
  NL: { length: 18, pattern: 'AAAA AAAA AAAA AAAA AA' }, // NL91 ABNA 0417 1643 00
  AT: { length: 20, pattern: 'AAAA AAAA AAAA AAAA AAAA' }, // AT61 1904 3002 3457 3201
  BE: { length: 16, pattern: 'AAAA AAAA AAAA AAAA' }, // BE68 5390 0754 7034
  CH: { length: 21, pattern: 'AAAA AAAA AAAA AAAA A' }, // CH93 0076 2011 6238 5295 7
  DK: { length: 18, pattern: 'AAAA AAAA AAAA AAAA AA' }, // DK50 0040 0440 1162 43
  FI: { length: 18, pattern: 'AAAA AAAA AAAA AAAA AA' }, // FI21 1234 5600 0007 85
  IE: { length: 22, pattern: 'AAAA AAAA AAAA AAAA AAAA AA' }, // IE29 AIBK 9311 5212 3456 78
  LU: { length: 20, pattern: 'AAAA AAAA AAAA AAAA AAAA' }, // LU28 0019 4006 4475 0000
  NO: { length: 15, pattern: 'AAAA AAAA AAAA AAA' }, // NO93 8601 1117 947
  PT: { length: 25, pattern: 'AAAA AAAA AAAA AAAA AAAA AAA A' }, // PT50 0002 0123 1234 5678 9015 4
  SE: { length: 24, pattern: 'AAAA AAAA AAAA AAAA AAAA AAAA' }, // SE45 5000 0000 0583 9825 7466
  PL: { length: 28, pattern: 'AAAA AAAA AAAA AAAA AAAA AAAA AAAA' }, // PL61 1090 1014 0000 0712 1981 2874
  CZ: { length: 24, pattern: 'AAAA AAAA AAAA AAAA AAAA AAAA' }, // CZ65 0800 0000 1920 0014 5399
  HU: { length: 28, pattern: 'AAAA AAAA AAAA AAAA AAAA AAAA AAAA' }, // HU42 1177 3016 1111 1018 0000 0000
  SK: { length: 24, pattern: 'AAAA AAAA AAAA AAAA AAAA AAAA' }, // SK31 1200 0000 1987 4263 7541
  SI: { length: 19, pattern: 'AAAA AAAA AAAA AAAA AAA' }, // SI56 2633 0001 2039 086
  HR: { length: 21, pattern: 'AAAA AAAA AAAA AAAA A' }, // HR12 1001 0051 8630 0016 0
  RO: { length: 24, pattern: 'AAAA AAAA AAAA AAAA AAAA AAAA' }, // RO49 AAAA 1B31 0075 9384 0000
  LT: { length: 20, pattern: 'AAAA AAAA AAAA AAAA AAAA' }, // LT12 1000 0111 0100 1000
  LV: { length: 21, pattern: 'AAAA AAAA AAAA AAAA A' }, // LV80 BANK 0000 4351 9500 1
  EE: { length: 20, pattern: 'AAAA AAAA AAAA AAAA AAAA' }, // EE38 2200 2210 2014 5685
  GR: { length: 27, pattern: 'AAAA AAAA AAAA AAAA AAAA AAA AAAA' }, // GR16 0110 1250 0000 0001 2300 695
  CY: { length: 28, pattern: 'AAAA AAAA AAAA AAAA AAAA AAAA AAAA' }, // CY17 0020 0128 0000 0012 0052 7600
  MT: { length: 31, pattern: 'AAAA AAAA AAAA AAAA AAAA AAAA AAA AAAA' }, // MT84 MALT 0110 0001 2345 MTLC AST0 01S
};

/**
 * Formats an IBAN according to the country-specific pattern
 */
export const formatIBAN = (iban: string, countryCode?: string): string => {
  // Remove all spaces and convert to uppercase
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();

  // If no country code provided, try to extract from IBAN
  const ibanCountryCode = countryCode || cleanIban.substring(0, 2);

  // Get the format pattern for this country
  const format = IBAN_FORMATS[ibanCountryCode];
  if (!format) {
    // If no specific format, add spaces every 4 characters (default IBAN formatting)
    return cleanIban.replace(/(.{4})/g, '$1 ').trim();
  }

  // Apply the country-specific formatting
  let formatted = '';
  let ibanIndex = 0;

  for (let i = 0; i < format.pattern.length && ibanIndex < cleanIban.length; i++) {
    const char = format.pattern[i];
    if (char === 'A') {
      formatted += cleanIban[ibanIndex];
      ibanIndex++;
    } else if (char === ' ') {
      formatted += ' ';
    }
  }

  return formatted;
};

/**
 * Validates an IBAN format for a specific country
 */
export const validateIBAN = (iban: string, countryCode: string): boolean => {
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  const format = IBAN_FORMATS[countryCode];

  if (!format) {
    // Basic validation: starts with country code and has reasonable length
    return cleanIban.startsWith(countryCode) && cleanIban.length >= 15 && cleanIban.length <= 34;
  }

  // Check if length matches expected format
  return cleanIban.length === format.length && cleanIban.startsWith(countryCode);
};

/**
 * Gets the expected IBAN length for a country
 */
export const getIBANLength = (countryCode: string): number => {
  return IBAN_FORMATS[countryCode]?.length || 22; // Default to 22 if unknown
};

/**
 * Gets the formatted IBAN placeholder for a country
 */
export const getIBANPlaceholder = (countryCode: string): string => {
  const format = IBAN_FORMATS[countryCode];
  if (!format) {
    return `${countryCode}00 0000 0000 0000 0000 00`;
  }

  // Create a placeholder based on the pattern
  let placeholder = '';
  let digitCount = 0;

  for (let i = 0; i < format.pattern.length; i++) {
    const char = format.pattern[i];
    if (char === 'A') {
      if (digitCount < 2) {
        placeholder += countryCode[digitCount] || '0';
      } else if (digitCount < 4) {
        placeholder += '0';
      } else {
        placeholder += digitCount % 2 === 0 ? '0' : '1';
      }
      digitCount++;
    } else {
      placeholder += char;
    }
  }

  return placeholder;
};

/**
 * Formats other bank account fields (routing numbers, sort codes, etc.)
 */
export const formatBankAccountField = (value: string, fieldName: string, countryCode: string): string => {
  const cleanValue = value.replace(/\D/g, ''); // Remove non-digits

  switch (fieldName) {
    case 'sortCode':
      // UK sort codes: format as XX-XX-XX
      return cleanValue.replace(/(\d{2})(\d{2})(\d{2})/, '$1-$2-$3').substring(0, 8);

    case 'routingNumber':
      // US routing numbers: 9 digits, no formatting
      return cleanValue.substring(0, 9);

    case 'bsbNumber':
      // Australian BSB: format as XXX-XXX
      return cleanValue.replace(/(\d{3})(\d{3})/, '$1-$2').substring(0, 7);

    case 'institutionNumber':
      // Canadian institution number: 3 digits
      return cleanValue.substring(0, 3);

    case 'transitNumber':
      // Canadian transit number: 5 digits
      return cleanValue.substring(0, 5);

    default:
      return value; // No special formatting
  }
};
