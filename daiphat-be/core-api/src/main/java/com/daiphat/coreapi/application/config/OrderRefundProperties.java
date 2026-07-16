package com.daiphat.coreapi.application.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.LocalTime;

@Data
@ConfigurationProperties(prefix = "daiphat.order.refund")
public class OrderRefundProperties {

    private LocalTime closingTime = LocalTime.of(14, 0);
    private int windowMinutes = 30;
    private String timezone = "Asia/Ho_Chi_Minh";
}
