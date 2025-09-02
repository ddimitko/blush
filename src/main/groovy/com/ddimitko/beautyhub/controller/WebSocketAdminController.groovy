package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.service.WebSocketMonitoringService
import groovy.util.logging.Slf4j
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.http.ResponseEntity
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.SendTo
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.security.Principal

@RestController
@RequestMapping('/api/admin/websocket')
@ConditionalOnProperty(name = "websocket.enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
class WebSocketAdminController {

    @Autowired
    private WebSocketMonitoringService monitoringService

    /**
     * Get current WebSocket connection statistics
     */
    @GetMapping('/stats')
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<Map<String, Object>> getConnectionStats() {
        try {
            Map<String, Object> stats = monitoringService.getConnectionStats()
            return ResponseEntity.ok(stats)
        } catch (Exception e) {
            log.error("Failed to get WebSocket stats", e)
            return ResponseEntity.internalServerError().build()
        }
    }

    /**
     * Get session count by user
     */
    @GetMapping('/users')
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<Map<String, Integer>> getUserSessions() {
        try {
            Map<String, Integer> userSessions = monitoringService.getSessionCountByUser()
            return ResponseEntity.ok(userSessions)
        } catch (Exception e) {
            log.error("Failed to get user sessions", e)
            return ResponseEntity.internalServerError().build()
        }
    }

    /**
     * Check if a specific user is connected
     */
    @GetMapping('/users/{userId}/connected')
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<Map<String, Object>> isUserConnected(@PathVariable("userId") String userId) {
        try {
            boolean connected = monitoringService.isUserConnected(userId)
            List sessions = monitoringService.getUserSessions(userId)
            
            return ResponseEntity.ok([
                userId: userId,
                connected: connected,
                sessionCount: sessions.size(),
                sessions: sessions
            ])
        } catch (Exception e) {
            log.error("Failed to check user connection status", e)
            return ResponseEntity.internalServerError().build()
        }
    }

    /**
     * Broadcast message to all connected users
     */
    @PostMapping('/broadcast')
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<Map<String, Object>> broadcastMessage(@RequestBody Map<String, String> request) {
        try {
            String message = request.get('message')
            if (!message) {
                return ResponseEntity.badRequest().body([error: 'Message is required'])
            }
            
            monitoringService.broadcastToAll(message)
            
            return ResponseEntity.ok([
                success: true,
                message: 'Broadcast sent successfully',
                activeUsers: monitoringService.getConnectionStats().activeConnections
            ])
        } catch (Exception e) {
            log.error("Failed to broadcast message", e)
            return ResponseEntity.internalServerError().build()
        }
    }

    /**
     * Send message to specific user
     */
    @PostMapping('/users/{userId}/message')
    @PreAuthorize("hasRole('OWNER')")
    ResponseEntity<Map<String, Object>> sendMessageToUser(
            @PathVariable("userId") String userId,
            @RequestBody Map<String, Object> request) {
        try {
            String message = request.get('message')
            String destination = request.get('destination') ?: '/queue/admin-message'
            
            if (!message) {
                return ResponseEntity.badRequest().body([error: 'Message is required'])
            }
            
            if (!monitoringService.isUserConnected(userId)) {
                return ResponseEntity.badRequest().body([error: 'User is not connected'])
            }
            
            monitoringService.sendToUser(userId, destination, [
                message: message,
                timestamp: System.currentTimeMillis(),
                from: 'admin'
            ])
            
            return ResponseEntity.ok([
                success: true,
                message: 'Message sent successfully',
                userId: userId,
                destination: destination
            ])
        } catch (Exception e) {
            log.error("Failed to send message to user", e)
            return ResponseEntity.internalServerError().build()
        }
    }
}

/**
 * WebSocket message handlers for admin functionality
 */
@RestController
@Slf4j
class WebSocketAdminMessageController {

    @Autowired
    private WebSocketMonitoringService monitoringService

    /**
     * Handle admin requests for connection stats
     */
    @MessageMapping('/admin.stats')
    @SendTo('/topic/admin/stats-response')
    Map<String, Object> handleStatsRequest(Principal principal) {
        log.info("Admin stats request from: {}", principal?.name)
        return monitoringService.getConnectionStats()
    }

    /**
     * Handle admin broadcast messages
     */
    @MessageMapping('/admin.broadcast')
    @SendTo('/topic/broadcast')
    Map<String, Object> handleAdminBroadcast(Map<String, String> message, Principal principal) {
        log.info("Admin broadcast from: {}, message: {}", principal?.name, message.message)
        
        return [
            message: message.message,
            timestamp: System.currentTimeMillis(),
            from: 'admin',
            sender: principal?.name
        ]
    }

    /**
     * Handle user-specific admin messages
     */
    @MessageMapping('/admin.user-message')
    @SendToUser('/queue/admin-message')
    Map<String, Object> handleUserMessage(Map<String, Object> request, Principal principal) {
        String targetUser = request.targetUser
        String message = request.message
        
        log.info("Admin message from: {} to user: {}, message: {}", 
                principal?.name, targetUser, message)
        
        if (targetUser && monitoringService.isUserConnected(targetUser)) {
            monitoringService.sendToUser(targetUser, '/queue/admin-message', [
                message: message,
                timestamp: System.currentTimeMillis(),
                from: 'admin',
                sender: principal?.name
            ])
        }
        
        return [
            success: true,
            targetUser: targetUser,
            delivered: monitoringService.isUserConnected(targetUser)
        ]
    }

    /**
     * Handle ping requests for connection testing
     */
    @MessageMapping('/ping')
    @SendToUser('/queue/pong')
    Map<String, Object> handlePing(Principal principal) {
        return [
            message: 'pong',
            timestamp: System.currentTimeMillis(),
            user: principal?.name
        ]
    }
}
