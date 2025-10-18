//
//  StripeConnectStatusView.swift
//  LunaraApp
//
//  Created by Lunara Team on 27/07/2025.
//

import SwiftUI

/// View for displaying Stripe Connect account status and management
struct StripeConnectStatusView: View {
    // MARK: - Properties
    let shop: Shop

    var body: some View {
        AdvancedStripeConnectManagementView(shop: shop)
    }
}

#Preview {
    StripeConnectStatusView(shop: Shop.preview)
}
