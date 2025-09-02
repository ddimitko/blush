// Comprehensive location data for countries, states, and cities

export interface Country {
  code: string;
  name: string;
  hasStates: boolean;
  stateLabel: string;
  postalCodeLabel: string;
  postalCodePattern?: string;
  postalCodePlaceholder: string;
  currency: string;
  phoneCode: string;
}

export interface State {
  code: string;
  name: string;
  countryCode: string;
}

export interface City {
  name: string;
  stateCode?: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
}

// Countries with comprehensive data
export const COUNTRIES: Country[] = [
  {
    code: 'US',
    name: 'United States',
    hasStates: true,
    stateLabel: 'State',
    postalCodeLabel: 'ZIP Code',
    postalCodePattern: '^[0-9]{5}(-[0-9]{4})?$',
    postalCodePlaceholder: '12345 or 12345-6789',
    currency: 'USD',
    phoneCode: '+1'
  },
  {
    code: 'CA',
    name: 'Canada',
    hasStates: true,
    stateLabel: 'Province',
    postalCodeLabel: 'Postal Code',
    postalCodePattern: '^[A-Za-z][0-9][A-Za-z] [0-9][A-Za-z][0-9]$',
    postalCodePlaceholder: 'A1A 1A1',
    currency: 'CAD',
    phoneCode: '+1'
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    hasStates: false,
    stateLabel: 'County',
    postalCodeLabel: 'Postcode',
    postalCodePattern: '^[A-Za-z]{1,2}[0-9Rr][0-9A-Za-z]? [0-9][ABD-HJLNP-UW-Zabd-hjlnp-uw-z]{2}$',
    postalCodePlaceholder: 'SW1A 1AA',
    currency: 'GBP',
    phoneCode: '+44'
  },
  {
    code: 'BG',
    name: 'Bulgaria',
    hasStates: false,
    stateLabel: 'Region',
    postalCodeLabel: 'Postal Code',
    postalCodePattern: '^[0-9]{4}$',
    postalCodePlaceholder: '1000',
    currency: 'BGN',
    phoneCode: '+359'
  },
  {
    code: 'DE',
    name: 'Germany',
    hasStates: true,
    stateLabel: 'State',
    postalCodeLabel: 'Postleitzahl',
    postalCodePattern: '^[0-9]{5}$',
    postalCodePlaceholder: '10115',
    currency: 'EUR',
    phoneCode: '+49'
  },
  {
    code: 'FR',
    name: 'France',
    hasStates: false,
    stateLabel: 'Region',
    postalCodeLabel: 'Code Postal',
    postalCodePattern: '^[0-9]{5}$',
    postalCodePlaceholder: '75001',
    currency: 'EUR',
    phoneCode: '+33'
  },
  {
    code: 'IT',
    name: 'Italy',
    hasStates: false,
    stateLabel: 'Region',
    postalCodeLabel: 'CAP',
    postalCodePattern: '^[0-9]{5}$',
    postalCodePlaceholder: '00118',
    currency: 'EUR',
    phoneCode: '+39'
  },
  {
    code: 'ES',
    name: 'Spain',
    hasStates: false,
    stateLabel: 'Province',
    postalCodeLabel: 'Código Postal',
    postalCodePattern: '^[0-9]{5}$',
    postalCodePlaceholder: '28001',
    currency: 'EUR',
    phoneCode: '+34'
  },
  {
    code: 'AU',
    name: 'Australia',
    hasStates: true,
    stateLabel: 'State',
    postalCodeLabel: 'Postcode',
    postalCodePattern: '^[0-9]{4}$',
    postalCodePlaceholder: '2000',
    currency: 'AUD',
    phoneCode: '+61'
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    hasStates: false,
    stateLabel: 'Region',
    postalCodeLabel: 'Postcode',
    postalCodePattern: '^[0-9]{4}$',
    postalCodePlaceholder: '1010',
    currency: 'NZD',
    phoneCode: '+64'
  }
];

