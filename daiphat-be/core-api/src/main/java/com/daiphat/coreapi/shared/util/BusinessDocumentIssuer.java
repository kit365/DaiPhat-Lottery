package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Who this company is, as it should appear on a document it issues.
 *
 * <p>Read from system_config rather than hard-coded, so the legal name and tax
 * code printed on a delivery note stay in step with the ones printed on a
 * contract - both are edited in the same settings screen.
 */
@Component
@RequiredArgsConstructor
public class BusinessDocumentIssuer {

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;

    /**
     * The receiving party of an import batch: tickets travel from the supplier
     * into this company's warehouse.
     */
    public record Issuer(
            String legalName,
            String taxCode,
            String address,
            String phone,
            String email,
            String representative
    ) {
    }

    public Issuer resolve() {
        return new Issuer(
                value(SystemConfigEnum.SITE_LEGAL_NAME),
                value(SystemConfigEnum.SITE_TAX_CODE),
                value(SystemConfigEnum.SITE_ADDRESS),
                value(SystemConfigEnum.SITE_PHONE),
                value(SystemConfigEnum.SITE_EMAIL),
                value(SystemConfigEnum.SITE_LEGAL_REPRESENTATIVE)
        );
    }

    /** Falls back to the enum's default, so a document is never issued unsigned. */
    private String value(SystemConfigEnum key) {
        return systemConfigRepositoryPort.findActiveByConfigKey(key.name())
                .map(SystemConfigModel::getConfigValue)
                .filter(configValue -> configValue != null && !configValue.isBlank())
                .orElse(key.getDefaultValue());
    }
}
