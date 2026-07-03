package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchClassificationPreviewRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchClassificationPreviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.mapper.lotteries.ImportBatchApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.ImportBatchServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import com.daiphat.coreapi.shared.util.ImportBatchConfigResolver;
import com.daiphat.coreapi.shared.util.ImportBatchTimePolicy;
import com.daiphat.coreapi.shared.util.SortUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImportBatchService implements ImportBatchServicePort {

    private final ImportBatchRepositoryPort importBatchRepositoryPort;
    private final LotteryStationServicePort lotteryStationServicePort;
    private final ImportBatchApplicationMapper importBatchApplicationMapper;
    private final ImportBatchConfigResolver importBatchConfigResolver;
    private final Clock clock;

    @Override
    @Transactional
    public ImportBatchResponse create(CreateImportBatchRequest request, UUID operatorId) {
        log.info("Creating import batch for station {} on draw date {}", request.lotteryStationId(), request.drawDate());

        LotteryStationModel station = getActiveStationOrThrow(request.lotteryStationId());
        validateDrawDate(request.drawDate(), station);
        validateDeclareQuantity(request.declareQuantity());
        validateImportCost(request.importCost());

        ImportBatchTimePolicy.ClassificationResult classification = classify(
                request.requestedBatchType(),
                request.drawDate()
        );

        ImportBatchModel model = importBatchApplicationMapper.toModel(request);
        model.initializeForCreate(operatorId);
        model.setRequestedBatchType(request.requestedBatchType());
        model.applyResolvedBatchType(classification.resolvedBatchType());
        if (request.invoiceEvidenceUrl() != null && !request.invoiceEvidenceUrl().isBlank()) {
            model.setInvoiceEvidenceUrl(request.invoiceEvidenceUrl().trim());
        }
        model.validateInvoiceEvidence();
        model.recalculateTotalCostValue();

        ImportBatchModel saved = importBatchRepositoryPort.save(model);
        return importBatchApplicationMapper.toResponse(saved, classification);
    }

    @Override
    @Transactional(readOnly = true)
    public ImportBatchResponse getById(Long id) {
        ImportBatchModel model = getImportBatchOrThrow(id);
        return importBatchApplicationMapper.toResponse(model, false, List.of());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ImportBatchResponse> getAll(
            int page,
            int size,
            Long lotteryStationId,
            LocalDate drawDate,
            ImportBatchStatus status,
            ImportBatchType batchType,
            String sortBy,
            String direction
    ) {
        PageRequest pageable = PageRequest.of(
                Math.max(0, page - 1),
                size,
                SortUtils.createSort(sortBy, direction)
        );

        Page<ImportBatchModel> resultPage = importBatchRepositoryPort.findAll(
                pageable,
                lotteryStationId,
                drawDate,
                status,
                batchType
        );

        Page<ImportBatchResponse> responsePage = resultPage.map(model ->
                importBatchApplicationMapper.toResponse(model, false, List.of())
        );

        return PageResponse.from(responsePage, page, size);
    }

    @Override
    public List<EnumOptionResponse> getBatchTypeOptions() {
        return Arrays.stream(ImportBatchType.values())
                .map(type -> new EnumOptionResponse(type.name(), type.getLabel()))
                .toList();
    }

    @Override
    public ImportBatchClassificationPreviewResponse previewClassification(ImportBatchClassificationPreviewRequest request) {
        ImportBatchTimePolicy.ClassificationResult classification = classify(
                request.requestedBatchType(),
                request.drawDate()
        );
        return ImportBatchClassificationPreviewResponse.builder()
                .requestedBatchType(request.requestedBatchType())
                .resolvedBatchType(classification.resolvedBatchType())
                .lateImportWarning(classification.lateImportWarning())
                .warnings(classification.warnings())
                .build();
    }

    private ImportBatchTimePolicy.ClassificationResult classify(
            ImportBatchType requestedBatchType,
            LocalDate drawDate
    ) {
        LocalDateTime now = LocalDateTime.now(clock);
        return ImportBatchTimePolicy.classify(
                requestedBatchType,
                drawDate,
                now,
                importBatchConfigResolver.resolveLateWindowStart(),
                importBatchConfigResolver.resolveImportCutoff()
        );
    }

    private LotteryStationModel getActiveStationOrThrow(Long stationId) {
        LotteryStationModel station = lotteryStationServicePort.getModelById(stationId);
        if (station == null || !station.isActive()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_STATION_INACTIVE);
        }
        return station;
    }

    private void validateDrawDate(LocalDate drawDate, LotteryStationModel station) {
        DrawScheduleUtils.validate(station.getDrawDays(), station.getDrawTime());
        if (!station.getDrawDays().contains(drawDate.getDayOfWeek())) {
            throw new DomainException(
                    ErrorCode.IMPORT_BATCH_DRAW_DATE_INVALID,
                    "Ngày quay " + drawDate + " không khớp lịch quay của đài " + station.getName() + "."
            );
        }
    }

    private void validateDeclareQuantity(Integer declareQuantity) {
        if (declareQuantity == null || declareQuantity <= 0) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_DECLARE_QUANTITY_INVALID);
        }
    }

    private void validateImportCost(BigDecimal importCost) {
        if (importCost == null || importCost.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_IMPORT_COST_INVALID);
        }
    }

    private ImportBatchModel getImportBatchOrThrow(Long id) {
        return importBatchRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));
    }
}