// US States
export const US_STATES: State[] = [
  { code: 'AL', name: 'Alabama', countryCode: 'US' },
  { code: 'AK', name: 'Alaska', countryCode: 'US' },
  { code: 'AZ', name: 'Arizona', countryCode: 'US' },
  { code: 'AR', name: 'Arkansas', countryCode: 'US' },
  { code: 'CA', name: 'California', countryCode: 'US' },
  { code: 'CO', name: 'Colorado', countryCode: 'US' },
  { code: 'CT', name: 'Connecticut', countryCode: 'US' },
  { code: 'DE', name: 'Delaware', countryCode: 'US' },
  { code: 'FL', name: 'Florida', countryCode: 'US' },
  { code: 'GA', name: 'Georgia', countryCode: 'US' },
  { code: 'HI', name: 'Hawaii', countryCode: 'US' },
  { code: 'ID', name: 'Idaho', countryCode: 'US' },
  { code: 'IL', name: 'Illinois', countryCode: 'US' },
  { code: 'IN', name: 'Indiana', countryCode: 'US' },
  { code: 'IA', name: 'Iowa', countryCode: 'US' },
  { code: 'KS', name: 'Kansas', countryCode: 'US' },
  { code: 'KY', name: 'Kentucky', countryCode: 'US' },
  { code: 'LA', name: 'Louisiana', countryCode: 'US' },
  { code: 'ME', name: 'Maine', countryCode: 'US' },
  { code: 'MD', name: 'Maryland', countryCode: 'US' },
  { code: 'MA', name: 'Massachusetts', countryCode: 'US' },
  { code: 'MI', name: 'Michigan', countryCode: 'US' },
  { code: 'MN', name: 'Minnesota', countryCode: 'US' },
  { code: 'MS', name: 'Mississippi', countryCode: 'US' },
  { code: 'MO', name: 'Missouri', countryCode: 'US' },
  { code: 'MT', name: 'Montana', countryCode: 'US' },
  { code: 'NE', name: 'Nebraska', countryCode: 'US' },
  { code: 'NV', name: 'Nevada', countryCode: 'US' },
  { code: 'NH', name: 'New Hampshire', countryCode: 'US' },
  { code: 'NJ', name: 'New Jersey', countryCode: 'US' },
  { code: 'NM', name: 'New Mexico', countryCode: 'US' },
  { code: 'NY', name: 'New York', countryCode: 'US' },
  { code: 'NC', name: 'North Carolina', countryCode: 'US' },
  { code: 'ND', name: 'North Dakota', countryCode: 'US' },
  { code: 'OH', name: 'Ohio', countryCode: 'US' },
  { code: 'OK', name: 'Oklahoma', countryCode: 'US' },
  { code: 'OR', name: 'Oregon', countryCode: 'US' },
  { code: 'PA', name: 'Pennsylvania', countryCode: 'US' },
  { code: 'RI', name: 'Rhode Island', countryCode: 'US' },
  { code: 'SC', name: 'South Carolina', countryCode: 'US' },
  { code: 'SD', name: 'South Dakota', countryCode: 'US' },
  { code: 'TN', name: 'Tennessee', countryCode: 'US' },
  { code: 'TX', name: 'Texas', countryCode: 'US' },
  { code: 'UT', name: 'Utah', countryCode: 'US' },
  { code: 'VT', name: 'Vermont', countryCode: 'US' },
  { code: 'VA', name: 'Virginia', countryCode: 'US' },
  { code: 'WA', name: 'Washington', countryCode: 'US' },
  { code: 'WV', name: 'West Virginia', countryCode: 'US' },
  { code: 'WI', name: 'Wisconsin', countryCode: 'US' },
  { code: 'WY', name: 'Wyoming', countryCode: 'US' },
  { code: 'DC', name: 'District of Columbia', countryCode: 'US' }
];

