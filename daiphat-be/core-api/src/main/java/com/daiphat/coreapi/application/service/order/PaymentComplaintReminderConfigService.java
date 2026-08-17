package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Reads the operator-notification switch without leaking config parsing to listeners. */
@Service
@RequiredArgsConstructor
public class PaymentComplaintReminderConfigService {

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;

    public boolean isEnabled() {
        return systemConfigRepositoryPort
                .findActiveByConfigKey(SystemConfigEnum.ORDER_PAYMENT_COMPLAINT_REMINDER_ENABLED.name())
                .map(SystemConfigModel::getConfigValue)
                .map(String::trim)
                .map(Boolean::parseBoolean)
                .orElse(true);
    }
}
