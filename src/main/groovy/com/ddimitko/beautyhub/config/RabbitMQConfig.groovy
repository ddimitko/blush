package com.ddimitko.beautyhub.config

import org.springframework.amqp.core.*
import org.springframework.amqp.rabbit.annotation.EnableRabbit
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory
import org.springframework.amqp.rabbit.connection.ConnectionFactory
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter
import org.springframework.amqp.support.converter.MessageConverter
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
@EnableRabbit
class RabbitMQConfig {

    // Exchange names
    static final String NOTIFICATION_EXCHANGE = "beautyhub.notifications"
    static final String APPOINTMENT_EXCHANGE = "beautyhub.appointments"
    static final String SLOT_UPDATES_EXCHANGE = "beautyhub.slot.updates"

    // Queue names
    static final String NOTIFICATION_QUEUE = "beautyhub.notifications.queue"
    static final String APPOINTMENT_NOTIFICATION_QUEUE = "beautyhub.appointments.notifications.queue"
    static final String EMAIL_NOTIFICATION_QUEUE = "beautyhub.notifications.email.queue"
    static final String SLOT_UPDATES_QUEUE = "beautyhub.slot.updates.queue"

    // Routing keys
    static final String NOTIFICATION_ROUTING_KEY = "notification.created"
    static final String APPOINTMENT_NOTIFICATION_ROUTING_KEY = "appointment.notification"
    static final String EMAIL_NOTIFICATION_ROUTING_KEY = "notification.email"
    static final String SLOT_LOCKED_ROUTING_KEY = "slot.locked"
    static final String SLOT_UNLOCKED_ROUTING_KEY = "slot.unlocked"

    @Bean
    MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter()
    }

    @Bean
    RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory)
        template.setMessageConverter(jsonMessageConverter())
        return template
    }

    @Bean
    SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(ConnectionFactory connectionFactory) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory()
        factory.setConnectionFactory(connectionFactory)
        factory.setMessageConverter(jsonMessageConverter())
        return factory
    }

    // Notification Exchange
    @Bean
    TopicExchange notificationExchange() {
        return new TopicExchange(NOTIFICATION_EXCHANGE)
    }

    // Appointment Exchange
    @Bean
    TopicExchange appointmentExchange() {
        return new TopicExchange(APPOINTMENT_EXCHANGE)
    }

    // Slot Updates Exchange
    @Bean
    TopicExchange slotUpdatesExchange() {
        return new TopicExchange(SLOT_UPDATES_EXCHANGE)
    }

    // Notification Queue
    @Bean
    Queue notificationQueue() {
        return QueueBuilder.durable(NOTIFICATION_QUEUE).build()
    }

    // Appointment Notification Queue
    @Bean
    Queue appointmentNotificationQueue() {
        return QueueBuilder.durable(APPOINTMENT_NOTIFICATION_QUEUE).build()
    }

    // Email Notification Queue
    @Bean
    Queue emailNotificationQueue() {
        return QueueBuilder.durable(EMAIL_NOTIFICATION_QUEUE).build()
    }

    // Slot Updates Queue
    @Bean
    Queue slotUpdatesQueue() {
        return QueueBuilder.durable(SLOT_UPDATES_QUEUE).build()
    }

    // Bindings
    @Bean
    Binding notificationBinding() {
        return BindingBuilder
                .bind(notificationQueue())
                .to(notificationExchange())
                .with(NOTIFICATION_ROUTING_KEY)
    }

    @Bean
    Binding appointmentNotificationBinding() {
        return BindingBuilder
                .bind(appointmentNotificationQueue())
                .to(appointmentExchange())
                .with(APPOINTMENT_NOTIFICATION_ROUTING_KEY)
    }

    @Bean
    Binding emailNotificationBinding() {
        return BindingBuilder
                .bind(emailNotificationQueue())
                .to(notificationExchange())
                .with(EMAIL_NOTIFICATION_ROUTING_KEY)
    }

    @Bean
    Binding slotLockedBinding() {
        return BindingBuilder
                .bind(slotUpdatesQueue())
                .to(slotUpdatesExchange())
                .with(SLOT_LOCKED_ROUTING_KEY)
    }

    @Bean
    Binding slotUnlockedBinding() {
        return BindingBuilder
                .bind(slotUpdatesQueue())
                .to(slotUpdatesExchange())
                .with(SLOT_UNLOCKED_ROUTING_KEY)
    }
}