// Canadian Provinces
export const CA_PROVINCES: State[] = [
  { code: 'AB', name: 'Alberta', countryCode: 'CA' },
  { code: 'BC', name: 'British Columbia', countryCode: 'CA' },
  { code: 'MB', name: 'Manitoba', countryCode: 'CA' },
  { code: 'NB', name: 'New Brunswick', countryCode: 'CA' },
  { code: 'NL', name: 'Newfoundland and Labrador', countryCode: 'CA' },
  { code: 'NS', name: 'Nova Scotia', countryCode: 'CA' },
  { code: 'ON', name: 'Ontario', countryCode: 'CA' },
  { code: 'PE', name: 'Prince Edward Island', countryCode: 'CA' },
  { code: 'QC', name: 'Quebec', countryCode: 'CA' },
  { code: 'SK', name: 'Saskatchewan', countryCode: 'CA' },
  { code: 'NT', name: 'Northwest Territories', countryCode: 'CA' },
  { code: 'NU', name: 'Nunavut', countryCode: 'CA' },
  { code: 'YT', name: 'Yukon', countryCode: 'CA' }
];

// German States
export const DE_STATES: State[] = [
  { code: 'BW', name: 'Baden-Württemberg', countryCode: 'DE' },
  { code: 'BY', name: 'Bavaria', countryCode: 'DE' },
  { code: 'BE', name: 'Berlin', countryCode: 'DE' },
  { code: 'BB', name: 'Brandenburg', countryCode: 'DE' },
  { code: 'HB', name: 'Bremen', countryCode: 'DE' },
  { code: 'HH', name: 'Hamburg', countryCode: 'DE' },
  { code: 'HE', name: 'Hesse', countryCode: 'DE' },
  { code: 'MV', name: 'Mecklenburg-Vorpommern', countryCode: 'DE' },
  { code: 'NI', name: 'Lower Saxony', countryCode: 'DE' },
  { code: 'NW', name: 'North Rhine-Westphalia', countryCode: 'DE' },
  { code: 'RP', name: 'Rhineland-Palatinate', countryCode: 'DE' },
  { code: 'SL', name: 'Saarland', countryCode: 'DE' },
  { code: 'SN', name: 'Saxony', countryCode: 'DE' },
  { code: 'ST', name: 'Saxony-Anhalt', countryCode: 'DE' },
  { code: 'SH', name: 'Schleswig-Holstein', countryCode: 'DE' },
  { code: 'TH', name: 'Thuringia', countryCode: 'DE' }
];

// Australian States
export const AU_STATES: State[] = [
  { code: 'NSW', name: 'New South Wales', countryCode: 'AU' },
  { code: 'VIC', name: 'Victoria', countryCode: 'AU' },
  { code: 'QLD', name: 'Queensland', countryCode: 'AU' },
  { code: 'WA', name: 'Western Australia', countryCode: 'AU' },
  { code: 'SA', name: 'South Australia', countryCode: 'AU' },
  { code: 'TAS', name: 'Tasmania', countryCode: 'AU' },
  { code: 'ACT', name: 'Australian Capital Territory', countryCode: 'AU' },
  { code: 'NT', name: 'Northern Territory', countryCode: 'AU' }
];

// All states combined
export const ALL_STATES: State[] = [
  ...US_STATES,
  ...CA_PROVINCES,
  ...DE_STATES,
  ...AU_STATES
];

