import React from 'react';
import Input from '../ui/Input';

interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
}

interface CountrySpecificBillingFormProps {
  billingAddress: BillingAddress;
  onBillingAddressChange: (address: BillingAddress) => void;
  errors?: { [key: string]: string };
  disabled?: boolean;
}

// Countries that don't use postal codes
const COUNTRIES_WITHOUT_POSTAL_CODES = [
  'AO', 'AG', 'AW', 'BS', 'BZ', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CF', 'TD', 'KM', 'CG', 'CD', 'CK', 'CI', 'DJ', 'DM', 'GQ', 'ER', 'FJ', 'TF', 'GA', 'GM', 'GH', 'GD', 'GN', 'GW', 'GY', 'HK', 'IE', 'JM', 'KI', 'LY', 'MO', 'MW', 'ML', 'MR', 'MU', 'MS', 'NR', 'AN', 'NU', 'KP', 'PA', 'QA', 'RW', 'KN', 'LC', 'ST', 'SA', 'SC', 'SL', 'SB', 'SO', 'SR', 'SY', 'TZ', 'TL', 'TK', 'TO', 'TT', 'TV', 'UG', 'AE', 'VU', 'YE', 'ZW'
];

// Countries that use states/provinces
const COUNTRIES_WITH_STATES = [
  'US', 'CA', 'AU', 'BR', 'IN', 'MX', 'AR', 'MY', 'NG', 'ZA', 'DE', 'IT', 'ES'
];

// Country-specific postal code patterns and labels
const POSTAL_CODE_CONFIG: { [key: string]: { label: string; placeholder: string; pattern?: string } } = {
  'US': { label: 'ZIP Code', placeholder: '12345', pattern: '^[0-9]{5}(-[0-9]{4})?$' },
  'CA': { label: 'Postal Code', placeholder: 'K1A 0A6', pattern: '^[A-Za-z][0-9][A-Za-z] [0-9][A-Za-z][0-9]$' },
  'GB': { label: 'Postcode', placeholder: 'SW1A 1AA', pattern: '^[A-Za-z]{1,2}[0-9Rr][0-9A-Za-z]? [0-9][ABD-HJLNP-UW-Zabd-hjlnp-uw-z]{2}$' },
  'DE': { label: 'Postleitzahl', placeholder: '10115', pattern: '^[0-9]{5}$' },
  'FR': { label: 'Code Postal', placeholder: '75001', pattern: '^[0-9]{5}$' },
  'IT': { label: 'CAP', placeholder: '00118', pattern: '^[0-9]{5}$' },
  'ES': { label: 'Código Postal', placeholder: '28001', pattern: '^[0-9]{5}$' },
  'NL': { label: 'Postcode', placeholder: '1012 JS', pattern: '^[0-9]{4} [A-Za-z]{2}$' },
  'BE': { label: 'Postcode', placeholder: '1000', pattern: '^[0-9]{4}$' },
  'AT': { label: 'Postleitzahl', placeholder: '1010', pattern: '^[0-9]{4}$' },
  'CH': { label: 'Postleitzahl', placeholder: '8001', pattern: '^[0-9]{4}$' },
  'AU': { label: 'Postcode', placeholder: '2000', pattern: '^[0-9]{4}$' },
  'JP': { label: '郵便番号', placeholder: '100-0001', pattern: '^[0-9]{3}-[0-9]{4}$' },
  'KR': { label: '우편번호', placeholder: '03141', pattern: '^[0-9]{5}$' },
  'BR': { label: 'CEP', placeholder: '01310-100', pattern: '^[0-9]{5}-[0-9]{3}$' },
  'IN': { label: 'PIN Code', placeholder: '110001', pattern: '^[0-9]{6}$' },
  'CN': { label: '邮政编码', placeholder: '100000', pattern: '^[0-9]{6}$' },
  'RU': { label: 'Почтовый индекс', placeholder: '101000', pattern: '^[0-9]{6}$' },
  'PL': { label: 'Kod pocztowy', placeholder: '00-001', pattern: '^[0-9]{2}-[0-9]{3}$' },
  'CZ': { label: 'PSČ', placeholder: '110 00', pattern: '^[0-9]{3} [0-9]{2}$' },
  'BG': { label: 'Пощенски код', placeholder: '1000', pattern: '^[0-9]{4}$' },
  'RO': { label: 'Cod poștal', placeholder: '010011', pattern: '^[0-9]{6}$' },
  'HU': { label: 'Irányítószám', placeholder: '1011', pattern: '^[0-9]{4}$' },
  'GR': { label: 'Ταχυδρομικός Κώδικας', placeholder: '10431', pattern: '^[0-9]{5}$' },
  'PT': { label: 'Código Postal', placeholder: '1000-001', pattern: '^[0-9]{4}-[0-9]{3}$' },
  'SE': { label: 'Postnummer', placeholder: '111 29', pattern: '^[0-9]{3} [0-9]{2}$' },
  'NO': { label: 'Postnummer', placeholder: '0150', pattern: '^[0-9]{4}$' },
  'DK': { label: 'Postnummer', placeholder: '1050', pattern: '^[0-9]{4}$' },
  'FI': { label: 'Postinumero', placeholder: '00100', pattern: '^[0-9]{5}$' },
  'TR': { label: 'Posta Kodu', placeholder: '34000', pattern: '^[0-9]{5}$' },
  'ZA': { label: 'Postal Code', placeholder: '8001', pattern: '^[0-9]{4}$' },
  'MX': { label: 'Código Postal', placeholder: '01000', pattern: '^[0-9]{5}$' },
  'AR': { label: 'Código Postal', placeholder: 'C1000AAA', pattern: '^[A-Za-z][0-9]{4}[A-Za-z]{3}$' },
  'CL': { label: 'Código Postal', placeholder: '8320000', pattern: '^[0-9]{7}$' },
  'CO': { label: 'Código Postal', placeholder: '110111', pattern: '^[0-9]{6}$' },
  'PE': { label: 'Código Postal', placeholder: 'LIMA 01', pattern: '^[A-Za-z0-9 ]{5,8}$' },
  'UY': { label: 'Código Postal', placeholder: '11000', pattern: '^[0-9]{5}$' },
  'PY': { label: 'Código Postal', placeholder: '1536', pattern: '^[0-9]{4}$' },
  'BO': { label: 'Código Postal', placeholder: '0000', pattern: '^[0-9]{4}$' },
  'EC': { label: 'Código Postal', placeholder: '170150', pattern: '^[0-9]{6}$' },
  'VE': { label: 'Código Postal', placeholder: '1010', pattern: '^[0-9]{4}$' }
};

