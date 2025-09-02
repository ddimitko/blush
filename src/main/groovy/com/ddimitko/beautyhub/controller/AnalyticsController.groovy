package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.security.CustomUserPrincipal
import com.ddimitko.beautyhub.service.AnalyticsService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = ["http://localhost:3000"])
class AnalyticsController {

    @Autowired
    private AnalyticsService analyticsService

    @GetMapping("/owner")
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<?> getOwnerAnalytics(@AuthenticationPrincipal CustomUserPrincipal userPrincipal) {
        try {
            def analytics = analyticsService.getOwnerAnalytics(userPrincipal.getId())
            return ResponseEntity.ok(analytics)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to fetch owner analytics",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/shop/{shopId}")
    @PreAuthorize("hasRole('OWNER') or hasRole('EMPLOYEE')")
    ResponseEntity<?> getShopAnalytics(
        @PathVariable("shopId") UUID shopId,
        @AuthenticationPrincipal CustomUserPrincipal userPrincipal
    ) {
        try {
            def analytics = analyticsService.getShopAnalytics(shopId, userPrincipal.getId())
            return ResponseEntity.ok(analytics)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to fetch shop analytics",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/shop/{shopId}/appointments")
    @PreAuthorize("hasRole('OWNER') or hasRole('EMPLOYEE')")
    ResponseEntity<?> getAppointmentStats(
        @PathVariable("shopId") UUID shopId,
        @RequestParam(value = "period", required = false) String period,
        @AuthenticationPrincipal CustomUserPrincipal userPrincipal
    ) {
        try {
            def stats = analyticsService.getAppointmentStats(shopId, period, userPrincipal.getId())
            return ResponseEntity.ok(stats)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to fetch appointment stats",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/shop/{shopId}/revenue")
    @PreAuthorize("hasRole('OWNER') or hasRole('EMPLOYEE')")
    ResponseEntity<?> getRevenueStats(
        @PathVariable("shopId") UUID shopId,
        @RequestParam(value = "period", required = false) String period,
        @AuthenticationPrincipal CustomUserPrincipal userPrincipal
    ) {
        try {
            def stats = analyticsService.getRevenueStats(shopId, period, userPrincipal.getId())
            return ResponseEntity.ok(stats)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to fetch revenue stats",
                message: e.getMessage()
            ])
        }
    }

    @GetMapping("/shop/{shopId}/customers")
    @PreAuthorize("hasRole('OWNER') or hasRole('EMPLOYEE')")
    ResponseEntity<?> getCustomerStats(
        @PathVariable("shopId") UUID shopId,
        @RequestParam(value = "period", required = false) String period,
        @AuthenticationPrincipal CustomUserPrincipal userPrincipal
    ) {
        try {
            def stats = analyticsService.getCustomerStats(shopId, period, userPrincipal.getId())
            return ResponseEntity.ok(stats)
        } catch (Exception e) {
            return ResponseEntity.badRequest().body([
                error: "Failed to fetch customer stats",
                message: e.getMessage()
            ])
        }
    }
}