// Major cities with coordinates for popular locations
export const MAJOR_CITIES: City[] = [
  // US Cities
  { name: 'New York', stateCode: 'NY', countryCode: 'US', latitude: 40.7128, longitude: -74.0060 },
  { name: 'Los Angeles', stateCode: 'CA', countryCode: 'US', latitude: 34.0522, longitude: -118.2437 },
  { name: 'Chicago', stateCode: 'IL', countryCode: 'US', latitude: 41.8781, longitude: -87.6298 },
  { name: 'Houston', stateCode: 'TX', countryCode: 'US', latitude: 29.7604, longitude: -95.3698 },
  { name: 'Phoenix', stateCode: 'AZ', countryCode: 'US', latitude: 33.4484, longitude: -112.0740 },
  { name: 'Philadelphia', stateCode: 'PA', countryCode: 'US', latitude: 39.9526, longitude: -75.1652 },
  { name: 'San Antonio', stateCode: 'TX', countryCode: 'US', latitude: 29.4241, longitude: -98.4936 },
  { name: 'San Diego', stateCode: 'CA', countryCode: 'US', latitude: 32.7157, longitude: -117.1611 },
  { name: 'Dallas', stateCode: 'TX', countryCode: 'US', latitude: 32.7767, longitude: -96.7970 },
  { name: 'San Jose', stateCode: 'CA', countryCode: 'US', latitude: 37.3382, longitude: -121.8863 },
  { name: 'Austin', stateCode: 'TX', countryCode: 'US', latitude: 30.2672, longitude: -97.7431 },
  { name: 'Jacksonville', stateCode: 'FL', countryCode: 'US', latitude: 30.3322, longitude: -81.6557 },
  { name: 'San Francisco', stateCode: 'CA', countryCode: 'US', latitude: 37.7749, longitude: -122.4194 },
  { name: 'Columbus', stateCode: 'OH', countryCode: 'US', latitude: 39.9612, longitude: -82.9988 },
  { name: 'Fort Worth', stateCode: 'TX', countryCode: 'US', latitude: 32.7555, longitude: -97.3308 },
  { name: 'Indianapolis', stateCode: 'IN', countryCode: 'US', latitude: 39.7684, longitude: -86.1581 },
  { name: 'Charlotte', stateCode: 'NC', countryCode: 'US', latitude: 35.2271, longitude: -80.8431 },
  { name: 'Seattle', stateCode: 'WA', countryCode: 'US', latitude: 47.6062, longitude: -122.3321 },
  { name: 'Denver', stateCode: 'CO', countryCode: 'US', latitude: 39.7392, longitude: -104.9903 },
  { name: 'Washington', stateCode: 'DC', countryCode: 'US', latitude: 38.9072, longitude: -77.0369 },
  { name: 'Boston', stateCode: 'MA', countryCode: 'US', latitude: 42.3601, longitude: -71.0589 },
  { name: 'El Paso', stateCode: 'TX', countryCode: 'US', latitude: 31.7619, longitude: -106.4850 },
  { name: 'Detroit', stateCode: 'MI', countryCode: 'US', latitude: 42.3314, longitude: -83.0458 },
  { name: 'Nashville', stateCode: 'TN', countryCode: 'US', latitude: 36.1627, longitude: -86.7816 },
  { name: 'Portland', stateCode: 'OR', countryCode: 'US', latitude: 45.5152, longitude: -122.6784 },
  { name: 'Memphis', stateCode: 'TN', countryCode: 'US', latitude: 35.1495, longitude: -90.0490 },
  { name: 'Oklahoma City', stateCode: 'OK', countryCode: 'US', latitude: 35.4676, longitude: -97.5164 },
  { name: 'Las Vegas', stateCode: 'NV', countryCode: 'US', latitude: 36.1699, longitude: -115.1398 },
  { name: 'Louisville', stateCode: 'KY', countryCode: 'US', latitude: 38.2527, longitude: -85.7585 },
  { name: 'Baltimore', stateCode: 'MD', countryCode: 'US', latitude: 39.2904, longitude: -76.6122 },
  { name: 'Milwaukee', stateCode: 'WI', countryCode: 'US', latitude: 43.0389, longitude: -87.9065 },
  { name: 'Albuquerque', stateCode: 'NM', countryCode: 'US', latitude: 35.0844, longitude: -106.6504 },
  { name: 'Tucson', stateCode: 'AZ', countryCode: 'US', latitude: 32.2226, longitude: -110.9747 },
  { name: 'Fresno', stateCode: 'CA', countryCode: 'US', latitude: 36.7378, longitude: -119.7871 },
  { name: 'Sacramento', stateCode: 'CA', countryCode: 'US', latitude: 38.5816, longitude: -121.4944 },
  { name: 'Mesa', stateCode: 'AZ', countryCode: 'US', latitude: 33.4152, longitude: -111.8315 },
  { name: 'Kansas City', stateCode: 'MO', countryCode: 'US', latitude: 39.0997, longitude: -94.5786 },
  { name: 'Atlanta', stateCode: 'GA', countryCode: 'US', latitude: 33.7490, longitude: -84.3880 },
  { name: 'Long Beach', stateCode: 'CA', countryCode: 'US', latitude: 33.7701, longitude: -118.1937 },
  { name: 'Colorado Springs', stateCode: 'CO', countryCode: 'US', latitude: 38.8339, longitude: -104.8214 },
  { name: 'Raleigh', stateCode: 'NC', countryCode: 'US', latitude: 35.7796, longitude: -78.6382 },
  { name: 'Miami', stateCode: 'FL', countryCode: 'US', latitude: 25.7617, longitude: -80.1918 },
  { name: 'Virginia Beach', stateCode: 'VA', countryCode: 'US', latitude: 36.8529, longitude: -75.9780 },
  { name: 'Omaha', stateCode: 'NE', countryCode: 'US', latitude: 41.2565, longitude: -95.9345 },
  { name: 'Oakland', stateCode: 'CA', countryCode: 'US', latitude: 37.8044, longitude: -122.2711 },
  { name: 'Minneapolis', stateCode: 'MN', countryCode: 'US', latitude: 44.9778, longitude: -93.2650 },
  { name: 'Tulsa', stateCode: 'OK', countryCode: 'US', latitude: 36.1540, longitude: -95.9928 },
  { name: 'Arlington', stateCode: 'TX', countryCode: 'US', latitude: 32.7357, longitude: -97.1081 },
  { name: 'New Orleans', stateCode: 'LA', countryCode: 'US', latitude: 29.9511, longitude: -90.0715 },
  { name: 'Wichita', stateCode: 'KS', countryCode: 'US', latitude: 37.6872, longitude: -97.3301 },
  { name: 'Cleveland', stateCode: 'OH', countryCode: 'US', latitude: 41.4993, longitude: -81.6944 },

  // Canadian Cities
  { name: 'Toronto', stateCode: 'ON', countryCode: 'CA', latitude: 43.6532, longitude: -79.3832 },
  { name: 'Montreal', stateCode: 'QC', countryCode: 'CA', latitude: 45.5017, longitude: -73.5673 },
  { name: 'Vancouver', stateCode: 'BC', countryCode: 'CA', latitude: 49.2827, longitude: -123.1207 },
  { name: 'Calgary', stateCode: 'AB', countryCode: 'CA', latitude: 51.0447, longitude: -114.0719 },
  { name: 'Edmonton', stateCode: 'AB', countryCode: 'CA', latitude: 53.5461, longitude: -113.4938 },
  { name: 'Ottawa', stateCode: 'ON', countryCode: 'CA', latitude: 45.4215, longitude: -75.6972 },
  { name: 'Winnipeg', stateCode: 'MB', countryCode: 'CA', latitude: 49.8951, longitude: -97.1384 },
  { name: 'Quebec City', stateCode: 'QC', countryCode: 'CA', latitude: 46.8139, longitude: -71.2080 },
  { name: 'Hamilton', stateCode: 'ON', countryCode: 'CA', latitude: 43.2557, longitude: -79.8711 },
  { name: 'Kitchener', stateCode: 'ON', countryCode: 'CA', latitude: 43.4516, longitude: -80.4925 },

  // UK Cities
  { name: 'London', countryCode: 'GB', latitude: 51.5074, longitude: -0.1278 },
  { name: 'Birmingham', countryCode: 'GB', latitude: 52.4862, longitude: -1.8904 },
  { name: 'Manchester', countryCode: 'GB', latitude: 53.4808, longitude: -2.2426 },
  { name: 'Glasgow', countryCode: 'GB', latitude: 55.8642, longitude: -4.2518 },
  { name: 'Liverpool', countryCode: 'GB', latitude: 53.4084, longitude: -2.9916 },
  { name: 'Edinburgh', countryCode: 'GB', latitude: 55.9533, longitude: -3.1883 },
  { name: 'Leeds', countryCode: 'GB', latitude: 53.8008, longitude: -1.5491 },
  { name: 'Sheffield', countryCode: 'GB', latitude: 53.3811, longitude: -1.4701 },
  { name: 'Bristol', countryCode: 'GB', latitude: 51.4545, longitude: -2.5879 },
  { name: 'Cardiff', countryCode: 'GB', latitude: 51.4816, longitude: -3.1791 },

  // Bulgarian Cities
  { name: 'Sofia', countryCode: 'BG', latitude: 42.6977, longitude: 23.3219 },
  { name: 'Plovdiv', countryCode: 'BG', latitude: 42.1354, longitude: 24.7453 },
  { name: 'Varna', countryCode: 'BG', latitude: 43.2141, longitude: 27.9147 },
  { name: 'Burgas', countryCode: 'BG', latitude: 42.5048, longitude: 27.4626 },
  { name: 'Ruse', countryCode: 'BG', latitude: 43.8564, longitude: 25.9656 },
  { name: 'Stara Zagora', countryCode: 'BG', latitude: 42.4258, longitude: 25.6342 },
  { name: 'Pleven', countryCode: 'BG', latitude: 43.4170, longitude: 24.6067 },
  { name: 'Sliven', countryCode: 'BG', latitude: 42.6859, longitude: 26.3150 },

  // German Cities
  { name: 'Berlin', stateCode: 'BE', countryCode: 'DE', latitude: 52.5200, longitude: 13.4050 },
  { name: 'Hamburg', stateCode: 'HH', countryCode: 'DE', latitude: 53.5511, longitude: 9.9937 },
  { name: 'Munich', stateCode: 'BY', countryCode: 'DE', latitude: 48.1351, longitude: 11.5820 },
  { name: 'Cologne', stateCode: 'NW', countryCode: 'DE', latitude: 50.9375, longitude: 6.9603 },
  { name: 'Frankfurt', stateCode: 'HE', countryCode: 'DE', latitude: 50.1109, longitude: 8.6821 },
  { name: 'Stuttgart', stateCode: 'BW', countryCode: 'DE', latitude: 48.7758, longitude: 9.1829 },
  { name: 'Düsseldorf', stateCode: 'NW', countryCode: 'DE', latitude: 51.2277, longitude: 6.7735 },
  { name: 'Dortmund', stateCode: 'NW', countryCode: 'DE', latitude: 51.5136, longitude: 7.4653 },
  { name: 'Essen', stateCode: 'NW', countryCode: 'DE', latitude: 51.4556, longitude: 7.0116 },
  { name: 'Leipzig', stateCode: 'SN', countryCode: 'DE', latitude: 51.3397, longitude: 12.3731 },

  // French Cities
  { name: 'Paris', countryCode: 'FR', latitude: 48.8566, longitude: 2.3522 },
  { name: 'Marseille', countryCode: 'FR', latitude: 43.2965, longitude: 5.3698 },
  { name: 'Lyon', countryCode: 'FR', latitude: 45.7640, longitude: 4.8357 },
  { name: 'Toulouse', countryCode: 'FR', latitude: 43.6047, longitude: 1.4442 },
  { name: 'Nice', countryCode: 'FR', latitude: 43.7102, longitude: 7.2620 },
  { name: 'Nantes', countryCode: 'FR', latitude: 47.2184, longitude: -1.5536 },
  { name: 'Strasbourg', countryCode: 'FR', latitude: 48.5734, longitude: 7.7521 },
  { name: 'Montpellier', countryCode: 'FR', latitude: 43.6110, longitude: 3.8767 },
  { name: 'Bordeaux', countryCode: 'FR', latitude: 44.8378, longitude: -0.5792 },
  { name: 'Lille', countryCode: 'FR', latitude: 50.6292, longitude: 3.0573 },

  // Italian Cities
  { name: 'Rome', countryCode: 'IT', latitude: 41.9028, longitude: 12.4964 },
  { name: 'Milan', countryCode: 'IT', latitude: 45.4642, longitude: 9.1900 },
  { name: 'Naples', countryCode: 'IT', latitude: 40.8518, longitude: 14.2681 },
  { name: 'Turin', countryCode: 'IT', latitude: 45.0703, longitude: 7.6869 },
  { name: 'Palermo', countryCode: 'IT', latitude: 38.1157, longitude: 13.3615 },
  { name: 'Genoa', countryCode: 'IT', latitude: 44.4056, longitude: 8.9463 },
  { name: 'Bologna', countryCode: 'IT', latitude: 44.4949, longitude: 11.3426 },
  { name: 'Florence', countryCode: 'IT', latitude: 43.7696, longitude: 11.2558 },
  { name: 'Bari', countryCode: 'IT', latitude: 41.1171, longitude: 16.8719 },
  { name: 'Catania', countryCode: 'IT', latitude: 37.5079, longitude: 15.0830 },

  // Spanish Cities
  { name: 'Madrid', countryCode: 'ES', latitude: 40.4168, longitude: -3.7038 },
  { name: 'Barcelona', countryCode: 'ES', latitude: 41.3851, longitude: 2.1734 },
  { name: 'Valencia', countryCode: 'ES', latitude: 39.4699, longitude: -0.3763 },
  { name: 'Seville', countryCode: 'ES', latitude: 37.3891, longitude: -5.9845 },
  { name: 'Zaragoza', countryCode: 'ES', latitude: 41.6488, longitude: -0.8891 },
  { name: 'Málaga', countryCode: 'ES', latitude: 36.7213, longitude: -4.4214 },
  { name: 'Murcia', countryCode: 'ES', latitude: 37.9922, longitude: -1.1307 },
  { name: 'Palma', countryCode: 'ES', latitude: 39.5696, longitude: 2.6502 },
  { name: 'Las Palmas', countryCode: 'ES', latitude: 28.1248, longitude: -15.4300 },
  { name: 'Bilbao', countryCode: 'ES', latitude: 43.2627, longitude: -2.9253 },

  // Australian Cities
  { name: 'Sydney', stateCode: 'NSW', countryCode: 'AU', latitude: -33.8688, longitude: 151.2093 },
  { name: 'Melbourne', stateCode: 'VIC', countryCode: 'AU', latitude: -37.8136, longitude: 144.9631 },
  { name: 'Brisbane', stateCode: 'QLD', countryCode: 'AU', latitude: -27.4698, longitude: 153.0251 },
  { name: 'Perth', stateCode: 'WA', countryCode: 'AU', latitude: -31.9505, longitude: 115.8605 },
  { name: 'Adelaide', stateCode: 'SA', countryCode: 'AU', latitude: -34.9285, longitude: 138.6007 },
  { name: 'Gold Coast', stateCode: 'QLD', countryCode: 'AU', latitude: -28.0167, longitude: 153.4000 },
  { name: 'Newcastle', stateCode: 'NSW', countryCode: 'AU', latitude: -32.9283, longitude: 151.7817 },
  { name: 'Canberra', stateCode: 'ACT', countryCode: 'AU', latitude: -35.2809, longitude: 149.1300 },
  { name: 'Sunshine Coast', stateCode: 'QLD', countryCode: 'AU', latitude: -26.6500, longitude: 153.0667 },
  { name: 'Wollongong', stateCode: 'NSW', countryCode: 'AU', latitude: -34.4278, longitude: 150.8931 },

  // New Zealand Cities
  { name: 'Auckland', countryCode: 'NZ', latitude: -36.8485, longitude: 174.7633 },
  { name: 'Wellington', countryCode: 'NZ', latitude: -41.2865, longitude: 174.7762 },
  { name: 'Christchurch', countryCode: 'NZ', latitude: -43.5321, longitude: 172.6362 },
  { name: 'Hamilton', countryCode: 'NZ', latitude: -37.7870, longitude: 175.2793 },
  { name: 'Tauranga', countryCode: 'NZ', latitude: -37.6878, longitude: 176.1651 },
  { name: 'Napier', countryCode: 'NZ', latitude: -39.4928, longitude: 176.9120 },
  { name: 'Dunedin', countryCode: 'NZ', latitude: -45.8788, longitude: 170.5028 },
  { name: 'Palmerston North', countryCode: 'NZ', latitude: -40.3523, longitude: 175.6082 },
  { name: 'Nelson', countryCode: 'NZ', latitude: -41.2706, longitude: 173.2840 },
  { name: 'Rotorua', countryCode: 'NZ', latitude: -38.1368, longitude: 176.2497 }
];

