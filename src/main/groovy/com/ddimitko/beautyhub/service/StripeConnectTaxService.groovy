package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.ShopStripeDetails
import com.ddimitko.beautyhub.repository.ShopRepository
import com.ddimitko.beautyhub.repository.ShopStripeDetailsRepository
import com.stripe.Stripe
import com.stripe.model.Account
import com.stripe.model.tax.Registration
import com.stripe.model.tax.Settings
import com.stripe.net.RequestOptions
import com.stripe.param.tax.RegistrationCreateParams
import com.stripe.param.tax.SettingsUpdateParams
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Slf4j
@Service
@Transactional
class StripeConnectTaxService {

    @Autowired
    private ShopRepository shopRepository

    @Autowired
    private ShopStripeDetailsRepository shopStripeDetailsRepository

    @Value('${stripe.api.secret-key}')
    private String stripeSecretKey

    // Supported tax codes for beauty services
    private static final List<String> SUPPORTED_TAX_CODES = [
        'txcd_20040001', // Beauty services - general
        'txcd_20040007', // Hair care services
        'txcd_20040009', // Nail care services
        'txcd_20040010'  // Spa and wellness services
    ]

    // EU countries that require tax registration
    private static final Map<String, String> EU_COUNTRIES = [
        'AT': 'Austria',
        'BE': 'Belgium', 
        'BG': 'Bulgaria',
        'HR': 'Croatia',
        'CY': 'Cyprus',
        'CZ': 'Czech Republic',
        'DK': 'Denmark',
        'EE': 'Estonia',
        'FI': 'Finland',
        'FR': 'France',
        'DE': 'Germany',
        'GR': 'Greece',
        'HU': 'Hungary',
        'IE': 'Ireland',
        'IT': 'Italy',
        'LV': 'Latvia',
        'LT': 'Lithuania',
        'LU': 'Luxembourg',
        'MT': 'Malta',
        'NL': 'Netherlands',
        'PL': 'Poland',
        'PT': 'Portugal',
        'RO': 'Romania',
        'SK': 'Slovakia',
        'SI': 'Slovenia',
        'ES': 'Spain',
        'SE': 'Sweden'
    ]

    /**
     * Get tax registration requirements for a specific country
     */
    Map<String, Object> getTaxRegistrationRequirements(String countryCode) {
        log.info("Getting tax registration requirements for country: ${countryCode}")

        try {
            Stripe.apiKey = stripeSecretKey

            Map<String, Object> requirements = [
                countryCode: countryCode,
                countryName: EU_COUNTRIES[countryCode] ?: countryCode,
                isEuCountry: EU_COUNTRIES.containsKey(countryCode),
                requiresVatRegistration: EU_COUNTRIES.containsKey(countryCode),
                supportedTaxCodes: SUPPORTED_TAX_CODES,
                requiredFields: getRequiredFieldsForCountry(countryCode)
            ]

            return requirements

        } catch (Exception e) {
            log.error("Error getting tax registration requirements for ${countryCode}: ${e.message}", e)
            throw new RuntimeException("Failed to get tax registration requirements: ${e.message}")
        }
    }

