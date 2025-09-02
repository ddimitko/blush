package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.entity.Shop
import com.ddimitko.beautyhub.entity.User
import com.ddimitko.beautyhub.entity.Appointment
import com.ddimitko.beautyhub.enums.AppointmentStatus
import com.ddimitko.beautyhub.repository.AppointmentRepository
import com.ddimitko.beautyhub.repository.ShopRepository
import com.ddimitko.beautyhub.repository.RatingRepository
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import groovy.util.logging.Slf4j

import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDateTime
import java.time.ZoneOffset

@Service
@Transactional(readOnly = true)
@Slf4j
class AnalyticsService {

    @Autowired
    private ShopRepository shopRepository

    @Autowired
    private AppointmentRepository appointmentRepository

    @Autowired
    private RatingRepository ratingRepository

    @Autowired
    private UserService userService

    Map<String, Object> getOwnerAnalytics(UUID ownerId) {
        User owner = userService.findById(ownerId)
        List<Shop> shops = shopRepository.findByOwner(owner)
        
        if (shops.isEmpty()) {
            return [
                totalRevenue: '$0',
                totalAppointments: 0,
                totalCustomers: 0,
                averageRating: 0.0,
                totalShops: 0,
                revenueGrowth: null,
                appointmentGrowth: null,
                customerGrowth: null
            ]
        }

        // Get shop IDs for queries
        List<UUID> shopIds = shops.collect { it.id }

        // Calculate total appointments across all shops
        long totalAppointments = appointmentRepository.countByShopIdIn(shopIds)

        // Calculate unique customers across all shops
        long totalCustomers = appointmentRepository.countDistinctCustomersByShopIds(shopIds)

        // Calculate total revenue from completed appointments with successful payments
        BigDecimal totalRevenue = calculateTotalRevenueForShops(shopIds)

        // Calculate average rating across all shops
        Double averageRating = calculateAverageRatingForShops(shops)

        return [
            totalRevenue: formatCurrency(totalRevenue),
            totalAppointments: totalAppointments,
            totalCustomers: totalCustomers,
            averageRating: averageRating ?: 0.0,
            totalShops: shops.size(),
            revenueGrowth: null, // TODO: Calculate month-over-month growth
            appointmentGrowth: null, // TODO: Calculate month-over-month growth
            customerGrowth: null // TODO: Calculate month-over-month growth
        ]
    }

    Map<String, Object> getShopAnalytics(UUID shopId, UUID userId) {
        // Verify user has access to this shop
        Shop shop = shopRepository.findById(shopId).orElseThrow {
            new RuntimeException("Shop not found")
        }

        User user = userService.findById(userId)
        
        // Check if user is owner or employee of this shop
        boolean hasAccess = shop.owner.id == userId || 
                           shop.employees?.any { it.user.id == userId }
        
        if (!hasAccess) {
            throw new RuntimeException("Access denied to shop analytics")
        }

        // Calculate shop-specific metrics
        long totalAppointments = appointmentRepository.countByShopId(shopId)
        long totalCustomers = appointmentRepository.countDistinctCustomersByShopId(shopId)

        // Calculate revenue for this shop
        BigDecimal shopRevenue = calculateTotalRevenueForShop(shop)

        // Calculate average rating for this shop
        Double shopRating = ratingRepository.findAverageRatingByShop(shop)

        return [
            shopId: shopId,
            shopName: shop.name,
            totalRevenue: formatCurrency(shopRevenue),
            totalAppointments: totalAppointments,
            totalCustomers: totalCustomers,
            averageRating: shopRating ?: 0.0,
            revenueGrowth: null,
            appointmentGrowth: null,
            customerGrowth: null
        ]
    }

    Map<String, Object> getAppointmentStats(UUID shopId, String period, UUID userId) {
        // Verify access (same as above)
        Shop shop = shopRepository.findById(shopId).orElseThrow {
            new RuntimeException("Shop not found")
        }

        User user = userService.findById(userId)
        boolean hasAccess = shop.owner.id == userId || 
                           shop.employees?.any { it.user.id == userId }
        
        if (!hasAccess) {
            throw new RuntimeException("Access denied to shop analytics")
        }

        // TODO: Implement period-based filtering (today, week, month, year)
        long totalAppointments = appointmentRepository.countByShopId(shopId)
        long confirmedAppointments = appointmentRepository.countByShopIdAndStatus(shopId, AppointmentStatus.CONFIRMED)
        long completedAppointments = appointmentRepository.countByShopIdAndStatus(shopId, AppointmentStatus.COMPLETED)
        long cancelledAppointments = appointmentRepository.countByShopIdAndStatus(shopId, AppointmentStatus.CANCELLED)

        return [
            period: period ?: 'all-time',
            totalAppointments: totalAppointments,
            confirmedAppointments: confirmedAppointments,
            completedAppointments: completedAppointments,
            cancelledAppointments: cancelledAppointments,
            completionRate: totalAppointments > 0 ? (completedAppointments / totalAppointments * 100).round(2) : 0
        ]
    }

