//
//  TermsStepView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI

struct TermsStepView: View {
    @Binding var hasScrolledToEnd: Bool
    let errorMessage: String?

    @State private var showingTermsModal = false
    
    var body: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 16) {
                Image(systemName: "doc.text")
                    .font(.system(size: 48))
                    .foregroundColor(LunaraColors.warmGold)
                
                VStack(spacing: 8) {
                    Text("Terms and Privacy Policy")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(LunaraColors.charcoalGray)

                    Text("Please read our terms and conditions and privacy policy to continue with shop creation.")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
            }
            
            // Document Reading Section
            VStack(spacing: 20) {
                // Combined Terms & Privacy Policy Document
                VStack(spacing: 12) {
                    HStack {
                        Text("Terms & Conditions and Privacy Policy")
                            .font(.headline)
                            .foregroundColor(LunaraColors.charcoalGray)

                        Spacer()

                        if hasScrolledToEnd {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                        } else {
                            Image(systemName: "circle")
                                .foregroundColor(.secondary)
                        }
                    }

                    ScrollableDocumentView(
                        title: "Terms & Conditions and Privacy Policy",
                        content: combinedContent,
                        hasScrolledToEnd: $hasScrolledToEnd
                    )
                    .frame(height: 250)

                    // Manual confirmation button if scroll detection fails
                    if !hasScrolledToEnd {
                        Button("I have read the Terms & Conditions and Privacy Policy") {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                hasScrolledToEnd = true
                            }
                        }
                        .font(.caption)
                        .foregroundColor(LunaraColors.warmGold)
                    }
                }
            }

            // Error Message
            if let errorMessage = errorMessage {
                HStack {
                    Image(systemName: "exclamationmark.circle.fill")
                        .foregroundColor(.red)
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                    Spacer()
                }
                .padding(.top, 8)
            }
            
            Spacer()
        }
    }

    // MARK: - Content Properties
    private var combinedContent: String {
        return termsContent + "\n\n" + privacyContent
    }

    private var termsContent: String {
        """
        LUNARA TERMS AND CONDITIONS

        Last updated: July 16, 2025

        1. ACCEPTANCE OF TERMS
        By accessing and using the Lunara platform, you accept and agree to be bound by the terms and provision of this agreement.

        2. SERVICE DESCRIPTION
        Lunara provides a platform for beauty service providers to manage their business, accept bookings, and process payments from customers.

        3. SHOP OWNER RESPONSIBILITIES
        As a shop owner, you agree to:
        - Provide accurate business information
        - Maintain professional service standards
        - Honor all confirmed appointments
        - Comply with local business regulations
        - Respond to customer inquiries promptly

        4. PAYMENT TERMS
        - Monthly subscription fees are charged automatically
        - Payment processing fees apply to customer transactions
        - Refunds are processed according to our refund policy
        - You can cancel your subscription at any time

        5. PLATFORM USAGE
        You agree to use the platform responsibly and not engage in:
        - Fraudulent activities
        - Harassment of customers or staff
        - Violation of intellectual property rights
        - Misrepresentation of services

        6. DATA AND PRIVACY
        We collect and process data according to our Privacy Policy. You are responsible for obtaining customer consent for data collection.

        7. LIMITATION OF LIABILITY
        Lunara's liability is limited to the amount paid for services in the preceding 12 months.

        8. TERMINATION
        Either party may terminate this agreement with 30 days notice. Upon termination, access to the platform will be revoked.

        9. GOVERNING LAW
        These terms are governed by the laws of the jurisdiction in which Lunara operates.

        10. MODIFICATIONS
        We reserve the right to modify these terms with reasonable notice to users.

        For questions about these terms, please contact our support team at support@lunara.com.
        """
    }

    private var privacyContent: String {
        """
        LUNARA PRIVACY POLICY

        Last updated: July 16, 2025

        1. INFORMATION WE COLLECT
        We collect information you provide directly to us, such as:
        - Account registration information
        - Business details and contact information
        - Payment and billing information
        - Communications with us

        2. HOW WE USE YOUR INFORMATION
        We use your information to:
        - Provide and improve our booking services
        - Process appointments and payments
        - Send booking confirmations and reminders
        - Personalize your experience
        - Communicate important updates
        - Ensure platform security and prevent fraud
        - Comply with legal obligations

        3. INFORMATION SHARING
        We do not sell your personal information. We may share information:
        - With service providers who assist our operations
        - When required by law
        - To protect our rights and safety
        - With your consent

        4. DATA SECURITY
        We implement appropriate security measures to protect your information against unauthorized access, alteration, disclosure, or destruction.

        5. DATA RETENTION
        We retain your information for as long as necessary to provide services and comply with legal obligations.

        6. YOUR RIGHTS
        You have the right to:
        - Access your personal information
        - Correct inaccurate information
        - Delete your account and data
        - Object to processing
        - Data portability

        7. COOKIES AND TRACKING
        We use cookies and similar technologies to:
        - Remember your preferences
        - Analyze site usage
        - Improve our services
        - Provide personalized content

        8. THIRD-PARTY SERVICES
        Our platform integrates with third-party services like payment processors. These services have their own privacy policies.

        9. INTERNATIONAL TRANSFERS
        Your information may be transferred to and processed in countries other than your own.

        10. CHILDREN'S PRIVACY
        Our services are not intended for children under 13. We do not knowingly collect information from children.

        11. CHANGES TO THIS POLICY
        We may update this privacy policy from time to time. We will notify you of significant changes.

        For privacy-related questions, contact us at privacy@lunara.com.

        12. CONTACT INFORMATION
        If you have any questions about this Privacy Policy or our data practices, please contact us at:

        Email: privacy@lunara.com
        Address: Lunara Technologies, 123 Beauty Street, Suite 456, San Francisco, CA 94102
        Phone: +1 (555) 123-4567

        We will respond to your inquiry within 30 days of receipt.

        13. EFFECTIVE DATE
        This Privacy Policy is effective as of the date listed at the top of this document and will remain in effect except with respect to any changes in its provisions in the future, which will be in effect immediately after being posted on this page.

        By using our service, you acknowledge that you have read and understood this Privacy Policy and agree to be bound by its terms.
        """
    }
}

