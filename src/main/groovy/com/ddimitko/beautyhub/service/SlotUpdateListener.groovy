package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.config.RabbitMQConfig
import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean
import org.springframework.stereotype.Service
import groovy.util.logging.Slf4j

@Service
@ConditionalOnBean(WebSocketMessagingService.class)
@Slf4j
class SlotUpdateListener {

    @Autowired
    private WebSocketMessagingService webSocketMessagingService

    /**
     * Listen for slot update messages from RabbitMQ and broadcast via WebSocket
     */
    @RabbitListener(queues = RabbitMQConfig.SLOT_UPDATES_QUEUE)
    void handleSlotUpdateMessage(Map message) {
        try {
            log.info("Received slot update from RabbitMQ: action={}, shop={}, service={}, employee={}, dateTime={}",
                message.action, message.shopId, message.serviceId, message.employeeId, message.dateTime)

            // Extract data for topic generation
            String shopId = message.shopId
            String serviceId = message.serviceId
            String employeeId = message.employeeId
            String date = message.date

            // Create topic patterns for different subscription levels
            List<String> topics = [
                // Most specific: shop + service + employee + date
                "slots.${shopId}.${serviceId}.${employeeId}.${date}",
                // Less specific: shop + service + date (for any employee)
                "slots.${shopId}.${serviceId}.${date}",
                // General: shop + date (for any service/employee)
                "slots.${shopId}.${date}"
            ]

            // Broadcast to all relevant topics via WebSocket
            topics.each { topic ->
                webSocketMessagingService.broadcastToTopic(topic, message)
                log.debug("Broadcasted slot update to WebSocket topic: {}", topic)
            }

            log.info("Successfully processed slot update message via RabbitMQ")

        } catch (Exception e) {
            log.error("Failed to handle slot update message from RabbitMQ: {}", e.getMessage(), e)
            // Don't rethrow - we don't want to requeue the message for this type of error
        }
    }
}
