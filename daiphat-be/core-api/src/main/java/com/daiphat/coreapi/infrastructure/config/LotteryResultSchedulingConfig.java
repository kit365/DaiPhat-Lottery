package com.daiphat.coreapi.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration
public class LotteryResultSchedulingConfig {

    @Bean(name = "lotteryResultLivePollingTaskScheduler")
    public ThreadPoolTaskScheduler lotteryResultLivePollingTaskScheduler() {
        ThreadPoolTaskScheduler taskScheduler = new ThreadPoolTaskScheduler();
        taskScheduler.setPoolSize(1);
        taskScheduler.setThreadNamePrefix("lottery-result-live-poll-");
        taskScheduler.setRemoveOnCancelPolicy(true);
        taskScheduler.initialize();
        return taskScheduler;
    }
}
