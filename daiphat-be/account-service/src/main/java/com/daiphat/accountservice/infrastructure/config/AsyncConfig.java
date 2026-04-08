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

    @Bean(name = "mailExecutor")
    public Executor mailExecutor() {
        log.info("Initializing Async Mail Executor...");
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);        // Số luồng tối thiểu luôn chạy
        executor.setMaxPoolSize(20);       // Số luồng tối đa khi tải cao
        executor.setQueueCapacity(500);    // Hàng đợi chờ xử lý
        executor.setThreadNamePrefix("MailAsync-");
        executor.initialize();
        return executor;
    }
}
