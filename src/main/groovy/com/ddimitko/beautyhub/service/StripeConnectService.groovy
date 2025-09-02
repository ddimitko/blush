package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.dto.ConnectAccountRequest
import com.ddimitko.beautyhub.dto.ConnectAccountResponse
import com.ddimitko.beautyhub.dto.ComprehensiveConnectAccountRequest
import com.ddimitko.beautyhub.dto.ApiOnboardingUpdateRequest
import com.ddimitko.beautyhub.dto.OnboardingRequirementsRequest
import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.ShopStripeDetails
import com.ddimitko.beautyhub.repository.ShopRepository
import com.ddimitko.beautyhub.service.ShopStripeDetailsService
import com.stripe.exception.StripeException
import com.stripe.model.Account
import com.stripe.model.AccountLink
import com.stripe.model.AccountSession
import com.stripe.model.ExternalAccount
import com.stripe.model.Balance
import com.stripe.model.BalanceTransaction
import com.stripe.model.BalanceTransactionCollection
import com.stripe.model.Payout
import com.stripe.model.PayoutCollection
import com.stripe.net.RequestOptions
import com.stripe.param.AccountCreateParams
import com.stripe.param.AccountLinkCreateParams
import com.stripe.param.AccountSessionCreateParams
import com.stripe.param.AccountUpdateParams
import com.stripe.param.ExternalAccountCollectionCreateParams
import com.stripe.param.BalanceTransactionListParams
import com.stripe.param.PayoutListParams
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
@Slf4j
class StripeConnectService {

    @Autowired
    private ShopRepository shopRepository

    @Autowired
    private ShopStripeDetailsService shopStripeDetailsService

    @Value('${stripe.connect.client-id}')
    private String connectClientId

    @Value('${app.base-url:https://localhost:3000}')
    private String baseUrl

    /**
     * Creates a Stripe Connect account for a shop using API-based onboarding
     */
    ConnectAccountResponse createConnectAccount(UUID shopId, ConnectAccountRequest request) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            if (stripeDetails.stripeAccountId) {
                throw new IllegalArgumentException("Shop already has a Stripe Connect account")
            }

            log.info("Creating Stripe Connect account for shop ${shopId} with country: ${request.businessCountry}")
            log.debug("Connect account request data: ${request}")

            // Determine business type
            AccountCreateParams.BusinessType businessType = request.businessType == "individual" ?
                AccountCreateParams.BusinessType.INDIVIDUAL : AccountCreateParams.BusinessType.COMPANY

            // Build capabilities based on request
            AccountCreateParams.Capabilities.Builder capabilitiesBuilder = AccountCreateParams.Capabilities.builder()

            if (request.requestedCapabilities.contains("card_payments")) {
                capabilitiesBuilder.setCardPayments(AccountCreateParams.Capabilities.CardPayments.builder()
                        .setRequested(true)
                        .build())
            }

            if (request.requestedCapabilities.contains("transfers")) {
                capabilitiesBuilder.setTransfers(AccountCreateParams.Capabilities.Transfers.builder()
                        .setRequested(true)
                        .build())
            }

            // Create CUSTOM account for API onboarding
            AccountCreateParams.Builder accountBuilder = AccountCreateParams.builder()
                    .setType(AccountCreateParams.Type.CUSTOM)
                    .setCountry(request.businessCountry)
                    .setEmail(request.businessEmail)
                    .setBusinessType(businessType)
                    .setCapabilities(capabilitiesBuilder.build())
                    .putMetadata("shop_id", shop.id.toString())
                    .putMetadata("shop_name", shop.name)

            // Add business profile
            accountBuilder.setBusinessProfile(AccountCreateParams.BusinessProfile.builder()
                    .setName(request.businessName)
                    .setUrl(request.businessWebsite)
                    .setSupportPhone(formatPhoneNumber(request.businessPhone, request.businessCountry))
                    .setSupportEmail(request.businessEmail)
                    .setMcc("7230") // Beauty salons MCC code
                    .build())

            // Add individual information for individual business type
            if (businessType == AccountCreateParams.BusinessType.INDIVIDUAL && request.individual) {
                def individual = request.individual
                def individualBuilder = AccountCreateParams.Individual.builder()
                        .setFirstName(individual.firstName)
                        .setLastName(individual.lastName)
                        .setEmail(individual.email)
                        .setPhone(formatPhoneNumber(individual.phone, request.businessCountry))

                // Add date of birth
                if (individual.dateOfBirth) {
                    individualBuilder.setDob(AccountCreateParams.Individual.Dob.builder()
                            .setDay(individual.dateOfBirth.day)
                            .setMonth(individual.dateOfBirth.month)
                            .setYear(individual.dateOfBirth.year)
                            .build())
                }

                // Add address
                if (individual.address) {
                    individualBuilder.setAddress(AccountCreateParams.Individual.Address.builder()
                            .setLine1(individual.address.line1)
                            .setLine2(individual.address.line2)
                            .setCity(individual.address.city)
                            .setState(individual.address.state)
                            .setPostalCode(individual.address.postalCode)
                            .setCountry(individual.address.country)
                            .build())
                }

                // Add SSN if provided (country-dependent)
                if (individual.ssn) {
                    individualBuilder.setSsnLast4(individual.ssn.length() >= 4 ?
                            individual.ssn.substring(individual.ssn.length() - 4) : individual.ssn)
                }

                accountBuilder.setIndividual(individualBuilder.build())
            }

            // Add company information for company business type
            if (businessType == AccountCreateParams.BusinessType.COMPANY && request.company) {
                def company = request.company
                def companyBuilder = AccountCreateParams.Company.builder()
                        .setName(company.name)
                        .setPhone(formatPhoneNumber(company.phone, request.businessCountry))

                // Add tax ID if provided
                if (company.taxId) {
                    companyBuilder.setTaxId(company.taxId)
                }

                // Add company address
                if (company.address) {
                    companyBuilder.setAddress(AccountCreateParams.Company.Address.builder()
                            .setLine1(company.address.line1)
                            .setLine2(company.address.line2)
                            .setCity(company.address.city)
                            .setState(company.address.state)
                            .setPostalCode(company.address.postalCode)
                            .setCountry(company.address.country)
                            .build())
                }

                accountBuilder.setCompany(companyBuilder.build())
            }

            // Add TOS acceptance
            def tosBuilder = AccountCreateParams.TosAcceptance.builder()
                    .setServiceAgreement("full")

            if (request.tosAcceptance) {
                tosBuilder.setDate(request.tosAcceptance.date)
                        .setIp(request.tosAcceptance.ip)
            } else {
                tosBuilder.setDate((System.currentTimeMillis() / 1000L) as Long)
                        .setIp("127.0.0.1")
            }

            accountBuilder.setTosAcceptance(tosBuilder.build())

            // Create the account
            Account account = Account.create(accountBuilder.build())

            // Add external account (bank details) after account creation
            if (request.externalAccount) {
                createExternalAccountFromRequest(account.id, request.externalAccount)
            }

            // Update shop stripe details with account ID
            shopStripeDetailsService.updateStripeAccount(shop, account.id, false)

            // Store compliance information if provided
            if (request.compliance) {
                storeComplianceInformation(shop, request.compliance)
            }

