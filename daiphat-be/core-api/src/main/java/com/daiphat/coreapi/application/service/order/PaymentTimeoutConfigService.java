package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PaymentTimeoutConfigService {

    private static final int DEFAULT_TIMEOUT_MINUTES = Integer.parseInt(
            SystemConfigEnum.PAYMENT_TIMEOUT_MINUTES.getDefaultValue());

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;

    public int getTimeoutMinutes() {
        return systemConfigRepositoryPort
                .findActiveByConfigKey(SystemConfigEnum.PAYMENT_TIMEOUT_MINUTES.name())
                .map(SystemConfigModel::getConfigValue)
                .map(this::parseMinutes)
                .orElse(DEFAULT_TIMEOUT_MINUTES);
    }

    public long getTimeoutSeconds() {
        return getTimeoutMinutes() * 60L;
    }

    public String getTimeoutCancelReason() {
        return "Quá thời gian thanh toán " + getTimeoutMinutes() + " phút.";
    }

    private int parseMinutes(String rawValue) {
        try {
            int minutes = Integer.parseInt(rawValue.trim());
            return minutes > 0 ? minutes : DEFAULT_TIMEOUT_MINUTES;
        } catch (NumberFormatException ex) {
            return DEFAULT_TIMEOUT_MINUTES;
        }
    }
}
