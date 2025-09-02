package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.config.RabbitMQConfig
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean
import org.springframework.stereotype.Service
import groovy.util.logging.Slf4j

import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.UUID

@Service
@ConditionalOnBean(WebSocketMessagingService.class)
@Slf4j
class SlotUpdateService {

    @Autowired
    private RabbitTemplate rabbitTemplate

    @Autowired
    private WebSocketMessagingService webSocketMessagingService

    @Autowired
    private RabbitMQMessageService rabbitMQMessageService

    /**
     * Broadcast slot lock event via RabbitMQ and WebSocket
     */
    void broadcastSlotLocked(UUID shopId, UUID serviceId, UUID employeeId, LocalDateTime dateTime, UUID userId) {
        try {
            Map<String, Object> slotUpdate = createSlotUpdateMessage(
                shopId, serviceId, employeeId, dateTime, 'LOCKED', userId
            )

            // Publish to RabbitMQ for reliable delivery
            rabbitMQMessageService.publishSlotUpdate(slotUpdate)

            // Also send via WebSocket for immediate delivery to connected users
            broadcastSlotUpdateViaWebSocket(slotUpdate)

            log.info("Broadcasted slot locked event: shop={}, service={}, employee={}, dateTime={}, user={}",
                shopId, serviceId, employeeId, dateTime, userId)

        } catch (Exception e) {
            log.error("Failed to broadcast slot locked event: {}", e.getMessage(), e)
        }
    }

    /**
     * Broadcast slot unlock event via RabbitMQ and WebSocket
     */
    void broadcastSlotUnlocked(UUID shopId, UUID serviceId, UUID employeeId, LocalDateTime dateTime, UUID userId) {
        try {
            Map<String, Object> slotUpdate = createSlotUpdateMessage(
                shopId, serviceId, employeeId, dateTime, 'UNLOCKED', userId
            )

            // Publish to RabbitMQ for reliable delivery
            rabbitMQMessageService.publishSlotUpdate(slotUpdate)

            // Also send via WebSocket for immediate delivery to connected users
            broadcastSlotUpdateViaWebSocket(slotUpdate)

            log.info("Broadcasted slot unlocked event: shop={}, service={}, employee={}, dateTime={}, user={}",
                shopId, serviceId, employeeId, dateTime, userId)

        } catch (Exception e) {
            log.error("Failed to broadcast slot unlocked event: {}", e.getMessage(), e)
        }
    }

    /**
     * Broadcast slot booked event via RabbitMQ and WebSocket
     */
    void broadcastSlotBooked(UUID shopId, UUID serviceId, UUID employeeId, LocalDateTime dateTime, UUID userId) {
        try {
            Map<String, Object> slotUpdate = createSlotUpdateMessage(
                shopId, serviceId, employeeId, dateTime, 'BOOKED', userId
            )

            // Publish to RabbitMQ for reliable delivery
            rabbitMQMessageService.publishSlotUpdate(slotUpdate)

            // Also send via WebSocket for immediate delivery to connected users
            broadcastSlotUpdateViaWebSocket(slotUpdate)

            log.info("Broadcasted slot booked event: shop={}, service={}, employee={}, dateTime={}, user={}",
                shopId, serviceId, employeeId, dateTime, userId)

        } catch (Exception e) {
            log.error("Failed to broadcast slot booked event: {}", e.getMessage(), e)
        }
    }



    /**
     * Create standardized slot update message with proper UTC timestamps
     */
    private Map<String, Object> createSlotUpdateMessage(UUID shopId, UUID serviceId, UUID employeeId,
                                                       LocalDateTime dateTime, String action, UUID userId) {
        // Ensure all timestamps are in UTC format for consistent frontend handling
        LocalDateTime utcNow = LocalDateTime.now(ZoneOffset.UTC)

        return [
            type: 'SLOT_UPDATE',
            action: action,
            shopId: shopId.toString(),
            serviceId: serviceId.toString(),
            employeeId: employeeId.toString(),
            dateTime: dateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'")), // Full UTC datetime
            date: dateTime.toLocalDate().toString(), // Date in YYYY-MM-DD format
            time: dateTime.toLocalTime().toString(), // Time in HH:mm:ss format (UTC)
            userId: userId.toString(),
            timestamp: utcNow.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'")), // UTC timestamp
            timezone: 'UTC' // Explicit timezone indicator for frontend
        ]
    }

    /**
     * Broadcast slot update via WebSocket to subscribed users
     */
    private void broadcastSlotUpdateViaWebSocket(Map<String, Object> slotUpdate) {
        try {
            String shopId = slotUpdate.shopId
            String serviceId = slotUpdate.serviceId
            String employeeId = slotUpdate.employeeId
            String date = slotUpdate.date

            // Create topic patterns for different subscription levels
            List<String> topics = [
                // Most specific: shop + service + employee + date
                "slots.${shopId}.${serviceId}.${employeeId}.${date}",
                // Less specific: shop + service + date (for any employee)
                "slots.${shopId}.${serviceId}.${date}",
                // General: shop + date (for any service/employee)
                "slots.${shopId}.${date}"
            ]

            // Broadcast to all relevant topics
            topics.each { topic ->
                webSocketMessagingService.broadcastToTopic(topic, slotUpdate)
                log.debug("Broadcasted slot update to topic: {}", topic)
            }

        } catch (Exception e) {
            log.error("Failed to broadcast slot update via WebSocket: {}", e.getMessage(), e)
        }
    }

    /**
     * Generate topic name for slot subscriptions
     */
    String generateSlotTopic(UUID shopId, UUID serviceId, UUID employeeId, String date) {
        return "slots.${shopId}.${serviceId}.${employeeId}.${date}"
    }

    /**
     * Generate general topic name for shop-wide slot subscriptions
     */
    String generateShopSlotTopic(UUID shopId, String date) {
        return "slots.${shopId}.${date}"
    }

    /**
     * Generate service-specific topic name
     */
    String generateServiceSlotTopic(UUID shopId, UUID serviceId, String date) {
        return "slots.${shopId}.${serviceId}.${date}"
    }
}
