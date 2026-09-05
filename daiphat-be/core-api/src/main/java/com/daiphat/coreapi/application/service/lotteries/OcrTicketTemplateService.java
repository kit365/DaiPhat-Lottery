package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.scan.CreateOcrFieldLayoutRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.CreateOcrTicketTemplateRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.UpdateOcrFieldLayoutRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.UpdateOcrTicketTemplateRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrFieldLayoutResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrTemplateDefaultReadyResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrTicketTemplateResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.port.in.lotteries.OcrTicketTemplateServicePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrFieldLayoutRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrTicketTemplateRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrFieldDataType;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldLayoutModel;
import com.daiphat.coreapi.domain.model.lotteries.OcrNormalizedBoundingBox;
import com.daiphat.coreapi.domain.model.lotteries.OcrTicketTemplateModel;
import com.daiphat.coreapi.shared.util.StorageFolderConstants;
import com.daiphat.coreapi.shared.util.StorageUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OcrTicketTemplateService implements OcrTicketTemplateServicePort {

    private final OcrTicketTemplateRepositoryPort templateRepositoryPort;
    private final OcrFieldLayoutRepositoryPort fieldLayoutRepositoryPort;
    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;
    private final StoragePort storagePort;

    @Override
    @Transactional(readOnly = true)
    public OcrTemplateDefaultReadyResponse defaultReady() {
        long count = templateRepositoryPort.countActiveDefaults();
        return OcrTemplateDefaultReadyResponse.builder()
                .ready(count > 0)
                .activeDefaultCount(count)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OcrTicketTemplateResponse> listByStation(Long stationId) {
        requireStation(stationId);
        return templateRepositoryPort.findByStationId(stationId).stream()
                .map(this::toTemplateResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public OcrTicketTemplateResponse getById(Long id) {
        return toTemplateResponse(getTemplateOrThrow(id));
    }

    @Override
    @Transactional
    public OcrTicketTemplateResponse create(CreateOcrTicketTemplateRequest request) {
        requireStation(request.stationId());
        boolean makeDefault = Boolean.TRUE.equals(request.isDefault());
        if (makeDefault) {
            templateRepositoryPort.clearDefaultsForStation(request.stationId(), null);
        }

        OcrTicketTemplateModel saved = templateRepositoryPort.save(
                OcrTicketTemplateModel.builder()
                        .stationId(request.stationId())
                        .templateName(request.templateName().trim())
                        .effectiveFrom(request.effectiveFrom())
                        .effectiveTo(request.effectiveTo())
                        .sampleImageUrl(blankToNull(request.sampleImageUrl()))
                        .active(request.isActive() == null || request.isActive())
                        .isDefault(makeDefault)
                        .build()
        );
        return toTemplateResponse(saved);
    }

    @Override
    @Transactional
    public OcrTicketTemplateResponse update(Long id, UpdateOcrTicketTemplateRequest request) {
        OcrTicketTemplateModel model = getTemplateOrThrow(id);

        if (StringUtils.hasText(request.templateName())) {
            model.setTemplateName(request.templateName().trim());
        }
        if (request.effectiveFrom() != null) {
            model.setEffectiveFrom(request.effectiveFrom());
        }
        if (request.effectiveTo() != null) {
            model.setEffectiveTo(request.effectiveTo());
        }
        if (request.sampleImageUrl() != null) {
            model.setSampleImageUrl(blankToNull(request.sampleImageUrl()));
        }
        if (request.isActive() != null) {
            model.setActive(request.isActive());
        }
        if (Boolean.TRUE.equals(request.isDefault())) {
            templateRepositoryPort.clearDefaultsForStation(model.getStationId(), model.getId());
            model.setDefault(true);
        } else if (Boolean.FALSE.equals(request.isDefault())) {
            model.setDefault(false);
        }

        return toTemplateResponse(templateRepositoryPort.save(model));
    }

    @Override
    @Transactional
    public OcrTicketTemplateResponse uploadSampleImage(Long id, UploadRequest request) {
        OcrTicketTemplateModel model = getTemplateOrThrow(id);
        StorageUtils.validateOcrTemplateSampleImage(request);

        StorageResult result = storagePort.upload(new UploadRequest(
                request.data(),
                request.fileName(),
                request.contentType(),
                StorageFolderConstants.OCR_TEMPLATE_SAMPLE_FOLDER
        ));

        model.setSampleImageUrl(result.url());
        return toTemplateResponse(templateRepositoryPort.save(model));
    }

    @Override
    @Transactional
    public OcrTicketTemplateResponse setDefault(Long id) {
        OcrTicketTemplateModel model = getTemplateOrThrow(id);
        if (!model.isActive()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Template mặc định phải đang active.");
        }
        templateRepositoryPort.clearDefaultsForStation(model.getStationId(), model.getId());
        model.setDefault(true);
        return toTemplateResponse(templateRepositoryPort.save(model));
    }

    @Override
    @Transactional
    public void softDelete(Long id) {
        OcrTicketTemplateModel model = getTemplateOrThrow(id);
        model.setDefault(false);
        model.setActive(false);
        model.setDeletedAt(LocalDateTime.now());
        templateRepositoryPort.save(model);
    }

    @Override
    @Transactional
    public void applyStationDefault(Long stationId, Long templateId) {
        if (stationId == null || templateId == null) {
            return;
        }
        requireStation(stationId);
        OcrTicketTemplateModel model = getTemplateOrThrow(templateId);
        if (!stationId.equals(model.getStationId())) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Template không thuộc nhà đài đã chọn.");
        }
        if (!model.isActive()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Template mặc định phải đang active.");
        }
        templateRepositoryPort.clearDefaultsForStation(stationId, model.getId());
        model.setDefault(true);
        templateRepositoryPort.save(model);
    }

    @Override
    @Transactional(readOnly = true)
    public Long findDefaultTemplateId(Long stationId) {
        if (stationId == null) {
            return null;
        }
        return templateRepositoryPort.findDefaultByStationId(stationId)
                .map(OcrTicketTemplateModel::getId)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OcrFieldLayoutResponse> listFieldLayouts(Long templateId) {
        getTemplateOrThrow(templateId);
        return fieldLayoutRepositoryPort.findByTemplateId(templateId).stream()
                .map(this::toLayoutResponse)
                .toList();
    }

    @Override
    @Transactional
    public OcrFieldLayoutResponse createFieldLayout(Long templateId, CreateOcrFieldLayoutRequest request) {
        getTemplateOrThrow(templateId);
        validateNormalizedBox(request.boundingBox());
        int priority = resolveCreatePriority(templateId, request.fieldName(), request.priority());
        if (fieldLayoutRepositoryPort.existsByTemplateIdAndFieldNameAndPriority(
                templateId, request.fieldName(), priority
        )) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Ưu tiên (priority) " + priority + " đã tồn tại cho trường này trên template."
            );
        }
        OcrFieldLayoutModel saved = fieldLayoutRepositoryPort.save(
                OcrFieldLayoutModel.builder()
                        .templateId(templateId)
                        .fieldName(request.fieldName())
                        .boundingBox(request.boundingBox())
                        .dataType(request.dataType() != null ? request.dataType() : OcrFieldDataType.STRING)
                        .required(request.isRequired() == null || request.isRequired())
                        .priority(priority)
                        .build()
        );
        return toLayoutResponse(saved);
    }

    @Override
    @Transactional
    public OcrFieldLayoutResponse updateFieldLayout(
            Long templateId,
            Long layoutId,
            UpdateOcrFieldLayoutRequest request
    ) {
        getTemplateOrThrow(templateId);
        OcrFieldLayoutModel model = fieldLayoutRepositoryPort.findById(layoutId)
                .orElseThrow(() -> new DomainException(ErrorCode.OCR_FIELD_LAYOUT_NOT_FOUND));
        if (!templateId.equals(model.getTemplateId())) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Layout không thuộc template đã chọn.");
        }
        OcrTemplateFieldName nextFieldName =
                request.fieldName() != null ? request.fieldName() : model.getFieldName();
        int nextPriority = request.priority() != null ? request.priority() : model.getPriority();
        if (nextPriority < 1) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Priority phải >= 1.");
        }
        if (nextFieldName != model.getFieldName() || nextPriority != model.getPriority()) {
            if (fieldLayoutRepositoryPort.existsByTemplateIdAndFieldNameAndPriority(
                    templateId, nextFieldName, nextPriority
            )) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Ưu tiên (priority) " + nextPriority + " đã tồn tại cho trường này trên template."
                );
            }
        }
        if (request.fieldName() != null) {
            model.setFieldName(request.fieldName());
        }
        if (request.priority() != null) {
            model.setPriority(request.priority());
        }
        if (request.boundingBox() != null) {
            validateNormalizedBox(request.boundingBox());
            model.setBoundingBox(request.boundingBox());
        }
        if (request.dataType() != null) {
            model.setDataType(request.dataType());
        }
        if (request.isRequired() != null) {
            model.setRequired(request.isRequired());
        }
        return toLayoutResponse(fieldLayoutRepositoryPort.save(model));
    }

    @Override
    @Transactional
    public void softDeleteFieldLayout(Long templateId, Long layoutId) {
        getTemplateOrThrow(templateId);
        OcrFieldLayoutModel model = fieldLayoutRepositoryPort.findById(layoutId)
                .orElseThrow(() -> new DomainException(ErrorCode.OCR_FIELD_LAYOUT_NOT_FOUND));
        if (!templateId.equals(model.getTemplateId())) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Layout không thuộc template đã chọn.");
        }
        model.setDeletedAt(LocalDateTime.now());
        fieldLayoutRepositoryPort.save(model);
    }

    private void requireStation(Long stationId) {
        if (stationId == null || lotteryStationRepositoryPort.findById(stationId).isEmpty()) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_NOT_FOUND);
        }
    }

    private OcrTicketTemplateModel getTemplateOrThrow(Long id) {
        return templateRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.OCR_TICKET_TEMPLATE_NOT_FOUND));
    }

    private void validateNormalizedBox(OcrNormalizedBoundingBox box) {
        if (box == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Vùng nhận dạng không được để trống.");
        }
        if (box.getWidth() <= 0 || box.getHeight() <= 0
                || box.getX() < 0 || box.getY() < 0
                || box.getX() + box.getWidth() > 1.0001
                || box.getY() + box.getHeight() > 1.0001) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Vùng nhận dạng phải nằm trong khoảng chuẩn hóa 0–1."
            );
        }
    }

    private OcrTicketTemplateResponse toTemplateResponse(OcrTicketTemplateModel model) {
        return OcrTicketTemplateResponse.builder()
                .id(model.getId())
                .stationId(model.getStationId())
                .templateName(model.getTemplateName())
                .effectiveFrom(model.getEffectiveFrom())
                .effectiveTo(model.getEffectiveTo())
                .sampleImageUrl(model.getSampleImageUrl())
                .isActive(model.isActive())
                .isDefault(model.isDefault())
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .build();
    }

    private OcrFieldLayoutResponse toLayoutResponse(OcrFieldLayoutModel model) {
        return OcrFieldLayoutResponse.builder()
                .id(model.getId())
                .templateId(model.getTemplateId())
                .fieldName(model.getFieldName())
                .boundingBox(model.getBoundingBox())
                .dataType(model.getDataType())
                .isRequired(model.isRequired())
                .priority(model.getPriority() > 0 ? model.getPriority() : 1)
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .build();
    }

    private int resolveCreatePriority(
            Long templateId,
            com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName fieldName,
            Integer requested
    ) {
        if (requested != null) {
            if (requested < 1) {
                throw new DomainException(ErrorCode.INVALID_INPUT, "Priority phải >= 1.");
            }
            return requested;
        }
        return fieldLayoutRepositoryPort.findMaxPriority(templateId, fieldName) + 1;
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
