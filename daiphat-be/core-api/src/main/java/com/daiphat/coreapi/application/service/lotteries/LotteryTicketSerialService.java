package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
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
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LotteryTicketSerialService implements LotteryTicketSerialServicePort {

    private static final List<LotteryTicketSerialStatus> AVAILABLE_STATUSES = List.of(LotteryTicketSerialStatus.IN_STOCK);
    private static final List<LotteryTicketSerialStatus> EXPIRABLE_STATUSES = List.of(
            LotteryTicketSerialStatus.IN_STOCK
    );

    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final StoragePort storagePort;

    @Override
    @Transactional
    public LotteryTicketSerialModel upsertSerialForTicket(
            LotteryTicketModel ticket,
            CreateLotteryTicketSerialRequest request,
            UUID importedById
    ) {
        String normalizedSerial = request.serialNumber().trim();
        if (lotteryTicketSerialRepositoryPort.existsByTicketIdAndSerialNumber(ticket.getId(), normalizedSerial)) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_SERIAL_EXISTED);
        }

        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .ticketId(ticket.getId())
                .ticketImg(request.ticketImg())
                .serialNumber(normalizedSerial)
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
                .filter(id -> id != null)
                .collect(Collectors.toCollection(HashSet::new));

        for (UpdateLotteryTicketSerialRequest serialReq : serials) {
            String normalizedSerial = serialReq.serialNumber().trim();
            if (serialReq.id() != null) {
                LotteryTicketSerialModel existing = existingSerials.stream()
                        .filter(serial -> serialReq.id().equals(serial.getId()))
                        .findFirst()
                        .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));

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
                    editorId
            );
        }

        for (LotteryTicketSerialModel existing : existingSerials) {
            if (requestedIds.contains(existing.getId())) {
                continue;
            }
            if (existing.getStatus() != LotteryTicketSerialStatus.IN_STOCK) {
                throw new DomainException(
                        ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                        "Không thể xóa sê-ri đang ở trạng thái " + existing.getStatus().getDisplayName()
                );
            }
            existing.setDeletedAt(LocalDateTime.now());
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
    public List<EnumOptionResponse> getStatuses() {
        return EnumOptionUtils.toEnumOptions(LotteryTicketSerialStatus.values());
    }
}
