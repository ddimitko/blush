// Country configuration for payment methods and currencies
export interface CountryConfig {
  currency: string;
  paymentMethods: string[];
  locale: string;
}

// Comprehensive country mapping that supports both country codes and full names
const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  // Country codes (ISO 3166-1 alpha-2)
  'BG': {
    currency: 'bgn',
    paymentMethods: ['card'], // Only use card payments for BGN in Bulgaria
    locale: 'bg'
  },
  'US': {
    currency: 'usd',
    paymentMethods: ['card', 'us_bank_account'],
    locale: 'en'
  },
  'CA': {
    currency: 'cad',
    paymentMethods: ['card'],
    locale: 'en-CA'
  },
  'GB': {
    currency: 'gbp',
    paymentMethods: ['card', 'bacs_debit'],
    locale: 'en-GB'
  },
  'DE': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'en'
  },
  'FR': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'en'
  },
  'IT': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'it'
  },
  'ES': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'es'
  },
  'NL': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'nl'
  },
  'BE': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'nl-BE'
  },
  'AT': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'de-AT'
  },
  'PT': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'pt'
  },
  'IE': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'en-IE'
  },
  'FI': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'fi'
  },
  'GR': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'el'
  },
  'LU': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'en'
  },
  'SI': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'sl'
  },
  'SK': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'sk'
  },
  'EE': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'et'
  },
  'LV': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'lv'
  },
  'LT': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'lt'
  },
  'MT': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'mt'
  },
  'CY': {
    currency: 'eur',
    paymentMethods: ['card', 'bancontact', 'eps', 'giropay', 'ideal', 'p24', 'sofort'],
    locale: 'el-CY'
  },
  'AU': {
    currency: 'aud',
    paymentMethods: ['card'],
    locale: 'en-AU'
  },
  'NZ': {
    currency: 'nzd',
    paymentMethods: ['card'],
    locale: 'en-NZ'
  },
  'JP': {
    currency: 'jpy',
    paymentMethods: ['card'],
    locale: 'ja'
  },
  'CH': {
    currency: 'chf',
    paymentMethods: ['card'],
    locale: 'de-CH'
  },
  'SE': {
    currency: 'sek',
    paymentMethods: ['card'],
    locale: 'sv'
  },
  'NO': {
    currency: 'nok',
    paymentMethods: ['card'],
    locale: 'nb'
  },
  'DK': {
    currency: 'dkk',
    paymentMethods: ['card'],
    locale: 'da'
  },
  'PL': {
    currency: 'pln',
    paymentMethods: ['card', 'p24'],
    locale: 'pl'
  },
  'CZ': {
    currency: 'czk',
    paymentMethods: ['card'],
    locale: 'cs'
  },
  'HU': {
    currency: 'huf',
    paymentMethods: ['card'],
    locale: 'hu'
  },
  'RO': {
    currency: 'ron',
    paymentMethods: ['card'],
    locale: 'ro'
  },
  'HR': {
    currency: 'hrk',
    paymentMethods: ['card'],
    locale: 'hr'
  },
  'RS': {
    currency: 'rsd',
    paymentMethods: ['card'],
    locale: 'sr'
  },
  'TR': {
    currency: 'try',
    paymentMethods: ['card'],
    locale: 'tr'
  },
  'RU': {
    currency: 'rub',
    paymentMethods: ['card'],
    locale: 'ru'
  },
  'UA': {
    currency: 'uah',
    paymentMethods: ['card'],
    locale: 'uk'
  },
  'IN': {
    currency: 'inr',
    paymentMethods: ['card'],
    locale: 'en-IN'
  },
  'CN': {
    currency: 'cny',
    paymentMethods: ['card'],
    locale: 'zh'
  },
  'KR': {
    currency: 'krw',
    paymentMethods: ['card'],
    locale: 'ko'
  },
  'SG': {
    currency: 'sgd',
    paymentMethods: ['card'],
    locale: 'en-SG'
  },
  'HK': {
    currency: 'hkd',
    paymentMethods: ['card'],
    locale: 'en-HK'
  },
  'MY': {
    currency: 'myr',
    paymentMethods: ['card'],
    locale: 'en-MY'
  },
  'TH': {
    currency: 'thb',
    paymentMethods: ['card'],
    locale: 'th'
  },
  'PH': {
    currency: 'php',
    paymentMethods: ['card'],
    locale: 'en-PH'
  },
  'ID': {
    currency: 'idr',
    paymentMethods: ['card'],
    locale: 'id'
  },
  'VN': {
    currency: 'vnd',
    paymentMethods: ['card'],
    locale: 'vi'
  },
  'BR': {
    currency: 'brl',
    paymentMethods: ['card'],
    locale: 'pt-BR'
  },
  'MX': {
    currency: 'mxn',
    paymentMethods: ['card'],
    locale: 'es-MX'
  },
  'AR': {
    currency: 'ars',
    paymentMethods: ['card'],
    locale: 'es-AR'
  },
  'CL': {
    currency: 'clp',
    paymentMethods: ['card'],
    locale: 'es-CL'
  },
  'CO': {
    currency: 'cop',
    paymentMethods: ['card'],
    locale: 'es-CO'
  },
  'PE': {
    currency: 'pen',
    paymentMethods: ['card'],
    locale: 'es-PE'
  },
  'ZA': {
    currency: 'zar',
    paymentMethods: ['card'],
    locale: 'en-ZA'
  },
  'EG': {
    currency: 'egp',
    paymentMethods: ['card'],
    locale: 'ar-EG'
  },
  'IL': {
    currency: 'ils',
    paymentMethods: ['card'],
    locale: 'he'
  },
  'SA': {
    currency: 'sar',
    paymentMethods: ['card'],
    locale: 'ar-SA'
  },
  'AE': {
    currency: 'aed',
    paymentMethods: ['card'],
    locale: 'ar-AE'
  },
  'KW': {
    currency: 'kwd',
    paymentMethods: ['card'],
    locale: 'ar-KW'
  },
  'QA': {
    currency: 'qar',
    paymentMethods: ['card'],
    locale: 'ar-QA'
  },
  // Additional European countries
  'MK': {
    currency: 'mkd',
    paymentMethods: ['card'],
    locale: 'mk'
  },
  'AL': {
    currency: 'all',
    paymentMethods: ['card'],
    locale: 'sq'
  },
  'BA': {
    currency: 'bam',
    paymentMethods: ['card'],
    locale: 'bs'
  },
  'ME': {
    currency: 'eur',
    paymentMethods: ['card'],
    locale: 'sr-ME'
  },
  'XK': {
    currency: 'eur',
    paymentMethods: ['card'],
    locale: 'sq-XK'
  },
  'MD': {
    currency: 'mdl',
    paymentMethods: ['card'],
    locale: 'ro-MD'
  },
  'BY': {
    currency: 'byn',
    paymentMethods: ['card'],
    locale: 'be'
  },
  'IS': {
    currency: 'isk',
    paymentMethods: ['card'],
    locale: 'is'
  },
  // Additional Asian countries
  'BD': {
    currency: 'bdt',
    paymentMethods: ['card'],
    locale: 'bn'
  },
  'LK': {
    currency: 'lkr',
    paymentMethods: ['card'],
    locale: 'si'
  },
  'NP': {
    currency: 'npr',
    paymentMethods: ['card'],
    locale: 'ne'
  },
  'MM': {
    currency: 'mmk',
    paymentMethods: ['card'],
    locale: 'my'
  },
  'KH': {
    currency: 'khr',
    paymentMethods: ['card'],
    locale: 'km'
  },
  'LA': {
    currency: 'lak',
    paymentMethods: ['card'],
    locale: 'lo'
  },
  'MN': {
    currency: 'mnt',
    paymentMethods: ['card'],
    locale: 'mn'
  },
  'KZ': {
    currency: 'kzt',
    paymentMethods: ['card'],
    locale: 'kk'
  },
  'UZ': {
    currency: 'uzs',
    paymentMethods: ['card'],
    locale: 'uz'
  },
  'KG': {
    currency: 'kgs',
    paymentMethods: ['card'],
    locale: 'ky'
  },
  'TJ': {
    currency: 'tjs',
    paymentMethods: ['card'],
    locale: 'tg'
  },
  'TM': {
    currency: 'tmt',
    paymentMethods: ['card'],
    locale: 'tk'
  },
  'AF': {
    currency: 'afn',
    paymentMethods: ['card'],
    locale: 'fa-AF'
  },
  'PK': {
    currency: 'pkr',
    paymentMethods: ['card'],
    locale: 'ur'
  },
  'IR': {
    currency: 'irr',
    paymentMethods: ['card'],
    locale: 'fa'
  },
  'IQ': {
    currency: 'iqd',
    paymentMethods: ['card'],
    locale: 'ar-IQ'
  },
  'SY': {
    currency: 'syp',
    paymentMethods: ['card'],
    locale: 'ar-SY'
  },
  'LB': {
    currency: 'lbp',
    paymentMethods: ['card'],
    locale: 'ar-LB'
  },
  'JO': {
    currency: 'jod',
    paymentMethods: ['card'],
    locale: 'ar-JO'
  },
  'YE': {
    currency: 'yer',
    paymentMethods: ['card'],
    locale: 'ar-YE'
  },
  'OM': {
    currency: 'omr',
    paymentMethods: ['card'],
    locale: 'ar-OM'
  },
  'BH': {
    currency: 'bhd',
    paymentMethods: ['card'],
    locale: 'ar-BH'
  },
  // Additional African countries
  'MA': {
    currency: 'mad',
    paymentMethods: ['card'],
    locale: 'ar-MA'
  },
  'TN': {
    currency: 'tnd',
    paymentMethods: ['card'],
    locale: 'ar-TN'
  },
  'DZ': {
    currency: 'dzd',
    paymentMethods: ['card'],
    locale: 'ar-DZ'
  },
  'LY': {
    currency: 'lyd',
    paymentMethods: ['card'],
    locale: 'ar-LY'
  },
  'SD': {
    currency: 'sdg',
    paymentMethods: ['card'],
    locale: 'ar-SD'
  },
  'ET': {
    currency: 'etb',
    paymentMethods: ['card'],
    locale: 'am'
  },
  'KE': {
    currency: 'kes',
    paymentMethods: ['card'],
    locale: 'en-KE'
  },
  'UG': {
    currency: 'ugx',
    paymentMethods: ['card'],
    locale: 'en-UG'
  },
  'TZ': {
    currency: 'tzs',
    paymentMethods: ['card'],
    locale: 'sw'
  },
  'RW': {
    currency: 'rwf',
    paymentMethods: ['card'],
    locale: 'rw'
  },
  'GH': {
    currency: 'ghs',
    paymentMethods: ['card'],
    locale: 'en-GH'
  },
  'NG': {
    currency: 'ngn',
    paymentMethods: ['card'],
    locale: 'en-NG'
  },
  'SN': {
    currency: 'xof',
    paymentMethods: ['card'],
    locale: 'en'
  },
  'CI': {
    currency: 'xof',
    paymentMethods: ['card'],
    locale: 'en'
  },
  'ML': {
    currency: 'xof',
    paymentMethods: ['card'],
    locale: 'en'
  },
  'BF': {
    currency: 'xof',
    paymentMethods: ['card'],
    locale: 'en'
  },
  'NE': {
    currency: 'xof',
    paymentMethods: ['card'],
    locale: 'en'
  },
  'TD': {
    currency: 'xaf',
    paymentMethods: ['card'],
    locale: 'en'
  },
  'CM': {
    currency: 'xaf',
    paymentMethods: ['card'],
    locale: 'en'
  },
  'CF': {
    currency: 'xaf',
    paymentMethods: ['card'],
    locale: 'en'
  },
  'GA': {
    currency: 'xaf',
    paymentMethods: ['card'],
    locale: 'en'
  },
  'CG': {
    currency: 'xaf',
    paymentMethods: ['card'],
    locale: 'en'
  },
  'CD': {
    currency: 'cdf',
    paymentMethods: ['card'],
    locale: 'en'
  },
  'AO': {
    currency: 'aoa',
    paymentMethods: ['card'],
    locale: 'pt-AO'
  },
  'MZ': {
    currency: 'mzn',
    paymentMethods: ['card'],
    locale: 'pt-MZ'
  },
  'ZW': {
    currency: 'zwl',
    paymentMethods: ['card'],
    locale: 'en-ZW'
  },
  'BW': {
    currency: 'bwp',
    paymentMethods: ['card'],
    locale: 'en-BW'
  },
  'NA': {
    currency: 'nad',
    paymentMethods: ['card'],
    locale: 'en-NA'
  },
  'SZ': {
    currency: 'szl',
    paymentMethods: ['card'],
    locale: 'en-SZ'
  },
  'LS': {
    currency: 'lsl',
    paymentMethods: ['card'],
    locale: 'en-LS'
  },
  'MW': {
    currency: 'mwk',
    paymentMethods: ['card'],
    locale: 'en-MW'
  },
  'ZM': {
    currency: 'zmw',
    paymentMethods: ['card'],
    locale: 'en-ZM'
  },
  'MG': {
    currency: 'mga',
    paymentMethods: ['card'],
    locale: 'mg'
  },
  'MU': {
    currency: 'mur',
    paymentMethods: ['card'],
    locale: 'en-MU'
  },
  'SC': {
    currency: 'scr',
    paymentMethods: ['card'],
    locale: 'en-SC'
  },
  // Additional Latin American countries
  'UY': {
    currency: 'uyu',
    paymentMethods: ['card'],
    locale: 'es-UY'
  },
  'PY': {
    currency: 'pyg',
    paymentMethods: ['card'],
    locale: 'es-PY'
  },
  'BO': {
    currency: 'bob',
    paymentMethods: ['card'],
    locale: 'es-BO'
  },
  'EC': {
    currency: 'usd',
    paymentMethods: ['card'],
    locale: 'es-EC'
  },
  'VE': {
    currency: 'ves',
    paymentMethods: ['card'],
    locale: 'es-VE'
  },
  'GY': {
    currency: 'gyd',
    paymentMethods: ['card'],
    locale: 'en-GY'
  },
  'SR': {
    currency: 'srd',
    paymentMethods: ['card'],
    locale: 'nl-SR'
  },
  'GF': {
    currency: 'eur',
    paymentMethods: ['card'],
    locale: 'en'
  },
  'FK': {
    currency: 'fkp',
    paymentMethods: ['card'],
    locale: 'en-FK'
  },
  // Caribbean countries
  'JM': {
    currency: 'jmd',
    paymentMethods: ['card'],
    locale: 'en-JM'
  },
  'CU': {
    currency: 'cup',
    paymentMethods: ['card'],
    locale: 'es-CU'
  },
  'DO': {
    currency: 'dop',
    paymentMethods: ['card'],
    locale: 'es-DO'
  },
  'HT': {
    currency: 'htg',
    paymentMethods: ['card'],
    locale: 'ht'
  },
  'TT': {
    currency: 'ttd',
    paymentMethods: ['card'],
    locale: 'en-TT'
  },
  'BB': {
    currency: 'bbd',
    paymentMethods: ['card'],
    locale: 'en-BB'
  },
  'BS': {
    currency: 'bsd',
    paymentMethods: ['card'],
    locale: 'en-BS'
  },
  'BZ': {
    currency: 'bzd',
    paymentMethods: ['card'],
    locale: 'en-BZ'
  },
  'GT': {
    currency: 'gtq',
    paymentMethods: ['card'],
    locale: 'es-GT'
  },
  'HN': {
    currency: 'hnl',
    paymentMethods: ['card'],
    locale: 'es-HN'
  },
  'SV': {
    currency: 'usd',
    paymentMethods: ['card'],
    locale: 'es-SV'
  },
  'NI': {
    currency: 'nio',
    paymentMethods: ['card'],
    locale: 'es-NI'
  },
  'CR': {
    currency: 'crc',
    paymentMethods: ['card'],
    locale: 'es-CR'
  },
  'PA': {
    currency: 'pab',
    paymentMethods: ['card'],
    locale: 'es-PA'
  },
  // Pacific countries
  'FJ': {
    currency: 'fjd',
    paymentMethods: ['card'],
    locale: 'en-FJ'
  },
  'PG': {
    currency: 'pgk',
    paymentMethods: ['card'],
    locale: 'en-PG'
  },
  'SB': {
    currency: 'sbd',
    paymentMethods: ['card'],
    locale: 'en-SB'
  },
  'VU': {
    currency: 'vuv',
    paymentMethods: ['card'],
    locale: 'bi'
  },
  'NC': {
    currency: 'xpf',
    paymentMethods: ['card'],
    locale: 'en'
  },
  'PF': {
    currency: 'xpf',
    paymentMethods: ['card'],
    locale: 'en'
  },
  'WS': {
    currency: 'wst',
    paymentMethods: ['card'],
    locale: 'sm'
  },
  'TO': {
    currency: 'top',
    paymentMethods: ['card'],
    locale: 'to'
  },
  'TV': {
    currency: 'aud',
    paymentMethods: ['card'],
    locale: 'en-TV'
  },
  'NR': {
    currency: 'aud',
    paymentMethods: ['card'],
    locale: 'en-NR'
  },
  'KI': {
    currency: 'aud',
    paymentMethods: ['card'],
    locale: 'en-KI'
  },
  'MH': {
    currency: 'usd',
    paymentMethods: ['card'],
    locale: 'en-MH'
  },
  'FM': {
    currency: 'usd',
    paymentMethods: ['card'],
    locale: 'en-FM'
  },
  'PW': {
    currency: 'usd',
    paymentMethods: ['card'],
    locale: 'en-PW'
  }
};

