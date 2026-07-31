package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.AttachReturnSerialItem;
import com.daiphat.coreapi.application.dto.request.lotteries.AttachReturnSerialsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmReturnBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateReturnBatchLineRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateReturnBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateReturnBatchLineStatusRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateReturnBatchRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
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
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.shared.util.ImportCostCalculator;
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
    private final Clock clock;

    @Override
    @Transactional
    public ReturnBatchResponse create(CreateReturnBatchRequest request, UUID operatorId) {
        if (request.supplierId() == null) {
            throw new DomainException(ErrorCode.RETURN_BATCH_SUPPLIER_REQUIRED);
        }
        LotterySupplierModel supplier = lotterySupplierServicePort.getActiveModelById(request.supplierId());
        ensureUniqueStations(request.lines().stream().map(CreateReturnBatchLineRequest::lotteryStationId).toList());

        returnBatchRepositoryPort.findPendingBySupplierAndDrawDate(supplier.getId(), request.drawDate())
                .ifPresent(existing -> {
                    throw new DomainException(ErrorCode.RETURN_BATCH_PENDING_EXISTS, existing.getId());
                });

        SupplierSettlementModel settlement = supplierSettlementServicePort.findOrCreateForImport(
                supplier,
                request.drawDate()
        );

        ReturnBatchModel header = ReturnBatchModel.builder()
                .lotterySupplierId(supplier.getId())
                .drawDate(request.drawDate())
                .supplierSettlementId(settlement.getId())
                .note(trimToNull(request.note()))
                .status(ReturnBatchStatus.PENDING)
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
    public ReturnBatchResponse update(Long id, UpdateReturnBatchRequest request) {
        ReturnBatchModel batch = getBatchOrThrow(id);
        if (batch.getStatus() == ReturnBatchStatus.CONFIRMED) {
            throw new DomainException(ErrorCode.RETURN_BATCH_INVALID_STATUS);
        }
        if (request.note() != null) {
            batch.setNote(trimToNull(request.note()));
        }
        if (request.returnReceiptUrl() != null) {
            batch.setReturnReceiptUrl(trimToNull(request.returnReceiptUrl()));
        }
        returnBatchRepositoryPort.save(batch);

        if (request.addLines() != null && !request.addLines().isEmpty()) {
            if (batch.getStatus() != ReturnBatchStatus.PENDING) {
                throw new DomainException(ErrorCode.RETURN_BATCH_INVALID_STATUS);
            }
            Set<Long> existingStations = returnBatchRepositoryPort.findLinesByBatchId(id).stream()
                    .map(ReturnBatchLineModel::getLotteryStationId)
                    .collect(Collectors.toSet());
            ensureUniqueStations(request.addLines().stream().map(CreateReturnBatchLineRequest::lotteryStationId).toList());
            for (CreateReturnBatchLineRequest lineRequest : request.addLines()) {
                if (existingStations.contains(lineRequest.lotteryStationId())) {
                    throw new DomainException(ErrorCode.RETURN_BATCH_DUPLICATE_STATION);
                }
                ReturnBatchLineModel line = ReturnBatchLineModel.builder()
                        .returnBatchId(id)
                        .lotteryStationId(lineRequest.lotteryStationId())
                        .status(ReturnBatchLineStatus.PENDING)
                        .totalQuantity(0)
                        .totalReturnValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                        .build();
                returnBatchRepositoryPort.saveLine(line);
            }
        }
        return toDetailResponse(id);
    }

    @Override
    @Transactional(readOnly = true)
    public ReturnBatchResponse getById(Long id) {
        return toDetailResponse(id);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ReturnBatchResponse> getAll(
            int page,
            int size,
            Long lotterySupplierId,
            Long supplierSettlementId,
            ReturnBatchStatus status,
            LocalDate drawDateFrom,
            LocalDate drawDateTo,
            String search,
            String sortBy,
            String direction
    ) {
        String field = sortBy != null && SORTABLE_FIELDS.contains(sortBy) ? sortBy : "drawDate";
        PageRequest pageRequest = PageRequest.of(
                Math.max(page - 1, 0),
                size,
                SortUtils.createSort(field, direction != null ? direction : "desc")
        );
        Page<ReturnBatchResponse> responsePage = returnBatchRepositoryPort
                .findAll(pageRequest, lotterySupplierId, supplierSettlementId, status, drawDateFrom, drawDateTo, search)
                .map(model -> returnBatchApplicationMapper.toResponse(model));
        return PageResponse.from(responsePage, page, size);
    }

    @Override
    @Transactional
    public ReturnBatchResponse attachSerials(Long batchId, Long lineId, AttachReturnSerialsRequest request) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        if (batch.getStatus() != ReturnBatchStatus.PENDING) {
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
            serial.setStatus(LotteryTicketSerialStatus.PENDING_RETURN);
            boolean override = Boolean.TRUE.equals(item.manualOverride());
            serial.setManualOverride(override);
            serial.setOverrideReason(override ? trimToNull(item.overrideReason()) : null);
            serial.setOverrideEvidenceUrl(override ? trimToNull(item.overrideEvidenceUrl()) : null);
            if (override && serial.getOverrideReason() == null) {
                throw new DomainException(ErrorCode.INVALID_INPUT, "Cần lý do khi ghi đè thủ công.");
            }
            lotteryTicketSerialRepositoryPort.save(serial);
        }

        recalculateLineAggregates(line);
        refreshBatchAggregates(batchId);
        return toDetailResponse(batchId);
    }

    @Override
    @Transactional
    public ReturnBatchResponse detachSerial(Long batchId, Long lineId, Long serialId) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        if (batch.getStatus() != ReturnBatchStatus.PENDING) {
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
        serial.setStatus(LotteryTicketSerialStatus.IN_STOCK);
        serial.setManualOverride(false);
        serial.setOverrideReason(null);
        serial.setOverrideEvidenceUrl(null);
        serial.setReturnedAt(null);
        lotteryTicketSerialRepositoryPort.save(serial);

        recalculateLineAggregates(line);
        refreshBatchAggregates(batchId);
        return toDetailResponse(batchId);
    }

    @Override
    @Transactional
    public ReturnBatchResponse updateLineStatus(Long batchId, Long lineId, UpdateReturnBatchLineStatusRequest request) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        if (batch.getStatus() == ReturnBatchStatus.CONFIRMED) {
            throw new DomainException(ErrorCode.RETURN_BATCH_INVALID_STATUS);
        }
        ReturnBatchLineModel line = getLineOrThrow(batchId, lineId);
        ReturnBatchLineStatus newStatus = request.status();
        line.setStatus(newStatus);
        LocalDateTime now = LocalDateTime.now(clock);

        List<LotteryTicketSerialModel> serials = lotteryTicketSerialRepositoryPort.findAllByReturnBatchLineId(lineId);
        for (LotteryTicketSerialModel serial : serials) {
            if (newStatus == ReturnBatchLineStatus.SUCCESS) {
                serial.setStatus(LotteryTicketSerialStatus.RETURNED);
                serial.setReturnedAt(now);
            } else if (newStatus == ReturnBatchLineStatus.PENDING) {
                serial.setStatus(LotteryTicketSerialStatus.PENDING_RETURN);
                serial.setReturnedAt(null);
            } else if (newStatus == ReturnBatchLineStatus.PULLED_FOR_SALE) {
                // Serial pulled for sale stays sellable inventory.
                serial.setStatus(LotteryTicketSerialStatus.IN_STOCK);
                serial.setReturnedAt(null);
            } else if (newStatus == ReturnBatchLineStatus.REJECTED_BY_SUPPLIER) {
                serial.setStatus(LotteryTicketSerialStatus.PENDING_RETURN);
                serial.setReturnedAt(null);
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
        if (batch.getStatus() != ReturnBatchStatus.PENDING) {
            throw new DomainException(ErrorCode.RETURN_BATCH_INVALID_STATUS);
        }
        batch.setStatus(ReturnBatchStatus.RETURNED);
        batch.setReturnedBy(operatorId);
        batch.setReturnedAt(LocalDateTime.now(clock));
        returnBatchRepositoryPort.save(batch);
        return toDetailResponse(batchId);
    }

    @Override
    @Transactional
    public ReturnBatchResponse confirm(Long batchId, ConfirmReturnBatchRequest request) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        if (batch.getStatus() != ReturnBatchStatus.RETURNED && batch.getStatus() != ReturnBatchStatus.PENDING) {
            throw new DomainException(ErrorCode.RETURN_BATCH_INVALID_STATUS);
        }
        if (request != null && request.returnReceiptUrl() != null) {
            batch.setReturnReceiptUrl(trimToNull(request.returnReceiptUrl()));
        }
        batch.setStatus(ReturnBatchStatus.CONFIRMED);
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

    private void validateSerialEligible(
            LotteryTicketSerialModel serial,
            ReturnBatchModel batch,
            ReturnBatchLineModel line
    ) {
        if (serial.getDeletedAt() != null) {
            throw new DomainException(ErrorCode.RETURN_BATCH_SERIAL_NOT_ELIGIBLE);
        }
        if (serial.getStatus() != LotteryTicketSerialStatus.IN_STOCK
                && serial.getStatus() != LotteryTicketSerialStatus.PENDING_RETURN
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

    private void refreshBatchAggregates(Long batchId) {
        ReturnBatchModel batch = getBatchOrThrow(batchId);
        List<ReturnBatchLineModel> lines = returnBatchRepositoryPort.findLinesByBatchId(batchId);
        batch.setLines(lines);
        batch.recalculateAggregates();
        returnBatchRepositoryPort.save(batch);
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
