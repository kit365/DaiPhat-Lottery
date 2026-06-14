package com.daiphat.coreapi.infrastructure.config;

import com.daiphat.coreapi.application.config.PaymentProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import vn.payos.PayOS;

@Configuration
public class PayOsConfig {

    @Bean
    public PayOS payOS(PaymentProperties paymentProperties) {
        PaymentProperties.Payos payos = paymentProperties.getPayos();
        return new PayOS(payos.getClientId(), payos.getApiKey(), payos.getChecksumKey());
    }
}
