//
//  ScrollDetectionView.swift
//  LunaraApp
//
//  Created by Lunara Team on 16/07/2025.
//

import SwiftUI

/// A ScrollView that detects when the user has scrolled to the end
struct ScrollDetectionView<Content: View>: View {
    let content: Content
    let onScrolledToEnd: () -> Void
    
    @State private var scrollOffset: CGFloat = 0
    @State private var contentHeight: CGFloat = 0
    @State private var scrollViewHeight: CGFloat = 0
    
    init(@ViewBuilder content: () -> Content, onScrolledToEnd: @escaping () -> Void) {
        self.content = content()
        self.onScrolledToEnd = onScrolledToEnd
    }
    
    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                ZStack(alignment: .top) {
                    // Content
                    content
                        .background(
                            GeometryReader { contentGeometry in
                                Color.clear
                                    .onAppear {
                                        let height = contentGeometry.size.height
                                        let viewHeight = geometry.size.height
                                        guard height.isFinite && height >= 0 && viewHeight.isFinite && viewHeight > 0 else { return }
                                        contentHeight = height
                                        scrollViewHeight = viewHeight
                                        checkScrollPosition()
                                    }
                                    .onChange(of: contentGeometry.size.height) { _, newHeight in
                                        guard newHeight.isFinite && newHeight >= 0 else { return }
                                        contentHeight = newHeight
                                        checkScrollPosition()
                                    }
                            }
                        )
                    
                    // Scroll offset tracker
                    GeometryReader { scrollGeometry in
                        Color.clear
                            .onChange(of: scrollGeometry.frame(in: .named("scrollView")).minY) { _, newOffset in
                                guard newOffset.isFinite else { return }
                                let calculatedOffset = -newOffset
                                guard calculatedOffset.isFinite else { return }
                                scrollOffset = calculatedOffset
                                checkScrollPosition()
                            }
                    }
                }
            }
            .coordinateSpace(name: "scrollView")
            .onAppear {
                let height = geometry.size.height
                guard height.isFinite && height > 0 else { return }
                scrollViewHeight = height
                checkScrollPosition()
            }
        }
    }
    
    private func checkScrollPosition() {
        // Guard against invalid values
        guard contentHeight.isFinite && contentHeight >= 0,
              scrollViewHeight.isFinite && scrollViewHeight > 0,
              scrollOffset.isFinite else {
            return
        }

        // Check if user has scrolled to within 50 points of the bottom
        let threshold: CGFloat = 50
        let maxScrollOffset = max(0, contentHeight - scrollViewHeight)

        if scrollOffset >= maxScrollOffset - threshold {
            onScrolledToEnd()
        }
    }
}

// MARK: - Preview
struct ScrollDetectionView_Previews: PreviewProvider {
    static var previews: some View {
        ScrollDetectionView(
            content: {
                VStack(spacing: 20) {
                    ForEach(0..<20) { index in
                        Text("Item \(index)")
                            .padding()
                            .background(Color.gray.opacity(0.2))
                            .cornerRadius(8)
                    }
                }
                .padding()
            },
            onScrolledToEnd: {
                print("Scrolled to end!")
            }
        )
        .frame(height: 300)
    }
}
