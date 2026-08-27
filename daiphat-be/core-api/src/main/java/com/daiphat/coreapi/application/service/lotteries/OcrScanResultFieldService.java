package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.scan.CorrectOcrScanResultFieldRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.CorrectOcrScanResultFieldsRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrScanResultFieldResponse;
import com.daiphat.coreapi.application.mapper.lotteries.OcrScanResultApplicationMapper;
import com.daiphat.coreapi.application.port.out.lotteries.OcrScanResultFieldRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrScanResultRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.lotteries.OcrBoundingBox;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldValidation;
import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultFieldModel;
import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Phase 2: dual-write per-field OCR rows and apply Admin corrections
 * while keeping the parent JSONB snapshot as the FE read model.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OcrScanResultFieldService {

    private final OcrScanResultFieldRepositoryPort fieldRepositoryPort;
    private final OcrScanResultRepositoryPort ocrScanResultRepositoryPort;
    private final OcrScanResultApplicationMapper ocrScanResultApplicationMapper;

    /**
     * Best-effort dual-write after parent persist. Never fails the scan path.
     */
    @Transactional
    public void dualWriteFromParent(OcrScanResultModel parent) {
        if (parent == null || parent.getId() == null) {
            return;
        }
        try {
            if (fieldRepositoryPort.existsByOcrScanResultId(parent.getId())) {
                return;
            }
            Map<OcrTemplateFieldName, String> aiValues = extractAiValues(parent);
            Set<OcrTemplateFieldName> fieldNames = EnumSet.noneOf(OcrTemplateFieldName.class);
            fieldNames.addAll(aiValues.keySet());
            addMappedKeys(fieldNames, parent.getFieldConfidences());
            addMappedKeys(fieldNames, parent.getFieldBoxes());
            addMappedKeys(fieldNames, parent.getFieldValidations());

            List<OcrScanResultFieldModel> rows = new ArrayList<>();
            for (OcrTemplateFieldName fieldName : fieldNames) {
                OcrFieldValidation validation = lookupValidation(parent, fieldName);
                rows.add(OcrScanResultFieldModel.builder()
                        .ocrScanResultId(parent.getId())
                        .fieldName(fieldName)
                        .aiValue(aiValues.get(fieldName))
                        .aiConfidence(lookupConfidence(parent, fieldName))
                        .detectedBoundingBox(lookupBox(parent, fieldName))
                        .fieldLayoutId(lookupUsedLayoutId(parent, fieldName))
                        .corrected(false)
                        .validationStatus(validation != null ? validation.getStatus() : null)
                        .validationMessage(validation != null ? validation.getMessage() : null)
                        .expectedValue(validation != null ? validation.getExpectedValue() : null)
                        .build());
            }
            if (!rows.isEmpty()) {
                fieldRepositoryPort.saveAll(rows);
            }
        } catch (Exception e) {
            log.error("Failed dual-write OCR field rows for scanResultId={}", parent.getId(), e);
        }
    }

    @Transactional(readOnly = true)
    public List<OcrScanResultFieldResponse> listByScanResultId(Long ocrScanResultId) {
        requireParent(ocrScanResultId);
        return fieldRepositoryPort.findByOcrScanResultId(ocrScanResultId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<OcrScanResultFieldResponse> correctFields(
            Long ocrScanResultId,
            CorrectOcrScanResultFieldsRequest request,
            UUID operatorId
    ) {
        OcrScanResultModel parent = requireParent(ocrScanResultId);
        ensureRowsExist(parent);

        LocalDateTime now = LocalDateTime.now();
        List<OcrScanResultFieldResponse> updated = new ArrayList<>();
        for (CorrectOcrScanResultFieldRequest item : request.fields()) {
            if (item.fieldName() == null) {
                continue;
            }
            OcrScanResultFieldModel field = fieldRepositoryPort
                    .findByOcrScanResultIdAndFieldName(ocrScanResultId, item.fieldName())
                    .orElseGet(() -> OcrScanResultFieldModel.builder()
                            .ocrScanResultId(ocrScanResultId)
                            .fieldName(item.fieldName())
                            .corrected(false)
                            .build());

            String incoming = normalizeValue(item.correctedValue());
            String original = normalizeValue(field.getAiValue());
            boolean changed = !Objects.equals(incoming, original);
            field.setCorrectedValue(incoming);
            field.setCorrected(changed);
            field.setCorrectedBy(changed ? operatorId : null);
            field.setCorrectedAt(changed ? now : null);
            updated.add(toResponse(fieldRepositoryPort.save(field)));

            applyParentSnapshot(parent, item.fieldName(), incoming);
        }

        ocrScanResultRepositoryPort.save(parent);
        return updated;
    }

    /**
     * Safety-net sync used by confirm-import when FE may have skipped live PATCH calls.
     */
    @Transactional
    public void applyConfirmSnapshot(
            Long ocrScanResultId,
            String numbers,
            String serialNumber,
            LocalDate drawDate,
            Long stationId,
            String stationName,
            UUID operatorId
    ) {
        if (ocrScanResultId == null) {
            return;
        }
        try {
            OcrScanResultModel parent = ocrScanResultRepositoryPort.findById(ocrScanResultId).orElse(null);
            if (parent == null) {
                return;
            }
            ensureRowsExist(parent);

            List<CorrectOcrScanResultFieldRequest> corrections = new ArrayList<>();
            if (StringUtils.hasText(numbers)) {
                corrections.add(new CorrectOcrScanResultFieldRequest(OcrTemplateFieldName.numbers, numbers.trim()));
            }
            if (StringUtils.hasText(serialNumber)) {
                corrections.add(new CorrectOcrScanResultFieldRequest(
                        OcrTemplateFieldName.serialNumber, serialNumber.trim()));
            }
            if (drawDate != null) {
                corrections.add(new CorrectOcrScanResultFieldRequest(
                        OcrTemplateFieldName.drawDate, drawDate.toString()));
            }
            if (StringUtils.hasText(stationName)) {
                corrections.add(new CorrectOcrScanResultFieldRequest(
                        OcrTemplateFieldName.stationName, stationName.trim()));
            }
            if (!corrections.isEmpty()) {
                correctFields(
                        ocrScanResultId,
                        new CorrectOcrScanResultFieldsRequest(corrections),
                        operatorId
                );
            }
            // stationId is parent-only (not a template field key)
            if (stationId != null) {
                parent = ocrScanResultRepositoryPort.findById(ocrScanResultId).orElse(parent);
                parent.setStationId(stationId);
                ocrScanResultRepositoryPort.save(parent);
            }
        } catch (Exception e) {
            log.error("Failed applyConfirmSnapshot for scanResultId={}", ocrScanResultId, e);
        }
    }

    private void ensureRowsExist(OcrScanResultModel parent) {
        if (!fieldRepositoryPort.existsByOcrScanResultId(parent.getId())) {
            dualWriteFromParent(parent);
        }
    }

    private OcrScanResultModel requireParent(Long ocrScanResultId) {
        return ocrScanResultRepositoryPort.findById(ocrScanResultId)
                .orElseThrow(() -> new DomainException(ErrorCode.INVALID_INPUT, "Kết quả OCR không tồn tại."));
    }

    private void applyParentSnapshot(OcrScanResultModel parent, OcrTemplateFieldName fieldName, String value) {
        switch (fieldName) {
            case stationName -> parent.setExtractedStationName(value);
            case numbers -> parent.setExtractedNumbers(value);
            case serialNumber -> parent.setExtractedSerialNumber(value);
            case drawDate -> parent.setExtractedDrawDate(parseDateOrNull(value));
            case batchCode -> parent.setExtractedBatchCode(value);
            case ticketType, price -> parent.setExtractedPrice(value);
            default -> {
                // no denormalized column
            }
        }
    }

    private Map<OcrTemplateFieldName, String> extractAiValues(OcrScanResultModel parent) {
        Map<OcrTemplateFieldName, String> values = new EnumMap<>(OcrTemplateFieldName.class);
        putIfHasText(values, OcrTemplateFieldName.stationName, parent.getExtractedStationName());
        putIfHasText(values, OcrTemplateFieldName.numbers, parent.getExtractedNumbers());
        putIfHasText(values, OcrTemplateFieldName.serialNumber, parent.getExtractedSerialNumber());
        if (parent.getExtractedDrawDate() != null) {
            values.put(OcrTemplateFieldName.drawDate, parent.getExtractedDrawDate().toString());
        }
        putIfHasText(values, OcrTemplateFieldName.batchCode, parent.getExtractedBatchCode());
        putIfHasText(values, OcrTemplateFieldName.ticketType, parent.getExtractedPrice());
        return values;
    }

    private static void putIfHasText(
            Map<OcrTemplateFieldName, String> values,
            OcrTemplateFieldName fieldName,
            String value
    ) {
        if (StringUtils.hasText(value)) {
            values.put(fieldName, value.trim());
        }
    }

    private static <V> void addMappedKeys(Set<OcrTemplateFieldName> target, Map<String, V> source) {
        if (source == null) {
            return;
        }
        for (String key : source.keySet()) {
            parseFieldName(key).ifPresent(target::add);
        }
    }

    private static java.util.Optional<OcrTemplateFieldName> parseFieldName(String key) {
        if (!StringUtils.hasText(key)) {
            return java.util.Optional.empty();
        }
        try {
            return java.util.Optional.of(OcrTemplateFieldName.valueOf(key.trim()));
        } catch (IllegalArgumentException ex) {
            return java.util.Optional.empty();
        }
    }

    private Double lookupConfidence(OcrScanResultModel parent, OcrTemplateFieldName fieldName) {
        Map<String, Double> map = parent.getFieldConfidences();
        if (map == null) {
            return null;
        }
        Double direct = map.get(fieldName.name());
        if (direct != null) {
            return direct;
        }
        if (fieldName == OcrTemplateFieldName.ticketType) {
            return map.get(OcrTemplateFieldName.price.name());
        }
        if (fieldName == OcrTemplateFieldName.price) {
            return map.get(OcrTemplateFieldName.ticketType.name());
        }
        return null;
    }

    private OcrBoundingBox lookupBox(OcrScanResultModel parent, OcrTemplateFieldName fieldName) {
        Map<String, OcrBoundingBox> map = parent.getFieldBoxes();
        if (map == null) {
            return null;
        }
        OcrBoundingBox direct = map.get(fieldName.name());
        if (direct != null) {
            return direct;
        }
        if (fieldName == OcrTemplateFieldName.ticketType) {
            return map.get(OcrTemplateFieldName.price.name());
        }
        if (fieldName == OcrTemplateFieldName.price) {
            return map.get(OcrTemplateFieldName.ticketType.name());
        }
        return null;
    }

    private OcrFieldValidation lookupValidation(OcrScanResultModel parent, OcrTemplateFieldName fieldName) {
        Map<String, OcrFieldValidation> map = parent.getFieldValidations();
        if (map == null) {
            return null;
        }
        OcrFieldValidation direct = map.get(fieldName.name());
        if (direct != null) {
            return direct;
        }
        if (fieldName == OcrTemplateFieldName.ticketType) {
            return map.get(OcrTemplateFieldName.price.name());
        }
        if (fieldName == OcrTemplateFieldName.price) {
            return map.get(OcrTemplateFieldName.ticketType.name());
        }
        return null;
    }

    private OcrScanResultFieldResponse toResponse(OcrScanResultFieldModel model) {
        return OcrScanResultFieldResponse.builder()
                .id(model.getId())
                .ocrScanResultId(model.getOcrScanResultId())
                .fieldName(model.getFieldName())
                .aiValue(model.getAiValue())
                .aiConfidence(model.getAiConfidence())
                .detectedBoundingBox(ocrScanResultApplicationMapper.toBoxResponse(model.getDetectedBoundingBox()))
                .correctedValue(model.getCorrectedValue())
                .isCorrected(model.isCorrected())
                .correctedBy(model.getCorrectedBy())
                .correctedAt(model.getCorrectedAt())
                .validationStatus(model.getValidationStatus())
                .validationMessage(model.getValidationMessage())
                .expectedValue(model.getExpectedValue())
                .effectiveValue(model.effectiveValue())
                .fieldLayoutId(model.getFieldLayoutId())
                .build();
    }

    private Long lookupUsedLayoutId(OcrScanResultModel parent, OcrTemplateFieldName fieldName) {
        Map<String, Long> used = parent.getUsedFieldLayouts();
        if (used == null || used.isEmpty() || fieldName == null) {
            return null;
        }
        Long direct = used.get(fieldName.name());
        if (direct != null) {
            return direct;
        }
        if (fieldName == OcrTemplateFieldName.ticketType) {
            return used.get(OcrTemplateFieldName.price.name());
        }
        if (fieldName == OcrTemplateFieldName.price) {
            return used.get(OcrTemplateFieldName.ticketType.name());
        }
        return null;
    }

    private static String normalizeValue(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static LocalDate parseDateOrNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (Exception e) {
            return null;
        }
    }
}
