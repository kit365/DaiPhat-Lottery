package com.daiphat.coreapi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;
import com.daiphat.coreapi.application.config.AuthProperties;

@SpringBootApplication
@EnableAsync
@EnableConfigurationProperties(AuthProperties.class)
public class CoreApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(CoreApiApplication.class, args);
    }
}
