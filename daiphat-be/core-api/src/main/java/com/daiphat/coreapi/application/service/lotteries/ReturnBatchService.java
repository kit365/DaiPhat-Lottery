package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.AttachReturnSerialItem;
import com.daiphat.coreapi.application.dto.request.lotteries.AttachReturnSerialsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmReturnBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmReturnHandoverRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmReturnInspectionRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateReturnBatchLineRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateReturnBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateReturnBatchLineStatusRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.InspectableReturnSerialResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ReturnBatchLineResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ReturnBatchResponse;
import com.daiphat.coreapi.application.mapper.lotteries.ReturnBatchApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotterySupplierServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.ReturnBatchServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchType;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnDeliveryMode;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.shared.util.ImportBatchConfigResolver;
import com.daiphat.coreapi.shared.util.ImportCostCalculator;
import com.daiphat.coreapi.shared.util.SortUtils;
import com.daiphat.coreapi.shared.util.ReturnBatchCodeGenerator;
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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReturnBatchService implements ReturnBatchServicePort {

    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "id", "drawDate", "totalQuantity", "totalReturnValue", "status", "createdAt", "updatedAt"
    );

    private final ReturnBatchRepositoryPort returnBatchRepositoryPort;
    private final LotterySupplierServicePort lotterySupplierServicePort;
    private final SupplierSettlementServicePort supplierSettlementServicePort;
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    private final ReturnBatchApplicationMapper returnBatchApplicationMapper;
    private final ReturnBatchSummaryCalculator returnBatchSummaryCalculator;
    private final ImportBatchConfigResolver importBatchConfigResolver;
    private final ReturnBatchAutoCancelService returnBatchAutoCancelService;
    private final ReturnBatchCodeGenerator returnBatchCodeGenerator;
    private final Clock clock;

    @Override
    @Transactional
    public ReturnBatchResponse create(CreateReturnBatchRequest request, UUID operatorId) {
        if (request.supplierId() == null) {
            throw new DomainException(ErrorCode.RETURN_BATCH_SUPPLIER_REQUIRED);
        }
        LotterySupplierModel supplier = lotterySupplierServicePort.getActiveModelById(request.supplierId());
        ensureUniqueStations(request.lines().stream().map(CreateReturnBatchLineRequest::lotteryStationId).toList());

        returnBatchRepositoryPort.findBySupplierAndDrawDate(supplier.getId(), request.drawDate())
                .ifPresent(existing -> {
                    throw new DomainException(ErrorCode.RETURN_BATCH_PENDING_EXISTS, existing.getId());
                });

        SupplierSettlementModel settlement = supplierSettlementServicePort.findOrCreateForImport(
                supplier,
                request.drawDate()
        );

        ReturnBatchModel header = ReturnBatchModel.builder()
                .batchCode(returnBatchCodeGenerator.generateHeaderCode(request.drawDate()))
                .lotterySupplierId(supplier.getId())
                .drawDate(request.drawDate())
                .supplierSettlementId(settlement.getId())
                .note(trimToNull(request.note()))
                .status(ReturnBatchStatus.PENDING_INSPECTION)
                .totalQuantity(0)
                .totalReturnValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                .build();
        ReturnBatchModel saved = returnBatchRepositoryPort.save(header);

        for (CreateReturnBatchLineRequest lineRequest : request.lines()) {
            ReturnBatchLineModel line = ReturnBatchLineModel.builder()
                    .returnBatchId(saved.getId())
                    .lotteryStationId(lineRequest.lotteryStationId())
                    .status(ReturnBatchLineStatus.PENDING)
                    .totalQuantity(0)
                    .totalReturnValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                    .build();
            returnBatchRepositoryPort.saveLine(line);
        }

        log.info(
                "Created return batch id={} supplierId={} drawDate={} settlementId={}",
                saved.getId(),
                supplier.getId(),
                request.drawDate(),
                settlement.getId()
        );
        return toDetailResponse(saved.getId());
    }


    @Override
    @Transactional
    public ReturnBatchResponse getById(Long id) {
        ReturnBatchModel batch = getBatchOrThrow(id);
        if (isSupplierReturn(batch) && batch.getStatus() != null && batch.getStatus().isOpenForInspection()) {
            returnBatchAutoCancelService.cancelIfPastCutoff(batch);
        }
        if (isSupplierReturn(batch)) {
            syncSummaryIfReturnWindowOpen(id);
        }
        return toDetailResponse(id);
    }

    @Override
    @Transactional
    public PageResponse<ReturnBatchResponse> getAll(
            int page,
            int size,
            Long lotterySupplierId,
            Long supplierSettlementId,
            ReturnBatchType returnBatchType,
            ReturnBatchStatus status,
            LocalDate drawDateFrom,
            LocalDate drawDateTo,
            String search,
            String sortBy,
            String direction
    ) {
        ReturnBatchType effectiveReturnBatchType = returnBatchType != null
                ? returnBatchType
                : ReturnBatchType.SUPPLIER_RETURN;
        String field = sortBy != null && SORTABLE_FIELDS.contains(sortBy) ? sortBy : "drawDate";
        PageRequest pageRequest = PageRequest.of(
                Math.max(page - 1, 0),
                size,
                SortUtils.createSort(field, direction != null ? direction : "desc")
        );
        Page<ReturnBatchResponse> responsePage = returnBatchRepositoryPort
                .findAll(
                        pageRequest,
                        lotterySupplierId,
                        supplierSettlementId,
                        effectiveReturnBatchType,
                        status,
                        drawDateFrom,
                        drawDateTo,
                        search
                )
                .map(model -> {
                    if (isSupplierReturn(model) && model.getStatus() != null && model.getStatus().isOpenForInspection()) {
                        returnBatchAutoCancelService.cancelIfPastCutoff(model);
                        syncSummaryIfReturnWindowOpen(model.getId());
                        return toDetailResponse(model.getId());
                    }
                    return returnBatchApplicationMapper.toResponse(model);
                });
        return PageResponse.from(responsePage, page, size);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InspectableReturnSerialResponse> listInspectableSerials(Long batchId) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        requireSupplierReturn(batch);
        List<ReturnBatchLineModel> lines = returnBatchRepositoryPort.findLinesByBatchId(batchId);
        Set<Long> stationIds = lines.stream()
                .map(ReturnBatchLineModel::getLotteryStationId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, Long> lineIdByStation = lines.stream()
                .collect(Collectors.toMap(
                        ReturnBatchLineModel::getLotteryStationId,
                        ReturnBatchLineModel::getId,
                        (a, b) -> a
                ));

        return lotteryTicketSerialRepositoryPort
                .findInStockForSupplierAndDrawDate(batch.getLotterySupplierId(), batch.getDrawDate(), stationIds)
                .stream()
                .map(row -> InspectableReturnSerialResponse.builder()
                        .serialId(row.serialId())
                        .serialNumber(row.serialNumber())
                        .status(row.status())
                        .statusLabel(row.status() != null ? row.status().getLabel() : null)
                        .ticketCondition(row.ticketCondition())
                        .ticketConditionLabel(row.ticketCondition() != null ? row.ticketCondition().getLabel() : null)
                        .ticketId(row.ticketId())
                        .ticketNumbers(row.ticketNumbers())
                        .drawDate(row.drawDate())
                        .lotteryStationId(row.stationId())
                        .lotteryStationName(row.stationName())
                        .returnBatchLineId(lineIdByStation.get(row.stationId()))
                        .importBatchLineId(row.importBatchLineId())
                        .importCost(row.importCost() != null
                                ? ImportCostCalculator.scaleMoney(row.importCost())
                                : BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                        .ticketPrice(row.ticketPrice() != null
                                ? ImportCostCalculator.scaleMoney(row.ticketPrice())
                                : null)
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public ReturnBatchResponse startInspection(Long batchId) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        requireSupplierReturn(batch);
        ensureInspectionMutable(batch);
        if (batch.getStatus() == ReturnBatchStatus.INSPECTING) {
            return toDetailResponse(batchId);
        }
        if (batch.getStatus() != ReturnBatchStatus.PENDING_INSPECTION) {
            throw new DomainException(ErrorCode.RETURN_BATCH_INVALID_STATUS);
        }
        batch.setStatus(ReturnBatchStatus.INSPECTING);
        returnBatchRepositoryPort.save(batch);
        log.info("Started return inspection batchId={}", batchId);
        return toDetailResponse(batchId);
    }

    @Override
    @Transactional
    public ReturnBatchResponse confirmInspection(
            Long batchId,
            ConfirmReturnInspectionRequest request,
            UUID operatorId
    ) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        requireSupplierReturn(batch);
        ensureInspectionMutable(batch);
        if (batch.getStatus() == null || !batch.getStatus().isOpenForInspection()) {
            throw new DomainException(ErrorCode.RETURN_BATCH_INVALID_STATUS);
        }
        if (request == null || request.deliveryMode() == null
                || request.serialIds() == null || request.serialIds().isEmpty()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Cần chọn sê-ri và hình thức giao trả.");
        }

        if (batch.getStatus() == ReturnBatchStatus.PENDING_INSPECTION) {
            batch.setStatus(ReturnBatchStatus.INSPECTING);
            returnBatchRepositoryPort.save(batch);
        }

        List<ReturnBatchLineModel> lines = returnBatchRepositoryPort.findLinesByBatchId(batchId);
        Map<Long, ReturnBatchLineModel> lineByStation = lines.stream()
                .collect(Collectors.toMap(
                        ReturnBatchLineModel::getLotteryStationId,
                        Function.identity(),
                        (a, b) -> a
                ));

        List<LotteryTicketSerialModel> serials =
                lotteryTicketSerialRepositoryPort.findAllByIds(new HashSet<>(request.serialIds()));
        if (serials.size() != new HashSet<>(request.serialIds()).size()) {
            throw new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE);
        }

        LocalDateTime now = LocalDateTime.now(clock);
        Set<Long> touchedLineIds = new HashSet<>();

        for (LotteryTicketSerialModel serial : serials) {
            if (serial.getStatus() != LotteryTicketSerialStatus.IN_STOCK
                    && serial.getStatus() != LotteryTicketSerialStatus.EXPIRED) {
                throw new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE);
            }
            if (serial.getTicketCondition() != null && serial.getTicketCondition().isIncidentReported()) {
                throw new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE);
            }
            if (serial.getReturnBatchLineId() != null) {
                throw new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE);
            }
            LotteryTicketModel ticket = lotteryTicketRepositoryPort.findById(serial.getTicketId())
                    .orElseThrow(() -> new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE));
            if (!Objects.equals(ticket.getDrawDate(), batch.getDrawDate())) {
                throw new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE);
            }
            ReturnBatchLineModel line = lineByStation.get(ticket.getStationId());
            if (line == null) {
                throw new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE);
            }
            if (line.getStatus() != ReturnBatchLineStatus.PENDING) {
                throw new DomainException(ErrorCode.RETURN_BATCH_LINE_INVALID_STATUS);
            }

            serial.setReturnBatchLineId(line.getId());
            // Return state is derived from returnBatchLineId + ReturnBatch status.
            serial.setReturnedAt(null);
            lotteryTicketSerialRepositoryPort.save(serial);
            touchedLineIds.add(line.getId());
        }

        for (ReturnBatchLineModel line : lines) {
            if (touchedLineIds.contains(line.getId())) {
                recalculateLineAggregates(line);
            }
        }
        refreshBatchAggregates(batchId);

        batch = getBatchOrThrow(batchId);
        if (request.returnReceiptUrl() != null) {
            batch.setReturnReceiptUrl(trimToNull(request.returnReceiptUrl()));
        }
        batch.setDeliveryMode(request.deliveryMode());
        batch.setStatus(ReturnBatchStatus.PENDING_HANDOVER);
        batch.setReturnedAt(now);
        batch.setReturnedBy(operatorId);
        returnBatchRepositoryPort.save(batch);

        if (batch.getSupplierSettlementId() != null) {
            supplierSettlementServicePort.recalculateTotalReturnValue(batch.getSupplierSettlementId());
        }

        returnBatchSummaryCalculator.recalculate(batchId);

        log.info(
                "Confirmed return inspection batchId={} mode={} serials={}",
                batchId,
                request.deliveryMode(),
                request.serialIds().size()
        );
        return toDetailResponse(batchId);
    }

    @Override
    @Transactional
    public ReturnBatchResponse confirmHandover(
            Long batchId,
            ConfirmReturnHandoverRequest request,
            UUID operatorId
    ) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        requireSupplierReturn(batch);
        if (batch.getStatus() != ReturnBatchStatus.PENDING_HANDOVER) {
            throw new DomainException(ErrorCode.RETURN_BATCH_INVALID_STATUS);
        }

        LocalDateTime now = LocalDateTime.now(clock);
        List<ReturnBatchLineModel> lines = returnBatchRepositoryPort.findLinesByBatchId(batchId);
        for (ReturnBatchLineModel line : lines) {
            List<LotteryTicketSerialModel> serials =
                    lotteryTicketSerialRepositoryPort.findAllByReturnBatchLineId(line.getId());
            boolean anyReturned = false;
            for (LotteryTicketSerialModel serial : serials) {
                if (serial.getReturnBatchLineId() != null) {
                    if (serial.getReturnedAt() == null) {
                        serial.setReturnedAt(now);
                    }
                    lotteryTicketSerialRepositoryPort.save(serial);
                    anyReturned = true;
                }
            }
            if (anyReturned) {
                line.setStatus(ReturnBatchLineStatus.SUCCESS);
                returnBatchRepositoryPort.saveLine(line);
                recalculateLineAggregates(line);
            }
        }
        refreshBatchAggregates(batchId);

        batch = getBatchOrThrow(batchId);
        if (request != null) {
            if (request.returnReceiptUrl() != null) {
                batch.setReturnReceiptUrl(trimToNull(request.returnReceiptUrl()));
            }
            if (request.returnReceiptEvidenceUrl() != null) {
                batch.setReturnReceiptEvidenceUrl(trimToNull(request.returnReceiptEvidenceUrl()));
            }
        }
        batch.setStatus(ReturnBatchStatus.HANDED_OVER);
        batch.setConfirmedAt(now);
        if (batch.getReturnedAt() == null) {
            batch.setReturnedAt(now);
        }
        if (batch.getReturnedBy() == null) {
            batch.setReturnedBy(operatorId);
        }
        returnBatchRepositoryPort.save(batch);

        if (batch.getSupplierSettlementId() != null) {
            supplierSettlementServicePort.recalculateTotalReturnValue(batch.getSupplierSettlementId());
        }
        returnBatchSummaryCalculator.recalculate(batchId);
        return toDetailResponse(batchId);
    }

    @Override
    @Transactional
    public ReturnBatchResponse attachSerials(Long batchId, Long lineId, AttachReturnSerialsRequest request) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        requireSupplierReturn(batch);
        ensureInspectionMutable(batch);
        if (batch.getStatus() == null || !batch.getStatus().isOpenForInspection()) {
            throw new DomainException(ErrorCode.RETURN_BATCH_INVALID_STATUS);
        }
        ReturnBatchLineModel line = getLineOrThrow(batchId, lineId);
        if (line.getStatus() != ReturnBatchLineStatus.PENDING) {
            throw new DomainException(ErrorCode.RETURN_BATCH_LINE_INVALID_STATUS);
        }

        Map<Long, AttachReturnSerialItem> byId = request.serials().stream()
                .collect(Collectors.toMap(AttachReturnSerialItem::serialId, Function.identity(), (a, b) -> a));
        List<LotteryTicketSerialModel> serials = lotteryTicketSerialRepositoryPort.findAllByIds(byId.keySet());
        if (serials.size() != byId.size()) {
            throw new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE);
        }

        for (LotteryTicketSerialModel serial : serials) {
            validateSerialEligible(serial, batch, line);
            AttachReturnSerialItem item = byId.get(serial.getId());
            serial.setReturnBatchLineId(lineId);
            boolean override = Boolean.TRUE.equals(item.manualOverride());
            serial.setManualOverride(override);
            serial.setOverrideReason(override ? trimToNull(item.overrideReason()) : null);
            serial.setOverrideEvidenceUrl(override ? trimToNull(item.overrideEvidenceUrl()) : null);
            if (override && serial.getOverrideReason() == null) {
                throw new DomainException(ErrorCode.INVALID_INPUT, "Cần lý do khi ghi đè thủ công.");
            }
            lotteryTicketSerialRepositoryPort.save(serial);
        }

        if (batch.getStatus() == ReturnBatchStatus.PENDING_INSPECTION) {
            batch.setStatus(ReturnBatchStatus.INSPECTING);
            returnBatchRepositoryPort.save(batch);
        }

        recalculateLineAggregates(line);
        refreshBatchAggregates(batchId);
        if (batch.getSupplierSettlementId() != null) {
            supplierSettlementServicePort.recalculateTotalReturnValue(batch.getSupplierSettlementId());
        }
        return toDetailResponse(batchId);
    }

    @Override
    @Transactional
    public ReturnBatchResponse detachSerial(Long batchId, Long lineId, Long serialId) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        requireSupplierReturn(batch);
        ensureInspectionMutable(batch);
        if (batch.getStatus() == null || !batch.getStatus().isOpenForInspection()) {
            throw new DomainException(ErrorCode.RETURN_BATCH_INVALID_STATUS);
        }
        ReturnBatchLineModel line = getLineOrThrow(batchId, lineId);
        if (line.getStatus() != ReturnBatchLineStatus.PENDING) {
            throw new DomainException(ErrorCode.RETURN_BATCH_LINE_INVALID_STATUS);
        }
        LotteryTicketSerialModel serial = lotteryTicketSerialRepositoryPort.findById(serialId)
                .orElseThrow(() -> new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE));
        if (!Objects.equals(serial.getReturnBatchLineId(), lineId)) {
            throw new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE);
        }
        serial.setReturnBatchLineId(null);
        if (serial.getStatus() != LotteryTicketSerialStatus.EXPIRED) {
            serial.setStatus(LotteryTicketSerialStatus.IN_STOCK);
        }
        serial.setManualOverride(false);
        serial.setOverrideReason(null);
        serial.setOverrideEvidenceUrl(null);
        serial.setReturnedAt(null);
        lotteryTicketSerialRepositoryPort.save(serial);

        recalculateLineAggregates(line);
        refreshBatchAggregates(batchId);

        boolean stillHasAttached = returnBatchRepositoryPort.findLinesByBatchId(batchId).stream()
                .anyMatch(l -> lotteryTicketSerialRepositoryPort.countByReturnBatchLineId(l.getId()) > 0);
        if (!stillHasAttached && batch.getStatus() == ReturnBatchStatus.INSPECTING) {
            batch.setStatus(ReturnBatchStatus.PENDING_INSPECTION);
            returnBatchRepositoryPort.save(batch);
        }

        if (batch.getSupplierSettlementId() != null) {
            supplierSettlementServicePort.recalculateTotalReturnValue(batch.getSupplierSettlementId());
        }
        return toDetailResponse(batchId);
    }

    @Override
    @Transactional
    public ReturnBatchResponse updateLineStatus(Long batchId, Long lineId, UpdateReturnBatchLineStatusRequest request) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        requireSupplierReturn(batch);
        if (batch.getStatus() != null && batch.getStatus().isOpenForInspection()) {
            ensureInspectionMutable(batch);
        }
        if (batch.getStatus() != null && batch.getStatus().isTerminal()) {
            throw new DomainException(ErrorCode.RETURN_BATCH_INVALID_STATUS);
        }
        ReturnBatchLineModel line = getLineOrThrow(batchId, lineId);
        ReturnBatchLineStatus newStatus = request.status();
        line.setStatus(newStatus);
        LocalDateTime now = LocalDateTime.now(clock);

        List<LotteryTicketSerialModel> serials = lotteryTicketSerialRepositoryPort.findAllByReturnBatchLineId(lineId);
        for (LotteryTicketSerialModel serial : serials) {
            if (newStatus == ReturnBatchLineStatus.SUCCESS) {
                if (serial.getReturnedAt() == null) {
                    serial.setReturnedAt(now);
                }
            } else if (newStatus == ReturnBatchLineStatus.PENDING
                    || newStatus == ReturnBatchLineStatus.REJECTED_BY_SUPPLIER) {
                serial.setReturnedAt(null);
            } else if (newStatus == ReturnBatchLineStatus.PULLED_FOR_SALE) {
                // Serial pulled for sale returns to sellable inventory.
                serial.setReturnBatchLineId(null);
                if (serial.getStatus() != LotteryTicketSerialStatus.EXPIRED) {
                    serial.setStatus(LotteryTicketSerialStatus.IN_STOCK);
                }
                serial.setReturnedAt(null);
                serial.setManualOverride(false);
                serial.setOverrideReason(null);
                serial.setOverrideEvidenceUrl(null);
            }
            lotteryTicketSerialRepositoryPort.save(serial);
        }

        returnBatchRepositoryPort.saveLine(line);
        recalculateLineAggregates(line);
        refreshBatchAggregates(batchId);

        if (batch.getSupplierSettlementId() != null) {
            supplierSettlementServicePort.recalculateTotalReturnValue(batch.getSupplierSettlementId());
        }
        return toDetailResponse(batchId);
    }

    @Override
    @Transactional
    public ReturnBatchResponse markReturned(Long batchId, UUID operatorId) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        requireSupplierReturn(batch);
        ensureInspectionMutable(batch);
        if (batch.getStatus() == null || !batch.getStatus().isOpenForInspection()) {
            throw new DomainException(ErrorCode.RETURN_BATCH_INVALID_STATUS);
        }
        batch.setStatus(ReturnBatchStatus.PENDING_HANDOVER);
        batch.setReturnedBy(operatorId);
        batch.setReturnedAt(LocalDateTime.now(clock));
        returnBatchRepositoryPort.save(batch);
        if (batch.getSupplierSettlementId() != null) {
            supplierSettlementServicePort.recalculateTotalReturnValue(batch.getSupplierSettlementId());
        }
        return toDetailResponse(batchId);
    }

    @Override
    @Transactional
    public ReturnBatchResponse confirm(Long batchId, ConfirmReturnBatchRequest request) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        requireSupplierReturn(batch);
        if (batch.getStatus() != null && batch.getStatus().isOpenForInspection()) {
            ensureInspectionMutable(batch);
        }
        if (batch.getStatus() != ReturnBatchStatus.PENDING_HANDOVER
                && (batch.getStatus() == null || !batch.getStatus().isOpenForInspection())) {
            throw new DomainException(ErrorCode.RETURN_BATCH_INVALID_STATUS);
        }
        if (request != null) {
            if (request.returnReceiptUrl() != null) {
                batch.setReturnReceiptUrl(trimToNull(request.returnReceiptUrl()));
            }
            if (request.returnReceiptEvidenceUrl() != null) {
                batch.setReturnReceiptEvidenceUrl(trimToNull(request.returnReceiptEvidenceUrl()));
            }
        }
        batch.setStatus(ReturnBatchStatus.HANDED_OVER);
        batch.setConfirmedAt(LocalDateTime.now(clock));
        if (batch.getReturnedAt() == null) {
            batch.setReturnedAt(batch.getConfirmedAt());
        }
        returnBatchRepositoryPort.save(batch);

        if (batch.getSupplierSettlementId() != null) {
            supplierSettlementServicePort.recalculateTotalReturnValue(batch.getSupplierSettlementId());
        }
        return toDetailResponse(batchId);
    }

    private void ensureInspectionMutable(ReturnBatchModel batch) {
        if (batch.getStatus() != null && batch.getStatus().isCancelled()) {
            throw new DomainException(ErrorCode.RETURN_BATCH_INSPECTION_EXPIRED);
        }
        if (batch.getStatus() == null || !batch.getStatus().isOpenForInspection()) {
            return;
        }
        if (returnBatchAutoCancelService.cancelIfPastCutoff(batch)) {
            throw new DomainException(ErrorCode.RETURN_BATCH_INSPECTION_EXPIRED);
        }
    }

    private void validateSerialEligible(
            LotteryTicketSerialModel serial,
            ReturnBatchModel batch,
            ReturnBatchLineModel line
    ) {
        if (serial.getDeletedAt() != null) {
            throw new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE);
        }
        if (serial.getTicketCondition() != null && serial.getTicketCondition().isIncidentReported()) {
            throw new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE);
        }
        if (serial.getStatus() != LotteryTicketSerialStatus.IN_STOCK
                && serial.getStatus() != LotteryTicketSerialStatus.EXPIRED) {
            throw new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE);
        }
        if (serial.getReturnBatchLineId() != null
                && !Objects.equals(serial.getReturnBatchLineId(), line.getId())) {
            throw new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE);
        }
        LotteryTicketModel ticket = lotteryTicketRepositoryPort.findById(serial.getTicketId())
                .orElseThrow(() -> new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE));
        if (!Objects.equals(ticket.getStationId(), line.getLotteryStationId())
                || !Objects.equals(ticket.getDrawDate(), batch.getDrawDate())) {
            throw new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE);
        }
    }

    private void recalculateLineAggregates(ReturnBatchLineModel line) {
        List<LotteryTicketSerialModel> serials =
                lotteryTicketSerialRepositoryPort.findAllByReturnBatchLineId(line.getId());
        int qty = serials.size();
        BigDecimal total = BigDecimal.ZERO;
        for (LotteryTicketSerialModel serial : serials) {
            BigDecimal unitCost = BigDecimal.ZERO;
            if (serial.getImportBatchLineId() != null) {
                unitCost = importBatchLineRepositoryPort.findById(serial.getImportBatchLineId())
                        .map(ImportBatchLineModel::getImportCost)
                        .orElse(BigDecimal.ZERO);
            }
            total = total.add(unitCost != null ? unitCost : BigDecimal.ZERO);
        }
        line.setTotalQuantity(qty);
        line.setTotalReturnValue(ImportCostCalculator.scaleMoney(total));
        returnBatchRepositoryPort.saveLine(line);
    }

    /**
     * Summary is filled when the return window is open
     * ({@code now >= returnCutOffTime - RETURN_BUFFER_TIME}), not before.
     * Once open, values stay synced with eligible import inventory / attached serials.
     */
    private void syncSummaryIfReturnWindowOpen(Long batchId) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        List<ReturnBatchLineModel> lines = returnBatchRepositoryPort.findLinesByBatchId(batchId);
        boolean hasAttached = lines.stream()
                .anyMatch(line -> lotteryTicketSerialRepositoryPort.countByReturnBatchLineId(line.getId()) > 0);

        if (hasAttached || batch.getStatus() == null || !batch.getStatus().isOpenForInspection()) {
            returnBatchSummaryCalculator.recalculate(batchId);
            return;
        }

        LotterySupplierModel supplier;
        try {
            supplier = lotterySupplierServicePort.getActiveModelById(batch.getLotterySupplierId());
        } catch (DomainException ex) {
            // Inactive/missing supplier: still try recalc from inventory for display consistency.
            returnBatchSummaryCalculator.recalculate(batchId);
            return;
        }
        if (supplier.getReturnCutOffTime() == null) {
            return;
        }
        int bufferMinutes = importBatchConfigResolver.resolveReturnBufferMinutes();
        LocalDateTime now = LocalDateTime.now(clock);
        if (!ReturnBatchAutoGenerationService.isPastAutoCreateTrigger(
                supplier.getReturnCutOffTime(),
                batch.getDrawDate(),
                now,
                bufferMinutes
        )) {
            return;
        }
        returnBatchSummaryCalculator.recalculate(batchId);
    }

    private void refreshBatchAggregates(Long batchId) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        List<ReturnBatchLineModel> lines = returnBatchRepositoryPort.findLinesByBatchId(batchId);
        batch.setLines(lines);
        batch.recalculateAggregates();
        returnBatchRepositoryPort.save(batch);
    }

    @Override
    @Transactional
    public ReturnBatchResponse updateEvidenceUrl(Long batchId, String returnReceiptEvidenceUrl) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        batch.setReturnReceiptEvidenceUrl(trimToNull(returnReceiptEvidenceUrl));
        returnBatchRepositoryPort.save(batch);
        log.info("Updated returnReceiptEvidenceUrl for batchId={}", batchId);
        return toDetailResponse(batchId);
    }

    private ReturnBatchResponse toDetailResponse(Long batchId) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        List<ReturnBatchLineModel> lines = returnBatchRepositoryPort.findLinesByBatchId(batchId);
        batch.setLines(lines);
        List<ReturnBatchLineResponse> lineResponses = lines.stream()
                .map(line -> returnBatchApplicationMapper.toLineResponse(
                        line,
                        lotteryTicketSerialRepositoryPort.countByReturnBatchLineId(line.getId())
                ))
                .toList();
        return returnBatchApplicationMapper.toResponse(batch, lineResponses);
    }

    private ReturnBatchModel getBatchOrThrow(Long id) {
        return returnBatchRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.RETURN_BATCH_NOT_FOUND));
    }

    private ReturnBatchLineModel getLineOrThrow(Long batchId, Long lineId) {
        ReturnBatchLineModel line = returnBatchRepositoryPort.findLineById(lineId)
                .orElseThrow(() -> new DomainException(ErrorCode.RETURN_BATCH_LINE_NOT_FOUND));
        if (!Objects.equals(line.getReturnBatchId(), batchId)) {
            throw new DomainException(ErrorCode.RETURN_BATCH_LINE_NOT_FOUND);
        }
        return line;
    }

    private boolean isSupplierReturn(ReturnBatchModel batch) {
        return batch.getReturnBatchType() == null
                || batch.getReturnBatchType() == ReturnBatchType.SUPPLIER_RETURN;
    }

    /** Supplier endpoints must not mutate a vendor receipt created by the allocation flow. */
    private void requireSupplierReturn(ReturnBatchModel batch) {
        if (!isSupplierReturn(batch)) {
            throw new DomainException(ErrorCode.RETURN_BATCH_INVALID_STATUS);
        }
    }

    private void ensureUniqueStations(List<Long> stationIds) {
        Set<Long> seen = new HashSet<>();
        for (Long stationId : stationIds) {
            if (stationId == null || !seen.add(stationId)) {
                throw new DomainException(ErrorCode.RETURN_BATCH_DUPLICATE_STATION);
            }
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