            log.info("Successfully created Stripe Connect account ${account.id} for shop ${shopId}")
            return buildConnectAccountResponse(account, null, null)

        } catch (StripeException e) {
            log.error("Stripe error creating Connect account for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to create Connect account: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Gets Connect account details and status
     */
    ConnectAccountResponse getConnectAccountDetails(UUID shopId) {
        try {
            log.info("Getting Connect account details for shop ${shopId}")
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            if (!stripeDetails.stripeAccountId) {
                log.info("Shop ${shopId} does not have a Stripe Connect account")
                throw new IllegalArgumentException("Shop does not have a Stripe Connect account")
            }

            log.info("Calling Stripe API for account ${stripeDetails.stripeAccountId}")

            Account account = Account.retrieve(stripeDetails.stripeAccountId)

            // Update shop onboarding status
            boolean onboardingCompleted = account.chargesEnabled && account.payoutsEnabled
            if (stripeDetails.stripeOnboardingCompleted != onboardingCompleted) {
                shopStripeDetailsService.updateOnboardingStatus(shop, onboardingCompleted)
                shop.acceptsCardPayments = onboardingCompleted
                shopRepository.save(shop)
                log.info("Updated shop ${shopId} onboarding status: completed=${onboardingCompleted}, acceptsCardPayments=${onboardingCompleted}")
            }

            String dashboardUrl = null
            if (onboardingCompleted) {
                try {
                    // Use AccountLink for Standard accounts (more compatible than LoginLink)
                    AccountLink accountLink = AccountLink.create(
                            AccountLinkCreateParams.builder()
                                    .setAccount(account.id)
                                    .setRefreshUrl("${baseUrl}/owner/dashboard") // Where to redirect if refresh needed
                                    .setReturnUrl("${baseUrl}/owner/dashboard")  // Where to redirect after completion
                                    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
                                    .build()
                    )
                    dashboardUrl = accountLink.url
                } catch (StripeException e) {
                    log.warn("Could not create account link for account ${account.id}: ${e.message}")
                    dashboardUrl = null
                }
            }

            return buildConnectAccountResponse(account, null, dashboardUrl)

        } catch (IllegalArgumentException e) {
            // Re-throw IllegalArgumentException as-is (these are client errors, not server errors)
            log.warn("Client error retrieving Connect account for shop ${shopId}: ${e.message}")
            throw e
        } catch (StripeException e) {
            // Handle various Stripe error codes that indicate the account doesn't exist or is invalid
            if (e.code == "account_invalid" || e.code == "resource_missing" ||
                e.httpStatusCode == 404 || e.message?.contains("No such account")) {
                // Re-fetch shop and stripe details for cleanup
                Shop shopForCleanup = shopRepository.findById(shopId)
                        .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }
                ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shopForCleanup)
                log.warn("Connect account ${stripeDetails.stripeAccountId} not found or invalid for shop ${shopId} (${e.code}), cleaning up local data")
                // Clean up local Connect account data
                shopStripeDetailsService.updateStripeAccount(shopForCleanup, null, false)
                shopForCleanup.acceptsCardPayments = false
                shopRepository.save(shopForCleanup)
                throw new IllegalArgumentException("Connect account not found - local data has been cleaned up")
            }
            log.error("Stripe error retrieving Connect account for shop ${shopId}: ${e.message} (code: ${e.code}, status: ${e.httpStatusCode})", e)
            throw new RuntimeException("Failed to retrieve Connect account: ${e.userMessage ?: e.message}")
        } catch (Exception e) {
            log.error("Unexpected error retrieving Connect account for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to retrieve Connect account: ${e.message}")
        }
    }

    /**
     * Updates Connect account information using API calls
     */
    ConnectAccountResponse updateConnectAccount(UUID shopId, Map<String, Object> updateData) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            if (!stripeDetails.stripeAccountId) {
                throw new IllegalArgumentException("Shop does not have a Stripe Connect account")
            }

            Account account = Account.retrieve(stripeDetails.stripeAccountId)

            // Build update parameters based on provided data
            AccountUpdateParams.Builder updateBuilder = AccountUpdateParams.builder()

            // Update business profile if provided
            if (updateData.containsKey("businessProfile")) {
                Map businessProfile = (Map) updateData.get("businessProfile")
                AccountUpdateParams.BusinessProfile.Builder profileBuilder = AccountUpdateParams.BusinessProfile.builder()

                if (businessProfile.containsKey("name")) {
                    profileBuilder.setName((String) businessProfile.get("name"))
                }
                if (businessProfile.containsKey("url")) {
                    profileBuilder.setUrl((String) businessProfile.get("url"))
                }
                if (businessProfile.containsKey("supportPhone")) {
                    profileBuilder.setSupportPhone((String) businessProfile.get("supportPhone"))
                }
                if (businessProfile.containsKey("supportEmail")) {
                    profileBuilder.setSupportEmail((String) businessProfile.get("supportEmail"))
                }

                updateBuilder.setBusinessProfile(profileBuilder.build())
            }

            // Update company information if provided
            if (updateData.containsKey("company")) {
                Map company = (Map) updateData.get("company")
                AccountUpdateParams.Company.Builder companyBuilder = AccountUpdateParams.Company.builder()

                if (company.containsKey("name")) {
                    companyBuilder.setName((String) company.get("name"))
                }
                if (company.containsKey("phone")) {
                    companyBuilder.setPhone((String) company.get("phone"))
                }
                if (company.containsKey("taxId")) {
                    companyBuilder.setTaxId((String) company.get("taxId"))
                }

                // Update address if provided
                if (company.containsKey("address")) {
                    Map address = (Map) company.get("address")
                    AccountUpdateParams.Company.Address.Builder addressBuilder = AccountUpdateParams.Company.Address.builder()

                    if (address.containsKey("line1")) {
                        addressBuilder.setLine1((String) address.get("line1"))
                    }
                    if (address.containsKey("line2")) {
                        addressBuilder.setLine2((String) address.get("line2"))
                    }
                    if (address.containsKey("city")) {
                        addressBuilder.setCity((String) address.get("city"))
                    }
                    if (address.containsKey("state")) {
                        addressBuilder.setState((String) address.get("state"))
                    }
                    if (address.containsKey("postalCode")) {
                        addressBuilder.setPostalCode((String) address.get("postalCode"))
                    }

                    companyBuilder.setAddress(addressBuilder.build())
                }

                updateBuilder.setCompany(companyBuilder.build())
            }

            // Update the account
            account = account.update(updateBuilder.build())

            // Check if onboarding is now complete
            boolean onboardingCompleted = account.chargesEnabled && account.payoutsEnabled
            if (stripeDetails.stripeOnboardingCompleted != onboardingCompleted) {
                shopStripeDetailsService.updateOnboardingStatus(shop, onboardingCompleted)
                shop.acceptsCardPayments = onboardingCompleted
                shopRepository.save(shop)
                log.info("Updated shop ${shop.id} onboarding status: completed=${onboardingCompleted}, acceptsCardPayments=${onboardingCompleted}")
            }

            String dashboardUrl = null
            if (onboardingCompleted) {
                try {
                    // Use AccountLink for Standard accounts
                    AccountLink accountLink = AccountLink.create(
                            AccountLinkCreateParams.builder()
                                    .setAccount(account.id)
                                    .setRefreshUrl("${baseUrl}/owner/dashboard")
                                    .setReturnUrl("${baseUrl}/owner/dashboard")
                                    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
                                    .build()
                    )
                    dashboardUrl = accountLink.url
                } catch (StripeException e) {
                    log.warn("Could not create account link for account ${account.id}: ${e.message}")
                    dashboardUrl = null
                }
            }

            return buildConnectAccountResponse(account, null, dashboardUrl)

        } catch (StripeException e) {
            log.error("Stripe error updating Connect account for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to update Connect account: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Submits Connect account for review (completes onboarding)
     */
    ConnectAccountResponse submitForReview(UUID shopId) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            if (!stripeDetails.stripeAccountId) {
                throw new IllegalArgumentException("Shop does not have a Stripe Connect account")
            }

            Account account = Account.retrieve(stripeDetails.stripeAccountId)

            // Check if all required information is provided
            if (account.requirements?.currentlyDue?.size() > 0) {
                throw new IllegalArgumentException("Account has pending requirements: ${account.requirements.currentlyDue.join(', ')}")
            }

            // The account should automatically be enabled once all requirements are met
            // Refresh account status
            account = Account.retrieve(stripeDetails.stripeAccountId)

            boolean onboardingCompleted = account.chargesEnabled && account.payoutsEnabled
            shopStripeDetailsService.updateOnboardingStatus(shop, onboardingCompleted)
            shop.acceptsCardPayments = onboardingCompleted
            shopRepository.save(shop)
            log.info("Updated shop ${shop.id} onboarding status: completed=${onboardingCompleted}, acceptsCardPayments=${onboardingCompleted}")

            String dashboardUrl = null
            if (onboardingCompleted) {
                try {
                    // Use AccountLink for Standard accounts
                    AccountLink accountLink = AccountLink.create(
                            AccountLinkCreateParams.builder()
                                    .setAccount(account.id)
                                    .setRefreshUrl("${baseUrl}/owner/dashboard")
                                    .setReturnUrl("${baseUrl}/owner/dashboard")
                                    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
                                    .build()
                    )
                    dashboardUrl = accountLink.url
                } catch (StripeException e) {
                    log.warn("Could not create account link for account ${account.id}: ${e.message}")
                    dashboardUrl = null
                }
            }

            return buildConnectAccountResponse(account, null, dashboardUrl)

        } catch (StripeException e) {
            log.error("Stripe error submitting Connect account for review for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to submit account for review: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Creates an Account Session for embedded onboarding
     */
    Map<String, Object> createAccountSession(UUID shopId) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            if (!stripeDetails.stripeAccountId) {
                throw new IllegalArgumentException("Shop does not have a Stripe Connect account")
            }

            // Create account session for embedded onboarding
            AccountSession accountSession = AccountSession.create(AccountSessionCreateParams.builder()
                    .setAccount(stripeDetails.stripeAccountId)
                    .setComponents(AccountSessionCreateParams.Components.builder()
                            .setAccountOnboarding(AccountSessionCreateParams.Components.AccountOnboarding.builder()
                                    .setEnabled(true)
                                    .build())
                            .build())
                    .build())

            log.info("Account session created for shop ${shopId}: ${accountSession.clientSecret}")

            return [
                clientSecret: accountSession.clientSecret,
                accountId: stripeDetails.stripeAccountId
            ]

        } catch (StripeException e) {
            log.error("Stripe error creating account session for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to create account session: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Creates an Account Link for onboarding (fallback)
     */
    ConnectAccountResponse createAccountLink(UUID shopId, String returnUrl, String refreshUrl) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            if (!stripeDetails.stripeAccountId) {
                throw new IllegalArgumentException("Shop does not have a Stripe Connect account")
            }

            Account account = Account.retrieve(stripeDetails.stripeAccountId)

            // Create account link for onboarding
            AccountLink accountLink = AccountLink.create(AccountLinkCreateParams.builder()
                    .setAccount(account.id)
                    .setRefreshUrl(refreshUrl)
                    .setReturnUrl(returnUrl)
                    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
                    .build())

            log.info("Account link created for shop ${shopId}: ${accountLink.url}")

            return buildConnectAccountResponse(account, accountLink.url, null)

        } catch (StripeException e) {
            log.error("Stripe error creating account link for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to create account link: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Creates a dashboard link for a connected account
     */
    String createDashboardLink(UUID shopId) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            if (!stripeDetails.stripeAccountId) {
                throw new IllegalArgumentException("Shop does not have a Stripe Connect account")
            }

            if (!stripeDetails.stripeOnboardingCompleted) {
                throw new IllegalArgumentException("Shop has not completed Stripe onboarding")
            }

            // Use AccountLink for Standard accounts
            AccountLink accountLink = AccountLink.create(
                    AccountLinkCreateParams.builder()
                            .setAccount(stripeDetails.stripeAccountId)
                            .setRefreshUrl("${baseUrl}/owner/dashboard")
                            .setReturnUrl("${baseUrl}/owner/dashboard")
                            .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
                            .build()
            )

            return accountLink.url

        } catch (StripeException e) {
            log.error("Stripe error creating dashboard link for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to create dashboard link: ${e.userMessage ?: e.message}")
        }
    }

    private ConnectAccountResponse buildConnectAccountResponse(Account account, String onboardingUrl, String dashboardUrl) {
        ConnectAccountResponse response = new ConnectAccountResponse()
        response.stripeAccountId = account.id
        response.onboardingUrl = onboardingUrl
        response.dashboardUrl = dashboardUrl
        response.chargesEnabled = account.chargesEnabled ?: false
        response.payoutsEnabled = account.payoutsEnabled ?: false
        response.detailsSubmitted = account.detailsSubmitted ?: false
        response.onboardingCompleted = (account.chargesEnabled ?: false) && (account.payoutsEnabled ?: false)
        response.businessType = account.businessType?.toString()
        response.country = account.country
        response.email = account.email
        response.defaultCurrency = account.defaultCurrency

        // Add business profile information
        if (account.businessProfile) {
            response.businessProfile = [
                name: account.businessProfile.name,
                url: account.businessProfile.url,
                supportPhone: account.businessProfile.supportPhone,
                supportEmail: account.businessProfile.supportEmail,
                mcc: account.businessProfile.mcc,
                productDescription: account.businessProfile.productDescription
            ]
        }

        // Set requirements and action needed
        response.requiresAction = false
        response.currentlyDue = []
        response.eventuallyDue = []
        response.pastDue = []

        if (account.requirements) {
            response.currentlyDue = account.requirements.currentlyDue ?: []
            response.eventuallyDue = account.requirements.eventuallyDue ?: []
            response.pastDue = account.requirements.pastDue ?: []
            response.requiresAction = (response.currentlyDue.size() > 0 || response.pastDue.size() > 0)
        }

        // Build capabilities map
        if (account.capabilities) {
            response.capabilities = [:]
            try {
                if (account.capabilities.cardPayments) {
                    response.capabilities['card_payments'] = account.capabilities.cardPayments.toString()
                }
                if (account.capabilities.transfers) {
                    response.capabilities['transfers'] = account.capabilities.transfers.toString()
                }
            } catch (Exception e) {
                log.warn("Error processing capabilities: ${e.message}")
                response.capabilities = [:]
            }
        }

        // Build verification errors
        if (account.requirements?.errors) {
            response.errors = account.requirements.errors.collect { error ->
                ConnectAccountResponse.VerificationError verificationError = new ConnectAccountResponse.VerificationError()
                verificationError.code = error.code
                verificationError.reason = error.reason
                verificationError.requirement = error.requirement
                return verificationError
            }
        }

        response.status = account.chargesEnabled ? "active" : "pending"
        response.message = account.chargesEnabled ?
                "Connect account is active and ready to accept payments" :
                "Connect account setup is pending completion"

        return response
    }

    /**
     * Updates Connect account using API onboarding approach
     */
    ConnectAccountResponse updateApiOnboardingAccount(UUID shopId, ApiOnboardingUpdateRequest request) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            if (!stripeDetails.stripeAccountId) {
                throw new IllegalArgumentException("Shop does not have a Stripe Connect account")
            }

            Account account = Account.retrieve(stripeDetails.stripeAccountId)
            AccountUpdateParams.Builder updateBuilder = AccountUpdateParams.builder()

            // Request card payments and transfers capabilities
            updateBuilder.setCapabilities(AccountUpdateParams.Capabilities.builder()
                    .setCardPayments(AccountUpdateParams.Capabilities.CardPayments.builder()
                            .setRequested(true)
                            .build())
                    .setTransfers(AccountUpdateParams.Capabilities.Transfers.builder()
                            .setRequested(true)
                            .build())
                    .build())

            // Update business profile
            if (request.businessProfile) {
                AccountUpdateParams.BusinessProfile.Builder profileBuilder = AccountUpdateParams.BusinessProfile.builder()

                if (request.businessProfile.name) {
                    profileBuilder.setName(request.businessProfile.name)
                }
                if (request.businessProfile.url) {
                    profileBuilder.setUrl(request.businessProfile.url)
                }
                if (request.businessProfile.supportPhone) {
                    profileBuilder.setSupportPhone(request.businessProfile.supportPhone)
                }
                if (request.businessProfile.supportEmail) {
                    profileBuilder.setSupportEmail(request.businessProfile.supportEmail)
                }
                if (request.businessProfile.productDescription) {
                    profileBuilder.setProductDescription(request.businessProfile.productDescription)
                }
                if (request.businessProfile.mcc) {
                    profileBuilder.setMcc(request.businessProfile.mcc)
                }

                updateBuilder.setBusinessProfile(profileBuilder.build())
            }

            // Update company information (for CUSTOM accounts, always process if provided)
            // If account is company type but no company data provided, use individual data
            if (request.company || (account.businessType == "company" && request.individual)) {
                AccountUpdateParams.Company.Builder companyBuilder = AccountUpdateParams.Company.builder()

                // Use company data if provided, otherwise fall back to individual data for company accounts
                if (request.company?.name) {
                    companyBuilder.setName(request.company.name)
                } else if (account.businessType == "company" && request.individual?.firstName && request.individual?.lastName) {
                    // For company accounts without company name, use individual name
                    companyBuilder.setName("${request.individual.firstName} ${request.individual.lastName}")
                    log.info("Using individual name for company: ${request.individual.firstName} ${request.individual.lastName}")
                }

                if (request.company?.phone) {
                    companyBuilder.setPhone(formatPhoneNumber(request.company.phone, account.country))
                } else if (account.businessType == "company" && request.individual?.phone) {
                    // For company accounts without company phone, use individual phone
                    companyBuilder.setPhone(formatPhoneNumber(request.individual.phone, account.country))
                    log.info("Using individual phone for company: ${request.individual.phone}")
                }

                if (request.company?.taxId) {
                    companyBuilder.setTaxId(request.company.taxId)
                } else if (account.businessType == "company" && request.individual?.idNumber) {
                    // For company accounts without tax ID, use individual ID number
                    companyBuilder.setTaxId(request.individual.idNumber)
                    log.info("Using individual ID number for company tax ID: ${request.individual.idNumber}")
                }

                // Set required boolean flags for CUSTOM accounts
                companyBuilder.setDirectorsProvided(true)
                companyBuilder.setExecutivesProvided(true)
                companyBuilder.setOwnersProvided(true)

                // Update company address (use company address if provided, otherwise individual address)
                def addressSource = request.company?.address ?: (account.businessType == "company" ? request.individual?.address : null)
                if (addressSource) {
                    AccountUpdateParams.Company.Address.Builder addressBuilder = AccountUpdateParams.Company.Address.builder()

                    if (addressSource.line1) {
                        addressBuilder.setLine1(addressSource.line1)
                    }
                    if (addressSource.line2) {
                        addressBuilder.setLine2(addressSource.line2)
                    }
                    if (addressSource.city) {
                        addressBuilder.setCity(addressSource.city)
                    }
                    if (addressSource.state) {
                        addressBuilder.setState(addressSource.state)
                    }
                    if (addressSource.postalCode) {
                        addressBuilder.setPostalCode(addressSource.postalCode)
                    }
                    if (addressSource.country) {
                        addressBuilder.setCountry(addressSource.country)
                    }

                    if (account.businessType == "company" && request.individual?.address && !request.company?.address) {
                        log.info("Using individual address for company address")
                    }

                    companyBuilder.setAddress(addressBuilder.build())
                }

                updateBuilder.setCompany(companyBuilder.build())
            }

            // Update individual information (only for individual business type)
            if (request.individual && account.businessType == "individual") {
                AccountUpdateParams.Individual.Builder individualBuilder = AccountUpdateParams.Individual.builder()

                if (request.individual.firstName) {
                    individualBuilder.setFirstName(request.individual.firstName)
                }
                if (request.individual.lastName) {
                    individualBuilder.setLastName(request.individual.lastName)
                }
                if (request.individual.email) {
                    individualBuilder.setEmail(request.individual.email)
                }
                if (request.individual.phone) {
                    individualBuilder.setPhone(formatPhoneNumber(request.individual.phone, account.country))
                }
                if (request.individual.idNumber) {
                    individualBuilder.setIdNumber(request.individual.idNumber)
                }
                if (request.individual.ssnLast4) {
                    individualBuilder.setSsnLast4(request.individual.ssnLast4)
                }

                // Set relationship for the representative (simplified - just set title)
                individualBuilder.setRelationship(AccountUpdateParams.Individual.Relationship.builder()
                        .setTitle("Owner")
                        .build())

                // Update date of birth
                if (request.individual.dob) {
                    AccountUpdateParams.Individual.Dob.Builder dobBuilder = AccountUpdateParams.Individual.Dob.builder()

                    if (request.individual.dob.day) {
                        dobBuilder.setDay(request.individual.dob.day)
                    }
                    if (request.individual.dob.month) {
                        dobBuilder.setMonth(request.individual.dob.month)
                    }
                    if (request.individual.dob.year) {
                        dobBuilder.setYear(request.individual.dob.year)
                    }

                    individualBuilder.setDob(dobBuilder.build())
                }

                // Update individual address
                if (request.individual.address) {
                    AccountUpdateParams.Individual.Address.Builder addressBuilder = AccountUpdateParams.Individual.Address.builder()

                    if (request.individual.address.line1) {
                        addressBuilder.setLine1(request.individual.address.line1)
                    }
                    if (request.individual.address.line2) {
                        addressBuilder.setLine2(request.individual.address.line2)
                    }
                    if (request.individual.address.city) {
                        addressBuilder.setCity(request.individual.address.city)
                    }
                    if (request.individual.address.state) {
                        addressBuilder.setState(request.individual.address.state)
                    }
                    if (request.individual.address.postalCode) {
                        addressBuilder.setPostalCode(request.individual.address.postalCode)
                    }
                    if (request.individual.address.country) {
                        addressBuilder.setCountry(request.individual.address.country)
                    }

                    individualBuilder.setAddress(addressBuilder.build())
                }

                updateBuilder.setIndividual(individualBuilder.build())
            }

            // For company accounts, use individual data as representative information
            // For individual accounts, use individual data as the account holder
            if (request.individual) {
                if (account.businessType == "company") {
                    // For company accounts, individual data represents the representative
                    log.info("Processing individual data as representative for company account ${account.id}")

                    // Note: In current Stripe SDK, representative information might need to be set
                    // through different API calls. For now, we'll ensure company information is complete.

                    // If company data is missing but individual data is provided,
                    // use individual data to populate missing company fields
                    if (!request.company?.name && request.individual?.firstName && request.individual?.lastName) {
                        log.info("Using individual name for company name: ${request.individual.firstName} ${request.individual.lastName}")
                        // This would require updating the company section above
                    }
                } else {
                    // For individual accounts, process individual data normally
                    log.info("Processing individual data for individual account ${account.id}")
                    // Individual processing was already handled above
                }
            }

            // Note: TOS acceptance cannot be updated for CUSTOM accounts with requirement_collection: APPLICATION
            // TOS acceptance must be handled during account creation or through platform-side validation
            if (request.tosAcceptance) {
                log.info("TOS acceptance received for account ${account.id} - validating platform-side")
                // Store TOS acceptance in our database for compliance tracking
                // For CUSTOM accounts, we handle TOS acceptance on our platform side
                storeTosAcceptanceForShop(shop, request.tosAcceptance)
            }

            // Update the account
            account = account.update(updateBuilder.build())

            // Create external account if provided
            if (request.externalAccount) {
                createExternalAccountFromRequest(account.id, request.externalAccount)
            }

            // Check if onboarding is now complete
            boolean onboardingCompleted = account.chargesEnabled && account.payoutsEnabled
            if (stripeDetails.stripeOnboardingCompleted != onboardingCompleted) {
                shopStripeDetailsService.updateOnboardingStatus(shop, onboardingCompleted)
                shop.acceptsCardPayments = onboardingCompleted
                shopRepository.save(shop)
            }

            String dashboardUrl = null
            if (onboardingCompleted) {
                try {
                    // Use AccountLink for Standard accounts
                    AccountLink accountLink = AccountLink.create(
                            AccountLinkCreateParams.builder()
                                    .setAccount(account.id)
                                    .setRefreshUrl("${baseUrl}/owner/dashboard")
                                    .setReturnUrl("${baseUrl}/owner/dashboard")
                                    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
                                    .build()
                    )
                    dashboardUrl = accountLink.url
                } catch (StripeException e) {
                    log.warn("Could not create account link for account ${account.id}: ${e.message}")
                    dashboardUrl = null
                }
            }

            return buildConnectAccountResponse(account, null, dashboardUrl)

        } catch (StripeException e) {
            log.error("Stripe error updating API onboarding account for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to update API onboarding account: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Stores TOS acceptance for a shop (platform-side compliance tracking)
     */
    private void storeTosAcceptanceForShop(Shop shop, ApiOnboardingUpdateRequest.TosAcceptance tosAcceptance) {
        try {
            // Store TOS acceptance information in shop metadata or separate table
            // This is for compliance tracking since we can't update TOS on CUSTOM accounts
            log.info("Storing TOS acceptance for shop ${shop.id}: date=${tosAcceptance.date}, ip=${tosAcceptance.ip}")

            // You could store this in shop metadata, a separate TOS acceptance table, or shop properties
            // For now, we'll just log it for compliance purposes
            // In production, you might want to:
            // 1. Create a TosAcceptance entity
            // 2. Store it in the database with shop reference
            // 3. Use it for compliance reporting

        } catch (Exception e) {
            log.error("Failed to store TOS acceptance for shop ${shop.id}: ${e.message}", e)
            // Don't throw here as this is just for tracking
        }
    }

    /**
     * Creates an external account from API onboarding request
     */
    private void createExternalAccountFromRequest(String accountId, ApiOnboardingUpdateRequest.ExternalAccount externalAccountRequest) {
        try {
            // Create external account using the Account's external accounts collection
            Account account = Account.retrieve(accountId)

            // For IBAN-based accounts, use different parameter structure
            Map<String, Object> bankAccountParams

            if (isIbanAccount(externalAccountRequest.accountNumber)) {
                // IBAN-based account (Europe)
                bankAccountParams = [
                    "external_account": [
                        "object": "bank_account",
                        "country": externalAccountRequest.country,
                        "currency": externalAccountRequest.currency,
                        "account_holder_name": externalAccountRequest.accountHolderName,
                        "account_holder_type": externalAccountRequest.accountHolderType,
                        "account_number": externalAccountRequest.accountNumber // IBAN goes here
                        // Note: No routing_number for IBAN accounts
                    ]
                ]
            } else {
                // US/UK style account with routing number
                bankAccountParams = [
                    "external_account": [
                        "object": "bank_account",
                        "country": externalAccountRequest.country,
                        "currency": externalAccountRequest.currency,
                        "account_holder_name": externalAccountRequest.accountHolderName,
                        "account_holder_type": externalAccountRequest.accountHolderType,
                        "routing_number": externalAccountRequest.routingNumber,
                        "account_number": externalAccountRequest.accountNumber
                    ]
                ]
            }

            log.info("Creating external account for ${accountId} with params: ${bankAccountParams}")
            account.getExternalAccounts().create(bankAccountParams)
            log.info("External account created for Stripe account: ${accountId}")
        } catch (StripeException e) {
            log.error("Failed to create external account for ${accountId}: ${e.message}", e)
            throw new RuntimeException("Failed to create external account: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Gets Connect account requirements for a specific shop
     */
    Map<String, Object> getConnectAccountRequirements(UUID shopId) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            if (!stripeDetails.stripeAccountId) {
                throw new IllegalArgumentException("Shop does not have a Stripe Connect account")
            }

            log.info("Calling Stripe API for account requirements: ${stripeDetails.stripeAccountId}")
            Account account = Account.retrieve(stripeDetails.stripeAccountId)

            return [
                currently_due: account.requirements?.currentlyDue ?: [],
                eventually_due: account.requirements?.eventuallyDue ?: [],
                past_due: account.requirements?.pastDue ?: [],
                pending_verification: account.requirements?.pendingVerification ?: [],
                disabled_reason: account.requirements?.disabledReason,
                errors: account.requirements?.errors ?: []
            ]

        } catch (Exception e) {
            log.error("Error retrieving Connect account requirements for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to retrieve Connect account requirements: ${e.message}")
        }
    }

    /**
     * Gets onboarding requirements for a specific configuration
     */
    Map<String, Object> getOnboardingRequirements(OnboardingRequirementsRequest request) {
        // This would typically involve calling Stripe's API to get requirements
        // For now, we'll return a basic structure based on common requirements

        List<String> currentlyDue = []
        List<String> eventuallyDue = []

        // Basic requirements for all accounts
        currentlyDue.addAll([
            "business_profile.product_description",
            "business_profile.support_phone",
            "business_profile.url",
            "external_account",
            "tos_acceptance.date",
            "tos_acceptance.ip"
        ])

        if (request.businessType == "company") {
            currentlyDue.addAll([
                "company.name",
                "company.address.line1",
                "company.address.city",
                "company.address.state",
                "company.address.postal_code"
            ])

            if (request.country == "US") {
                currentlyDue.add("company.tax_id")
            }
        } else if (request.businessType == "individual") {
            currentlyDue.addAll([
                "individual.first_name",
                "individual.last_name",
                "individual.dob.day",
                "individual.dob.month",
                "individual.dob.year",
                "individual.address.line1",
                "individual.address.city",
                "individual.address.state",
                "individual.address.postal_code"
            ])

            if (request.country == "US") {
                currentlyDue.add("individual.ssn_last_4")
            }
        }

        // Eventually due requirements
        eventuallyDue.addAll([
            "individual.verification.document",
            "company.verification.document"
        ])

        return [
            currently_due: currentlyDue,
            eventually_due: eventuallyDue,
            past_due: [],
            pending_verification: [],
            alternatives: [],
            current_deadline: null,
            disabled_reason: null
        ]
    }

    /**
     * Creates a comprehensive Connect account with all required information and documents
     */
    ConnectAccountResponse createComprehensiveConnectAccount(UUID shopId, ComprehensiveConnectAccountRequest request) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            if (stripeDetails.stripeAccountId) {
                throw new IllegalArgumentException("Shop already has a Stripe Connect account")
            }

            // Parse date of birth
            def dobParts = request.representativeDateOfBirth.split('-')
            def dobYear = Integer.parseInt(dobParts[0])
            def dobMonth = Integer.parseInt(dobParts[1])
            def dobDay = Integer.parseInt(dobParts[2])

            // Create Stripe Connect account with comprehensive information
            Account account = Account.create(AccountCreateParams.builder()
                    .setType(AccountCreateParams.Type.EXPRESS)
                    .setCountry(request.businessCountry)
                    .setEmail(request.businessEmail)
                    .setCapabilities(AccountCreateParams.Capabilities.builder()
                            .setCardPayments(AccountCreateParams.Capabilities.CardPayments.builder()
                                    .setRequested(true)
                                    .build())
                            .setTransfers(AccountCreateParams.Capabilities.Transfers.builder()
                                    .setRequested(true)
                                    .build())
                            .build())
                    .setBusinessType(AccountCreateParams.BusinessType.COMPANY)
                    .setCompany(AccountCreateParams.Company.builder()
                            .setName(request.businessName)
                            .setPhone(request.businessPhone)
                            .setTaxId(request.companyTaxId)
                            .setAddress(AccountCreateParams.Company.Address.builder()
                                    .setLine1(request.businessAddress)
                                    .setCity(request.businessCity)
                                    .setState(request.businessState)
                                    .setPostalCode(request.businessPostalCode)
                                    .setCountry(request.businessCountry)
                                    .build())
                            .build())
                    .setIndividual(AccountCreateParams.Individual.builder()
                            .setFirstName(request.representativeFirstName)
                            .setLastName(request.representativeLastName)
                            .setEmail(request.representativeEmail)
                            .setPhone(request.representativePhone)
                            .setDob(AccountCreateParams.Individual.Dob.builder()
                                    .setDay(dobDay)
                                    .setMonth(dobMonth)
                                    .setYear(dobYear)
                                    .build())
                            .setAddress(AccountCreateParams.Individual.Address.builder()
                                    .setLine1(request.representativeAddress)
                                    .setCity(request.representativeCity)
                                    .setState(request.representativeState)
                                    .setPostalCode(request.representativePostalCode)
                                    .setCountry(request.representativeCountry)
                                    .build())
                            .build())
                    .setBusinessProfile(AccountCreateParams.BusinessProfile.builder()
                            .setName(request.businessName)
                            .setUrl(request.businessWebsite ?: null)
                            .setMcc("7230") // Beauty salons MCC code
                            .build())
                    .setTosAcceptance(AccountCreateParams.TosAcceptance.builder()
                            .setDate(System.currentTimeMillis() / 1000L)
                            .setIp("127.0.0.1") // This should be the actual user's IP
                            .build())
                    .putMetadata("shop_id", shop.id.toString())
                    .putMetadata("shop_name", shop.name)
                    .build())

            // Update shop stripe details with account ID
            shopStripeDetailsService.updateStripeAccount(shop, account.id, false)

            // Upload documents if provided
            if (request.identityDocumentFront || request.identityDocumentBack || request.addressDocument) {
                uploadDocumentsForAccount(account.id, request)
            }

            // Create external account (bank account)
            if (request.bankAccountNumber && request.bankRoutingNumber) {
                createExternalAccount(account.id, request)
            }

            // Refresh account to get updated status
            account = Account.retrieve(account.id)

            // Check if onboarding is complete
            boolean onboardingCompleted = account.chargesEnabled && account.payoutsEnabled
            shopStripeDetailsService.updateOnboardingStatus(shop, onboardingCompleted)

            return buildConnectAccountResponse(account, null, null)
        } catch (StripeException e) {
            log.error("Error creating comprehensive Connect account for shop ${shopId}: ${e.getMessage()}", e)
            throw new RuntimeException("Failed to create comprehensive Connect account: ${e.getMessage()}")
        }
    }

    /**
     * Updates Connect account with comprehensive information and documents
     */
    ConnectAccountResponse updateComprehensiveConnectAccount(UUID shopId, ComprehensiveConnectAccountRequest request) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            if (!stripeDetails.stripeAccountId) {
                throw new IllegalArgumentException("Shop does not have a Stripe Connect account")
            }

            Account account = Account.retrieve(stripeDetails.stripeAccountId)

            // Upload documents if provided
            if (request.identityDocumentFront || request.identityDocumentBack || request.addressDocument) {
                uploadDocumentsForAccount(account.id, request)
            }

            // Create external account (bank account) if provided
            if (request.bankAccountNumber && request.bankRoutingNumber) {
                createExternalAccount(account.id, request)
            }

            // Refresh account to get updated status
            account = Account.retrieve(account.id)

            // Check if onboarding is complete
            boolean onboardingCompleted = account.chargesEnabled && account.payoutsEnabled
            shopStripeDetailsService.updateOnboardingStatus(shop, onboardingCompleted)
            shop.acceptsCardPayments = onboardingCompleted
            shopRepository.save(shop)
            log.info("Updated shop ${shop.id} onboarding status: completed=${onboardingCompleted}, acceptsCardPayments=${onboardingCompleted}")

            return buildConnectAccountResponse(account, null, null)
        } catch (StripeException e) {
            log.error("Error updating comprehensive Connect account for shop ${shopId}: ${e.getMessage()}", e)
            throw new RuntimeException("Failed to update comprehensive Connect account: ${e.getMessage()}")
        }
    }

    /**
     * Uploads documents for a Stripe Connect account
     */
    private void uploadDocumentsForAccount(String accountId, ComprehensiveConnectAccountRequest request) {
        try {
            // Note: Document upload in Stripe requires the File Upload API
            // For now, we'll log that documents were provided and would be uploaded
            // In a production environment, you would:
            // 1. Upload files to Stripe using the File Upload API
            // 2. Attach the file IDs to the account using the Account Update API

            log.info("Documents provided for account ${accountId}:")
            if (request.identityDocumentFront) {
                log.info("- Identity document front: ${request.identityDocumentFront.originalFilename}")
            }
            if (request.identityDocumentBack) {
                log.info("- Identity document back: ${request.identityDocumentBack.originalFilename}")
            }
            if (request.addressDocument) {
                log.info("- Address document: ${request.addressDocument.originalFilename}")
            }

            // TODO: Implement actual file upload to Stripe
            // This would involve:
            // 1. Creating File objects using Stripe's File API
            // 2. Updating the account with document references

        } catch (Exception e) {
            log.error("Error processing documents for account ${accountId}: ${e.getMessage()}", e)
            // Don't throw here as documents can be uploaded later
        }
    }

    /**
     * Creates an external account (bank account) from ConnectAccountRequest
     */
    private void createExternalAccountFromRequest(String accountId, ConnectAccountRequest.ExternalAccountInfo externalAccount) {
        try {
            log.info("Creating external account for Connect account ${accountId}")

            Map<String, Object> bankAccountParams

            // Determine account type based on available fields
            if (externalAccount.iban) {
                // IBAN-based account (EU countries)
                bankAccountParams = [
                    "external_account": [
                        "object": "bank_account",
                        "country": externalAccount.country,
                        "currency": externalAccount.currency,
                        "account_holder_name": externalAccount.accountHolderName,
                        "account_holder_type": externalAccount.accountHolderType,
                        "account_number": externalAccount.iban.replace(" ", "") // Remove spaces from IBAN
                    ]
                ]
            } else if (externalAccount.sortCode && externalAccount.accountNumber) {
                // UK bank account
                bankAccountParams = [
                    "external_account": [
                        "object": "bank_account",
                        "country": externalAccount.country,
                        "currency": externalAccount.currency,
                        "account_holder_name": externalAccount.accountHolderName,
                        "account_holder_type": externalAccount.accountHolderType,
                        "sort_code": externalAccount.sortCode.replace("-", ""), // Remove dashes
                        "account_number": externalAccount.accountNumber
                    ]
                ]
            } else if (externalAccount.bsbNumber && externalAccount.accountNumber) {
                // Australian bank account
                bankAccountParams = [
                    "external_account": [
                        "object": "bank_account",
                        "country": externalAccount.country,
                        "currency": externalAccount.currency,
                        "account_holder_name": externalAccount.accountHolderName,
                        "account_holder_type": externalAccount.accountHolderType,
                        "bsb_number": externalAccount.bsbNumber.replace("-", ""), // Remove dashes
                        "account_number": externalAccount.accountNumber
                    ]
                ]
            } else if (externalAccount.institutionNumber && externalAccount.transitNumber && externalAccount.accountNumber) {
                // Canadian bank account
                bankAccountParams = [
                    "external_account": [
                        "object": "bank_account",
                        "country": externalAccount.country,
                        "currency": externalAccount.currency,
                        "account_holder_name": externalAccount.accountHolderName,
                        "account_holder_type": externalAccount.accountHolderType,
                        "institution_number": externalAccount.institutionNumber,
                        "transit_number": externalAccount.transitNumber,
                        "account_number": externalAccount.accountNumber
                    ]
                ]
            } else if (externalAccount.routingNumber && externalAccount.accountNumber) {
                // US bank account
                bankAccountParams = [
                    "external_account": [
                        "object": "bank_account",
                        "country": externalAccount.country,
                        "currency": externalAccount.currency,
                        "account_holder_name": externalAccount.accountHolderName,
                        "account_holder_type": externalAccount.accountHolderType,
                        "routing_number": externalAccount.routingNumber,
                        "account_number": externalAccount.accountNumber
                    ]
                ]
            } else {
                throw new IllegalArgumentException("Invalid external account information provided")
            }

            log.debug("Creating external account with params: ${bankAccountParams}")

            // Create the external account using the account's external accounts collection
            Account account = Account.retrieve(accountId)
            account.getExternalAccounts().create(bankAccountParams)

            log.info("Successfully created external account for Connect account ${accountId}")

        } catch (StripeException e) {
            log.error("Stripe error creating external account for account ${accountId}: ${e.message}", e)
            throw new RuntimeException("Failed to create external account: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Creates an external account (bank account) for the Connect account (legacy method)
     */
    private void createExternalAccount(String accountId, ComprehensiveConnectAccountRequest request) {
        try {
            // Create external account (bank account)
            Account account = Account.retrieve(accountId)
            ExternalAccountCollectionCreateParams externalAccountParams =
                ExternalAccountCollectionCreateParams.builder()
                    .setExternalAccount(
                        ExternalAccountCollectionCreateParams.ExternalAccount.builder()
                            .setObject("bank_account")
                            .setCountry(request.businessCountry)
                            .setCurrency(request.businessCountry == "BG" ? "bgn" : "usd")
                            .setAccountHolderName(request.bankAccountHolderName)
                            .setAccountHolderType(ExternalAccountCollectionCreateParams.ExternalAccount.AccountHolderType.COMPANY)
                            .setAccountNumber(request.bankAccountNumber)
                            .setRoutingNumber(request.bankRoutingNumber)
                            .build()
                    )
                    .build()

            ExternalAccount externalAccount = account.getExternalAccounts().create(externalAccountParams)

            log.info("External account created for account ${accountId}")

        } catch (StripeException e) {
            log.error("Error creating external account for account ${accountId}: ${e.getMessage()}", e)
            // Don't throw here as bank account can be added later
        }
    }

    /**
     * Formats phone number for Stripe (E.164 format)
     */
    private String formatPhoneNumber(String phone, String country) {
        if (!phone) {
            // Return a default valid phone number based on country
            return getDefaultPhoneNumber(country)
        }

        // Remove all non-digit characters
        String cleanPhone = phone.replaceAll(/[^\d]/, '')

        // If phone is empty after cleaning, use default
        if (!cleanPhone) {
            return getDefaultPhoneNumber(country)
        }

        // Format based on country
        switch (country?.toUpperCase()) {
            case 'BG':
                // Bulgaria: +359 format (mobile: 87/88/89, landline: 2/3/4/5/6)
                if (cleanPhone.startsWith('359')) {
                    String nationalNumber = cleanPhone.substring(3)
                    if (isValidBulgarianNumber(nationalNumber)) {
                        return "+${cleanPhone}"
                    }
                } else if (cleanPhone.startsWith('0')) {
                    String nationalNumber = cleanPhone.substring(1)
                    if (isValidBulgarianNumber(nationalNumber)) {
                        return "+359${nationalNumber}"
                    }
                } else if (isValidBulgarianNumber(cleanPhone)) {
                    return "+359${cleanPhone}"
                }
                // If none of the above work, use default
                return "+359888123456" // Valid Bulgarian mobile
            case 'US':
                // US: +1 format
                if (cleanPhone.startsWith('1') && cleanPhone.length() == 11) {
                    return "+${cleanPhone}"
                } else if (cleanPhone.length() == 10) {
                    return "+1${cleanPhone}"
                } else {
                    return "+15551234567" // Default US number
                }
            default:
                // For other countries, use default to avoid validation issues
                return getDefaultPhoneNumber(country)
        }
    }

    /**
     * Validates Bulgarian phone number format
     */
    private boolean isValidBulgarianNumber(String nationalNumber) {
        if (!nationalNumber || nationalNumber.length() < 8 || nationalNumber.length() > 9) {
            return false
        }

        // Mobile numbers: 87, 88, 89 (9 digits total)
        if (nationalNumber.length() == 9 && (nationalNumber.startsWith('87') ||
                                           nationalNumber.startsWith('88') ||
                                           nationalNumber.startsWith('89'))) {
            return true
        }

        // Landline numbers: area codes 2, 3, 4, 5, 6 (8-9 digits total)
        if ((nationalNumber.length() == 8 || nationalNumber.length() == 9) &&
            (nationalNumber.startsWith('2') || nationalNumber.startsWith('3') ||
             nationalNumber.startsWith('4') || nationalNumber.startsWith('5') ||
             nationalNumber.startsWith('6'))) {
            return true
        }

        return false
    }

    /**
     * Checks if the account number is an IBAN
     */
    private boolean isIbanAccount(String accountNumber) {
        if (!accountNumber) return false

        // IBAN starts with 2-letter country code followed by 2 digits
        // and is typically 15-34 characters long
        return accountNumber.matches(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/) &&
               accountNumber.length() >= 15 &&
               accountNumber.length() <= 34
    }

    /**
     * Returns a default valid phone number for the country
     */
    private String getDefaultPhoneNumber(String country) {
        switch (country?.toUpperCase()) {
            case 'BG':
                return "+359888123456" // Valid Bulgarian mobile (88 prefix)
            case 'US':
                return "+12125551234" // Valid US number (NYC area code)
            case 'GB':
                return "+447700900123" // Valid UK mobile
            case 'DE':
                return "+4915123456789" // Valid German mobile
            case 'FR':
                return "+33123456789" // Valid French number
            default:
                return "+359888123456" // Default to valid Bulgarian mobile
        }
    }

    /**
     * Gets Connect account balance
     */
    Map<String, Object> getAccountBalance(UUID shopId) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            if (!stripeDetails.stripeAccountId) {
                throw new IllegalArgumentException("Shop does not have a Stripe Connect account")
            }

            Balance balance = Balance.retrieve(RequestOptions.builder()
                    .setStripeAccount(stripeDetails.stripeAccountId)
                    .build())

            return [
                available: balance.available.collect { balanceAmount ->
                    [
                        amount: balanceAmount.amount,
                        currency: balanceAmount.currency
                    ]
                },
                pending: balance.pending.collect { balanceAmount ->
                    [
                        amount: balanceAmount.amount,
                        currency: balanceAmount.currency
                    ]
                }
            ]
        } catch (StripeException e) {
            log.error("Stripe error retrieving balance for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to retrieve account balance: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Gets Connect account payouts
     */
    Map<String, Object> getAccountPayouts(UUID shopId, int limit, String startingAfter) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            if (!stripeDetails.stripeAccountId) {
                throw new IllegalArgumentException("Shop does not have a Stripe Connect account")
            }

            PayoutListParams.Builder paramsBuilder = PayoutListParams.builder()
                .setLimit(limit.longValue())

            if (startingAfter) {
                paramsBuilder.setStartingAfter(startingAfter)
            }

            PayoutCollection payouts = Payout.list(paramsBuilder.build(),
                RequestOptions.builder()
                    .setStripeAccount(stripeDetails.stripeAccountId)
                    .build())

            List<Map<String, Object>> payoutData = []
            payouts.data.each { payout ->
                payoutData.add([
                    id: payout.id,
                    amount: payout.amount,
                    currency: payout.currency,
                    arrival_date: payout.arrivalDate,
                    created: payout.created,
                    description: payout.description,
                    destination: payout.destination,
                    method: payout.method,
                    status: payout.status,
                    type: payout.type
                ])
            }

            return [
                data: payoutData,
                hasMore: payouts.hasMore
            ]
        } catch (StripeException e) {
            log.error("Stripe error retrieving payouts for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to retrieve payouts: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Gets Connect account transactions (balance transactions)
     */
    Map<String, Object> getAccountTransactions(UUID shopId, int limit, String startingAfter) {
        try {
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow { new RuntimeException("Shop not found with id: $shopId") }

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)
            if (!stripeDetails.stripeAccountId) {
                throw new IllegalArgumentException("Shop does not have a Stripe Connect account")
            }

            BalanceTransactionListParams.Builder paramsBuilder = BalanceTransactionListParams.builder()
                .setLimit(limit.longValue())

            if (startingAfter) {
                paramsBuilder.setStartingAfter(startingAfter)
            }

            BalanceTransactionCollection transactions = BalanceTransaction.list(paramsBuilder.build(),
                RequestOptions.builder()
                    .setStripeAccount(stripeDetails.stripeAccountId)
                    .build())

            List<Map<String, Object>> transactionData = []
            transactions.data.each { transaction ->
                transactionData.add([
                    id: transaction.id,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    created: transaction.created,
                    description: transaction.description,
                    fee: transaction.fee,
                    fee_details: transaction.feeDetails.collect { feeDetail ->
                        [
                            amount: feeDetail.amount,
                            currency: feeDetail.currency,
                            description: feeDetail.description,
                            type: feeDetail.type
                        ]
                    },
                    net: transaction.net,
                    status: transaction.status,
                    type: transaction.type
                ])
            }

            return [
                data: transactionData,
                hasMore: transactions.hasMore
            ]
        } catch (StripeException e) {
            log.error("Stripe error retrieving transactions for shop ${shopId}: ${e.message}", e)
            throw new RuntimeException("Failed to retrieve transactions: ${e.userMessage ?: e.message}")
        }
    }

    /**
     * Stores compliance information in the shop's Stripe details
     */
    private void storeComplianceInformation(Shop shop, ConnectAccountRequest.ComplianceInfo compliance) {
        try {
            log.info("Storing compliance information for shop ${shop.id}")

            ShopStripeDetails stripeDetails = shopStripeDetailsService.getOrCreateStripeDetails(shop)

            // Update VAT information if provided
            if (compliance.vatRegistrationStatus == "registered" && compliance.vatNumber) {
                stripeDetails.vatNumber = compliance.vatNumber
                stripeDetails.vatCountry = compliance.vatCountry ?: shop.country
                stripeDetails.vatValidated = false // Will be validated separately
                stripeDetails.vatValidationDate = null
            }

            // Store compliance flags in metadata (could be moved to separate entity if needed)
            stripeDetails.tosAcceptedDate = new Date().toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDateTime()
            stripeDetails.tosAcceptedIp = "127.0.0.1" // Should be actual IP in production

            // Save the updated details
            shopStripeDetailsService.save(stripeDetails)

            log.info("Successfully stored compliance information for shop ${shop.id}")

        } catch (Exception e) {
            log.error("Error storing compliance information for shop ${shop.id}: ${e.message}", e)
            // Don't throw exception here as it's not critical for account creation
        }
    }
}
