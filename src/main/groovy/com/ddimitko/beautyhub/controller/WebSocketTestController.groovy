package com.ddimitko.beautyhub.controller

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
class WebSocketTestController {

    @Autowired
    private WebSocketMonitoringService monitoringService

    /**
     * REST endpoint to get WebSocket connection stats
     */
    @RestController
    @RequestMapping("/api/test/websocket")
    @CrossOrigin(origins = "*", maxAge = 3600)
    static class WebSocketTestRestController {

        @Autowired
        private WebSocketMonitoringService monitoringService

        @GetMapping("/stats")
        Map<String, Object> getStats() {
            return monitoringService.getConnectionStats()
        }

        @PostMapping("/broadcast")
        Map<String, Object> broadcastMessage(@RequestBody Map<String, Object> request) {
            String message = request.message as String

            monitoringService.broadcastToAll(message)

            return [
                success: true,
                message: "Broadcast sent to ${monitoringService.getConnectionStats().activeConnections} connections".toString(),
                timestamp: LocalDateTime.now()
            ]
        }

        @PostMapping("/user/{userId}")
        Map<String, Object> sendUserMessage(@PathVariable("userId") String userId, @RequestBody Map<String, Object> request) {
            String message = request.message as String

            monitoringService.sendToUser(userId, message)

            return [
                success: true,
                message: "Message sent to user ${userId}",
                timestamp: LocalDateTime.now()
            ]
        }

        @GetMapping("/health")
        Map<String, Object> health() {
            def stats = monitoringService.getConnectionStats()
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