    /**
     * Register shop for tax collection in specified country
     */
    Map<String, Object> registerShopForTax(UUID shopId, Map<String, Object> registrationData) {
        log.info("Registering shop for tax collection: ${shopId}")

        try {
            Shop shop = shopRepository.findById(shopId)
                .orElseThrow { new RuntimeException("Shop not found with id: ${shopId}") }

            ShopStripeDetails stripeDetails = shop.stripeDetails
            if (!stripeDetails?.stripeAccountId) {
                throw new RuntimeException("Shop must have Stripe Connect account before tax registration")
            }

            Stripe.apiKey = stripeSecretKey

            // Create tax registration
            RegistrationCreateParams.Builder paramsBuilder = RegistrationCreateParams.builder()
                .setCountry(registrationData.country as String)
                .setCountryOptions(buildCountryOptions(registrationData))

            // Set active from date
            if (registrationData.activeFrom) {
                paramsBuilder.setActiveFrom(registrationData.activeFrom as Long)
            }

            Registration registration = Registration.create(
                paramsBuilder.build(),
                RequestOptions.builder()
                    .setStripeAccount(stripeDetails.stripeAccountId)
                    .build()
            )

            // Update shop with tax registration info
            stripeDetails.taxRegistrationId = registration.id
            stripeDetails.taxRegistrationCountry = registrationData.country as String
            stripeDetails.taxRegistrationStatus = registration.status
            stripeDetails.taxRegistrationDate = new Date()
            shopStripeDetailsRepository.save(stripeDetails)

            return [
                registrationId: registration.id,
                status: registration.status,
                country: registration.country,
                message: "Tax registration created successfully"
            ]

        } catch (Exception e) {
            log.error("Error registering shop for tax: ${e.message}", e)
            throw new RuntimeException("Failed to register for tax: ${e.message}")
        }
    }

    /**
     * Enable automatic tax calculation for shop
     */
    Map<String, Object> enableAutomaticTaxCalculation(UUID shopId) {
        log.info("Enabling automatic tax calculation for shop: ${shopId}")

        try {
            Shop shop = shopRepository.findById(shopId)
                .orElseThrow { new RuntimeException("Shop not found with id: ${shopId}") }

            ShopStripeDetails stripeDetails = shop.stripeDetails
            if (!stripeDetails?.stripeAccountId) {
                throw new RuntimeException("Shop must have Stripe Connect account")
            }

            Stripe.apiKey = stripeSecretKey

            // Update tax settings to enable automatic calculation
            Settings settings = Settings.update(
                SettingsUpdateParams.builder()
                    .setDefaults(
                        SettingsUpdateParams.Defaults.builder()
                            .setTaxBehavior(SettingsUpdateParams.Defaults.TaxBehavior.EXCLUSIVE)
                            .setTaxCode("txcd_20040001") // Default beauty services tax code
                            .build()
                    )
                    .build(),
                RequestOptions.builder()
                    .setStripeAccount(stripeDetails.stripeAccountId)
                    .build()
            )

            // Update shop details
            stripeDetails.automaticTaxEnabled = true
            stripeDetails.defaultTaxCode = "txcd_20040001"
            shopStripeDetailsRepository.save(stripeDetails)

            return [
                enabled: true,
                defaultTaxCode: "txcd_20040001",
                taxBehavior: "exclusive",
                message: "Automatic tax calculation enabled"
            ]

        } catch (Exception e) {
            log.error("Error enabling automatic tax calculation: ${e.message}", e)
            throw new RuntimeException("Failed to enable automatic tax calculation: ${e.message}")
        }
    }

    /**
     * Get tax registration status for shop
     */
    Map<String, Object> getTaxRegistrationStatus(UUID shopId) {
        log.info("Getting tax registration status for shop: ${shopId}")

        try {
            Shop shop = shopRepository.findById(shopId)
                .orElseThrow { new RuntimeException("Shop not found with id: ${shopId}") }

            ShopStripeDetails stripeDetails = shop.stripeDetails
            if (!stripeDetails?.stripeAccountId) {
                return [
                    registered: false,
                    message: "No Stripe Connect account found"
                ]
            }

            Stripe.apiKey = stripeSecretKey

            // Get tax registrations for the account
            List<Map<String, Object>> registrations = Registration.list(
                [:],
                RequestOptions.builder()
                    .setStripeAccount(stripeDetails.stripeAccountId)
                    .build()
            ).data.collect { registration ->
                [
                    id: registration.id,
                    country: registration.country,
                    status: registration.status,
                    activeFrom: registration.activeFrom,
                    expiresAt: registration.expiresAt
                ]
            }

            return [
                registered: !registrations.isEmpty(),
                registrations: registrations,
                automaticTaxEnabled: stripeDetails.automaticTaxEnabled ?: false,
                defaultTaxCode: stripeDetails.defaultTaxCode
            ]

        } catch (Exception e) {
            log.error("Error getting tax registration status: ${e.message}", e)
            throw new RuntimeException("Failed to get tax registration status: ${e.message}")
        }
    }

