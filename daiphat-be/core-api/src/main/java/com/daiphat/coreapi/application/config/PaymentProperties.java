package com.daiphat.coreapi.application.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "daiphat.payment")
public class PaymentProperties {

    private Payos payos = new Payos();

    @Data
    public static class Payos {
        private String clientId;
        private String apiKey;
        private String checksumKey;
        private String returnPath = "/checkout/result";
        private String cancelPath = "/checkout/result";
    }
}
