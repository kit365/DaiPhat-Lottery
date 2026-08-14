package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ReportSerialFaultRequest;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialFaultedBy;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.application.service.streetagent.LuckySerialTagger;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.shared.util.EnumOptionUtils;
import com.daiphat.coreapi.shared.util.StorageUtils;
import com.daiphat.coreapi.shared.util.StorageFolderConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LotteryTicketSerialService implements LotteryTicketSerialServicePort {

    private static final List<LotteryTicketSerialStatus> AVAILABLE_STATUSES = List.of(LotteryTicketSerialStatus.IN_STOCK);
    private static final List<LotteryTicketSerialStatus> EXPIRABLE_STATUSES = List.of(
            LotteryTicketSerialStatus.IN_STOCK,
            LotteryTicketSerialStatus.PROXY_HOLDING
    );

    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final StoragePort storagePort;
    private final OrderRepositoryPort orderRepositoryPort;
    private final LotteryTicketSerialIncidentService serialIncidentService;
    private final LuckySerialTagger luckySerialTagger;

    @Override
    @Transactional
    public LotteryTicketSerialModel upsertSerialForTicket(
            LotteryTicketModel ticket,
            CreateLotteryTicketSerialRequest request,
            UUID importedById,
            Long importBatchId,
            Long importBatchLineId
    ) {
        String normalizedSerial = request.serialNumber().trim();
        if (lotteryTicketSerialRepositoryPort.existsByTicketIdAndSerialNumber(ticket.getId(), normalizedSerial)) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_SERIAL_EXISTED);
        }

        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .ticketId(ticket.getId())
                .importBatchId(importBatchId)
                .importBatchLineId(importBatchLineId)
                .ticketImg(request.ticketImg())
                .serialNumber(normalizedSerial)
                .stationId(ticket.getStationId())
                .drawDate(ticket.getDrawDate())
                .inputSource(InputSource.MANUAL)
                .replacedForTicketId(request.replacedForTicketId())
                .build();
        serial.initializeImport(importedById);
        luckySerialTagger.apply(serial, ticket.getNumbers());
        return lotteryTicketSerialRepositoryPort.save(serial);
    }

    @Override
    @Transactional
    public void syncSerialsForTicket(
            LotteryTicketModel ticket,
            List<UpdateLotteryTicketSerialRequest> serials,
            UUID editorId
    ) {
        if (serials == null || serials.isEmpty()) {
            return;
        }

        List<LotteryTicketSerialModel> existingSerials = lotteryTicketSerialRepositoryPort.findAllByTicketId(ticket.getId());
        Set<Long> requestedIds = serials.stream()
                .map(UpdateLotteryTicketSerialRequest::id)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(HashSet::new));

        for (UpdateLotteryTicketSerialRequest serialReq : serials) {
            String normalizedSerial = serialReq.serialNumber().trim();
            if (serialReq.id() != null) {
                LotteryTicketSerialModel existing = existingSerials.stream()
                        .filter(serial -> serialReq.id().equals(serial.getId()))
                        .findFirst()
                        .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
                ensureSerialEditable(existing);

                if (!normalizedSerial.equalsIgnoreCase(existing.getSerialNumber())) {
                    if (lotteryTicketSerialRepositoryPort.existsByTicketIdAndSerialNumber(ticket.getId(), normalizedSerial)) {
                        throw new DomainException(ErrorCode.LOTTERY_TICKET_SERIAL_EXISTED);
                    }
                    existing.setSerialNumber(normalizedSerial);
                }
                existing.setStationId(ticket.getStationId());
                existing.setDrawDate(ticket.getDrawDate());
                if (hasText(serialReq.ticketImg())) {
                    existing.setTicketImg(serialReq.ticketImg().trim());
                }
                lotteryTicketSerialRepositoryPort.save(existing);
                continue;
            }

            upsertSerialForTicket(
                    ticket,
                    new CreateLotteryTicketSerialRequest(serialReq.ticketImg(), normalizedSerial),
                    editorId,
                    null,
                    null
            );
        }

        for (LotteryTicketSerialModel existing : existingSerials) {
            if (requestedIds.contains(existing.getId())) {
                continue;
            }
            ensureSerialSoftDeletable(existing);
            existing.softDelete();
            lotteryTicketSerialRepositoryPort.save(existing);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    @Override
    public LotteryTicketSerialModel reserveFirstAvailable(Long ticketId, UUID orderId, LocalDateTime expiresAt) {
        LotteryTicketSerialModel serial = getFirstAvailableSerialOrThrow(ticketId);
        serial.reserve(orderId, expiresAt);
        return lotteryTicketSerialRepositoryPort.save(serial);
    }

    @Override
    public LotteryTicketSerialModel sellFirstAvailable(Long ticketId) {
        LotteryTicketSerialModel serial = getFirstAvailableSerialOrThrow(ticketId);
        serial.sellOffline();
        return lotteryTicketSerialRepositoryPort.save(serial);
    }

    @Override
    public LotteryTicketSerialModel markSold(Long ticketSerialId) {
        LotteryTicketSerialModel serial = getByIdOrThrow(ticketSerialId);
        serial.sellOnline();
        return lotteryTicketSerialRepositoryPort.save(serial);
    }

    @Override
    public LotteryTicketSerialModel markProxyHoldingForPaidOrder(Long ticketSerialId, UUID orderId) {
        LotteryTicketSerialModel serial = getByIdOrThrow(ticketSerialId);
        if (serial.getStatus() == LotteryTicketSerialStatus.PROXY_HOLDING) {
            if (orderId != null) {
                serial.assumeProxyHolding(orderId);
            }
            return lotteryTicketSerialRepositoryPort.save(serial);
        }
        if (serial.getStatus() == LotteryTicketSerialStatus.SOLD) {
            // Legacy: payment used to mark SOLD immediately — keep link for inspection.
            serial.assumeProxyHolding(orderId);
            return lotteryTicketSerialRepositoryPort.save(serial);
        }
        serial.confirmPaidProxyHolding(orderId);
        return lotteryTicketSerialRepositoryPort.save(serial);
    }

    @Override
    public LotteryTicketSerialModel releaseReservation(Long ticketSerialId, boolean expireAfterRelease) {
        LotteryTicketSerialModel serial = getByIdOrThrow(ticketSerialId);
        serial.releaseReservation();
        if (expireAfterRelease) {
            serial.expire();
        }
        return lotteryTicketSerialRepositoryPort.save(serial);
    }

    @Override
    public LotteryTicketSerialModel returnSoldToStock(Long ticketSerialId) {
        LotteryTicketSerialModel serial = getByIdOrThrow(ticketSerialId);
        serial.returnSoldToStock();
        return lotteryTicketSerialRepositoryPort.save(serial);
    }

    @Override
    public LotteryTicketSerialModel getByIdOrThrow(Long ticketSerialId) {
        return lotteryTicketSerialRepositoryPort.findById(ticketSerialId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
    }

    @Override
    public Optional<LotteryTicketSerialModel> findFirstByTicketId(Long ticketId) {
        return lotteryTicketSerialRepositoryPort.findFirstByTicketIdOrderByIdAsc(ticketId);
    }

    @Override
    public Map<Long, LotteryTicketSerialModel> findRepresentativeSerialsByTicketIds(List<Long> ticketIds) {
        return lotteryTicketSerialRepositoryPort.findRepresentativeSerialsByTicketIds(ticketIds);
    }

    @Override
    public long countAvailableSerials(Long ticketId) {
        return lotteryTicketSerialRepositoryPort.countSellableByTicketId(ticketId);
    }

    @Override
    public Map<Long, Long> countAvailableSerialsByTicketIds(Collection<Long> ticketIds) {
        return lotteryTicketSerialRepositoryPort.countSellableByTicketIds(ticketIds);
    }

    @Override
    public Map<Long, Long> countSerialsByTicketIds(Collection<Long> ticketIds) {
        return lotteryTicketSerialRepositoryPort.countByTicketIds(ticketIds);
    }

    @Override
    public long countByStatuses(Long ticketId, Collection<LotteryTicketSerialStatus> statuses) {
        return lotteryTicketSerialRepositoryPort.countByTicketIdAndStatuses(ticketId, statuses);
    }

    @Override
    public void expireActiveSerials(Long ticketId) {
        lotteryTicketSerialRepositoryPort.findByTicketIdAndStatuses(ticketId, EXPIRABLE_STATUSES).forEach(serial -> {
            serial.expire();
            lotteryTicketSerialRepositoryPort.save(serial);
        });
    }

    @Override
    @Transactional
    public LotteryTicketSerialModel uploadImage(Long ticketSerialId, UploadRequest request) {
        LotteryTicketSerialModel model = getByIdOrThrow(ticketSerialId);
        ensureSerialEditable(model);
        StorageUtils.validateImageUpload(request);

        StorageResult result = storagePort.upload(new UploadRequest(
                request.data(),
                request.fileName(),
                request.contentType(),
                StorageFolderConstants.TICKET_IMAGE_FOLDER
        ));

        model.setTicketImg(result.url());
        return lotteryTicketSerialRepositoryPort.save(model);
    }

    private LotteryTicketSerialModel getFirstAvailableSerialOrThrow(Long ticketId) {
        return lotteryTicketSerialRepositoryPort.findAllByTicketId(ticketId).stream()
                .filter(LotteryTicketSerialModel::isAvailableForSale)
                .findFirst()
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS, "Vé đã hết sê-ri khả dụng."));
    }

    @Override
    public List<LotteryTicketSerialModel> findAllByTicketId(Long ticketId) {
        return lotteryTicketSerialRepositoryPort.findAllByTicketId(ticketId);
    }

    @Override
    public long countByImportBatchLineId(Long importBatchLineId) {
        return lotteryTicketSerialRepositoryPort.countByImportBatchLineId(importBatchLineId);
    }

    @Override
    public List<Long> findDistinctTicketIdsByImportBatchLineId(Long importBatchLineId) {
        return lotteryTicketSerialRepositoryPort.findDistinctTicketIdsByImportBatchLineId(importBatchLineId);
    }

    @Override
    public List<LotteryTicketSerialModel> findAllByImportBatchLineId(Long importBatchLineId) {
        return lotteryTicketSerialRepositoryPort.findAllByImportBatchLineId(importBatchLineId);
    }

    @Override
    public long countByTicketIdAndImportBatchLineId(Long ticketId, Long importBatchLineId) {
        return lotteryTicketSerialRepositoryPort.countByTicketIdAndImportBatchLineId(ticketId, importBatchLineId);
    }

    @Override
    public void hardDeleteByTicketIdAndImportBatchLineId(Long ticketId, Long importBatchLineId) {
        lotteryTicketSerialRepositoryPort.hardDeleteByTicketIdAndImportBatchLineId(ticketId, importBatchLineId);
    }

    @Override
    @Transactional
    public void hardDeleteByImportBatchLineId(Long importBatchLineId) {
        lotteryTicketSerialRepositoryPort.hardDeleteByImportBatchLineId(importBatchLineId);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.List<LotteryTicketSerialModel> findAllReplacementCandidates(
            Long stationId, String numbers, LocalDate drawDate, LotteryTicketSerialStatus status) {
        return lotteryTicketSerialRepositoryPort.findAllReplacementCandidates(stationId, numbers, drawDate, status);
    }

    @Override
    public List<EnumOptionResponse> getStatuses() {
        return EnumOptionUtils.toEnumOptions(LotteryTicketSerialStatus.values());
    }

    private void ensureSerialEditable(LotteryTicketSerialModel serial) {
        if (!serial.isEditableStatus()) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                    "Chỉ được chỉnh sửa sê-ri ở trạng thái IN_STOCK."
            );
        }
    }

    private void ensureSerialSoftDeletable(LotteryTicketSerialModel serial) {
        if (!serial.isSoftDeletableStatus()) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                    "Không thể xóa sê-ri đang ở trạng thái " + serial.getStatus().getDisplayName()
            );
        }

        if (orderRepositoryPort.existsByLotteryTicketSerialId(serial.getId())) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                    "Không thể xóa sê-ri đã có lịch sử đơn hàng tham chiếu."
            );
        }
    }

    @Override
    @Transactional
    public LotteryTicketSerialModel reportFault(Long id, ReportSerialFaultRequest request, UUID actorId) {
        LotteryTicketSerialModel serial = getByIdOrThrow(id);

        if (serial.isTerminalIncidentStatus()) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                    "Sê-ri ở trạng thái " + serial.getStatus().getDisplayName()
                            + " không thể báo sự cố (chỉ đọc để tra cứu).");
        }

        validateIncidentRequest(serial, request);

        LotteryTicketSerialStatus priorStatus = serial.getStatus();
        LocalDateTime priorReservationExpiresAt = serial.getReservationExpiresAt();
        UUID priorOrderId = serial.getReservedByOrderId();

        if (request.ticketCondition() == TicketCondition.DAMAGED) {
            serial.markDamaged(request.faultedBy(), request.damagedReason(), request.damagedEvidenceUrl());
        } else if (request.ticketCondition() == TicketCondition.LOST) {
            serial.markLost(request.faultedBy(), request.damagedReason());
        } else if (request.ticketCondition() == TicketCondition.VOIDED) {
            serial.markVoided(request.faultedBy(), request.damagedReason());
        } else {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Báo lỗi không hợp lệ (cần ticketCondition DAMAGED, LOST hoặc VOIDED)."
            );
        }

        LotteryTicketSerialModel saved = lotteryTicketSerialRepositoryPort.save(serial);
        serialIncidentService.handleAfterFaultReported(
                saved,
                priorStatus,
                priorReservationExpiresAt,
                priorOrderId,
                request,
                actorId);
        return saved;
    }

    private void validateIncidentRequest(LotteryTicketSerialModel serial, ReportSerialFaultRequest request) {
        if (request.ticketCondition() == TicketCondition.VOIDED) {
            if (request.faultedBy() != LotteryTicketSerialFaultedBy.DATA_ENTRY_FAULT) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Hủy sê-ri (VOIDED) chỉ áp dụng cho lỗi nhập liệu (DATA_ENTRY_FAULT).");
            }
            return;
        }

        if (request.ticketCondition() == TicketCondition.DAMAGED
                || request.ticketCondition() == TicketCondition.LOST) {
            if (request.faultedBy() == LotteryTicketSerialFaultedBy.LOST_DURING_RETURN
                    || request.faultedBy() == LotteryTicketSerialFaultedBy.ISSUER_FAULT) {
                return;
            }
            if (serial.isInternalInventoryIncidentStatus()
                    && request.faultedBy() != LotteryTicketSerialFaultedBy.INTERNAL_FAULT) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Vé trong kho chỉ báo hỏng/mất với nguồn lỗi INTERNAL_FAULT.");
            }
        }
    }
}
