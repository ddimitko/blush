//
//  AppDelegate.swift
//  LunaraApp
//
//  Created by Lunara Team on 14/07/2025.
//

import UIKit
import UserNotifications
import FBSDKCoreKit

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {

        // Configure logging (suppresses network framework debug logs)
        LoggingConfiguration.configure()

        // Configure Facebook SDK
        ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)

        // Configure push notifications
        configurePushNotifications(application)

        // Initialize StoreKit service (prevents unnecessary transaction errors)
        _ = StoreKitService.shared

        return true
    }
    
    // MARK: - Push Notification Configuration
    
    private func configurePushNotifications(_ application: UIApplication) {
        // Set notification delegate
        UNUserNotificationCenter.current().delegate = self
        
        // Register for remote notifications
        application.registerForRemoteNotifications()
    }
    
    // MARK: - Remote Notification Registration
    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        print("📱 Successfully registered for remote notifications")
        
        // Send device token to NotificationService
        Task {
            await MainActor.run {
                NotificationService.shared.registerDeviceToken(deviceToken)
            }
        }
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("❌ Failed to register for remote notifications: \(error)")
    }
    
    // MARK: - Remote Notification Handling
    
    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable : Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {

        print("📨 Received remote notification: \(userInfo)")

        // Extract sendable values from userInfo
        let badgeCount = userInfo["badge"] as? Int
        let notificationType = userInfo["type"] as? String
        let appointmentId = userInfo["appointmentId"] as? String
        let shopId = userInfo["shopId"] as? String
        let isActive = application.applicationState == .active

        Task { @MainActor in
            NotificationService.shared.handleRemoteNotificationWithValues(
                badgeCount: badgeCount,
                type: notificationType,
                appointmentId: appointmentId,
                shopId: shopId
            )

            // Refresh notifications if app is active
            if isActive {
                await NotificationService.shared.fetchUnreadNotifications()
            }
        }

        completionHandler(.newData)
    }

    // MARK: - URL Handling for Facebook Authentication

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        // Handle Facebook URL callbacks
        if ApplicationDelegate.shared.application(app, open: url, sourceApplication: options[UIApplication.OpenURLOptionsKey.sourceApplication] as? String, annotation: options[UIApplication.OpenURLOptionsKey.annotation]) {
            return true
        }

        // Handle other URL schemes (Stripe, etc.)
        return false
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension AppDelegate {
    
    // Called when a notification is delivered to a foreground app
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {

        print("📱 Will present notification in foreground: \(notification.request.content.title)")

        // Show notification even when app is in foreground
        completionHandler([.banner, .sound, .badge])
    }
    
    // Called when user taps on a notification
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {

        print("👆 User tapped notification: \(response.notification.request.content.title)")

        let userInfo = response.notification.request.content.userInfo

        // Extract sendable values from userInfo
        let notificationType = userInfo["type"] as? String
        let appointmentId = userInfo["appointmentId"] as? String
        let shopId = userInfo["shopId"] as? String

        Task { @MainActor in
            // Handle notification tap on main actor
            NotificationService.shared.handleNotificationTapWithValues(
                type: notificationType,
                appointmentId: appointmentId,
                shopId: shopId
            )

            // Refresh notifications
            await NotificationService.shared.fetchNotifications()
            await NotificationService.shared.fetchUnreadNotifications()
        }

        completionHandler()
    }

    // Called when notification settings change
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, openSettingsFor notification: UNNotification?) {
        print("⚙️ User opened notification settings")

        // Optionally navigate to app settings or show notification settings
    }
}
