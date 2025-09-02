package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.dto.SubscriptionPlanResponse
import com.stripe.exception.StripeException
import com.stripe.model.Price
import com.stripe.model.Product
import com.stripe.param.PriceListParams
import com.stripe.param.ProductListParams
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
@Slf4j
class StripeProductService {

    @Value('${stripe.currency:usd}')
    private String defaultCurrency

    /**
     * Fetches all active subscription plans from Stripe
     */
    List<SubscriptionPlanResponse> getAvailableSubscriptionPlans() {
        try {
            // Fetch all active products
            ProductListParams productParams = ProductListParams.builder()
                    .setActive(true)
                    .setType(ProductListParams.Type.SERVICE)
                    .setLimit(100L)
                    .build()

            List<Product> products = Product.list(productParams).data

            // Fetch all active prices
            PriceListParams priceParams = PriceListParams.builder()
                    .setActive(true)
                    .setType(PriceListParams.Type.RECURRING)
                    .setLimit(100L)
                    .build()

            List<Price> prices = Price.list(priceParams).data

            // Group prices by product and build response
            List<SubscriptionPlanResponse> plans = []

            products.each { product ->
                // Find prices for this product
                List<Price> productPrices = prices.findAll { price -> 
                    price.product == product.id 
                }

                productPrices.each { price ->
                    SubscriptionPlanResponse plan = buildSubscriptionPlanResponse(product, price)
                    if (plan) {
                        plans.add(plan)
                    }
                }
            }

            // Sort plans by price (ascending)
            plans.sort { a, b -> a.priceInCents <=> b.priceInCents }

            log.info("Retrieved ${plans.size()} subscription plans from Stripe")
            return plans

        } catch (StripeException e) {
            log.error("Error fetching subscription plans from Stripe: ${e.message}", e)
            throw new RuntimeException("Failed to fetch subscription plans: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Gets a specific subscription plan by price ID
     */
    SubscriptionPlanResponse getSubscriptionPlanByPriceId(String priceId) {
        try {
            Price price = Price.retrieve(priceId)
            Product product = Product.retrieve(price.product)

            return buildSubscriptionPlanResponse(product, price)

        } catch (StripeException e) {
            log.error("Error fetching subscription plan for price ID ${priceId}: ${e.message}", e)
            throw new RuntimeException("Failed to fetch subscription plan: ${e.userMessage ?: e.message}")
        }
    }

    private SubscriptionPlanResponse buildSubscriptionPlanResponse(Product product, Price price) {
        try {
            // Skip if price is not recurring
            if (!price.recurring) {
                return null
            }

            SubscriptionPlanResponse plan = new SubscriptionPlanResponse()
            plan.id = price.id
            plan.productId = product.id
            plan.name = product.name
            plan.displayName = product.name
            plan.description = product.description ?: "Professional beauty business plan"
            plan.priceInCents = price.unitAmount?.intValue() ?: 0
            plan.currency = price.currency?.toUpperCase() ?: "USD"
            plan.interval = price.recurring.interval
            plan.intervalCount = price.recurring.intervalCount ?: 1

            // Calculate formatted price with proper currency symbol
            String currencySymbol = getCurrencySymbol(plan.currency)
            plan.formattedPrice = String.format('%s%.2f', currencySymbol, plan.priceInCents / 100.0)
            
            // Build interval display
            String intervalDisplay = plan.interval
            if (plan.intervalCount > 1) {
                intervalDisplay = "${plan.intervalCount} ${plan.interval}s"
            }
            plan.formattedPriceWithInterval = "${plan.formattedPrice}/${intervalDisplay}"

            // Determine if this is a yearly plan for savings calculation
            plan.isYearly = plan.interval == "year"
            plan.isMonthly = plan.interval == "month"

            // Extract features from product metadata
            if (product.metadata) {
                plan.features = extractFeaturesFromMetadata(product.metadata)
                plan.recommended = product.metadata.get("recommended") == "true"
                plan.savings = product.metadata.get("savings")
            }

            // Default features if none specified
            if (!plan.features) {
                plan.features = getDefaultFeatures(plan.interval)
            }

            return plan

        } catch (Exception e) {
            log.error("Error building subscription plan response for product ${product.id}: ${e.message}", e)
            return null
        }
    }

    private List<String> extractFeaturesFromMetadata(Map<String, String> metadata) {
        List<String> features = []
        
        // Look for features in metadata (features_1, features_2, etc.)
        int index = 1
        while (metadata.containsKey("feature_${index}")) {
            String feature = metadata.get("feature_${index}")
            if (feature) {
                features.add(feature)
            }
            index++
        }

        // Alternative: comma-separated features
        if (features.isEmpty() && metadata.containsKey("features")) {
            String featuresString = metadata.get("features")
            if (featuresString) {
                features = featuresString.split(",").collect { it.trim() }.findAll { it }
            }
        }

        return features
    }

    private List<String> getDefaultFeatures(String interval) {
        List<String> baseFeatures = [
            "Unlimited appointment bookings",
            "Customer management",
            "Basic analytics",
            "Email notifications",
            "Mobile app access"
        ]

        if (interval == "year") {
            baseFeatures.add("2 months FREE")
        }

        return baseFeatures
    }

    private String getCurrencySymbol(String currency) {
        switch (currency?.toLowerCase()) {
            case 'usd':
                return '$'
            case 'eur':
                return '€'
            case 'bgn':
                return 'лв.'
            case 'gbp':
                return '£'
            default:
                return currency?.toUpperCase() + ' '
        }
    }

    /**
     * Creates or updates subscription plans in Stripe
     * This is useful for initial setup or plan management
     */
    void createDefaultSubscriptionPlans() {
        try {
            log.info("Creating default subscription plans in Stripe...")

            // Create Basic Monthly Plan
            createPlanIfNotExists(
                "basic_monthly",
                "Basic Monthly Plan",
                "Essential features for small beauty businesses",
                2999, // $29.99
                "month",
                [
                    "feature_1": "Unlimited appointment bookings",
                    "feature_2": "Customer management", 
                    "feature_3": "Basic analytics",
                    "feature_4": "Email notifications",
                    "feature_5": "Mobile app access",
                    "recommended": "true"
                ]
            )

            // Create Basic Yearly Plan
            createPlanIfNotExists(
                "basic_yearly",
                "Basic Yearly Plan",
                "Essential features for small beauty businesses - Save 17%",
                29999, // $299.99
                "year",
                [
                    "feature_1": "Unlimited appointment bookings",
                    "feature_2": "Customer management",
                    "feature_3": "Basic analytics", 
                    "feature_4": "Email notifications",
                    "feature_5": "Mobile app access",
                    "feature_6": "2 months FREE",
                    "savings": "Save \$59.89/year"
                ]
            )

            // Create Premium Monthly Plan
            createPlanIfNotExists(
                "premium_monthly",
                "Premium Monthly Plan", 
                "Advanced features for growing beauty businesses",
                4999, // $49.99
                "month",
                [
                    "feature_1": "Everything in Basic",
                    "feature_2": "Advanced analytics & reports",
                    "feature_3": "Marketing tools",
                    "feature_4": "Priority customer support",
                    "feature_5": "Custom branding",
                    "feature_6": "Multiple staff accounts"
                ]
            )

            // Create Premium Yearly Plan
            createPlanIfNotExists(
                "premium_yearly",
                "Premium Yearly Plan",
                "Advanced features for growing beauty businesses - Save 17%",
                49999, // $499.99
                "year",
                [
                    "feature_1": "Everything in Basic",
                    "feature_2": "Advanced analytics & reports",
                    "feature_3": "Marketing tools",
                    "feature_4": "Priority customer support", 
                    "feature_5": "Custom branding",
                    "feature_6": "Multiple staff accounts",
                    "feature_7": "2 months FREE",
                    "savings": "Save \$99.89/year"
                ]
            )

            log.info("Default subscription plans created successfully")

        } catch (Exception e) {
            log.error("Error creating default subscription plans: ${e.message}", e)
            throw new RuntimeException("Failed to create default subscription plans: ${e.message}")
        }
    }

    private void createPlanIfNotExists(String productId, String name, String description, 
                                     Integer priceInCents, String interval, Map<String, String> metadata) {
        try {
            // Check if product already exists
            try {
                Product.retrieve(productId)
                log.info("Product ${productId} already exists, skipping creation")
                return
            } catch (StripeException e) {
                // Product doesn't exist, create it
            }

            // Create product
            Product product = Product.create([
                id: productId,
                name: name,
                description: description,
                type: "service",
                metadata: metadata
            ])

            // Create price
            Price.create([
                product: product.id,
                unit_amount: priceInCents,
                currency: defaultCurrency,
                recurring: [
                    interval: interval
                ]
            ])

            log.info("Created subscription plan: ${name}")

        } catch (StripeException e) {
            log.error("Error creating plan ${productId}: ${e.message}", e)
        }
    }
}
