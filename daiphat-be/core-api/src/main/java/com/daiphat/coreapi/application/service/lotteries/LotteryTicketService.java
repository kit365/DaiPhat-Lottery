package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.order.OrderTicketSnapshot;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.event.LotteryTicketProxyExpiredEvent;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryTicketApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.valueobject.LotteryTicketNumber;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import com.daiphat.coreapi.shared.util.StorageUtils;
import com.daiphat.coreapi.shared.util.StorageFolderConstants;
import com.daiphat.coreapi.shared.util.SortUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class LotteryTicketService implements LotteryTicketServicePort {
    private static final List<LotteryTicketStatus> EXPIRABLE_STATUSES = List.of(
            LotteryTicketStatus.IN_STOCK,
            LotteryTicketStatus.SOLD_OUT,
            LotteryTicketStatus.RESERVED,
            LotteryTicketStatus.PROXY_HOLDING
    );
    private static final List<LotteryTicketSerialStatus> NON_EDITABLE_SERIAL_STATUSES =
            List.of(
                    LotteryTicketSerialStatus.RESERVED,
                    LotteryTicketSerialStatus.SOLD
            );
    private static final List<LotteryTicketSerialStatus> SOLD_SERIAL_STATUSES =
            List.of(LotteryTicketSerialStatus.SOLD);

    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final LotteryStationServicePort lotteryStationServicePort;
    private final LotteryTicketApplicationMapper lotteryTicketApplicationMapper;
    private final LotteryTicketSerialServicePort lotteryTicketSerialService;
    private final StoragePort storagePort;
    private final OrderRepositoryPort orderRepositoryPort;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public LotteryTicketResponse create(CreateLotteryTicketRequest request, UUID importedById) {
        log.info("Importing lottery ticket with serials: {}", request.serials().stream().map(com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest::serialNumber).toList());

        LotteryStationModel station = getStationOrThrow(request.stationId());
        LotteryTicketNumber ticketNumber = toTicketNumber(request.numbers(), station);
        LotteryTicketModel requestedTicket = lotteryTicketApplicationMapper.toModel(request);
        LocalDate resolvedDrawDate = resolveRequestedDrawDate(request.drawDate(), station);
        requestedTicket.validateDrawDate(resolvedDrawDate);
        requestedTicket.setDrawDate(resolvedDrawDate);
        var existingTicket = lotteryTicketRepositoryPort.findByUniqueFields(
                request.stationId(),
                ticketNumber.value(),
                resolvedDrawDate
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

        return PageResponse.from(responses, ticketPage.getTotalElements(), page, size);
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

        return PageResponse.from(responses, ticketPage.getTotalElements(), page, size);
    }

    @Override
    @Transactional
    public LotteryTicketResponse update(Long id, UpdateLotteryTicketRequest request, UUID editorId) {
        log.info("Updating lottery ticket with id: {}", id);

        LotteryTicketModel model = getTicketOrThrow(id);
        ensureTicketEditable(model);

        String nextNumbers = model.getNumbers();
        LocalDate nextDrawDate = model.getDrawDate();
        LotteryStationModel station;

        if (hasText(request.numbers()) || request.drawDate() != null) {
            station = getStationOrThrow(model.getStationId());
            nextNumbers = hasText(request.numbers())
                    ? toTicketNumber(request.numbers(), station).value()
                    : model.getNumbers();
            if (request.drawDate() != null) {
                nextDrawDate = resolveRequestedDrawDate(request.drawDate(), station);
            }
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

        ensureTicketSoftDeletable(model);

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
            case PROXY_HOLDING -> model.holdForProxy();
            case IN_STOCK -> model.recallFromProxy();
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
            LotteryTicketStatus previousStatus = ticket.getStatus();
            lotteryTicketSerialService.expireActiveSerials(ticket.getId());
            ticket.expire();
            lotteryTicketRepositoryPort.save(ticket);
            syncStationInventory(ticket.getStationId());
            if (previousStatus == LotteryTicketStatus.PROXY_HOLDING) {
                eventPublisher.publishEvent(LotteryTicketProxyExpiredEvent.builder()
                        .ticketId(ticket.getId())
                        .ticketNumber(ticket.getNumbers())
                        .build());
            }
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
            return null;
        }
    }

    private LocalDate parseDrawDate(String drawDate) {
        if (drawDate == null || drawDate.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(drawDate);
        } catch (DateTimeParseException ignored) {
            return null;
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
        if (station.getRegion() == null) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_SYNC_REGION_REQUIRED);
        }
        return LotteryTicketNumber.from(numbers, station.getRegion().numberLength());
    }

    private LocalDate resolveCurrentStationDrawDate(LotteryStationModel station) {
        DrawScheduleUtils.validate(station.getDrawDays(), station.getDrawTime());
        return DrawScheduleUtils.resolveNextDrawDate(station.getDrawDays(), station.getDrawTime());
    }

    private LocalDate resolveRequestedDrawDate(LocalDate requestedDrawDate, LotteryStationModel station) {
        if (requestedDrawDate == null) {
            return resolveCurrentStationDrawDate(station);
        }

        DrawScheduleUtils.validate(station.getDrawDays(), station.getDrawTime());
        if (!station.getDrawDays().contains(requestedDrawDate.getDayOfWeek())) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_DRAW_DATE_INVALID,
                    "Ngày quay " + requestedDrawDate + " không khớp lịch quay của đài " + station.getName() + "."
            );
        }

        return requestedDrawDate;
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
        int totalSerialCount = lotteryTicketSerialService.findAllByTicketId(ticketId).size();
        int soldSerialCount = (int) lotteryTicketSerialService.countByStatuses(ticketId, SOLD_SERIAL_STATUSES);
        if (ticket.getStatus() == LotteryTicketStatus.PROXY_HOLDING && ticket.isExpired(cutoffTime)) {
            ticket.expire();
        } else {
            ticket.syncAggregateState((int) availableSerialCount, totalSerialCount, soldSerialCount, cutoffTime);
        }
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

    private void ensureTicketEditable(LotteryTicketModel ticket) {
        if (!ticket.isEditableStatus()) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                    "Chỉ được chỉnh sửa vé ở trạng thái IN_STOCK hoặc ISSUER_FAULT."
            );
        }

        long lockedSerialCount = lotteryTicketSerialService.countByStatuses(ticket.getId(), NON_EDITABLE_SERIAL_STATUSES);
        if (lockedSerialCount > 0) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                    "Không thể chỉnh sửa vé khi đang có sê-ri RESERVED hoặc SOLD."
            );
        }
    }

    private void ensureTicketSoftDeletable(LotteryTicketModel ticket) {
        if (!ticket.isSoftDeletableStatus()) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                    "Không thể xóa vé ở trạng thái hiện tại."
            );
        }

        long soldSerialCount = lotteryTicketSerialService.countByStatuses(ticket.getId(), SOLD_SERIAL_STATUSES);
        if (soldSerialCount > 0) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                    "Không thể xóa vé đã có sê-ri SOLD."
            );
        }

        if (orderRepositoryPort.existsByLotteryTicketId(ticket.getId())) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                    "Không thể xóa vé đã có lịch sử đơn hàng tham chiếu."
            );
        }
    }
}
