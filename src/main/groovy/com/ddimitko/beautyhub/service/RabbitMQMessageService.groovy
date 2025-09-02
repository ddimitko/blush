package com.ddimitko.beautyhub.service

import com.ddimitko.beautyhub.config.RabbitMQConfig
import com.ddimitko.beautyhub.entity.Notification
import groovy.util.logging.Slf4j
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service

@Service
@Slf4j
class RabbitMQMessageService {

    @Autowired
    private RabbitTemplate rabbitTemplate

    /**
     * Publish a notification message to RabbitMQ
     */
    void publishNotification(Notification notification) {
        try {
            def message = [
                id: notification.id,
                userId: notification.user?.id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                actionUrl: notification.actionUrl,
                createdAt: notification.createdAt,
                seen: notification.seen
            ]
            
            rabbitTemplate.convertAndSend(
                RabbitMQConfig.NOTIFICATION_EXCHANGE,
                RabbitMQConfig.NOTIFICATION_ROUTING_KEY,
                message
            )
            
            log.info("Published notification to RabbitMQ: ${notification.id}")
        } catch (Exception e) {
            log.error("Failed to publish notification to RabbitMQ: ${notification.id}", e)
        }
    }

    /**
     * Publish an appointment notification message
     */
    void publishAppointmentNotification(Map appointmentData) {
        try {
            rabbitTemplate.convertAndSend(
                RabbitMQConfig.APPOINTMENT_EXCHANGE,
                RabbitMQConfig.APPOINTMENT_NOTIFICATION_ROUTING_KEY,
                appointmentData
            )
            
            log.info("Published appointment notification to RabbitMQ: ${appointmentData.appointmentId}")
        } catch (Exception e) {
            log.error("Failed to publish appointment notification to RabbitMQ", e)
        }
    }

    /**
     * Publish an email notification message
     */
    void publishEmailNotification(Map emailData) {
        try {
            rabbitTemplate.convertAndSend(
                RabbitMQConfig.NOTIFICATION_EXCHANGE,
                RabbitMQConfig.EMAIL_NOTIFICATION_ROUTING_KEY,
                emailData
            )
            
            log.info("Published email notification to RabbitMQ: type=${emailData.emailType}, appointmentId=${emailData.appointmentId}, userId=${emailData.userId}")
        } catch (Exception e) {
            log.error("Failed to publish email notification to RabbitMQ", e)
        }
    }

    /**
     * Publish a slot update message
     */
    void publishSlotUpdate(Map slotUpdateData) {
        try {
            String routingKey
            switch (slotUpdateData.action) {
                case 'LOCKED':
                    routingKey = RabbitMQConfig.SLOT_LOCKED_ROUTING_KEY
                    break
                case 'UNLOCKED':
                    routingKey = RabbitMQConfig.SLOT_UNLOCKED_ROUTING_KEY
                    break
                case 'BOOKED':
                    routingKey = RabbitMQConfig.SLOT_UNLOCKED_ROUTING_KEY // Use unlocked routing for booked slots
                    break
                default:
                    routingKey = RabbitMQConfig.SLOT_UNLOCKED_ROUTING_KEY
            }

            rabbitTemplate.convertAndSend(
                RabbitMQConfig.SLOT_UPDATES_EXCHANGE,
                routingKey,
                slotUpdateData
            )

            log.info("Published slot update to RabbitMQ: action={}, shop={}, service={}, employee={}",
                slotUpdateData.action, slotUpdateData.shopId, slotUpdateData.serviceId, slotUpdateData.employeeId)
        } catch (Exception e) {
            log.error("Failed to publish slot update to RabbitMQ", e)
        }
    }

    /**
     * Publish a real-time WebSocket message
     */
    void publishWebSocketMessage(String userId, Map message) {
        try {
            def wsMessage = [
                userId: userId,
                type: 'websocket',
                payload: message,
                timestamp: System.currentTimeMillis()
            ]
            
            rabbitTemplate.convertAndSend(
                RabbitMQConfig.NOTIFICATION_EXCHANGE,
                "websocket.${userId}",
                wsMessage
            )
            
            log.info("Published WebSocket message to RabbitMQ for user: ${userId}")
        } catch (Exception e) {
            log.error("Failed to publish WebSocket message to RabbitMQ", e)
        }
    }
}
