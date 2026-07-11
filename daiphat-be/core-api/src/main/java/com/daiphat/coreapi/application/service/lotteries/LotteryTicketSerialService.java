package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
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
                .inputSource(InputSource.MANUAL)
                .build();
        serial.initializeImport(importedById);
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
        return lotteryTicketSerialRepositoryPort.countByTicketIdAndStatuses(ticketId, AVAILABLE_STATUSES);
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
        return lotteryTicketSerialRepositoryPort
                .findFirstByTicketIdAndStatusOrderByIdAsc(ticketId, LotteryTicketSerialStatus.IN_STOCK)
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
    public long countByTicketIdAndImportBatchLineId(Long ticketId, Long importBatchLineId) {
        return lotteryTicketSerialRepositoryPort.countByTicketIdAndImportBatchLineId(ticketId, importBatchLineId);
    }

    @Override
    public void hardDeleteByTicketIdAndImportBatchLineId(Long ticketId, Long importBatchLineId) {
        lotteryTicketSerialRepositoryPort.hardDeleteByTicketIdAndImportBatchLineId(ticketId, importBatchLineId);
    }

    @Override
    public void hardDeleteByImportBatchLineId(Long importBatchLineId) {
        lotteryTicketSerialRepositoryPort.hardDeleteByImportBatchLineId(importBatchLineId);
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
}
