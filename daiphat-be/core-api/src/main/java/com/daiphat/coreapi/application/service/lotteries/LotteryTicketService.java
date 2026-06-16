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
import com.daiphat.coreapi.domain.valueobject.LotteryTicketNumber;
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
import java.util.LinkedHashMap;
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

        request.serials().forEach(serialReq -> lotteryTicketSerialService.upsertSerialForTicket(ticket, serialReq, importedById));

        LotteryTicketModel saved = recomputeTicketAggregate(ticket.getId());

        log.info("Lottery ticket imported with id: {}", saved.getId());
        return mapToDetailResponse(saved);
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
    @Transactional(readOnly = true)
    public PageResponse<LotteryTicketResponse> getPublicTickets(
            int page, int size, Long stationId, String drawDate,
            String search, String sortBy, String direction) {

        PageRequest pageable = PageRequest.of(
                Math.max(0, page - 1),
                size,
                SortUtils.createSort(sortBy, direction)
        );

        LocalDate parsedDrawDate = parseDrawDate(drawDate);

        Page<LotteryTicketModel> ticketPage = lotteryTicketRepositoryPort
                .findAllPublic(pageable, stationId, parsedDrawDate, search);

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
    public LotteryTicketResponse update(Long id, UpdateLotteryTicketRequest request, UUID editorId) {
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

        lotteryTicketRepositoryPort.save(model);

        if (request.serials() != null && !request.serials().isEmpty()) {
            lotteryTicketSerialService.syncSerialsForTicket(model, request.serials(), editorId);
        }

        LotteryTicketModel saved = recomputeTicketAggregate(model.getId());
        log.info("Lottery ticket updated with id: {}", saved.getId());
        return mapToDetailResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Soft deleting lottery ticket with id: {}", id);

        LotteryTicketModel model = getTicketOrThrow(id);

        if (model.isDeleted()) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND);
        }

        model.softDelete();
        lotteryTicketRepositoryPort.save(model);
        syncStationInventory(model.getStationId());
    }

    @Override
    @Transactional
    public LotteryTicketResponse uploadImage(Long id, UploadRequest request) {
        LotteryTicketModel model = getTicketOrThrow(id);
        StorageUtils.validateImageUpload(request);

        StorageResult result = uploadAsset(request);

        model.setTicketImg(result.url());
        LotteryTicketModel saved = lotteryTicketRepositoryPort.save(model);
        return mapToDetailResponse(saved);
    }

    @Override
    public StorageResult uploadAsset(UploadRequest request) {
        StorageUtils.validateImageUpload(request);
        return storagePort.upload(new UploadRequest(
                request.data(),
                request.fileName(),
                request.contentType(),
                StorageFolderConstants.TICKET_IMAGE_FOLDER
        ));
    }

    @Override
    @Transactional
    public LotteryTicketResponse verify(Long id, UUID verifierId) {
        log.info("Verifying lottery ticket with id: {} by user: {}", id, verifierId);

        LotteryTicketModel model = getTicketOrThrow(id);

        model.verify(verifierId);

        LotteryTicketModel saved = lotteryTicketRepositoryPort.save(model);
        return mapToDetailResponse(saved);
    }

    @Override
    @Transactional
    public LotteryTicketResponse changeStatus(Long id, LotteryTicketStatus status) {
        log.info("Changing status of lottery ticket with id: {} to {}", id, status);

        if (status == null) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_STATUS_REQUIRED);
        }

        LotteryTicketModel model = getTicketOrThrow(id);

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

        LotteryTicketModel saved = lotteryTicketRepositoryPort.save(model);
        syncStationInventory(model.getStationId());
        return mapToDetailResponse(saved);
    }

    @Override
    @Transactional
    public List<OrderTicketSnapshot> reserveForOrder(List<Long> ticketIds) {
        List<LotteryTicketModel> tickets = getTicketsOrThrow(ticketIds);
        validateRequestedSerialAvailability(tickets, false);

        return tickets.stream()
                .map(this::reserveForValidatedTicket)
                .toList();
    }

    @Override
    @Transactional
    public OrderTicketSnapshot reserveForOrder(Long ticketId) {
        LotteryTicketModel ticket = getTicketOrThrow(ticketId);
        ensureTicketAvailableForReserve(ticket);
        return reserveForValidatedTicket(ticket);
    }

    @Override
    @Transactional
    public List<OrderTicketSnapshot> sellOfflineForOrder(List<Long> ticketIds) {
        List<LotteryTicketModel> tickets = getTicketsOrThrow(ticketIds);
        validateRequestedSerialAvailability(tickets, true);

        return tickets.stream()
                .map(this::sellOfflineForValidatedTicket)
                .toList();
    }

    @Override
    @Transactional
    public OrderTicketSnapshot sellOfflineForOrder(Long ticketId) {
        LotteryTicketModel ticket = getTicketOrThrow(ticketId);
        ensureTicketAvailableForDirectSale(ticket);
        return sellOfflineForValidatedTicket(ticket);
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
        boolean expireAfterRelease = ticket.isExpired(station.getDrawTime());
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
            if (!ticket.isExpired(station.getDrawTime())) {
                continue;
            }
            ticket.expire();
            lotteryTicketRepositoryPort.save(ticket);
            syncStationInventory(ticket.getStationId());
            expiredCount++;
        }
        return expiredCount;
    }



    private LotteryTicketResponse mapToDetailResponse(LotteryTicketModel model) {
        List<LotteryTicketSerialModel> serials = lotteryTicketSerialService.findAllByTicketId(model.getId());
        String stationName = lotteryStationServicePort.findModelById(model.getStationId())
                .map(LotteryStationModel::getName)
                .orElse(null);
        return lotteryTicketApplicationMapper.toResponseDetail(model, serials, stationName);
    }

    private LotteryTicketResponse mapToDetailResponse(LotteryTicketModel model) {
        List<LotteryTicketSerialModel> serials = lotteryTicketSerialService.findAllByTicketId(model.getId());
        String stationName = lotteryStationServicePort.findModelById(model.getStationId())
                .map(LotteryStationModel::getName)
                .orElse(null);
        return lotteryTicketApplicationMapper.toResponseDetail(model, serials, stationName);
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

    private DomainException insufficientSerials(LotteryTicketModel ticket, int requestedQuantity, long availableSerials) {
        String ticketRef = ticket.getNumbers() != null && !ticket.getNumbers().isBlank()
                ? "Vé số " + ticket.getNumbers()
                : "Vé #" + ticket.getId();
        return new DomainException(
                ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                String.format(
                        "%s chỉ còn %d sê-ri khả dụng, không đủ số lượng yêu cầu %d.",
                        ticketRef,
                        availableSerials,
                        requestedQuantity
                )
        );
    }

    private LotteryStationModel getStationOrThrow(Long id) {
        return lotteryStationServicePort.getModelById(id);
    }

    private LotteryTicketModel getTicketOrThrow(Long id) {
        return lotteryTicketRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
    }

    private List<LotteryTicketModel> getTicketsOrThrow(List<Long> ticketIds) {
        Map<Long, LotteryTicketModel> ticketsById = new LinkedHashMap<>();
        lotteryTicketRepositoryPort.findAllByIds(ticketIds).forEach(ticket -> ticketsById.put(ticket.getId(), ticket));

        return ticketIds.stream()
                .map(ticketId -> {
                    LotteryTicketModel ticket = ticketsById.get(ticketId);
                    if (ticket == null) {
                        throw new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND);
                    }
                    return ticket;
                })
                .toList();
    }

    private void validateRequestedSerialAvailability(List<LotteryTicketModel> requestedTickets, boolean directSale) {
        Map<Long, Integer> requestedCounts = new LinkedHashMap<>();
        Map<Long, LotteryTicketModel> ticketById = new LinkedHashMap<>();

        for (LotteryTicketModel ticket : requestedTickets) {
            ticketById.putIfAbsent(ticket.getId(), ticket);
            requestedCounts.merge(ticket.getId(), 1, Integer::sum);
        }

        for (Map.Entry<Long, Integer> entry : requestedCounts.entrySet()) {
            LotteryTicketModel ticket = ticketById.get(entry.getKey());
            if (directSale) {
                ensureTicketAvailableForDirectSale(ticket);
            } else {
                ensureTicketAvailableForReserve(ticket);
            }

            long availableSerials = lotteryTicketSerialService.countAvailableSerials(ticket.getId());
            int requestedQuantity = entry.getValue();
            if (availableSerials < requestedQuantity) {
                throw insufficientSerials(ticket, requestedQuantity, availableSerials);
            }
        }
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
                ? lotteryTicketRepositoryPort.existsByUniqueFields(stationId, numbers, drawDate)
                : lotteryTicketRepositoryPort.existsByUniqueFieldsAndIdNot(stationId, numbers, drawDate, currentId);

        if (existed) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_SERIAL_EXISTED);
        }
    }

    private LotteryTicketModel recomputeTicketAggregate(Long ticketId) {
        LotteryTicketModel ticket = getTicketOrThrow(ticketId);
        LotteryStationModel station = getStationOrThrow(ticket.getStationId());
        LocalTime cutoffTime = station.getDrawTime();
        if (ticket.isExpired(cutoffTime)) {
            lotteryTicketSerialService.expireActiveSerials(ticketId);
        }
        long availableSerialCount = lotteryTicketSerialService.countAvailableSerials(ticketId);
        ticket.syncAggregateState((int) availableSerialCount, cutoffTime);
        LotteryTicketModel saved = lotteryTicketRepositoryPort.save(ticket);
        syncStationInventory(saved.getStationId());
        return saved;
    }

    private OrderTicketSnapshot reserveForValidatedTicket(LotteryTicketModel ticket) {
        LotteryTicketSerialModel serial = lotteryTicketSerialService.reserveFirstAvailable(ticket.getId(), null, null);
        LotteryTicketModel refreshed = recomputeTicketAggregate(ticket.getId());

        return new OrderTicketSnapshot(refreshed.getId(), serial.getId(), refreshed.getPriceSnapshot(), refreshed.getDrawDate());
    }

    private OrderTicketSnapshot sellOfflineForValidatedTicket(LotteryTicketModel ticket) {
        LotteryTicketSerialModel serial = lotteryTicketSerialService.sellFirstAvailable(ticket.getId());
        LotteryTicketModel refreshed = recomputeTicketAggregate(ticket.getId());

        return new OrderTicketSnapshot(refreshed.getId(), serial.getId(), refreshed.getPriceSnapshot(), refreshed.getDrawDate());
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private void syncStationInventory(Long stationId) {
        if (stationId != null) {
            lotteryStationServicePort.recalculateInventory(stationId);
        }
    }
}
