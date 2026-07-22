package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchLineRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchClassificationPreviewRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateImportBatchLineRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateImportBatchRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchBlockedStationResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchClassificationPreviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchEligibleStationResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchEligibleStationsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchLineEntryTicketsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchReductionLineResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchReductionTicketsResponse;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchTimePolicyResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.mapper.lotteries.ImportBatchApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.ImportBatchServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotterySupplierServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
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
import com.daiphat.coreapi.shared.util.ImportBatchImportModeResolver;
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
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

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
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final ImportBatchImportModeResolver importBatchImportModeResolver;
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

        if (!Boolean.TRUE.equals(request.forceCreate())) {
            importBatchRepositoryPort
                    .findEditableBatchByImportedByAndDrawDateAndSupplierAndImportMode(
                            operatorId,
                            request.drawDate(),
                            supplier.getId(),
                            request.importMode()
                    )
                    .ifPresent(existing -> {
                        throw new DomainException(
                                ErrorCode.IMPORT_BATCH_DRAFT_ALREADY_EXISTS,
                                importBatchApplicationMapper.toResponse(existing)
                        );
                    });
        }

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
        validateTotalDeclareQuantity(request.totalDeclareQuantity());
        header.setTotalDeclareQuantity(request.totalDeclareQuantity());

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

        validateDeclaredQuantityMatchesLines(header);
        header.validateInvoiceEvidence();
        header.recalculateAggregates();

        ImportBatchModel saved = importBatchRepositoryPort.save(header);
        return importBatchApplicationMapper.toResponse(saved, lateImportWarning, warnings);
    }

    @Override
    @Transactional
    public ImportBatchResponse update(Long id, UpdateImportBatchRequest request) {
        int lineRequestCount = request.lines() == null ? 0 : request.lines().size();
        log.info("Updating import batch {} with {} line request(s)", id, lineRequestCount);

        ImportBatchModel batch = getImportBatchOrThrow(id);
        importBatchDraftExpiryService.cancelIfOverdue(batch);
        batch = getImportBatchOrThrow(id);

        if (!batch.isEditable()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVALID_STATUS);
        }

        lotterySupplierServicePort.ensureActiveSupplierConfigured();
        if (request.supplierId() == null) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_SUPPLIER_REQUIRED);
        }
        applySupplierUpdate(batch, request.supplierId());
        validateTotalDeclareQuantity(request.totalDeclareQuantity());
        applyDeclareQuantityReductionIfNeeded(batch, request);
        batch = getImportBatchOrThrow(id);
        batch.setTotalDeclareQuantity(request.totalDeclareQuantity());

        LocalDateTime now = LocalDateTime.now(clock);

        boolean hasLineUpdates = request.lines() != null && !request.lines().isEmpty();
        if (hasLineUpdates) {
            applyLineUpdates(batch, request, now);
        } else {
            applyInvoiceEvidenceUpdate(batch, request);
        }

        validateDeclaredQuantityMatchesLines(batch);
        batch.validateInvoiceEvidence();
        batch.recalculateAggregates();
        if (hasLineUpdates) {
            batch.refreshImportStatus(now);
        }
        batch.setUpdatedAt(now);

        ImportBatchModel saved = importBatchRepositoryPort.save(batch);
        return importBatchApplicationMapper.toResponse(saved);
    }

    private void applyLineUpdates(
            ImportBatchModel batch,
            UpdateImportBatchRequest request,
            LocalDateTime now
    ) {
        applyInvoiceEvidenceUpdate(batch, request);

        List<ImportBatchLineModel> existingLines = batch.getActiveLines();
        Map<Long, ImportBatchLineModel> existingById = existingLines.stream()
                .collect(Collectors.toMap(ImportBatchLineModel::getId, line -> line));

        Set<Long> referencedIds = request.lines().stream()
                .map(UpdateImportBatchLineRequest::id)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        for (ImportBatchLineModel existingLine : existingLines) {
            if (!referencedIds.contains(existingLine.getId())) {
                throw new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND);
            }
        }

        long remainingLines = request.lines().stream()
                .filter(line -> !Boolean.TRUE.equals(line.removed()))
                .count();
        if (remainingLines < 1) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_LAST_LINE_CANNOT_DELETE);
        }

        ensureUniqueStationsFromUpdate(request.lines(), existingById);

        for (UpdateImportBatchLineRequest lineRequest : request.lines()) {
            if (lineRequest.id() == null || !Boolean.TRUE.equals(lineRequest.removed())) {
                continue;
            }
            ImportBatchLineModel existingLine = existingById.get(lineRequest.id());
            if (existingLine == null) {
                throw new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND);
            }
            removeDeletableLineFromBatch(batch, existingLine, now);
        }

        for (UpdateImportBatchLineRequest lineRequest : request.lines()) {
            if (lineRequest.id() == null) {
                continue;
            }
            if (Boolean.TRUE.equals(lineRequest.removed())) {
                continue;
            }

            ImportBatchLineModel existingLine = existingById.get(lineRequest.id());
            if (existingLine == null) {
                throw new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND);
            }

            if (existingLine.getStatus() == ImportBatchLineStatus.OPEN) {
                updateOpenLine(batch, existingLine, lineRequest, now);
            } else if (existingLine.getStatus() == ImportBatchLineStatus.IMPORTING) {
                updateImportingLine(batch, existingLine, lineRequest, now);
            } else if (existingLine.getStatus() == ImportBatchLineStatus.PAUSED) {
                updatePausedLine(batch, existingLine, lineRequest, now, request);
            } else if (existingLine.getStatus() == ImportBatchLineStatus.IMPORTED
                    || existingLine.getStatus() == ImportBatchLineStatus.CANCELLED) {
                verifyTerminalLineUnchanged(existingLine, lineRequest);
            } else {
                throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_NOT_EDITABLE);
            }
        }

        for (UpdateImportBatchLineRequest lineRequest : request.lines()) {
            if (lineRequest.id() == null && !Boolean.TRUE.equals(lineRequest.removed())) {
                addLineToBatch(batch, lineRequest, now);
            }
        }

        batch.setLines(importBatchLineRepositoryPort.findByImportBatchId(batch.getId()));
        recalculateOpenLineBatchTypes(batch, now);
    }

    private void applyInvoiceEvidenceUpdate(ImportBatchModel batch, UpdateImportBatchRequest request) {
        if (batch.getImportMode() != ImportBatchImportMode.IN_DAY) {
            return;
        }
        if (request.invoiceEvidenceUrl() == null) {
            return;
        }
        // Invoice evidence is immutable on edit — clients may only resend the existing URL.
        String requested = trimToNull(request.invoiceEvidenceUrl());
        String existing = trimToNull(batch.getInvoiceEvidenceUrl());
        if (!Objects.equals(existing, requested)) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVOICE_EVIDENCE_LOCKED);
        }
    }

    private void applySupplierUpdate(ImportBatchModel batch, Long supplierId) {
        if (Objects.equals(supplierId, batch.getSupplierId())) {
            return;
        }

        // Supplier can only change while no ticket import has started (DRAFT only).
        // RECEIVING / PARTIALLY_IMPORTED already attribute inventory & payables to the current vendor.
        if (batch.getStatus() != ImportBatchStatus.DRAFT) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_SUPPLIER_LOCKED_IMPORTED_LINES);
        }

        LotterySupplierModel supplier = lotterySupplierServicePort.getActiveModelById(supplierId);
        batch.setSupplierId(supplier.getId());
        batch.setSupplierName(supplier.getName());
    }

    @Override
    @Transactional
    public Optional<ImportBatchResponse> getActiveDraft(UUID operatorId) {
        importBatchDraftExpiryService.cancelOverdueDrafts();
        if (operatorId == null) {
            return Optional.empty();
        }

        return importBatchRepositoryPort.findEditableBatchByImportedBy(operatorId)
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
    public List<ImportBatchResponse> getBatchesWithoutLines() {
        importBatchDraftExpiryService.cancelOverdueDrafts();
        return importBatchRepositoryPort.findEditableBatchesWithoutLines().stream()
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
            ImportBatchImportMode importMode,
            Long excludeBatchId
    ) {
        LocalDateTime now = LocalDateTime.now(clock);
        List<ImportBatchEligibleStationResponse> eligible = new ArrayList<>();
        List<ImportBatchBlockedStationResponse> blocked = new ArrayList<>();

        for (LotteryStationModel station : lotteryStationServicePort.getScheduleModelsByDrawDate(drawDate)) {
            if (!stationEligibilityResolver.isScheduledOnDrawDate(station, drawDate)) {
                continue;
            }

            boolean hasDraftLine = excludeBatchId != null
                    ? importBatchLineRepositoryPort.existsDraftLineForStationAndDrawDateExcludingBatch(
                            station.getId(), drawDate, excludeBatchId)
                    : importBatchLineRepositoryPort.existsDraftLineForStationAndDrawDate(station.getId(), drawDate);

            if (hasDraftLine) {
                Optional<Long> existingBatchId = excludeBatchId != null
                        ? importBatchLineRepositoryPort.findDraftBatchIdForStationAndDrawDateExcludingBatch(
                                station.getId(), drawDate, excludeBatchId)
                        : importBatchLineRepositoryPort.findDraftBatchIdForStationAndDrawDate(station.getId(), drawDate);
                blocked.add(ImportBatchBlockedStationResponse.builder()
                        .lotteryStationId(station.getId())
                        .name(station.getName())
                        .existingDraftBatchId(existingBatchId.orElse(null))
                        .blockedReason("Đài đã có phiếu nhập nháp cho ngày quay này.")
                        .build());
                continue;
            }

            if (!stationEligibilityResolver.isEligibleForSelection(
                    station, drawDate, now, importMode, excludeBatchId)) {
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
        validateStationEligibility(
                request.drawDate(),
                station,
                request.importMode(),
                request.excludeBatchId()
        );

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

    @Override
    @Transactional
    public ImportBatchResponse deleteLine(Long batchId, Long lineId) {
        ImportBatchModel batch = getImportBatchOrThrow(batchId);
        importBatchDraftExpiryService.cancelIfOverdue(batch);
        batch = getImportBatchOrThrow(batchId);

        if (!batch.isEditable()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVALID_STATUS);
        }

        if (importBatchLineRepositoryPort.countActiveByImportBatchId(batchId) <= 1) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_LAST_LINE_CANNOT_DELETE);
        }

        ImportBatchLineModel line = importBatchLineRepositoryPort.findById(lineId)
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));

        if (!Objects.equals(line.getImportBatchId(), batchId)) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND);
        }

        if (!line.isDeletable()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_NOT_DELETABLE);
        }

        if (line.getStatus() == ImportBatchLineStatus.OPEN
                || line.getStatus() == ImportBatchLineStatus.IMPORTING
                || line.getStatus() == ImportBatchLineStatus.PAUSED) {
            lotteryTicketServicePort.purgeImportBatchLineTickets(lineId);
        }

        LocalDateTime now = LocalDateTime.now(clock);
        line.softDelete(now);
        importBatchLineRepositoryPort.save(line);

        batch.setLines(importBatchLineRepositoryPort.findByImportBatchId(batchId));
        batch.recalculateAggregates();
        batch.refreshImportStatus(now);
        ImportBatchModel saved = importBatchRepositoryPort.save(batch);

        if (saved.getStatus() == ImportBatchStatus.IMPORTED) {
            saved.getActiveLines().forEach(activeLine ->
                    lotteryTicketServicePort.activateTicketsForImportBatchLine(activeLine.getId())
            );
        }

        return importBatchApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public ImportBatchResponse pauseLine(Long batchId, Long lineId) {
        ImportBatchModel batch = getImportBatchOrThrow(batchId);
        importBatchDraftExpiryService.cancelIfOverdue(batch);
        batch = getImportBatchOrThrow(batchId);

        if (!batch.isEditable()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVALID_STATUS);
        }

        ImportBatchLineModel line = importBatchLineRepositoryPort.findById(lineId)
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));

        if (!Objects.equals(line.getImportBatchId(), batchId) || line.isDeleted()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND);
        }

        LocalDateTime now = LocalDateTime.now(clock);
        line.pauseImport(now);
        importBatchLineRepositoryPort.save(line);

        batch.setLines(importBatchLineRepositoryPort.findByImportBatchId(batchId));
        return importBatchApplicationMapper.toResponse(importBatchRepositoryPort.save(batch));
    }

    @Override
    @Transactional
    public ImportBatchResponse resumeLine(Long batchId, Long lineId) {
        ImportBatchModel batch = getImportBatchOrThrow(batchId);
        importBatchDraftExpiryService.cancelIfOverdue(batch);
        batch = getImportBatchOrThrow(batchId);

        if (!batch.isEditable()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVALID_STATUS);
        }

        ImportBatchLineModel line = importBatchLineRepositoryPort.findById(lineId)
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));

        if (!Objects.equals(line.getImportBatchId(), batchId) || line.isDeleted()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND);
        }

        LocalDateTime now = LocalDateTime.now(clock);
        line.resumeImport(now);
        importBatchLineRepositoryPort.save(line);

        batch.setLines(importBatchLineRepositoryPort.findByImportBatchId(batchId));
        return importBatchApplicationMapper.toResponse(importBatchRepositoryPort.save(batch));
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

    private void ensureUniqueStationsFromUpdate(
            List<UpdateImportBatchLineRequest> lines,
            Map<Long, ImportBatchLineModel> existingById
    ) {
        Set<Long> stationIds = new HashSet<>();
        for (UpdateImportBatchLineRequest line : lines) {
            if (Boolean.TRUE.equals(line.removed())) {
                continue;
            }
            Long stationId = line.lotteryStationId();
            if (stationId == null || stationId <= 0) {
                if (line.id() != null && existingById.containsKey(line.id())) {
                    stationId = existingById.get(line.id()).getLotteryStationId();
                } else {
                    continue;
                }
            }
            if (stationId == null) {
                continue;
            }
            if (!stationIds.add(stationId)) {
                throw new DomainException(ErrorCode.IMPORT_BATCH_DUPLICATE_STATION);
            }
        }
    }

    private void addLineToBatch(ImportBatchModel batch, UpdateImportBatchLineRequest lineRequest, LocalDateTime now) {
        validateDeclareQuantity(lineRequest.declareQuantity());
        validateImportCost(lineRequest.importCost());

        LotteryStationModel station = getActiveStationOrThrow(lineRequest.lotteryStationId());

        Optional<ImportBatchLineModel> deletedLine = importBatchLineRepositoryPort
                .findDeletedByImportBatchIdAndStationId(batch.getId(), lineRequest.lotteryStationId());
        if (deletedLine.isPresent()) {
            reviveDeletedLine(batch, deletedLine.get(), lineRequest, station, now);
            return;
        }

        validateStationEligibility(batch.getDrawDate(), station, batch.getImportMode(), batch.getId());
        validateStationAvailableForBatch(batch.getId(), batch.getDrawDate(), station.getId());

        ImportBatchTypeResolver.ClassificationResult classification = importBatchTypeResolver.resolve(
                lineRequest.lotteryStationId(),
                batch.getDrawDate(),
                station,
                batch.getImportMode()
        );

        ImportBatchLineModel line = ImportBatchLineModel.builder()
                .importBatchId(batch.getId())
                .lotteryStationId(lineRequest.lotteryStationId())
                .declareQuantity(lineRequest.declareQuantity())
                .importCost(lineRequest.importCost())
                .build();
        line.applyResolvedBatchType(classification.resolvedBatchType());
        line.setBatchCode(importBatchCodeGenerator.generateLineCode(
                station,
                classification.resolvedBatchType(),
                batch.getDrawDate()
        ));
        line.recalculateDeclaredCostValue();
        line.setStatus(ImportBatchLineStatus.OPEN);
        line.recalculateTotalCostValue();
        line.setCreatedAt(now);
        line.setUpdatedAt(now);
        importBatchLineRepositoryPort.save(line);
    }

    private void reviveDeletedLine(
            ImportBatchModel batch,
            ImportBatchLineModel line,
            UpdateImportBatchLineRequest lineRequest,
            LotteryStationModel station,
            LocalDateTime now
    ) {
        ImportBatchTypeResolver.ClassificationResult classification = importBatchTypeResolver.resolve(
                lineRequest.lotteryStationId(),
                batch.getDrawDate(),
                station,
                batch.getImportMode()
        );

        line.setDeletedAt(null);
        line.setDeclareQuantity(lineRequest.declareQuantity());
        line.setImportCost(lineRequest.importCost());
        line.applyResolvedBatchType(classification.resolvedBatchType());
        line.setBatchCode(importBatchCodeGenerator.generateLineCode(
                station,
                classification.resolvedBatchType(),
                batch.getDrawDate()
        ));
        line.recalculateDeclaredCostValue();
        line.setStatus(ImportBatchLineStatus.OPEN);
        line.setTotalQuantity(0);
        line.recalculateTotalCostValue();
        line.setImportedAt(null);
        line.setUpdatedAt(now);
        importBatchLineRepositoryPort.save(line);
    }

    private void updateOpenLine(
            ImportBatchModel batch,
            ImportBatchLineModel line,
            UpdateImportBatchLineRequest lineRequest,
            LocalDateTime now
    ) {
        validateDeclareQuantity(lineRequest.declareQuantity());
        validateImportCost(lineRequest.importCost());

        Long requestedStationId = resolveRequestedStationId(line, lineRequest);
        if (!Objects.equals(line.getLotteryStationId(), requestedStationId)) {
            // OPEN lines have no imported tickets yet. Allow station changes while the batch
            // itself is still editable (DRAFT / RECEIVING / PARTIALLY_IMPORTED).
            if (!batch.isEditable()) {
                throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_NOT_EDITABLE);
            }
            applyOpenLineStationChange(batch, line, requestedStationId, now);
        }

        line.setDeclareQuantity(lineRequest.declareQuantity());
        line.setImportCost(lineRequest.importCost());
        line.recalculateDeclaredCostValue();
        line.recalculateTotalCostValue();
        line.setUpdatedAt(now);
        importBatchLineRepositoryPort.save(line);
    }

    private void applyOpenLineStationChange(
            ImportBatchModel batch,
            ImportBatchLineModel line,
            Long stationId,
            LocalDateTime now
    ) {
        LotteryStationModel station = getActiveStationOrThrow(stationId);
        validateStationEligibility(batch.getDrawDate(), station, batch.getImportMode(), batch.getId());
        validateStationAvailableForBatch(batch.getId(), batch.getDrawDate(), stationId);

        ImportBatchTypeResolver.ClassificationResult classification = importBatchTypeResolver.resolve(
                stationId,
                batch.getDrawDate(),
                station,
                batch.getImportMode()
        );

        line.setLotteryStationId(stationId);
        line.applyResolvedBatchType(classification.resolvedBatchType());
        line.setBatchCode(importBatchCodeGenerator.generateLineCode(
                station,
                classification.resolvedBatchType(),
                batch.getDrawDate()
        ));
        line.setUpdatedAt(now);
    }

    private void updateImportingLine(
            ImportBatchModel batch,
            ImportBatchLineModel line,
            UpdateImportBatchLineRequest lineRequest,
            LocalDateTime now
    ) {
        validateImportCost(lineRequest.importCost());

        // Declare quantity is locked while actively importing — pause first.
        if (!Objects.equals(line.getDeclareQuantity(), lineRequest.declareQuantity())) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_DECLARE_QUANTITY_LOCKED_IMPORTING);
        }

        Long requestedStationId = resolveRequestedStationId(line, lineRequest);
        if (!Objects.equals(line.getLotteryStationId(), requestedStationId)) {
            // Station is locked once ticket import has started (IMPORTING / PAUSED).
            throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_NOT_EDITABLE);
        }

        line.setImportCost(lineRequest.importCost());
        line.recalculateDeclaredCostValue();
        int importedCount = line.getTotalQuantity() != null ? line.getTotalQuantity() : 0;
        line.updateImportProgress(importedCount, now, false);
        importBatchLineRepositoryPort.save(line);
    }

    private void updatePausedLine(
            ImportBatchModel batch,
            ImportBatchLineModel line,
            UpdateImportBatchLineRequest lineRequest,
            LocalDateTime now,
            UpdateImportBatchRequest request
    ) {
        validateImportCost(lineRequest.importCost());

        boolean declareChanged = !Objects.equals(line.getDeclareQuantity(), lineRequest.declareQuantity());
        boolean adjustmentFlow = Boolean.TRUE.equals(request.adjustPausedDeclareQuantity());

        if (declareChanged && !adjustmentFlow) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_DECLARE_QUANTITY_REQUIRES_ADJUSTMENT_FLOW);
        }

        if (declareChanged) {
            validateDeclareQuantity(lineRequest.declareQuantity());
            validateDeclareQuantityNotBelowImported(lineRequest.declareQuantity(), line.getTotalQuantity());
        }

        int importedCount = line.getTotalQuantity() != null ? line.getTotalQuantity() : 0;
        boolean completingAsImported = declareChanged
                && lineRequest.declareQuantity() != null
                && lineRequest.declareQuantity() == importedCount;
        boolean hasTicketRemovals = request.removedTicketIds() != null && !request.removedTicketIds().isEmpty();
        // Completing a line by matching declare to imported (no ticket deletes) requires explicit confirm.
        if (completingAsImported
                && !hasTicketRemovals
                && !Boolean.TRUE.equals(request.confirmPausedLineImported())) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_IMPORTED_CONFIRMATION_REQUIRED);
        }

        Long requestedStationId = resolveRequestedStationId(line, lineRequest);
        if (!Objects.equals(line.getLotteryStationId(), requestedStationId)) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_NOT_EDITABLE);
        }

        if (declareChanged) {
            line.setDeclareQuantity(lineRequest.declareQuantity());
        }
        line.setImportCost(lineRequest.importCost());
        line.recalculateDeclaredCostValue();
        line.updateImportProgress(importedCount, now, false);
        importBatchLineRepositoryPort.save(line);
    }

    /**
     * Missing or non-positive station IDs from the client mean "keep the current station".
     * This prevents declare-quantity edits on DRAFT/OPEN lines from being rejected with
     * {@link ErrorCode#IMPORT_BATCH_LINE_NOT_EDITABLE} when the payload omits/zeros stationId.
     */
    private Long resolveRequestedStationId(
            ImportBatchLineModel line,
            UpdateImportBatchLineRequest lineRequest
    ) {
        Long requestedStationId = lineRequest.lotteryStationId();
        if (requestedStationId == null || requestedStationId <= 0) {
            return line.getLotteryStationId();
        }
        return requestedStationId;
    }

    private void verifyTerminalLineUnchanged(ImportBatchLineModel line, UpdateImportBatchLineRequest lineRequest) {
        Long requestedStationId = resolveRequestedStationId(line, lineRequest);
        if (!Objects.equals(line.getLotteryStationId(), requestedStationId)
                || !Objects.equals(line.getDeclareQuantity(), lineRequest.declareQuantity())
                || line.getImportCost() == null
                || lineRequest.importCost() == null
                || line.getImportCost().compareTo(lineRequest.importCost()) != 0) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_NOT_EDITABLE);
        }
    }

    private void validateDeclareQuantityNotBelowImported(Integer declareQuantity, Integer importedQuantity) {
        int imported = importedQuantity != null ? importedQuantity : 0;
        if (declareQuantity != null && declareQuantity < imported) {
            throw new DomainException(
                    ErrorCode.IMPORT_BATCH_DECLARE_QUANTITY_BELOW_IMPORTED,
                    null,
                    declareQuantity,
                    imported
            );
        }
    }

    private void removeDeletableLineFromBatch(ImportBatchModel batch, ImportBatchLineModel line, LocalDateTime now) {
        if (!line.isDeletable()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_NOT_DELETABLE);
        }

        if (importBatchLineRepositoryPort.countActiveByImportBatchId(batch.getId()) <= 1) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_LAST_LINE_CANNOT_DELETE);
        }

        if (line.getStatus() == ImportBatchLineStatus.OPEN
                || line.getStatus() == ImportBatchLineStatus.IMPORTING
                || line.getStatus() == ImportBatchLineStatus.PAUSED) {
            lotteryTicketServicePort.purgeImportBatchLineTickets(line.getId());
        }
        line.softDelete(now);
        importBatchLineRepositoryPort.save(line);
    }

    private void recalculateOpenLineBatchTypes(ImportBatchModel batch, LocalDateTime now) {
        for (ImportBatchLineModel line : batch.getActiveLines()) {
            if (line.getStatus() != ImportBatchLineStatus.OPEN) {
                continue;
            }

            LotteryStationModel station = getActiveStationOrThrow(line.getLotteryStationId());
            ImportBatchTypeResolver.ClassificationResult classification = importBatchTypeResolver.resolve(
                    line.getLotteryStationId(),
                    batch.getDrawDate(),
                    station,
                    batch.getImportMode()
            );
            line.applyResolvedBatchType(classification.resolvedBatchType());
            line.setBatchCode(importBatchCodeGenerator.generateLineCode(
                    station,
                    classification.resolvedBatchType(),
                    batch.getDrawDate()
            ));
            line.recalculateDeclaredCostValue();
            line.setUpdatedAt(now);
            importBatchLineRepositoryPort.save(line);
        }
    }

    private void validateStationAvailableForBatch(Long batchId, LocalDate drawDate, Long stationId) {
        if (importBatchLineRepositoryPort.existsDraftLineForStationAndDrawDateExcludingBatch(
                stationId,
                drawDate,
                batchId
        )) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_STATION_DRAFT_EXISTS);
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
        validateStationEligibility(drawDate, station, importMode, null);
    }

    private void validateStationEligibility(
            LocalDate drawDate,
            LotteryStationModel station,
            ImportBatchImportMode importMode,
            Long excludeBatchId
    ) {
        stationEligibilityResolver.validateStationEligibleOrThrow(
                station,
                drawDate,
                LocalDateTime.now(clock),
                importMode,
                excludeBatchId
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

    private void validateTotalDeclareQuantity(Integer totalDeclareQuantity) {
        if (totalDeclareQuantity == null || totalDeclareQuantity <= 0) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_DECLARE_QUANTITY_INVALID);
        }
    }

    private void applyDeclareQuantityReductionIfNeeded(ImportBatchModel batch, UpdateImportBatchRequest request) {
        int requiredExcess = computeRequiredDeclareQuantityReductionExcess(batch, request);
        if (requiredExcess <= 0) {
            return;
        }

        validateDeclareQuantityReductionIsPossible(batch, requiredExcess);

        List<Long> removedTicketIds = request.removedTicketIds() != null ? request.removedTicketIds() : List.of();
        if (removedTicketIds.isEmpty()) {
            int currentImported = batch.getTotalImportedQuantity() != null ? batch.getTotalImportedQuantity() : 0;
            throw new DomainException(
                    ErrorCode.IMPORT_BATCH_DECLARE_QUANTITY_BELOW_IMPORTED,
                    null,
                    request.totalDeclareQuantity(),
                    currentImported
            );
        }

        lotteryTicketServicePort.hardDeleteImportBatchTicketsForReduction(
                batch.getId(),
                removedTicketIds,
                requiredExcess
        );
    }

    /**
     * When line updates are present, excess is driven by per-line declare vs imported.
     * Otherwise fall back to batch-total vs batch-imported (header-only reduction).
     */
    private int computeRequiredDeclareQuantityReductionExcess(
            ImportBatchModel batch,
            UpdateImportBatchRequest request
    ) {
        if (request.lines() != null && !request.lines().isEmpty()) {
            Map<Long, ImportBatchLineModel> linesById = batch.getActiveLines().stream()
                    .filter(line -> line.getId() != null)
                    .collect(Collectors.toMap(ImportBatchLineModel::getId, line -> line, (a, b) -> a));

            int lineExcess = 0;
            for (UpdateImportBatchLineRequest lineRequest : request.lines()) {
                if (lineRequest.id() == null || Boolean.TRUE.equals(lineRequest.removed())) {
                    continue;
                }
                ImportBatchLineModel existing = linesById.get(lineRequest.id());
                if (existing == null) {
                    continue;
                }
                if (existing.getStatus() != ImportBatchLineStatus.OPEN
                        && existing.getStatus() != ImportBatchLineStatus.IMPORTING
                        && existing.getStatus() != ImportBatchLineStatus.PAUSED) {
                    continue;
                }
                int imported = existing.getTotalQuantity() != null ? existing.getTotalQuantity() : 0;
                int newDeclare = lineRequest.declareQuantity() != null ? lineRequest.declareQuantity() : 0;
                lineExcess += Math.max(0, imported - newDeclare);
            }
            return lineExcess;
        }

        int currentImported = batch.getTotalImportedQuantity() != null ? batch.getTotalImportedQuantity() : 0;
        return Math.max(0, currentImported - request.totalDeclareQuantity());
    }

    private void validateDeclareQuantityReductionIsPossible(ImportBatchModel batch, int excess) {
        int removableImported = batch.getActiveLines().stream()
                .filter(line -> line.getStatus() == ImportBatchLineStatus.OPEN
                        || line.getStatus() == ImportBatchLineStatus.IMPORTING
                        || line.getStatus() == ImportBatchLineStatus.PAUSED)
                .mapToInt(line -> line.getTotalQuantity() != null ? line.getTotalQuantity() : 0)
                .sum();

        if (excess > removableImported) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_DECLARE_QUANTITY_REDUCTION_IMPORTED_ONLY);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ImportBatchReductionTicketsResponse getReductionTickets(Long importBatchId) {
        ImportBatchModel batch = getImportBatchOrThrow(importBatchId);
        List<ImportBatchReductionLineResponse> lineResponses = new ArrayList<>();
        int removableImported = 0;

        for (ImportBatchLineModel line : batch.getActiveLines()) {
            boolean deletable = line.getStatus() == ImportBatchLineStatus.OPEN
                    || line.getStatus() == ImportBatchLineStatus.IMPORTING
                    || line.getStatus() == ImportBatchLineStatus.PAUSED;
            int importedQuantity = line.getTotalQuantity() != null ? line.getTotalQuantity() : 0;

            if (deletable) {
                removableImported += importedQuantity;
            }

            LotteryStationModel station = lotteryStationServicePort.getModelById(line.getLotteryStationId());
            lineResponses.add(ImportBatchReductionLineResponse.builder()
                    .lineId(line.getId())
                    .lotteryStationId(line.getLotteryStationId())
                    .stationName(station.getName())
                    .status(line.getStatus())
                    .deletable(deletable)
                    .importedQuantity(importedQuantity)
                    .tickets(lotteryTicketServicePort.listReductionTicketsByImportBatchLine(line.getId()))
                    .build());
        }

        return ImportBatchReductionTicketsResponse.builder()
                .totalImportedQuantity(batch.getTotalImportedQuantity())
                .removableImportedQuantity(removableImported)
                .lines(lineResponses)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ImportBatchLineEntryTicketsResponse getLineEntryTickets(Long batchId, Long lineId) {
        ImportBatchModel batch = getImportBatchOrThrow(batchId);
        ImportBatchLineModel line = batch.getActiveLines().stream()
                .filter(item -> Objects.equals(item.getId(), lineId))
                .findFirst()
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));

        ImportBatchLineEntryTicketsResponse response =
                lotteryTicketServicePort.listEntryTicketsByImportBatchLine(line.getId());
        if (!Objects.equals(response.importBatchId(), batchId)) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND);
        }
        return response;
    }

    private void validateDeclaredQuantityMatchesLines(ImportBatchModel batch) {
        int linesSum = batch.getActiveLines().stream()
                .mapToInt(line -> line.getDeclareQuantity() != null ? line.getDeclareQuantity() : 0)
                .sum();
        Integer totalDeclareQuantity = batch.getTotalDeclareQuantity();
        if (totalDeclareQuantity == null || totalDeclareQuantity != linesSum) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_DECLARE_QUANTITY_MISMATCH);
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
