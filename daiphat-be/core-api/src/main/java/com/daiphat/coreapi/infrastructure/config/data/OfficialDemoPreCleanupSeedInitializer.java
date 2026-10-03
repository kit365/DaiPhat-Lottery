package com.daiphat.coreapi.infrastructure.config.data;

import org.springframework.beans.factory.annotation.Value;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Remove customer-side demo state before import serials are rebuilt. */
@Component
@Order(90)
@RequiredArgsConstructor
@ConditionalOnProperty(value = "daiphat.official-demo.seed.enabled", havingValue = "true")
public class OfficialDemoPreCleanupSeedInitializer implements ApplicationRunner {

    @Value("${daiphat.lottery.seed.rebuild-demo:false}")
    private boolean rebuildDemo;

    private final OfficialDemoAfterSalesSeedInitializer afterSales;
    private final OfficialDemoOrderSeedInitializer orders;

    @Value("${daiphat.lottery.seed.daily-only:true}")
    private boolean dailyOnly;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (dailyOnly) return;
        if (!rebuildDemo) return;
        afterSales.clearPreviousAfterSales();
        orders.clearPreviousOrders();
    }
}
