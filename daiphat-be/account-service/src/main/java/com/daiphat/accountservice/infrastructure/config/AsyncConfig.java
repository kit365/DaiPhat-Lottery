package com.daiphat.accountservice.infrastructure.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
@Slf4j
public class AsyncConfig {

    public static final String MAIL_THREAD_PREFIX = "MailAsync-";

    @Bean(name = "mailExecutor")
    public Executor mailExecutor() {
        log.info("Initializing Async Mail Executor with prefix: {}", MAIL_THREAD_PREFIX);
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix(MAIL_THREAD_PREFIX);
        executor.initialize();
        return executor;
    }
}