    Map<String, Object> getRevenueStats(UUID shopId, String period, UUID userId) {
        // Verify access
        Shop shop = shopRepository.findById(shopId).orElseThrow {
            new RuntimeException("Shop not found")
        }

        User user = userService.findById(userId)
        boolean hasAccess = shop.owner.id == userId || 
                           shop.employees?.any { it.user.id == userId }
        
        if (!hasAccess) {
            throw new RuntimeException("Access denied to shop analytics")
        }

        // Calculate revenue for the shop
        BigDecimal totalRevenue = calculateTotalRevenueForShop(shop)
        BigDecimal averageBookingValue = calculateAverageBookingValueForShop(shop)

        return [
            period: period ?: 'all-time',
            totalRevenue: formatCurrency(totalRevenue),
            averageBookingValue: formatCurrency(averageBookingValue),
            revenueGrowth: 0, // TODO: Implement period-based growth calculation
            topServices: [] // TODO: Implement top services by revenue
        ]
    }

    Map<String, Object> getCustomerStats(UUID shopId, String period, UUID userId) {
        // Verify access
        Shop shop = shopRepository.findById(shopId).orElseThrow {
            new RuntimeException("Shop not found")
        }

        User user = userService.findById(userId)
        boolean hasAccess = shop.owner.id == userId || 
                           shop.employees?.any { it.user.id == userId }
        
        if (!hasAccess) {
            throw new RuntimeException("Access denied to shop analytics")
        }

        long totalCustomers = appointmentRepository.countDistinctCustomersByShopId(shopId)
        long newCustomers = 0 // TODO: Calculate based on first appointment date
        long returningCustomers = 0 // TODO: Calculate customers with multiple appointments

        return [
            period: period ?: 'all-time',
            totalCustomers: totalCustomers,
            newCustomers: newCustomers,
            returningCustomers: returningCustomers,
            customerRetentionRate: 0, // TODO: Calculate retention rate
            averageVisitsPerCustomer: 0 // TODO: Calculate average visits
        ]
    }

    // Helper methods for revenue and rating calculations

    /**
     * Calculate total revenue for multiple shops
     */
    private BigDecimal calculateTotalRevenueForShops(List<UUID> shopIds) {
        try {
            List<Appointment> completedAppointments = appointmentRepository.findAll()
                .findAll { appointment ->
                    shopIds.contains(appointment.shop.id) &&
                    appointment.status == AppointmentStatus.COMPLETED &&
                    appointment.hasSuccessfulCardPayment()
                }

            return completedAppointments.sum { it.totalAmount } ?: BigDecimal.ZERO
        } catch (Exception e) {
            log.warn("Failed to calculate total revenue for shops: ${e.message}")
            return BigDecimal.ZERO
        }
    }

    /**
     * Calculate total revenue for a single shop
     */
    private BigDecimal calculateTotalRevenueForShop(Shop shop) {
        try {
            List<Appointment> completedAppointments = appointmentRepository.findByShop(shop)
                .findAll { appointment ->
                    appointment.status == AppointmentStatus.COMPLETED &&
                    appointment.hasSuccessfulCardPayment()
                }

            return completedAppointments.sum { it.totalAmount } ?: BigDecimal.ZERO
        } catch (Exception e) {
            log.warn("Failed to calculate total revenue for shop ${shop.id}: ${e.message}")
            return BigDecimal.ZERO
        }
    }

    /**
     * Calculate average booking value for a shop
     */
    private BigDecimal calculateAverageBookingValueForShop(Shop shop) {
        try {
            List<Appointment> completedAppointments = appointmentRepository.findByShop(shop)
                .findAll { appointment ->
                    appointment.status == AppointmentStatus.COMPLETED &&
                    appointment.hasSuccessfulCardPayment()
                }

            if (completedAppointments.isEmpty()) {
                return BigDecimal.ZERO
            }

            BigDecimal totalRevenue = completedAppointments.sum { it.totalAmount }
            return totalRevenue.divide(new BigDecimal(completedAppointments.size()), 2, RoundingMode.HALF_UP)
        } catch (Exception e) {
            log.warn("Failed to calculate average booking value for shop ${shop.id}: ${e.message}")
            return BigDecimal.ZERO
        }
    }

    /**
     * Calculate average rating across multiple shops
     */
    private Double calculateAverageRatingForShops(List<Shop> shops) {
        try {
            List<Double> shopRatings = shops.collect { shop ->
                ratingRepository.findAverageRatingByShop(shop)
            }.findAll { it != null }

            if (shopRatings.isEmpty()) {
                return 0.0
            }

            return shopRatings.sum() / shopRatings.size()
        } catch (Exception e) {
            log.warn("Failed to calculate average rating for shops: ${e.message}")
            return 0.0
        }
    }

    /**
     * Format currency value for display
     */
    private String formatCurrency(BigDecimal amount) {
        if (amount == null || amount == BigDecimal.ZERO) {
            return '$0.00'
        }
        return String.format('$%.2f', amount)
    }
}