// State/Province labels by country
const STATE_LABELS: { [key: string]: string } = {
  'US': 'State',
  'CA': 'Province',
  'AU': 'State',
  'BR': 'State',
  'IN': 'State',
  'MX': 'State',
  'AR': 'Province',
  'MY': 'State',
  'NG': 'State',
  'ZA': 'Province',
  'DE': 'State',
  'IT': 'Region',
  'ES': 'Province'
};

const CountrySpecificBillingForm: React.FC<CountrySpecificBillingFormProps> = ({
  billingAddress,
  onBillingAddressChange,
  errors = {},
  disabled = false
}) => {
  const country = billingAddress.country?.toUpperCase() || 'US';
  const requiresPostalCode = !COUNTRIES_WITHOUT_POSTAL_CODES.includes(country);
  const requiresState = COUNTRIES_WITH_STATES.includes(country);
  const postalConfig = POSTAL_CODE_CONFIG[country] || { label: 'Postal Code', placeholder: '12345' };
  const stateLabel = STATE_LABELS[country] || 'State/Province';

  const handleInputChange = (field: keyof BillingAddress, value: string) => {
    onBillingAddressChange({
      ...billingAddress,
      [field]: value
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Billing Address</h4>
      
      {/* Address Line 1 */}
      <Input
        label="Address Line 1"
        value={billingAddress.line1}
        onChange={(e) => handleInputChange('line1', e.target.value)}
        placeholder="123 Main Street"
        error={errors.line1}
        disabled={disabled}
        required
      />

      {/* Address Line 2 */}
      <Input
        label="Address Line 2 (Optional)"
        value={billingAddress.line2 || ''}
        onChange={(e) => handleInputChange('line2', e.target.value)}
        placeholder="Apartment, suite, etc."
        error={errors.line2}
        disabled={disabled}
      />

      {/* City and State/Province */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="City"
          value={billingAddress.city}
          onChange={(e) => handleInputChange('city', e.target.value)}
          placeholder="New York"
          error={errors.city}
          disabled={disabled}
          required
        />

        {requiresState && (
          <Input
            label={stateLabel}
            value={billingAddress.state || ''}
            onChange={(e) => handleInputChange('state', e.target.value)}
            placeholder={country === 'US' ? 'NY' : 'State/Province'}
            error={errors.state}
            disabled={disabled}
            required
          />
        )}
      </div>

      {/* Postal Code */}
      {requiresPostalCode && (
        <Input
          label={postalConfig.label}
          value={billingAddress.postal_code || ''}
          onChange={(e) => handleInputChange('postal_code', e.target.value)}
          placeholder={postalConfig.placeholder}
          error={errors.postal_code}
          disabled={disabled}
          required
        />
      )}

      {/* Country (read-only, showing current country) */}
      <Input
        label="Country"
        value={billingAddress.country}
        onChange={() => {}} // Read-only
        disabled={true}
        className="bg-gray-50"
      />
    </div>
  );
};

export default CountrySpecificBillingForm;
