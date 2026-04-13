package com.daiphat.accountservice.infrastructure.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình RabbitMQ cho việc truyền tin nhắn bất đồng bộ.
 */
@Configuration
public class RabbitMQConfig {

    public static final String EMAIL_QUEUE = "daiphat.email.queue";
    public static final String EMAIL_EXCHANGE = "daiphat.email.exchange";
    public static final String EMAIL_ROUTING_KEY = "daiphat.email.routing.key";

    // Dead Letter Config
    public static final String EMAIL_DLQ = "daiphat.email.dlq";
    public static final String EMAIL_DLX = "daiphat.email.dlx";
    public static final String EMAIL_DLQ_ROUTING_KEY = "daiphat.email.dlq.routing.key";

    // Retry Config (Delayed Processing via TTL + DLX)
    public static final String EMAIL_RETRY_QUEUE = "daiphat.email.retry.queue";
    public static final String EMAIL_RETRY_EXCHANGE = "daiphat.email.retry.exchange";
    public static final String EMAIL_RETRY_ROUTING_KEY = "daiphat.email.retry.routing_key";

    // RabbitMQ Argument Keys
    public static final String X_DEAD_LETTER_EXCHANGE = "x-dead-letter-exchange";
    public static final String X_DEAD_LETTER_ROUTING_KEY = "x-dead-letter-routing-key";

    @Bean
    public Queue emailQueue() {
        return QueueBuilder.durable(EMAIL_QUEUE)
                .withArgument(X_DEAD_LETTER_EXCHANGE, EMAIL_DLX)
                .withArgument(X_DEAD_LETTER_ROUTING_KEY, EMAIL_DLQ_ROUTING_KEY)
                .build();
    }

    @Bean
    public DirectExchange emailExchange() {
        return new DirectExchange(EMAIL_EXCHANGE);
    }

    @Bean
    public Binding emailBinding(Queue emailQueue, DirectExchange emailExchange) {
        return BindingBuilder.bind(emailQueue).to(emailExchange).with(EMAIL_ROUTING_KEY);
    }

    // Dead Letter Exchange & Queue Setup
    @Bean
    public Queue emailDeadLetterQueue() {
        return QueueBuilder.durable(EMAIL_DLQ).build();
    }

    @Bean
    public DirectExchange emailDeadLetterExchange() {
        return new DirectExchange(EMAIL_DLX);
    }

    @Bean
    public Binding emailDLQBinding(Queue emailDeadLetterQueue, DirectExchange emailDeadLetterExchange) {
        return BindingBuilder.bind(emailDeadLetterQueue).to(emailDeadLetterExchange).with(EMAIL_DLQ_ROUTING_KEY);
    }

    // --- Retry Mechanism Beans ---

    @Bean
    public Queue emailRetryQueue() {
        return QueueBuilder.durable(EMAIL_RETRY_QUEUE)
                .withArgument(X_DEAD_LETTER_EXCHANGE, EMAIL_EXCHANGE)
                .withArgument(X_DEAD_LETTER_ROUTING_KEY, EMAIL_ROUTING_KEY)
                .build();
    }

    @Bean
    public DirectExchange emailRetryExchange() {
        return new DirectExchange(EMAIL_RETRY_EXCHANGE);
    }

    @Bean
    public Binding emailRetryBinding(Queue emailRetryQueue, DirectExchange emailRetryExchange) {
        return BindingBuilder.bind(emailRetryQueue).to(emailRetryExchange).with(EMAIL_RETRY_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