// Utility functions
export const getCountryByCode = (code: string): Country | undefined => {
  return COUNTRIES.find(country => country.code === code);
};

export const getStatesByCountry = (countryCode: string): State[] => {
  return ALL_STATES.filter(state => state.countryCode === countryCode);
};

export const getCitiesByCountry = (countryCode: string): City[] => {
  return MAJOR_CITIES.filter(city => city.countryCode === countryCode);
};

export const getCitiesByState = (countryCode: string, stateCode: string): City[] => {
  return MAJOR_CITIES.filter(city =>
    city.countryCode === countryCode && city.stateCode === stateCode
  );
};

export const searchCities = (query: string, countryCode?: string, stateCode?: string): City[] => {
  let cities = MAJOR_CITIES;

  if (countryCode) {
    cities = cities.filter(city => city.countryCode === countryCode);
  }

  if (stateCode) {
    cities = cities.filter(city => city.stateCode === stateCode);
  }

  if (!query.trim()) {
    return cities.slice(0, 20); // Return first 20 cities if no query
  }

  const searchTerm = query.toLowerCase().trim();
  return cities
    .filter(city => city.name.toLowerCase().includes(searchTerm))
    .sort((a, b) => {
      // Prioritize exact matches and cities that start with the search term
      const aStartsWith = a.name.toLowerCase().startsWith(searchTerm);
      const bStartsWith = b.name.toLowerCase().startsWith(searchTerm);

      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      return a.name.localeCompare(b.name);
    })
    .slice(0, 20); // Limit to 20 results
};

