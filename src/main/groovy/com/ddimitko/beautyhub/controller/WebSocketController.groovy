package com.ddimitko.beautyhub.controller

import com.ddimitko.beautyhub.service.NotificationService
import com.ddimitko.beautyhub.service.SlotLockingService
import com.ddimitko.beautyhub.service.WebSocketMonitoringService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.*
import groovy.util.logging.Slf4j

import java.time.LocalDateTime

@Controller
@ConditionalOnProperty(name = "websocket.enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
class WebSocketController {

    @Autowired
    private SlotLockingService slotLockingService

    @Autowired
    private NotificationService notificationService

    @Autowired
    private WebSocketMonitoringService webSocketMonitoringService

    /**
     * Get WebSocket connection statistics
     */
    @RestController
    @RequestMapping("/api/websocket")
    @CrossOrigin(origins = "*", maxAge = 3600)
    static class WebSocketRestController {

        @Autowired
        private WebSocketMonitoringService webSocketMonitoringService

        @GetMapping("/stats")
        Map<String, Object> getConnectionStats() {
            def connectionStats = webSocketMonitoringService.getConnectionStats()
            def topicStats = webSocketMonitoringService.getTopicStats()

            return [
                *:connectionStats,
                topicStats: topicStats
            ]
        }

        @GetMapping("/debug-subscriptions")
        Map<String, Object> getDebugSubscriptions() {
            return webSocketMonitoringService.getDebugSubscriptions()
        }

        @PostMapping("/broadcast")
        Map<String, Object> broadcastMessage(@RequestBody Map<String, Object> request) {
            String message = request.message as String

            webSocketMonitoringService.broadcastToAll(message)

            return [
                success: true,
                message: "Broadcast sent to ${webSocketMonitoringService.getConnectionStats().activeConnections} connections".toString(),
                timestamp: LocalDateTime.now()
            ]
        }

        @PostMapping("/user/{userId}")
        Map<String, Object> sendUserMessage(@PathVariable("userId") String userId, @RequestBody Map<String, Object> request) {
            String message = request.message as String

            webSocketMonitoringService.sendToUser(userId, message)

            return [
                success: true,
                message: "Message sent to user ${userId}".toString(),
                timestamp: LocalDateTime.now()
            ]
        }

        @GetMapping("/health")
        Map<String, Object> health() {
            def stats = webSocketMonitoringService.getConnectionStats()
            return [
                status: "UP",
                websocket: [
                    enabled: true,
                    activeConnections: stats.activeConnections,
                    totalConnections: stats.totalConnections
                ],
                timestamp: LocalDateTime.now()
            ]
        }
    }
}