    /**
     * Calculate tax for payment intent
     */
    Map<String, Object> calculateTaxForPayment(UUID shopId, Map<String, Object> paymentData) {
        log.info("Calculating tax for payment: ${shopId}")

        try {
            Shop shop = shopRepository.findById(shopId)
                .orElseThrow { new RuntimeException("Shop not found with id: ${shopId}") }

            ShopStripeDetails stripeDetails = shop.stripeDetails
            if (!stripeDetails?.automaticTaxEnabled) {
                return [
                    taxAmount: 0,
                    taxRate: 0,
                    taxCalculated: false,
                    taxBehavior: 'inclusive',
                    message: "Automatic tax calculation not enabled"
                ]
            }

            BigDecimal amount = paymentData.amount as BigDecimal
            String customerCountry = paymentData.customerCountry as String ?: shop.country
            String taxBehavior = paymentData.taxBehavior as String ?: 'inclusive'

            // Calculate tax based on behavior (inclusive vs exclusive)
            BigDecimal taxRate = getTaxRateForCountry(customerCountry, shop.country)
            BigDecimal taxAmount

            if (taxBehavior == 'inclusive') {
                // Tax is included in the amount - calculate the tax portion
                // Formula: tax = amount * (rate / (1 + rate))
                taxAmount = amount * (taxRate / (BigDecimal.ONE + taxRate))
            } else {
                // Tax is added on top of the amount
                taxAmount = amount * taxRate
            }

            return [
                taxAmount: taxAmount,
                taxRate: taxRate,
                taxCalculated: true,
                taxBehavior: taxBehavior,
                customerCountry: customerCountry,
                shopCountry: shop.country,
                taxCode: stripeDetails.defaultTaxCode ?: "txcd_20040001"
            ]

        } catch (Exception e) {
            log.error("Error calculating tax for payment: ${e.message}", e)
            throw new RuntimeException("Failed to calculate tax: ${e.message}")
        }
    }

    private Map<String, Object> getRequiredFieldsForCountry(String countryCode) {
        // Return country-specific required fields for tax registration
        switch (countryCode) {
            case 'BG':
                return [
                    vatNumber: true,
                    businessRegistrationNumber: true,
                    businessAddress: true,
                    businessType: true
                ]
            case 'DE':
                return [
                    vatNumber: true,
                    businessRegistrationNumber: true,
                    businessAddress: true,
                    businessType: true,
                    taxNumber: true
                ]
            default:
                return [
                    vatNumber: EU_COUNTRIES.containsKey(countryCode),
                    businessAddress: true,
                    businessType: true
                ]
        }
    }

    private RegistrationCreateParams.CountryOptions buildCountryOptions(Map<String, Object> registrationData) {
        String country = registrationData.country as String
        
        switch (country) {
            case 'BG':
                return RegistrationCreateParams.CountryOptions.builder()
                    .setBg(
                        RegistrationCreateParams.CountryOptions.Bg.builder()
                            .setType(RegistrationCreateParams.CountryOptions.Bg.Type.STANDARD)
                            .setStandardVatNumber(registrationData.vatNumber as String)
                            .build()
                    )
                    .build()
            default:
                // Generic EU country options
                return RegistrationCreateParams.CountryOptions.builder()
                    .build()
        }
    }

    private BigDecimal getTaxRateForCountry(String customerCountry, String shopCountry) {
        // Simplified tax rate calculation
        // In production, this should use Stripe Tax API for accurate rates
        if (EU_COUNTRIES.containsKey(customerCountry)) {
            return new BigDecimal("0.20") // 20% standard EU VAT rate
        }
        return BigDecimal.ZERO
    }
}
