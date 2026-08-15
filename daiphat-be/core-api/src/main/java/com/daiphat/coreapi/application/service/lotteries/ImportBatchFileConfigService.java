package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.lotteries.ImportBatchFileConfig;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateImportBatchFileConfigRequest;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reads the file-import rules from system_config.
 *
 * <p>Always returns a usable configuration: a missing, malformed or nonsensical
 * stored value falls back to the defaults rather than breaking the import, because
 * a bad settings row must not take the feature offline.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportBatchFileConfigService {

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final ObjectMapper objectMapper;

    public ImportBatchFileConfig get() {
        return systemConfigRepositoryPort
                .findActiveByConfigKey(SystemConfigEnum.TICKET_IMPORT_FILE_CONFIG.name())
                .map(SystemConfigModel::getConfigValue)
                .map(this::parse)
                .orElseGet(ImportBatchFileConfig::defaults);
    }

    @Transactional
    public ImportBatchFileConfig update(UpdateImportBatchFileConfigRequest request) {
        ImportBatchFileConfig current = get();
        ImportBatchFileConfig next = ImportBatchFileConfig.builder()
                .maxFileSizeMb(request.maxFileSizeMb() != null
                        ? request.maxFileSizeMb() : current.maxFileSizeMb())
                .maxRows(request.maxRows() != null ? request.maxRows() : current.maxRows())
                .serialSeparator(request.serialSeparator() != null
                        ? request.serialSeparator() : current.serialSeparator())
                .storeOriginalFile(request.storeOriginalFile() != null
                        ? request.storeOriginalFile() : current.storeOriginalFile())
                .allowPartialImport(request.allowPartialImport() != null
                        ? request.allowPartialImport() : current.allowPartialImport())
                .fieldAliases(request.fieldAliases() != null
                        ? request.fieldAliases() : current.fieldAliases())
                .build()
                .sanitized();

        SystemConfigModel model = systemConfigRepositoryPort
                .findActiveByConfigKey(SystemConfigEnum.TICKET_IMPORT_FILE_CONFIG.name())
                .orElseThrow(() -> new DomainException(ErrorCode.SYSTEM_CONFIG_NOT_FOUND));

        try {
            model.setConfigValue(objectMapper.writeValueAsString(next));
        } catch (Exception e) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Không lưu được cấu hình đọc tệp.");
        }
        systemConfigRepositoryPort.save(model);
        return next;
    }

    private ImportBatchFileConfig parse(String rawValue) {
        try {
            return objectMapper.readValue(rawValue, ImportBatchFileConfig.class).sanitized();
        } catch (Exception e) {
            log.warn("TICKET_IMPORT_FILE_CONFIG is not readable, falling back to defaults", e);
            return ImportBatchFileConfig.defaults();
        }
    }
}
