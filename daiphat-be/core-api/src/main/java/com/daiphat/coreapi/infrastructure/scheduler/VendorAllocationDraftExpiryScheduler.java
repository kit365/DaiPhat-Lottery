package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.port.in.streetagent.VendorAllocationServicePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class VendorAllocationDraftExpiryScheduler {
    private final VendorAllocationServicePort vendorAllocationServicePort;

    @Scheduled(fixedDelayString = "${daiphat.vendor-allocation.draft-expiry-check-ms:60000}")
    public void expireDrafts() {
        int expired = vendorAllocationServicePort.expireDrafts();
        if (expired > 0) {
            log.info("Released {} expired vendor allocation draft(s)", expired);
        }
    }
}
