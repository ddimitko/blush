import SwiftUI
import StripePaymentSheet
import StripePayments


struct SubscriptionManagementView: View {
    let shop: Shop
    @StateObject private var apiClient = APIClient.shared
    @State private var subscriptionDetails: SubscriptionDetails?
    @State private var paymentMethods: [StripePaymentMethod] = []
    @State private var invoices: [StripeInvoice] = []
    @State private var upcomingInvoice: StripeInvoice?
    @State private var isLoading = true
    @State private var isUpdating = false
    @State private var errorMessage: String?
    @State private var selectedTab: SubscriptionTab = .overview
    @State private var showingCancelConfirmation = false
    @State private var showingReactivateConfirmation = false
    @Environment(\.dismiss) private var dismiss

    // Add Payment Method state
    @State private var addPmSheet: PaymentSheet?
    @State private var isPresentingAddPmSheet = false
    @State private var addPmError: String?

    enum SubscriptionTab: String, CaseIterable {
        case overview = "Overview"
        case paymentMethods = "Payment Methods"
        case invoices = "Invoices"

        var icon: String {
            switch self {
            case .overview:
                return "chart.bar.fill"
            case .paymentMethods:
                return "creditcard.fill"
            case .invoices:
                return "doc.text.fill"
            }
        }
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Tab Selector
                tabSelector