// Country name to code mapping for backward compatibility
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'Bulgaria': 'BG',
  'United States': 'US',
  'USA': 'US',
  'Canada': 'CA',
  'United Kingdom': 'GB',
  'UK': 'GB',
  'Germany': 'DE',
  'France': 'FR',
  'Italy': 'IT',
  'Spain': 'ES',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Austria': 'AT',
  'Portugal': 'PT',
  'Ireland': 'IE',
  'Finland': 'FI',
  'Greece': 'GR',
  'Luxembourg': 'LU',
  'Slovenia': 'SI',
  'Slovakia': 'SK',
  'Estonia': 'EE',
  'Latvia': 'LV',
  'Lithuania': 'LT',
  'Malta': 'MT',
  'Cyprus': 'CY',
  'Australia': 'AU',
  'New Zealand': 'NZ',
  'Japan': 'JP',
  'Switzerland': 'CH',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Poland': 'PL',
  'Czech Republic': 'CZ',
  'Hungary': 'HU',
  'Romania': 'RO',
  'Croatia': 'HR',
  'Serbia': 'RS',
  'Turkey': 'TR',
  'Russia': 'RU',
  'Ukraine': 'UA',
  'India': 'IN',
  'China': 'CN',
  'South Korea': 'KR',
  'Singapore': 'SG',
  'Hong Kong': 'HK',
  'Malaysia': 'MY',
  'Thailand': 'TH',
  'Philippines': 'PH',
  'Indonesia': 'ID',
  'Vietnam': 'VN',
  'Brazil': 'BR',
  'Mexico': 'MX',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Peru': 'PE',
  'South Africa': 'ZA',
  'Egypt': 'EG',
  'Israel': 'IL',
  'Saudi Arabia': 'SA',
  'UAE': 'AE',
  'Kuwait': 'KW',
  'Qatar': 'QA',
  // Additional European countries
  'North Macedonia': 'MK',
  'Macedonia': 'MK',
  'Albania': 'AL',
  'Bosnia and Herzegovina': 'BA',
  'Montenegro': 'ME',
  'Kosovo': 'XK',
  'Moldova': 'MD',
  'Belarus': 'BY',
  'Iceland': 'IS',
  // Additional Asian countries
  'Bangladesh': 'BD',
  'Sri Lanka': 'LK',
  'Nepal': 'NP',
  'Myanmar': 'MM',
  'Burma': 'MM',
  'Cambodia': 'KH',
  'Laos': 'LA',
  'Mongolia': 'MN',
  'Kazakhstan': 'KZ',
  'Uzbekistan': 'UZ',
  'Kyrgyzstan': 'KG',
  'Tajikistan': 'TJ',
  'Turkmenistan': 'TM',
  'Afghanistan': 'AF',
  'Pakistan': 'PK',
  'Iran': 'IR',
  'Iraq': 'IQ',
  'Syria': 'SY',
  'Lebanon': 'LB',
  'Jordan': 'JO',
  'Yemen': 'YE',
  'Oman': 'OM',
  'Bahrain': 'BH',
  // Additional African countries
  'Morocco': 'MA',
  'Tunisia': 'TN',
  'Algeria': 'DZ',
  'Libya': 'LY',
  'Sudan': 'SD',
  'Ethiopia': 'ET',
  'Kenya': 'KE',
  'Uganda': 'UG',
  'Tanzania': 'TZ',
  'Rwanda': 'RW',
  'Ghana': 'GH',
  'Nigeria': 'NG',
  'Senegal': 'SN',
  'Ivory Coast': 'CI',
  'Côte d\'Ivoire': 'CI',
  'Mali': 'ML',
  'Burkina Faso': 'BF',
  'Niger': 'NE',
  'Chad': 'TD',
  'Cameroon': 'CM',
  'Central African Republic': 'CF',
  'Gabon': 'GA',
  'Congo': 'CG',
  'Democratic Republic of Congo': 'CD',
  'DRC': 'CD',
  'Angola': 'AO',
  'Mozambique': 'MZ',
  'Zimbabwe': 'ZW',
  'Botswana': 'BW',
  'Namibia': 'NA',
  'Eswatini': 'SZ',
  'Swaziland': 'SZ',
  'Lesotho': 'LS',
  'Malawi': 'MW',
  'Zambia': 'ZM',
  'Madagascar': 'MG',
  'Mauritius': 'MU',
  'Seychelles': 'SC',
  // Additional Latin American countries
  'Uruguay': 'UY',
  'Paraguay': 'PY',
  'Bolivia': 'BO',
  'Ecuador': 'EC',
  'Venezuela': 'VE',
  'Guyana': 'GY',
  'Suriname': 'SR',
  'French Guiana': 'GF',
  'Falkland Islands': 'FK',
  // Caribbean countries
  'Jamaica': 'JM',
  'Cuba': 'CU',
  'Dominican Republic': 'DO',
  'Haiti': 'HT',
  'Trinidad and Tobago': 'TT',
  'Barbados': 'BB',
  'Bahamas': 'BS',
  'Belize': 'BZ',
  'Guatemala': 'GT',
  'Honduras': 'HN',
  'El Salvador': 'SV',
  'Nicaragua': 'NI',
  'Costa Rica': 'CR',
  'Panama': 'PA',
  // Pacific countries
  'Fiji': 'FJ',
  'Papua New Guinea': 'PG',
  'Solomon Islands': 'SB',
  'Vanuatu': 'VU',
  'New Caledonia': 'NC',
  'French Polynesia': 'PF',
  'Samoa': 'WS',
  'Tonga': 'TO',
  'Tuvalu': 'TV',
  'Nauru': 'NR',
  'Kiribati': 'KI',
  'Marshall Islands': 'MH',
  'Micronesia': 'FM',
  'Palau': 'PW'
};

