package com.ddimitko.beautyhub.entity

import groovy.transform.EqualsAndHashCode
import groovy.transform.ToString

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "device_tokens")
@EqualsAndHashCode(includes = ['id'])
@ToString(includes = ['id', 'userId', 'platform', 'active'])
class DeviceToken {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id")
    UUID id

    @Column(name = "user_id", nullable = false)
    UUID userId

    @Column(name = "token", nullable = false, unique = true, length = 500)
    String token

    @Column(name = "platform", nullable = false, length = 20)
    String platform // 'ios', 'android', 'web'

    @Column(name = "active", nullable = false)
    Boolean active = true

    @Column(name = "created_at", nullable = false)
    LocalDateTime createdAt

    @Column(name = "last_used")
    LocalDateTime lastUsed

    @Column(name = "device_info", columnDefinition = "TEXT")
    String deviceInfo // JSON string with device details

    @Column(name = "app_version", length = 50)
    String appVersion

    @Column(name = "os_version", length = 50)
    String osVersion

    // Constructors
    DeviceToken() {
        this.createdAt = LocalDateTime.now()
        this.lastUsed = LocalDateTime.now()
        this.active = true
    }

    DeviceToken(UUID userId, String token, String platform) {
        this()
        this.userId = userId
        this.token = token
        this.platform = platform
    }

    // Helper methods
    boolean isExpired() {
        if (!lastUsed) return false
        return lastUsed.isBefore(LocalDateTime.now().minusDays(30))
    }

    boolean isIOS() {
        return platform == 'ios'
    }

    boolean isAndroid() {
        return platform == 'android'
    }

    boolean isWeb() {
        return platform == 'web'
    }

    void updateLastUsed() {
        this.lastUsed = LocalDateTime.now()
    }

    void deactivate() {
        this.active = false
    }

    void activate() {
        this.active = true
        updateLastUsed()
    }
}
