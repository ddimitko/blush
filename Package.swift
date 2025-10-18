// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "LunaraApp",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "LunaraApp",
            targets: ["LunaraApp"]
        ),
    ],
    dependencies: [
        // Networking
        .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.8.0"),

        // WebSocket
        .package(url: "https://github.com/daltoniam/Starscream.git", from: "4.0.0"),

        // Payments
        .package(url: "https://github.com/stripe/stripe-ios.git", from: "23.0.0"),

        // Image Loading
        .package(url: "https://github.com/onevcat/Kingfisher.git", from: "7.0.0"),

        // Keychain Access
        .package(url: "https://github.com/kishikawakatsumi/KeychainAccess.git", from: "4.2.0"),

        // Facebook SDK
        .package(url: "https://github.com/facebook/facebook-ios-sdk.git", from: "18.0.0"),

        // Additional utilities that might be useful
        .package(url: "https://github.com/SwiftyJSON/SwiftyJSON.git", from: "5.0.0"),
        .package(url: "https://github.com/realm/SwiftLint.git", from: "0.50.0"),
    ],
    targets: [
        .target(
            name: "LunaraApp",
            dependencies: [
                "Alamofire",
                "Starscream",
                .product(name: "StripePaymentSheet", package: "stripe-ios"),
                .product(name: "StripePayments", package: "stripe-ios"),
                .product(name: "StripeCore", package: "stripe-ios"),
                .product(name: "StripeUICore", package: "stripe-ios"),
                "Kingfisher",
                "KeychainAccess",
                .product(name: "FacebookLogin", package: "facebook-ios-sdk"),
                .product(name: "FacebookCore", package: "facebook-ios-sdk"),
                "SwiftyJSON",
            ]
        ),
        .testTarget(
            name: "LunaraAppTests",
            dependencies: ["LunaraApp"]
        ),
    ]
)
