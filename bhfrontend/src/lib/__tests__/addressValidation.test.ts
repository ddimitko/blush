import { 
  validateAddress, 
  isAddressValid, 
  getAddressConfig,
  getAddressValidationRules 
} from '../addressValidation';
import { 
  isValidPostalCode, 
  getPostalCodeLabel, 
  getPostalCodePlaceholder,
  isStateRequired,
  getStateLabel 
} from '../validation';

describe('Address Validation', () => {
  describe('validateAddress', () => {
    it('should validate US address correctly', () => {
      const validUSAddress = {
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US'
      };

      const errors = validateAddress(validUSAddress);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should require state for US addresses', () => {
      const invalidUSAddress = {
        address: '123 Main Street',
        city: 'New York',
        state: '',
        postalCode: '10001',
        country: 'US'
      };

      const errors = validateAddress(invalidUSAddress);
      expect(errors.state).toBe('State is required');
    });

    it('should validate postal code format', () => {
      const invalidPostalCode = {
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        postalCode: 'invalid',
        country: 'US'
      };

      const errors = validateAddress(invalidPostalCode);
      expect(errors.postalCode).toContain('valid');
    });

    it('should require minimum address length', () => {
      const shortAddress = {
        address: '123',
        city: 'NYC',
        state: 'NY',
        postalCode: '10001',
        country: 'US'
      };

      const errors = validateAddress(shortAddress);
      expect(errors.address).toContain('minimum 5 characters');
    });

    it('should require minimum city length', () => {
      const shortCity = {
        address: '123 Main Street',
        city: 'A',
        state: 'NY',
        postalCode: '10001',
        country: 'US'
      };

      const errors = validateAddress(shortCity);
      expect(errors.city).toContain('at least 2 characters');
    });
  });

  describe('Postal Code Validation', () => {
    it('should validate US ZIP codes', () => {
      expect(isValidPostalCode('12345', 'US')).toBe(true);
      expect(isValidPostalCode('12345-6789', 'US')).toBe(true);
      expect(isValidPostalCode('invalid', 'US')).toBe(false);
    });

    it('should validate Canadian postal codes', () => {
      expect(isValidPostalCode('A1A 1A1', 'CA')).toBe(true);
      expect(isValidPostalCode('K1A 0A6', 'CA')).toBe(true);
      expect(isValidPostalCode('12345', 'CA')).toBe(false);
    });

    it('should validate UK postcodes', () => {
      expect(isValidPostalCode('SW1A 1AA', 'GB')).toBe(true);
      expect(isValidPostalCode('M1 1AA', 'GB')).toBe(true);
      expect(isValidPostalCode('12345', 'GB')).toBe(false);
    });

    it('should validate Bulgarian postal codes', () => {
      expect(isValidPostalCode('1000', 'BG')).toBe(true);
      expect(isValidPostalCode('1234', 'BG')).toBe(true);
      expect(isValidPostalCode('12345', 'BG')).toBe(false);
    });
  });

  describe('Country Configuration', () => {
    it('should return correct postal code labels', () => {
      expect(getPostalCodeLabel('US')).toBe('ZIP Code');
      expect(getPostalCodeLabel('CA')).toBe('Postal Code');
      expect(getPostalCodeLabel('GB')).toBe('Postcode');
      expect(getPostalCodeLabel('DE')).toBe('Postleitzahl');
    });

    it('should return correct state requirements', () => {
      expect(isStateRequired('US')).toBe(true);
      expect(isStateRequired('CA')).toBe(true);
      expect(isStateRequired('AU')).toBe(true);
      expect(isStateRequired('GB')).toBe(false);
      expect(isStateRequired('DE')).toBe(false);
    });

    it('should return correct state labels', () => {
      expect(getStateLabel('US')).toBe('State');
      expect(getStateLabel('CA')).toBe('Province');
      expect(getStateLabel('AU')).toBe('State');
      expect(getStateLabel('GB')).toBe('County');
    });
  });

  describe('Address Configuration', () => {
    it('should return correct configuration for US', () => {
      const config = getAddressConfig('US');
      expect(config.postalCodeLabel).toBe('ZIP Code');
      expect(config.stateRequired).toBe(true);
      expect(config.stateLabel).toBe('State');
      expect(config.postalCodePlaceholder).toBe('12345 or 12345-6789');
    });

    it('should return correct configuration for UK', () => {
      const config = getAddressConfig('GB');
      expect(config.postalCodeLabel).toBe('Postcode');
      expect(config.stateRequired).toBe(false);
      expect(config.stateLabel).toBe('County');
      expect(config.postalCodePlaceholder).toBe('SW1A 1AA');
    });
  });
});
