package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchLineRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchClassificationPreviewRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchBlockedStationResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchClassificationPreviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchEligibleStationResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchEligibleStationsResponse;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchTimePolicyResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.mapper.lotteries.ImportBatchApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.ImportBatchServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotterySupplierServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.shared.util.ImportBatchConfigResolver;
import com.daiphat.coreapi.shared.util.ImportBatchCodeGenerator;
import com.daiphat.coreapi.shared.util.ImportBatchDraftExpiryService;
import com.daiphat.coreapi.shared.util.ImportBatchStationEligibilityResolver;
import com.daiphat.coreapi.shared.util.ImportBatchTypeResolver;
import com.daiphat.coreapi.shared.util.SortUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImportBatchService implements ImportBatchServicePort {

    private static final DateTimeFormatter TIME_DISPLAY = DateTimeFormatter.ofPattern("H:mm");

    private final ImportBatchRepositoryPort importBatchRepositoryPort;
    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    private final LotteryStationServicePort lotteryStationServicePort;
    private final LotterySupplierServicePort lotterySupplierServicePort;
    private final ImportBatchApplicationMapper importBatchApplicationMapper;
    private final ImportBatchTypeResolver importBatchTypeResolver;
    private final ImportBatchStationEligibilityResolver stationEligibilityResolver;
    private final ImportBatchCodeGenerator importBatchCodeGenerator;
    private final ImportBatchConfigResolver importBatchConfigResolver;
    private final ImportBatchDraftExpiryService importBatchDraftExpiryService;
    private final Clock clock;

    @Override
    @Transactional
    public ImportBatchResponse create(CreateImportBatchRequest request, UUID operatorId) {
        log.info("Creating import batch with {} line(s) on draw date {}", request.lines().size(), request.drawDate());

        ensureUniqueStations(request.lines());
        lotterySupplierServicePort.ensureActiveSupplierConfigured();
        validateInDayCreateAllowed(request);

        if (request.supplierId() == null) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_SUPPLIER_REQUIRED);
        }
        LotterySupplierModel supplier = lotterySupplierServicePort.getActiveModelById(request.supplierId());

        LocalDateTime now = LocalDateTime.now(clock);

        ImportBatchModel header = ImportBatchModel.builder()
                .drawDate(request.drawDate())
                .supplierId(supplier.getId())
                .supplierName(supplier.getName())
                .importMode(request.importMode())
                .invoiceEvidenceUrl(resolveInvoiceEvidenceUrl(request))
                .note(trimToNull(request.note()))
                .lines(new ArrayList<>())
                .build();
        header.initializeForCreate(operatorId, now);
        header.markSubmitted(now);
        header.setBatchCode(importBatchCodeGenerator.generateHeaderCode(request.drawDate()));

        boolean lateImportWarning = false;
        List<String> warnings = new ArrayList<>();

        for (CreateImportBatchLineRequest lineRequest : request.lines()) {
            LotteryStationModel station = getActiveStationOrThrow(lineRequest.lotteryStationId());
            validateStationEligibility(request.drawDate(), station, request.importMode());
            validateDeclareQuantity(lineRequest.declareQuantity());
            validateImportCost(lineRequest.importCost());

            ImportBatchTypeResolver.ClassificationResult classification = importBatchTypeResolver.resolve(
                    lineRequest.lotteryStationId(),
                    request.drawDate(),
                    station,
                    request.importMode()
            );
            lateImportWarning = lateImportWarning || classification.lateImportWarning();
            if (classification.warnings() != null) {
                warnings.addAll(classification.warnings());
            }

            ImportBatchLineModel line = importBatchApplicationMapper.toLineModel(lineRequest);
            line.applyResolvedBatchType(classification.resolvedBatchType());
            line.setBatchCode(importBatchCodeGenerator.generateLineCode(
                    station,
                    classification.resolvedBatchType(),
                    request.drawDate()
            ));
            line.recalculateDeclaredCostValue();
            line.setStatus(ImportBatchLineStatus.OPEN);
            line.recalculateTotalCostValue();
            header.getLines().add(line);
        }

        header.validateInvoiceEvidence();
        header.recalculateAggregates();

        ImportBatchModel saved = importBatchRepositoryPort.save(header);
        return importBatchApplicationMapper.toResponse(saved, lateImportWarning, warnings);
    }

    @Override
    @Transactional
    public Optional<ImportBatchResponse> getActiveDraft(UUID operatorId) {
        importBatchDraftExpiryService.cancelOverdueDrafts();
        if (operatorId == null) {
            return Optional.empty();
        }

        return importBatchRepositoryPort.findByImportedByAndStatus(operatorId, ImportBatchStatus.DRAFT)
                .map(importBatchApplicationMapper::toResponse);
    }

    @Override
    @Transactional
    public List<ImportBatchResponse> getIncompleteBatches() {
        importBatchDraftExpiryService.cancelOverdueDrafts();
        return importBatchRepositoryPort.findIncompleteDraftBatches().stream()
                .map(importBatchApplicationMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public ImportBatchResponse getById(Long id) {
        importBatchDraftExpiryService.cancelOverdueDrafts();
        ImportBatchModel model = getImportBatchOrThrow(id);
        return importBatchApplicationMapper.toResponse(model);
    }

    @Override
    @Transactional
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
        importBatchDraftExpiryService.cancelOverdueDrafts();
        PageRequest pageable = PageRequest.of(
                Math.max(0, page - 1),
                size,
                resolveListSort(sortBy, direction)
        );

        Page<ImportBatchModel> resultPage = importBatchRepositoryPort.findAll(
                pageable,
                lotteryStationId,
                drawDate,
                status,
                batchType
        );

        Page<ImportBatchResponse> responsePage = resultPage.map(importBatchApplicationMapper::toResponse);
        return PageResponse.from(responsePage, page, size);
    }

    @Override
    public List<EnumOptionResponse> getBatchTypeOptions() {
        return List.of(
                new EnumOptionResponse(ImportBatchType.NEW.name(), ImportBatchType.NEW.getLabel()),
                new EnumOptionResponse(ImportBatchType.SUPPLEMENTARY.name(), ImportBatchType.SUPPLEMENTARY.getLabel()),
                new EnumOptionResponse(ImportBatchType.LATE_IMPORT.name(), ImportBatchType.LATE_IMPORT.getLabel()),
                new EnumOptionResponse(ImportBatchType.ADJUSTMENT.name(), ImportBatchType.ADJUSTMENT.getLabel())
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ImportBatchEligibleStationsResponse getEligibleStations(
            LocalDate drawDate,
            ImportBatchImportMode importMode
    ) {
        LocalDateTime now = LocalDateTime.now(clock);
        List<ImportBatchEligibleStationResponse> eligible = new ArrayList<>();
        List<ImportBatchBlockedStationResponse> blocked = new ArrayList<>();

        for (LotteryStationModel station : lotteryStationServicePort.getScheduleModelsByDrawDate(drawDate)) {
            if (!stationEligibilityResolver.isScheduledOnDrawDate(station, drawDate)) {
                continue;
            }

            if (importBatchLineRepositoryPort.existsDraftLineForStationAndDrawDate(station.getId(), drawDate)) {
                blocked.add(ImportBatchBlockedStationResponse.builder()
                        .lotteryStationId(station.getId())
                        .name(station.getName())
                        .existingDraftBatchId(importBatchLineRepositoryPort
                                .findDraftBatchIdForStationAndDrawDate(station.getId(), drawDate)
                                .orElse(null))
                        .blockedReason("Đài đã có phiếu nhập nháp cho ngày quay này.")
                        .build());
                continue;
            }

            if (!stationEligibilityResolver.isEligibleForSelection(station, drawDate, now, importMode)) {
                continue;
            }

            ImportBatchTypeResolver.ClassificationResult classification = importBatchTypeResolver.resolve(
                    station.getId(),
                    drawDate,
                    station,
                    importMode
            );
            eligible.add(ImportBatchEligibleStationResponse.builder()
                    .lotteryStationId(station.getId())
                    .name(station.getName())
                    .resolvedBatchType(classification.resolvedBatchType())
                    .build());
        }

        return ImportBatchEligibleStationsResponse.builder()
                .eligible(eligible)
                .blocked(blocked)
                .build();
    }

    @Override
    public ImportBatchClassificationPreviewResponse previewClassification(
            ImportBatchClassificationPreviewRequest request
    ) {
        LotteryStationModel station = getActiveStationOrThrow(request.lotteryStationId());
        validateStationEligibility(request.drawDate(), station, request.importMode());

        ImportBatchTypeResolver.ClassificationResult classification = importBatchTypeResolver.resolve(
                request.lotteryStationId(),
                request.drawDate(),
                station,
                request.importMode()
        );

        return ImportBatchClassificationPreviewResponse.builder()
                .resolvedBatchType(classification.resolvedBatchType())
                .lateImportWarning(classification.lateImportWarning())
                .warnings(classification.warnings())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ImportBatchTimePolicyResponse getTimePolicy() {
        return ImportBatchTimePolicyResponse.builder()
                .lateImportTime(importBatchConfigResolver.resolveLateImportTime().format(TIME_DISPLAY))
                .importBatchCutoffTime(importBatchConfigResolver.resolveImportBatchCutoff().format(TIME_DISPLAY))
                .build();
    }

    @Override
    @Transactional
    public int cancelOverdueDrafts() {
        return importBatchDraftExpiryService.cancelOverdueDrafts();
    }

    private void validateInDayCreateAllowed(CreateImportBatchRequest request) {
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDate today = now.toLocalDate();
        if (request.importMode() != ImportBatchImportMode.IN_DAY || !today.equals(request.drawDate())) {
            return;
        }

        List<LotteryStationModel> scheduled = lotteryStationServicePort.getScheduleModelsByDrawDate(request.drawDate());
        if (scheduled.isEmpty()) {
            return;
        }

        boolean anyEligible = scheduled.stream()
                .anyMatch(station -> stationEligibilityResolver.isEligibleForSelection(
                        station, request.drawDate(), now, ImportBatchImportMode.IN_DAY));

        if (!anyEligible) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_ALL_STATIONS_DRAFT);
        }
    }

    private void ensureUniqueStations(List<CreateImportBatchLineRequest> lines) {
        Set<Long> stationIds = new HashSet<>();
        for (CreateImportBatchLineRequest line : lines) {
            if (!stationIds.add(line.lotteryStationId())) {
                throw new DomainException(ErrorCode.IMPORT_BATCH_DUPLICATE_STATION);
            }
        }
    }

    private LotteryStationModel getActiveStationOrThrow(Long stationId) {
        LotteryStationModel station = lotteryStationServicePort.getModelById(stationId);
        if (station == null || !station.isActive()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_STATION_INACTIVE);
        }
        return station;
    }

    private void validateStationEligibility(
            LocalDate drawDate,
            LotteryStationModel station,
            ImportBatchImportMode importMode
    ) {
        stationEligibilityResolver.validateStationEligibleOrThrow(
                station,
                drawDate,
                LocalDateTime.now(clock),
                importMode
        );
    }

    private String resolveInvoiceEvidenceUrl(CreateImportBatchRequest request) {
        if (request.importMode() != ImportBatchImportMode.IN_DAY) {
            return null;
        }
        if (request.invoiceEvidenceUrl() == null || request.invoiceEvidenceUrl().isBlank()) {
            return null;
        }
        return request.invoiceEvidenceUrl().trim();
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
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

    private Sort resolveListSort(String sortBy, String direction) {
        if (sortBy == null || sortBy.isBlank()) {
            return Sort.by(Sort.Order.desc("drawDate")).and(Sort.by(Sort.Order.desc("createdAt")));
        }
        return SortUtils.createSort(sortBy, direction);
    }

    private ImportBatchModel getImportBatchOrThrow(Long id) {
        return importBatchRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));
    }
}
