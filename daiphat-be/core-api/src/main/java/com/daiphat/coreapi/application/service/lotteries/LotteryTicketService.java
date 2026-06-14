package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.order.OrderTicketSnapshot;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryTicketApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketNumber;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.shared.util.StorageUtils;
import com.daiphat.coreapi.shared.util.StorageFolderConstants;
import com.daiphat.coreapi.shared.util.SortUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LotteryTicketService implements LotteryTicketServicePort {

    private static final List<LotteryTicketStatus> EXPIRABLE_STATUSES = List.of(
            LotteryTicketStatus.IN_STOCK,
            LotteryTicketStatus.SOLD_OUT,
            LotteryTicketStatus.RESERVED
    );

    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final LotteryStationServicePort lotteryStationServicePort;
    private final LotteryTicketApplicationMapper lotteryTicketApplicationMapper;
    private final LotteryTicketSerialServicePort lotteryTicketSerialService;
    private final StoragePort storagePort;

    @Override
    @Transactional
    public LotteryTicketResponse create(CreateLotteryTicketRequest request, UUID importedById) {
        log.info("Importing lottery ticket with serials: {}", request.serials().stream().map(com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest::serialNumber).toList());

        LotteryStationModel station = getStationOrThrow(request.stationId());
        LotteryTicketNumber ticketNumber = toTicketNumber(request.numbers(), station);
        LotteryTicketModel requestedTicket = lotteryTicketApplicationMapper.toModel(request);
        requestedTicket.validateDrawDate(request.drawDate());
        var existingTicket = lotteryTicketRepositoryPort.findByUniqueFields(
                request.stationId(),
                ticketNumber.value(),
                request.drawDate()
        );

        LotteryTicketModel ticket = existingTicket
                .orElseGet(() -> {
                    requestedTicket.setNumbers(ticketNumber.value());
                    requestedTicket.setPriceSnapshot(station.getPrice());
                    requestedTicket.setQuantity(0);
                    requestedTicket.setStatus(LotteryTicketStatus.IN_STOCK);
                    return lotteryTicketRepositoryPort.save(requestedTicket);
                });

        request.serials().forEach(serialReq -> {
            lotteryTicketSerialService.upsertSerialForTicket(ticket, serialReq, importedById);
        });

        LotteryTicketModel saved = recomputeTicketAggregate(ticket.getId());
        persistInventoryAdjustment(station, request.serials().size());

        log.info("Lottery ticket imported with id: {}", saved.getId());
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public LotteryTicketResponse getById(Long id) {
        LotteryTicketModel model = getTicketOrThrow(id);
        List<LotteryTicketSerialModel> serials = lotteryTicketSerialService.findAllByTicketId(model.getId());
        String stationName = lotteryStationServicePort.findModelById(model.getStationId())
                .map(LotteryStationModel::getName)
                .orElse(null);
        return lotteryTicketApplicationMapper.toResponseDetail(model, serials, stationName);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<LotteryTicketResponse> getAll(
            int page, int size, Long stationId, String status, String drawDate,
            String search, String sortBy, String direction) {

        PageRequest pageable = PageRequest.of(
                Math.max(0, page - 1),
                size,
                SortUtils.createSort(sortBy, direction)
        );

        LotteryTicketStatus statusEnum = parseStatus(status);
        LocalDate parsedDrawDate = parseDrawDate(drawDate);

        Page<LotteryTicketModel> ticketPage = lotteryTicketRepositoryPort
                .findAll(pageable, stationId, statusEnum, parsedDrawDate, search);

        Map<Long, String> stationNameCache = new HashMap<>();
        Map<Long, LotteryTicketSerialModel> serialsByTicketId = lotteryTicketSerialService.findRepresentativeSerialsByTicketIds(
                ticketPage.getContent().stream().map(LotteryTicketModel::getId).toList()
        );
        List<LotteryTicketResponse> responses = ticketPage.getContent().stream()
                .map(ticket -> mapToResponse(ticket, serialsByTicketId.get(ticket.getId()), stationNameCache))
                .toList();

        return PageResponse.<LotteryTicketResponse>builder()
                .recordList(responses)
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(ticketPage.getTotalElements())
                        .totalPages(ticketPage.getTotalPages())
                        .currentPage(page)
                        .limit(size)
                        .isFirst(ticketPage.isFirst())
                        .isLast(ticketPage.isLast())
                        .build())
                .build();
    }

    @Override
    @Transactional
    public LotteryTicketResponse update(Long id, UpdateLotteryTicketRequest request) {
        log.info("Updating lottery ticket with id: {}", id);

        LotteryTicketModel model = getTicketOrThrow(id);

        String nextNumbers = model.getNumbers();
        LocalDate nextDrawDate = request.drawDate() != null ? request.drawDate() : model.getDrawDate();

        if (hasText(request.numbers()) || request.drawDate() != null) {
            LotteryStationModel station = getStationOrThrow(model.getStationId());
            nextNumbers = hasText(request.numbers())
                    ? toTicketNumber(request.numbers(), station).value()
                    : model.getNumbers();
        }

        validateUniqueTicket(model.getStationId(), nextNumbers, nextDrawDate, id);

        if (request.ticketImg() != null) {
            model.setTicketImg(request.ticketImg());
        }
        if (hasText(request.numbers())) {
            model.setNumbers(nextNumbers);
        }
        if (request.drawDate() != null) {
            model.validateDrawDate(nextDrawDate);
            model.setDrawDate(nextDrawDate);
        }
        if (hasText(request.batchCode())) {
            model.setBatchCode(request.batchCode().trim());
        }

        if (request.status() != null && request.status() != model.getStatus()) {
            applyStatusTransition(model, request.status());
        }

        LotteryTicketModel saved = lotteryTicketRepositoryPort.save(model);
        log.info("Lottery ticket updated with id: {}", saved.getId());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Soft deleting lottery ticket with id: {}", id);

        LotteryTicketModel model = getTicketOrThrow(id);

        if (model.isDeleted()) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND);
        }

        if (model.countsTowardInventory()) {
            LotteryStationModel station = getStationOrThrow(model.getStationId());
            persistInventoryAdjustment(station, -model.getQuantity());
        }

        model.softDelete();
        lotteryTicketRepositoryPort.save(model);
    }

    @Override
    @Transactional
    public LotteryTicketResponse uploadImage(Long id, UploadRequest request) {
        LotteryTicketModel model = getTicketOrThrow(id);
        StorageUtils.validateImageUpload(request);

        StorageResult result = storagePort.upload(new UploadRequest(
                request.data(),
                request.fileName(),
                request.contentType(),
                StorageFolderConstants.TICKET_IMAGE_FOLDER
        ));

        model.setTicketImg(result.url());
        LotteryTicketModel saved = lotteryTicketRepositoryPort.save(model);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public LotteryTicketResponse verify(Long id, UUID verifierId) {
        log.info("Verifying lottery ticket with id: {} by user: {}", id, verifierId);

        LotteryTicketModel model = getTicketOrThrow(id);

        model.verify(verifierId);

        LotteryTicketModel saved = lotteryTicketRepositoryPort.save(model);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public LotteryTicketResponse changeStatus(Long id, LotteryTicketStatus status) {
        log.info("Changing status of lottery ticket with id: {} to {}", id, status);

        if (status == null) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_STATUS_REQUIRED);
        }

        LotteryTicketModel model = getTicketOrThrow(id);

        boolean wasInInventory = model.countsTowardInventory();

        switch (status) {
            case RESERVED -> model.reserve();
            case SOLD -> model.sellOnline();
            case PROXY_HOLDING -> model.holdForProxy();
            case PENDING_RETURN -> model.requestReturn();
            case RETURNED -> model.confirmReturned();
            case INTERNAL_FAULT -> model.markInternalFault();
            case ISSUER_FAULT -> model.markIssuerFault();
            default -> throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }

        boolean isInInventory = model.countsTowardInventory();
        if (wasInInventory != isInInventory) {
            LotteryStationModel station = getStationOrThrow(model.getStationId());
            persistInventoryAdjustment(station, isInInventory ? 1 : -1);
        }

        LotteryTicketModel saved = lotteryTicketRepositoryPort.save(model);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public OrderTicketSnapshot reserveForOrder(Long ticketId) {
        LotteryTicketModel ticket = getTicketOrThrow(ticketId);
        ensureTicketAvailableForReserve(ticket);
        LotteryTicketSerialModel serial = lotteryTicketSerialService.reserveFirstAvailable(ticketId, null, null);
        LotteryTicketModel refreshed = recomputeTicketAggregate(ticketId);

        return new OrderTicketSnapshot(refreshed.getId(), serial.getId(), refreshed.getPriceSnapshot(), refreshed.getDrawDate());
    }

    @Override
    @Transactional
    public OrderTicketSnapshot sellOfflineForOrder(Long ticketId) {
        LotteryTicketModel ticket = getTicketOrThrow(ticketId);
        LotteryStationModel station = getStationOrThrow(ticket.getStationId());

        ensureTicketAvailableForDirectSale(ticket);
        LotteryTicketSerialModel serial = lotteryTicketSerialService.sellFirstAvailable(ticketId);
        LotteryTicketModel refreshed = recomputeTicketAggregate(ticketId);
        persistInventoryAdjustment(station, -1);

        return new OrderTicketSnapshot(refreshed.getId(), serial.getId(), refreshed.getPriceSnapshot(), refreshed.getDrawDate());
    }

    @Override
    @Transactional
    public void markSoldForOrder(Long ticketSerialId) {
        LotteryTicketSerialModel serial = lotteryTicketSerialService.getByIdOrThrow(ticketSerialId);
        lotteryTicketSerialService.markSold(ticketSerialId);
        recomputeTicketAggregate(serial.getTicketId());
    }

    @Override
    @Transactional
    public void releaseReservationForOrder(Long ticketSerialId) {
        LotteryTicketSerialModel serial = lotteryTicketSerialService.getByIdOrThrow(ticketSerialId);
        LotteryTicketModel ticket = getTicketOrThrow(serial.getTicketId());
        LotteryStationModel station = getStationOrThrow(ticket.getStationId());
        boolean expireAfterRelease = ticket.isExpired(parseDrawTime(station.getDrawTime()));
        serial = lotteryTicketSerialService.releaseReservation(ticketSerialId, expireAfterRelease);
        recomputeTicketAggregate(serial.getTicketId());
    }

    @Override
    @Transactional
    public int expireDueTickets() {
        List<LotteryTicketModel> tickets = lotteryTicketRepositoryPort.findExpirableTickets(LocalDate.now(), EXPIRABLE_STATUSES);
        int expiredCount = 0;
        for (LotteryTicketModel ticket : tickets) {
            LotteryStationModel station = getStationOrThrow(ticket.getStationId());
            if (!ticket.isExpired(parseDrawTime(station.getDrawTime()))) {
                continue;
            }
            ticket.expire();
            lotteryTicketRepositoryPort.save(ticket);
            expiredCount++;
        }
        return expiredCount;
    }

    private LotteryTicketResponse mapToResponse(LotteryTicketModel model) {
        LotteryTicketSerialModel serial = lotteryTicketSerialService.findFirstByTicketId(model.getId()).orElse(null);
        return mapToResponse(model, serial, new HashMap<>());
    }

    private LotteryTicketResponse mapToResponse(
            LotteryTicketModel model,
            LotteryTicketSerialModel serial,
            Map<Long, String> stationNameCache
    ) {
        String stationName = stationNameCache.computeIfAbsent(
                model.getStationId(),
                id -> lotteryStationServicePort.findModelById(id)
                        .map(LotteryStationModel::getName)
                        .orElse(null)
        );
        return lotteryTicketApplicationMapper.toResponse(model, serial, stationName);
    }

    private LotteryTicketStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return LotteryTicketStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException ignored) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
    }

    private LocalDate parseDrawDate(String drawDate) {
        if (drawDate == null || drawDate.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(drawDate);
        } catch (DateTimeParseException ignored) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_DRAW_DATE_INVALID);
        }
    }

    private void persistInventoryAdjustment(LotteryStationModel station, int delta) {
        lotteryStationServicePort.adjustInventory(station.getId(), delta);
    }

    private void ensureTicketAvailableForReserve(LotteryTicketModel ticket) {
        if (ticket.getStatus() != LotteryTicketStatus.IN_STOCK) {
            throw invalidTicketStatus(ticket, List.of(LotteryTicketStatus.IN_STOCK));
        }
    }

    private void ensureTicketAvailableForDirectSale(LotteryTicketModel ticket) {
        if (ticket.getStatus() != LotteryTicketStatus.IN_STOCK) {
            throw invalidTicketStatusForDirectSale(ticket);
        }
    }

    private DomainException invalidTicketStatus(LotteryTicketModel ticket, List<LotteryTicketStatus> allowedStatuses) {
        String allowedStatusText = allowedStatuses.stream().map(Enum::name).toList().toString();
        return new DomainException(
                ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                String.format(
                        "Ve so #%d dang o trang thai %s nen khong the thuc hien thao tac nay. Trang thai hop le: %s.",
                        ticket.getId(),
                        ticket.getStatus().name(),
                        allowedStatusText
                )
        );
    }

    private DomainException invalidTicketStatusForDirectSale(LotteryTicketModel ticket) {
        if (ticket.getStatus() == LotteryTicketStatus.SOLD_OUT) {
            return new DomainException(
                    ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                    "Vé đã được bán."
            );
        }
        return invalidTicketStatus(ticket, List.of(LotteryTicketStatus.IN_STOCK));
    }

    private LotteryStationModel getStationOrThrow(Long id) {
        return lotteryStationServicePort.getModelById(id);
    }

    private LotteryTicketModel getTicketOrThrow(Long id) {
        return lotteryTicketRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
    }

    private void applyStatusTransition(LotteryTicketModel model, LotteryTicketStatus status) {
        switch (status) {
            case RESERVED -> model.reserve();
            case SOLD -> model.sellOnline();
            case PROXY_HOLDING -> model.holdForProxy();
            case PENDING_RETURN -> model.requestReturn();
            case RETURNED -> model.confirmReturned();
            case INTERNAL_FAULT -> model.markInternalFault();
            case ISSUER_FAULT -> model.markIssuerFault();
            default -> throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
    }

    private LotteryTicketNumber toTicketNumber(String numbers, LotteryStationModel station) {
        return LotteryTicketNumber.from(numbers, station.getNumberLength());
    }

    private void validateUniqueTicket(Long stationId, String numbers, LocalDate drawDate, Long currentId) {
        boolean existed = currentId == null
                ? lotteryTicketRepositoryPort.existsByUniqueFields(stationId, null, numbers, drawDate)
                : lotteryTicketRepositoryPort.existsByUniqueFieldsAndIdNot(stationId, null, numbers, drawDate, currentId);

        if (existed) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_SERIAL_EXISTED);
        }
    }

    private LotteryTicketModel recomputeTicketAggregate(Long ticketId) {
        LotteryTicketModel ticket = getTicketOrThrow(ticketId);
        LotteryStationModel station = getStationOrThrow(ticket.getStationId());
        LocalTime cutoffTime = parseDrawTime(station.getDrawTime());
        if (ticket.isExpired(cutoffTime)) {
            lotteryTicketSerialService.expireActiveSerials(ticketId);
        }
        long availableSerialCount = lotteryTicketSerialService.countAvailableSerials(ticketId);
        ticket.syncAggregateState((int) availableSerialCount, cutoffTime);
        return lotteryTicketRepositoryPort.save(ticket);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private LocalTime parseDrawTime(String drawTime) {
        if (drawTime == null || drawTime.isBlank()) {
            return null;
        }
        try {
            return LocalTime.parse(drawTime.trim());
        } catch (DateTimeParseException ignored) {
            log.warn("Invalid draw time format for station: {}", drawTime);
            return null;
        }
    }
}