export const getCityCoordinates = (cityName: string, countryCode: string, stateCode?: string): { latitude: number; longitude: number } | null => {
  const city = MAJOR_CITIES.find(city =>
    city.name.toLowerCase() === cityName.toLowerCase() &&
    city.countryCode === countryCode &&
    (!stateCode || city.stateCode === stateCode)
  );

  if (city && city.latitude && city.longitude) {
    return { latitude: city.latitude, longitude: city.longitude };
  }

  return null;
};

export const validatePostalCode = (postalCode: string, countryCode: string): boolean => {
  const country = getCountryByCode(countryCode);
  if (!country || !country.postalCodePattern) {
    return true; // If no pattern defined, consider valid
  }

  const regex = new RegExp(country.postalCodePattern);
  return regex.test(postalCode);
};

export const formatAddress = (
  address: string,
  city: string,
  state: string,
  postalCode: string,
  countryCode: string
): string => {
  const country = getCountryByCode(countryCode);
  const parts: string[] = [];

  if (address.trim()) parts.push(address.trim());
  if (city.trim()) parts.push(city.trim());

  if (state.trim() && country?.hasStates) {
    parts.push(state.trim());
  }

  if (postalCode.trim()) parts.push(postalCode.trim());
  if (country) parts.push(country.name);

  return parts.join(', ');
};