// Default fallback configuration
const DEFAULT_CONFIG: CountryConfig = {
  currency: 'usd',
  paymentMethods: ['card'],
  locale: 'en'
};

/**
 * Get payment configuration for a country
 * Supports both country codes (BG, US) and full country names (Bulgaria, United States)
 */
export function getCountryPaymentMethods(country: string): CountryConfig {
  if (!country) {
    return DEFAULT_CONFIG;
  }

  // Normalize the country input
  const normalizedCountry = country.trim();
  
  // Try direct lookup with country code
  let config = COUNTRY_CONFIGS[normalizedCountry.toUpperCase()];
  
  // If not found, try to convert country name to code
  if (!config) {
    const countryCode = COUNTRY_NAME_TO_CODE[normalizedCountry];
    if (countryCode) {
      config = COUNTRY_CONFIGS[countryCode];
    }
  }
  
  // Return config or default
  return config || DEFAULT_CONFIG;
}

/**
 * Get currency for a country
 */
export function getCurrencyForCountry(country: string): string {
  return getCountryPaymentMethods(country).currency;
}

/**
 * Get payment methods for a country
 */
export function getPaymentMethodsForCountry(country: string): string[] {
  return getCountryPaymentMethods(country).paymentMethods;
}

/**
 * Get locale for a country
 */
export function getLocaleForCountry(country: string): string {
  return getCountryPaymentMethods(country).locale;
}