                // Content
                if isLoading {
                    loadingView
                } else if let error = errorMessage {
                    errorView(error)
                } else {
                    tabContent
                }
            }
            .navigationTitle("Subscription")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: refreshData) {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(isUpdating)
                }
            }
        }
        .onAppear {
            loadSubscriptionData()
        }
        .alert("Cancel Subscription", isPresented: $showingCancelConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Confirm", role: .destructive) {
                Task { await cancelSubscription() }
            }
        } message: {
            Text("Are you sure you want to cancel your subscription? It will remain active until the end of your current billing period.")
        }
        .alert("Reactivate Subscription", isPresented: $showingReactivateConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Reactivate") {
                Task { await reactivateSubscription() }
            }
        } message: {
            Text("Your subscription will be reactivated and billing will resume.")
        }
    }

    // MARK: - Tab Selector
    private var tabSelector: some View {
        HStack(spacing: 0) {
            ForEach(SubscriptionTab.allCases, id: \.self) { tab in
                Button(action: {
                    selectedTab = tab
                    loadTabData()
                }) {
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 16))

                        Text(tab.rawValue)
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(selectedTab == tab ? LunaraColors.warmGold : LunaraColors.secondaryText)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
            }
        }
        .background(LunaraColors.coolLightGray.opacity(0.3))
        .overlay(
            Rectangle()
                .fill(LunaraColors.warmGold)
                .frame(height: 2)
                .offset(x: tabIndicatorOffset, y: 0)
                .animation(.easeInOut(duration: 0.3), value: selectedTab),
            alignment: .bottom
        )
    }

    private var tabIndicatorOffset: CGFloat {
        let tabWidth = UIScreen.main.bounds.width / CGFloat(SubscriptionTab.allCases.count)
        let index = CGFloat(SubscriptionTab.allCases.firstIndex(of: selectedTab) ?? 0)
        return (index * tabWidth) - (UIScreen.main.bounds.width / 2) + (tabWidth / 2)
    }

    // MARK: - Tab Content
    @ViewBuilder
    private var tabContent: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                switch selectedTab {
                case .overview:
                    overviewContent
                case .paymentMethods:
                    paymentMethodsContent
                case .invoices:
                    invoicesContent
                }
            }
            .padding(16)
        }
    }

    // MARK: - Overview Content
    private var overviewContent: some View {
        VStack(spacing: 16) {
            if let subscription = subscriptionDetails {
                subscriptionOverviewCard(subscription)
                subscriptionActionsCard(subscription)

                if let upcoming = upcomingInvoice {
                    upcomingInvoiceCard(upcoming)
                }
            }
        }
    }

    private func subscriptionOverviewCard(_ subscription: SubscriptionDetails) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Current Plan")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(LunaraColors.secondaryText)

                    Text(subscription.planDisplayName)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text(subscription.formattedAmountWithInterval)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text(subscription.subscriptionStatusText)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(subscription.isActiveSubscription ? LunaraColors.success : LunaraColors.warning)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(
                            RoundedRectangle(cornerRadius: 4)
                                .fill((subscription.isActiveSubscription ? LunaraColors.success : LunaraColors.warning).opacity(0.1))
                        )
                }
            }

            Divider()

            VStack(spacing: 12) {
                if let trialText = subscription.trialDaysRemainingText {
                    HStack {
                        Image(systemName: "clock.fill")
                            .foregroundColor(LunaraColors.warmGold)
                        Text("Trial: \(trialText)")
                            .font(.system(size: 14))
                            .foregroundColor(LunaraColors.primaryText)
                        Spacer()
                    }
                }

                HStack {
                    Image(systemName: "calendar")
                        .foregroundColor(LunaraColors.secondaryText)
                    Text("Next billing: \(subscription.nextBillingDateFormatted)")
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.primaryText)
                    Spacer()
                }

                HStack {
                    Image(systemName: "person.circle")
                        .foregroundColor(LunaraColors.secondaryText)
                    Text("Customer ID: \(subscription.customerId)")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                    Spacer()
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }

    private func subscriptionActionsCard(_ subscription: SubscriptionDetails) -> some View {
        VStack(spacing: 12) {
            Text("Subscription Actions")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)
                .frame(maxWidth: .infinity, alignment: .leading)

            VStack(spacing: 8) {
                if subscription.cancelAtPeriodEnd {
                    Button(action: { showingReactivateConfirmation = true }) {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                            Text("Reactivate Subscription")
                        }
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(LunaraColors.success)
                        .cornerRadius(8)
                    }
                    .disabled(isUpdating)
                } else {
                    Button(action: { showingCancelConfirmation = true }) {
                        HStack {
                            Image(systemName: "xmark.circle")
                            Text("Cancel Subscription")
                        }
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(LunaraColors.error)
                        .cornerRadius(8)
                    }
                    .disabled(isUpdating)
                }

                Button(action: { Task { await openCustomerPortal() } }) {
                    HStack {
                        Image(systemName: "link")
                        Text("Manage in Stripe Portal")
                    }
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(LunaraColors.warmGold.opacity(0.1))
                    .cornerRadius(8)
                }
                .disabled(isUpdating)
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }

    private func upcomingInvoiceCard(_ invoice: StripeInvoice) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Upcoming Invoice")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Amount Due")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                    Text(invoice.formattedAmountDue)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("Period")
                        .font(.system(size: 12))
                        .foregroundColor(LunaraColors.secondaryText)
                    Text(invoice.periodText)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.primaryText)
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }

    // MARK: - Payment Methods Content
    private var paymentMethodsContent: some View {
        VStack(spacing: 16) {
            if paymentMethods.isEmpty {
                emptyPaymentMethodsView
            } else {
                ForEach(paymentMethods) { paymentMethod in
                    paymentMethodCard(paymentMethod)
                }
            Button(action: { Task { await addPaymentMethod() } }) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("Add Payment Method")
                }
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(LunaraColors.warmGold)
                .cornerRadius(8)
            }

            }
        }
    }

    private var emptyPaymentMethodsView: some View {
        VStack(spacing: 16) {
            Image(systemName: "creditcard")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.secondaryText)

            Text("No Payment Methods")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)

            Text("Add a payment method to manage your subscription billing.")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
        }
        .padding(40)
        .background(LunaraColors.white)
        .cornerRadius(12)
    }

    private func addPaymentMethod() async {
        do {
            // 1) Create a customer SetupIntent on backend (for current user)
            let si = try await APIClient.shared.createUserSetupIntent()

            // 2) Configure PaymentSheet for SetupIntent
            var config = PaymentSheet.Configuration()
            config.merchantDisplayName = shop.name
            // Align Apple Pay country to shop; not used for SetupIntent payment method collection by default
            config.applePay = .init(merchantId: "merchant.com.lunara.LunaraApp", merchantCountryCode: shop.country)

            // 3) Present PaymentSheet for SetupIntent
            await MainActor.run {
                self.addPmSheet = PaymentSheet(setupIntentClientSecret: si.clientSecret, configuration: config)
                self.isPresentingAddPmSheet = true
            }

            await presentAddPmSheet()

            // 4) Refresh payment methods
            await loadPaymentMethods()
        } catch {
            await MainActor.run {
                self.addPmError = error.localizedDescription
            }
        }
    }

    @MainActor
    private func presentAddPmSheet() async {
        guard let addPmSheet else { return }
        let presenter = (UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow })?.rootViewController
        guard let presenter else { return }
        addPmSheet.present(from: presenter) { result in
            switch result {
            case .completed:
                break
            case .canceled:
                break
            case .failed(let error):
                self.addPmError = error.localizedDescription
            }
        }
    }

    private func paymentMethodCard(_ paymentMethod: StripePaymentMethod) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "creditcard.fill")
                    .foregroundColor(LunaraColors.warmGold)

                VStack(alignment: .leading, spacing: 4) {
                    Text(paymentMethod.displayName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text("Expires \(paymentMethod.expirationText)")
                        .font(.system(size: 14))
                        .foregroundColor(paymentMethod.isExpired ? LunaraColors.error : LunaraColors.secondaryText)
                }

                Spacer()

                if paymentMethod.isDefault {
                    Text("Default")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(LunaraColors.success)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            RoundedRectangle(cornerRadius: 4)
                                .fill(LunaraColors.success.opacity(0.1))
                        )
                }
            }

            if !paymentMethod.isDefault {
                HStack(spacing: 8) {
                    Button("Set as Default") {
                        Task { await setDefaultPaymentMethod(paymentMethod.id) }
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.warmGold)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(LunaraColors.warmGold, lineWidth: 1)
                    )
                    .disabled(isUpdating)

                    Button("Remove") {
                        Task { await removePaymentMethod(paymentMethod.id) }
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(LunaraColors.error)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(LunaraColors.error, lineWidth: 1)
                    )
                    .disabled(isUpdating)

                    Spacer()
                }
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }

    // MARK: - Invoices Content
    private var invoicesContent: some View {
        VStack(spacing: 16) {
            if invoices.isEmpty {
                emptyInvoicesView
            } else {
                ForEach(invoices) { invoice in
                    invoiceCard(invoice)
                }
            }
        }
    }

    private var emptyInvoicesView: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.secondaryText)

            Text("No Invoices")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)

            Text("Your billing history will appear here once you have invoices.")
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)
        }
        .padding(40)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }

    private func invoiceCard(_ invoice: StripeInvoice) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Invoice #\(String(invoice.id.suffix(8)))")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text(invoice.periodText)
                        .font(.system(size: 14))
                        .foregroundColor(LunaraColors.secondaryText)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text(invoice.formattedTotal)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(LunaraColors.primaryText)

                    Text(invoice.status.capitalized)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(statusColor(for: invoice.status))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(
                            RoundedRectangle(cornerRadius: 4)
                                .fill(statusColor(for: invoice.status).opacity(0.1))
                        )
                }
            }

            if let hostedUrl = invoice.hostedInvoiceUrl {
                Button("View Invoice") {
                    if let url = URL(string: hostedUrl) {
                        UIApplication.shared.open(url)
                    }
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(LunaraColors.warmGold)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(LunaraColors.warmGold, lineWidth: 1)
                )
            }
        }
        .padding(16)
        .background(LunaraColors.white)
        .cornerRadius(12)
        .shadow(color: LunaraColors.charcoalGray.opacity(0.1), radius: 4, x: 0, y: 2)
    }

    private func statusColor(for status: String) -> Color {
        switch status.lowercased() {
        case "paid":
            return LunaraColors.success
        case "open":
            return LunaraColors.warning
        case "void":
            return LunaraColors.error
        default:
            return LunaraColors.secondaryText
        }
    }

    // MARK: - Loading and Error Views
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)

            Text("Loading subscription details...")
                .font(.system(size: 16))
                .foregroundColor(LunaraColors.secondaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.coolLightGray.opacity(0.1))
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundColor(LunaraColors.error)

            Text("Error Loading Subscription")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(LunaraColors.primaryText)

            Text(message)
                .font(.system(size: 14))
                .foregroundColor(LunaraColors.secondaryText)
                .multilineTextAlignment(.center)

            Button("Retry") {
                loadSubscriptionData()
            }
            .font(.system(size: 16, weight: .medium))
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(LunaraColors.warmGold)
            .cornerRadius(8)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LunaraColors.coolLightGray.opacity(0.1))
    }

    // MARK: - API Methods
    private func loadSubscriptionData() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let details = try await apiClient.getDetailedSubscriptionInfo(shopId: shop.id)

                await MainActor.run {
                    subscriptionDetails = details
                    isLoading = false
                }

                // Load tab-specific data
                loadTabData()
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }

    private func loadTabData() {
        Task {
            switch selectedTab {
            case .overview:
                await loadUpcomingInvoice()
            case .paymentMethods:
                await loadPaymentMethods()
            case .invoices:
                await loadInvoices()
            }
        }
    }

    private func loadPaymentMethods() async {
        do {
            let methods = try await apiClient.getPaymentMethods(shopId: shop.id)
            await MainActor.run {
                paymentMethods = methods
            }
        } catch {
            print("Error loading payment methods: \(error)")
        }
    }

    private func loadInvoices() async {
        do {
            let invoiceList = try await apiClient.getInvoices(shopId: shop.id, limit: 20)
            await MainActor.run {
                invoices = invoiceList
            }
        } catch {
            print("Error loading invoices: \(error)")
        }
    }

    private func loadUpcomingInvoice() async {
        do {
            let upcoming = try await apiClient.getUpcomingInvoice(shopId: shop.id)
            await MainActor.run {
                upcomingInvoice = upcoming
            }
        } catch {
            print("Error loading upcoming invoice: \(error)")
            // Upcoming invoice is optional, so don't show error
        }
    }

    private func refreshData() {
        loadSubscriptionData()
    }

    // MARK: - Subscription Actions
    private func cancelSubscription() async {
        isUpdating = true

        do {
            let updatedSubscription = try await apiClient.cancelSubscription(shopId: shop.id, cancelImmediately: false)
            await MainActor.run {
                subscriptionDetails = updatedSubscription
                isUpdating = false
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to cancel subscription: \(error.localizedDescription)"
                isUpdating = false
            }
        }
    }

    private func reactivateSubscription() async {
        isUpdating = true

        do {
            let updatedSubscription = try await apiClient.reactivateSubscription(shopId: shop.id)
            await MainActor.run {
                subscriptionDetails = updatedSubscription
                isUpdating = false
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to reactivate subscription: \(error.localizedDescription)"
                isUpdating = false
            }
        }
    }

    private func openCustomerPortal() async {
        do {
            let portalResponse = try await apiClient.createCustomerPortalSession(
                shopId: shop.id,
                returnUrl: "lunara://subscription-management"
            )

            await MainActor.run {
                if let url = URL(string: portalResponse.url) {
                    UIApplication.shared.open(url)
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to open customer portal: \(error.localizedDescription)"
            }
        }
    }

    // MARK: - Payment Method Actions
    private func setDefaultPaymentMethod(_ paymentMethodId: String) async {
        isUpdating = true

        do {
            _ = try await apiClient.setDefaultPaymentMethod(shopId: shop.id, paymentMethodId: paymentMethodId)
            await loadPaymentMethods()
            await MainActor.run {
                isUpdating = false
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to set default payment method: \(error.localizedDescription)"
                isUpdating = false
            }
        }
    }

    private func removePaymentMethod(_ paymentMethodId: String) async {
        isUpdating = true

        do {
            _ = try await apiClient.removePaymentMethod(shopId: shop.id, paymentMethodId: paymentMethodId)
            await loadPaymentMethods()
            await MainActor.run {
                isUpdating = false
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to remove payment method: \(error.localizedDescription)"
                isUpdating = false
            }
        }
    }
}

#Preview {
    SubscriptionManagementView(shop: Shop.preview)
}