// Enhanced geocoding function that uses city coordinates as fallback
export const geocodeAddressWithFallback = async (
  address: string,
  city: string,
  state: string,
  countryCode: string
): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    // First try to geocode the full address
    const fullAddress = formatAddress(address, city, state, '', countryCode);

    // Try using the existing geocoding service
    const { geocodeAddress } = await import('./geolocation');
    const result = await geocodeAddress(fullAddress);

    if (result.latitude && result.longitude) {
      return { latitude: result.latitude, longitude: result.longitude };
    }
  } catch (error) {
    console.warn('Primary geocoding failed, trying fallback:', error);
  }

  // Fallback to city coordinates
  const cityCoords = getCityCoordinates(city, countryCode, state);
  if (cityCoords) {
    return cityCoords;
  }

  // Final fallback to country center (approximate)
  const countryDefaults: Record<string, { latitude: number; longitude: number }> = {
    'US': { latitude: 39.8283, longitude: -98.5795 },
    'CA': { latitude: 56.1304, longitude: -106.3468 },
    'GB': { latitude: 55.3781, longitude: -3.4360 },
    'BG': { latitude: 42.7339, longitude: 25.4858 },
    'DE': { latitude: 51.1657, longitude: 10.4515 },
    'FR': { latitude: 46.2276, longitude: 2.2137 },
    'IT': { latitude: 41.8719, longitude: 12.5674 },
    'ES': { latitude: 40.4637, longitude: -3.7492 },
    'AU': { latitude: -25.2744, longitude: 133.7751 },
    'NZ': { latitude: -40.9006, longitude: 174.8860 }
  };

  return countryDefaults[countryCode] || null;
};
