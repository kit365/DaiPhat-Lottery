package com.daiphat.coreapi.application.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigDecimal;
import java.time.LocalTime;

/**
 * Local fixture knobs for manually exercising the vendor flow. These values are
 * deliberately kept outside production business policy/System Config.
 */
@Data
@ConfigurationProperties(prefix = "daiphat.vendor.test-seed")
public class VendorTestSeedProperties {

    private int stationLimit = 2;
    private int ticketsPerStation = 100;
    private BigDecimal faceValue = BigDecimal.valueOf(10_000);
    private LocalTime supplierImportAllowedFrom = LocalTime.of(8, 0);
    private LocalTime supplierReturnCutoff = LocalTime.of(14, 30);
    private int historicalDays = 2;
    private int futureDays = 1;
}
