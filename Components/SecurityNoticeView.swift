import SwiftUI

struct SecurityNoticeView: View {
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "lock.shield.fill")
                .foregroundColor(LunaraColors.warmGold)
                .font(.system(size: 18))

            VStack(alignment: .leading, spacing: 4) {
                Text("Secure payment")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(LunaraColors.charcoalGray)

                Text("Your card details are encrypted and processed by Stripe. We don't store full card numbers on our servers.")
                    .font(.system(size: 12))
                    .foregroundColor(LunaraColors.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()

            Image(systemName: "checkmark.seal.fill")
                .foregroundColor(LunaraColors.success)
                .font(.system(size: 16))
        }
        .padding(12)
        .background(LunaraColors.coolLightGray.opacity(0.2))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(LunaraColors.coolLightGray, lineWidth: 1)
        )
        .cornerRadius(8)
    }
}

struct SecurityNoticeView_Previews: PreviewProvider {
    static var previews: some View {
        SecurityNoticeView()
            .padding()
            .previewLayout(.sizeThatFits)
    }
}

