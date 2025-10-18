//
//  ScrollableDocumentView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI

// MARK: - Preference Keys
struct ContentSizePreferenceKey: PreferenceKey {
    static let defaultValue: CGSize = .zero
    static func reduce(value: inout CGSize, nextValue: () -> CGSize) {
        value = nextValue()
    }
}

struct ScrollOffsetPreferenceKey: PreferenceKey {
    static let defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

/// A scrollable document view that detects when user has scrolled to the end
struct ScrollableDocumentView: View {
    let title: String
    let content: String
    @Binding var hasScrolledToEnd: Bool

    @State private var scrollOffset: CGFloat = 0
    @State private var contentHeight: CGFloat = 0
    @State private var scrollViewHeight: CGFloat = 0
    @State private var hasUserScrolled: Bool = false
    
    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text(content)
                        .font(.system(size: 14, weight: .regular))
                        .foregroundColor(LunaraColors.charcoalGray)
                        .lineSpacing(4)
                        .fixedSize(horizontal: false, vertical: true)
                        .background(
                            GeometryReader { contentGeometry in
                                Color.clear
                                    .preference(key: ContentSizePreferenceKey.self, value: contentGeometry.size)
                            }
                        )
                }
                .padding(16)
                .background(
                    GeometryReader { scrollGeometry in
                        Color.clear
                            .preference(key: ScrollOffsetPreferenceKey.self, value: scrollGeometry.frame(in: .named("scrollView")).minY)
                    }
                )
            }
            .coordinateSpace(name: "scrollView")
            .onPreferenceChange(ContentSizePreferenceKey.self) { size in
                // Guard against invalid values
                guard size.height.isFinite && size.height >= 0 else { return }
                contentHeight = size.height
                scrollViewHeight = geometry.size.height
            }
            .onPreferenceChange(ScrollOffsetPreferenceKey.self) { offset in
                // Guard against invalid values
                guard offset.isFinite else { return }
                let newOffset = -offset
                guard newOffset.isFinite && abs(newOffset - scrollOffset) > 1 else { return }
                hasUserScrolled = true
                scrollOffset = newOffset
                checkScrollPosition()
            }
            .onAppear {
                // Guard against invalid geometry values
                let height = geometry.size.height
                guard height.isFinite && height > 0 else { return }
                scrollViewHeight = height
                hasUserScrolled = false
                hasScrolledToEnd = false
            }
            .background(Color.white)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(hasScrolledToEnd ? LunaraColors.warmGold : LunaraColors.coolLightGray, lineWidth: hasScrolledToEnd ? 2 : 1)
            )

            // Scroll indicator overlay
            if !hasScrolledToEnd && contentHeight > scrollViewHeight {
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        VStack(spacing: 8) {
                            Image(systemName: "arrow.down")
                                .font(.caption)
                                .foregroundColor(LunaraColors.warmGold)
                            Text("Scroll to read all")
                                .font(.caption2)
                                .foregroundColor(LunaraColors.warmGold)
                        }
                        .padding(8)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.white.opacity(0.9))
                                .shadow(radius: 2)
                        )
                        .padding(.trailing, 16)
                        .padding(.bottom, 16)
                    }
                }
                .allowsHitTesting(false)
            }
            
            // Scroll indicator overlay
            if !hasScrolledToEnd && contentHeight > scrollViewHeight {
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        VStack(spacing: 8) {
                            Image(systemName: "arrow.down")
                                .font(.caption)
                                .foregroundColor(LunaraColors.warmGold)
                            Text("Scroll to read all")
                                .font(.caption2)
                                .foregroundColor(LunaraColors.warmGold)
                        }
                        .padding(8)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.white.opacity(0.9))
                                .shadow(radius: 2)
                        )
                        .padding(.trailing, 16)
                        .padding(.bottom, 16)
                    }
                }
                .allowsHitTesting(false)
            }
        }
    }
    
    private func checkScrollPosition() {
        // Only check if user has actually scrolled and we have valid dimensions
        guard hasUserScrolled,
              contentHeight > 0,
              scrollViewHeight > 0,
              !contentHeight.isNaN,
              !scrollViewHeight.isNaN,
              !scrollOffset.isNaN else {
            return
        }

        // Check if user has scrolled to within 20 points of the bottom
        let threshold: CGFloat = 20
        let maxScrollOffset = max(0, contentHeight - scrollViewHeight)

        // Only mark as read if content actually requires scrolling AND user scrolled to bottom
        if maxScrollOffset > 10 && scrollOffset >= maxScrollOffset - threshold {
            withAnimation(.easeInOut(duration: 0.3)) {
                hasScrolledToEnd = true
            }
        }
        // If content is very short (doesn't require scrolling), require manual confirmation
    }
}

// MARK: - Preview
struct ScrollableDocumentView_Previews: PreviewProvider {
    static var previews: some View {
        ScrollableDocumentView(
            title: "Sample Document",
            content: """
            This is a sample document with multiple paragraphs to test the scrolling functionality.
            
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
            
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
            
            Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
            """,
            hasScrolledToEnd: .constant(false)
        )
        .frame(height: 200)
        .padding()
    }
}