// MARK: - Terms Point View
struct TermsPointView: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(LunaraColors.warmGold)
                .frame(width: 24)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(LunaraColors.charcoalGray)
                
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            
            Spacer()
        }
    }
}

// MARK: - Full Terms View
struct FullTermsView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("LUNARA TERMS AND CONDITIONS")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(LunaraColors.charcoalGray)
                    
                    Text("Last updated: July 16, 2025")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Divider()
                    
                    TermsSectionView(
                        title: "1. ACCEPTANCE OF TERMS",
                        content: "By accessing and using the Lunara platform, you accept and agree to be bound by the terms and provision of this agreement."
                    )
                    
                    TermsSectionView(
                        title: "2. SERVICE DESCRIPTION",
                        content: "Lunara provides a platform for beauty service providers to manage their business, accept bookings, and process payments from customers."
                    )
                    
                    TermsSectionView(
                        title: "3. SHOP OWNER RESPONSIBILITIES",
                        content: "As a shop owner, you are responsible for:\n• Providing accurate business information\n• Maintaining professional service standards\n• Complying with local business regulations\n• Ensuring proper licensing and certifications\n• Handling customer service professionally"
                    )
                    
                    TermsSectionView(
                        title: "4. PAYMENT TERMS",
                        content: "Subscription fees are charged monthly in advance. You may cancel your subscription at any time. Refunds are provided according to our refund policy."
                    )
                    
                    TermsSectionView(
                        title: "5. PRIVACY AND DATA PROTECTION",
                        content: "We are committed to protecting your privacy and the privacy of your customers. Please review our Privacy Policy for detailed information about how we collect, use, and protect your data."
                    )
                    
                    TermsSectionView(
                        title: "6. LIMITATION OF LIABILITY",
                        content: "Lunara shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the platform."
                    )
                    
                    TermsSectionView(
                        title: "7. TERMINATION",
                        content: "Either party may terminate this agreement at any time. Upon termination, your access to the platform will be discontinued."
                    )
                    
                    TermsSectionView(
                        title: "8. GOVERNING LAW",
                        content: "These terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Lunara operates."
                    )
                    
                    Text("For questions about these terms, please contact our support team.")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .padding(.top, 20)
                }
                .padding(20)
            }
            .navigationTitle("Terms & Conditions")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(LunaraColors.warmGold)
                }
            }
        }
    }
}

// MARK: - Terms Section View
struct TermsSectionView: View {
    let title: String
    let content: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(LunaraColors.charcoalGray)
            
            Text(content)
                .font(.body)
                .foregroundColor(.primary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

// MARK: - Preview
#Preview {
    TermsStepView(
        hasScrolledToEnd: .constant(false),
        errorMessage: nil
    )
}
