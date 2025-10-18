//
//  ShopGalleryView.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import SwiftUI
import Kingfisher

/// Shop gallery view for browsing shop images
struct ShopGalleryView: View {
    // MARK: - Properties
    let images: [String]
    @Binding var selectedIndex: Int
    
    // MARK: - Environment
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - State
    @State private var currentIndex: Int = 0
    @State private var dragOffset: CGSize = .zero
    @State private var isZoomed = false
    @State private var zoomScale: CGFloat = 1.0
    @State private var zoomOffset: CGSize = .zero
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background
                Color.black
                    .ignoresSafeArea()
                
                // Image Pager
                TabView(selection: $currentIndex) {
                    ForEach(images.indices, id: \.self) { index in
                        ZoomableImageView(
                            imageURL: images[index],
                            isZoomed: $isZoomed,
                            zoomScale: $zoomScale,
                            zoomOffset: $zoomOffset
                        )
                        .tag(index)
                    }
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
                .onAppear {
                    currentIndex = selectedIndex
                }
                .onChange(of: currentIndex) { _, newValue in
                    selectedIndex = newValue
                    // Reset zoom when changing images
                    withAnimation(.easeInOut(duration: 0.3)) {
                        isZoomed = false
                        zoomScale = 1.0
                        zoomOffset = .zero
                    }
                }
                
                // Overlay Controls
                if !isZoomed {
                    VStack {
                        // Top Bar
                        HStack {
                            Button(action: {
                                dismiss()
                            }) {
                                Image(systemName: "xmark")
                                    .font(.system(size: 18, weight: .medium))
                                    .foregroundColor(.white)
                                    .frame(width: 44, height: 44)
                                    .background(Color.black.opacity(0.5))
                                    .clipShape(Circle())
                            }
                            
                            Spacer()
                            
                            // Image Counter
                            Text("\(currentIndex + 1) of \(images.count)")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color.black.opacity(0.5))
                                .cornerRadius(20)
                            

                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 10)
                        
                        Spacer()
                        
                        // Bottom Page Indicator
                        if images.count > 1 {
                            HStack(spacing: 8) {
                                ForEach(images.indices, id: \.self) { index in
                                    Circle()
                                        .fill(index == currentIndex ? Color.white : Color.white.opacity(0.5))
                                        .frame(width: 8, height: 8)
                                        .scaleEffect(index == currentIndex ? 1.2 : 1.0)
                                        .animation(.easeInOut(duration: 0.2), value: currentIndex)
                                }
                            }
                            .padding(.bottom, 40)
                            .allowsHitTesting(false) // Allow gestures to pass through
                        }
                    }
                    .transition(.opacity)
                }
            }
            .navigationBarHidden(true)
            .statusBarHidden(isZoomed)
        }
    }
}

/// Zoomable image view component
struct ZoomableImageView: View {
    // MARK: - Properties
    let imageURL: String
    @Binding var isZoomed: Bool
    @Binding var zoomScale: CGFloat
    @Binding var zoomOffset: CGSize

    // MARK: - State
    @State private var currentScale: CGFloat = 1.0
    @State private var currentOffset: CGSize = .zero

    var body: some View {
        GeometryReader { geometry in
            KFImage(URL(string: getImageUrl(imageURL)))
                .downloader(ImageService.shared.downloader)
                .onFailure { error in
                    print("❌ Gallery image loading failed: \(error)")
                }
                .placeholder {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .overlay(
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        )
                }
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(maxWidth: geometry.size.width, maxHeight: geometry.size.height)
                .scaleEffect(currentScale)
                .offset(currentOffset)
                .gesture(
                    // Only add magnification gesture - let TabView handle horizontal swipes
                    MagnificationGesture()
                        .onChanged { value in
                            currentScale = max(1.0, min(value * zoomScale, 4.0))
                            isZoomed = currentScale > 1.0
                        }
                        .onEnded { value in
                            zoomScale = currentScale
                            if currentScale <= 1.0 {
                                withAnimation(.easeInOut(duration: 0.3)) {
                                    currentScale = 1.0
                                    currentOffset = .zero
                                    zoomScale = 1.0
                                    zoomOffset = .zero
                                    isZoomed = false
                                }
                            }
                        }
                )
                .gesture(
                    // Only add drag gesture when zoomed to avoid conflicts with TabView
                    currentScale > 1.0 ?
                    DragGesture()
                        .onChanged { value in
                            let maxOffsetX = max(0, (geometry.size.width * currentScale - geometry.size.width) / 2)
                            let maxOffsetY = max(0, (geometry.size.height * currentScale - geometry.size.height) / 2)

                            currentOffset = CGSize(
                                width: max(-maxOffsetX, min(maxOffsetX, zoomOffset.width + value.translation.width)),
                                height: max(-maxOffsetY, min(maxOffsetY, zoomOffset.height + value.translation.height))
                            )
                        }
                        .onEnded { value in
                            zoomOffset = currentOffset
                        } : nil
                )
                .onTapGesture(count: 2) {
                    // Double tap to zoom
                    withAnimation(.easeInOut(duration: 0.3)) {
                        if currentScale > 1.0 {
                            currentScale = 1.0
                            currentOffset = .zero
                            zoomScale = 1.0
                            zoomOffset = .zero
                            isZoomed = false
                        } else {
                            currentScale = 2.0
                            zoomScale = 2.0
                            isZoomed = true
                        }
                    }
                }
        }
        .clipped()
        .onAppear {
            currentScale = zoomScale
            currentOffset = zoomOffset
        }
    }

    private func getImageUrl(_ url: String) -> String {
        // Return empty string for nil/empty URLs to prevent invalid requests
        if url.isEmpty {
            return ""
        }
        if url.starts(with: "http") {
            return url
        }
        return "https://109.104.206.19:8443\(url)"
    }
}

// MARK: - Preview
struct ShopGalleryView_Previews: PreviewProvider {
    static var previews: some View {
        ShopGalleryView(
            images: [
                "https://example.com/image1.jpg",
                "https://example.com/image2.jpg",
                "https://example.com/image3.jpg"
            ],
            selectedIndex: .constant(0)
        )
    }
}
