package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.order.OrderTicketSnapshot;
import com.daiphat.coreapi.application.dto.request.lotteries.BulkCreateLotteryTicketsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketNumberSectionRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.BulkCreateLotteryTicketsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchReductionTicketResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketSerialResponse;
import com.daiphat.coreapi.application.event.LotteryTicketProxyExpiredEvent;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryTicketApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.valueobject.LotteryTicketNumber;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import com.daiphat.coreapi.shared.util.ImportBatchDraftExpiryService;
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
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

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
    private final ImportBatchRepositoryPort importBatchRepositoryPort;
    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    private final ImportBatchDraftExpiryService importBatchDraftExpiryService;
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

        ImportBatchLineModel importBatchLine = getDraftImportBatchLineForOperatorOrThrow(
                request.importBatchLineId(),
                importedById
        );
        ImportBatchModel importBatch = getImportBatchOrThrow(importBatchLine.getImportBatchId());
        LotteryStationModel station = getStationOrThrow(request.stationId());
        LotteryTicketNumber ticketNumber = toTicketNumber(request.numbers(), station);
        LotteryTicketModel requestedTicket = lotteryTicketApplicationMapper.toModel(request);
        LocalDate resolvedDrawDate = resolveRequestedDrawDate(request.drawDate(), station);
        requestedTicket.validateDrawDate(resolvedDrawDate);
        requestedTicket.setDrawDate(resolvedDrawDate);
        validateTicketAgainstImportBatchLine(importBatchLine, importBatch, station.getId(), resolvedDrawDate);
        validateImportQuantity(importBatchLine, request.serials().size());

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

        final LotteryTicketModel resolvedTicket = ticket;
        final Long importBatchId = importBatch.getId();
        final Long importBatchLineId = importBatchLine.getId();
        request.serials().forEach(serialReq ->
                lotteryTicketSerialService.upsertSerialForTicket(
                        resolvedTicket,
                        serialReq,
                        importedById,
                        importBatchId,
                        importBatchLineId
                )
        );

        LotteryTicketModel saved = recomputeTicketAggregate(resolvedTicket.getId());
        saved = applyImportBatchProgress(saved, importBatchLine, importBatch);

        log.info("Lottery ticket imported with id: {}", saved.getId());
        return mapToDetailResponse(saved);
    }

    @Override
    @Transactional
    public BulkCreateLotteryTicketsResponse createBulk(BulkCreateLotteryTicketsRequest request, UUID importedById) {
        log.info(
                "Bulk importing {} lottery ticket number sections for import batch line: {}",
                request.tickets().size(),
                request.importBatchLineId()
        );

        ImportBatchLineModel importBatchLine = getDraftImportBatchLineForOperatorOrThrow(
                request.importBatchLineId(),
                importedById
        );
        ImportBatchModel importBatch = getImportBatchOrThrow(importBatchLine.getImportBatchId());
        LotteryStationModel station = getStationOrThrow(request.stationId());
        LocalDate resolvedDrawDate = resolveRequestedDrawDate(request.drawDate(), station);
        validateTicketAgainstImportBatchLine(importBatchLine, importBatch, station.getId(), resolvedDrawDate);

        validateBulkTicketSections(request.tickets());

        int incomingSerialCount = request.tickets().stream()
                .mapToInt(section -> section.serials().size())
                .sum();
        validateImportQuantity(importBatchLine, incomingSerialCount);

        List<LotteryTicketResponse> responses = new ArrayList<>();
        for (CreateLotteryTicketNumberSectionRequest section : request.tickets()) {
            responses.add(create(
                    CreateLotteryTicketRequest.builder()
                            .stationId(request.stationId())
                            .importBatchLineId(request.importBatchLineId())
                            .drawDate(resolvedDrawDate)
                            .numbers(section.numbers())
                            .serials(section.serials())
                            .build(),
                    importedById
            ));
        }

        return BulkCreateLotteryTicketsResponse.builder()
                .tickets(responses)
                .importedSerialCount(incomingSerialCount)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public LotteryTicketResponse getById(Long id) {
        LotteryTicketModel model = getTicketOrThrow(id);
        return mapToDetailResponse(model);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<LotteryTicketResponse> getAll(
            int page, int size, Long stationId, List<Long> stationIds, String status, String drawDate,
            String search, String sortBy, String direction) {

        PageRequest pageable = PageRequest.of(
                Math.max(0, page - 1),
                size,
                SortUtils.createSort(sortBy, direction)
        );

        LotteryTicketStatus statusEnum = parseStatus(status);
        List<LocalDate> parsedDrawDates = parseDrawDates(drawDate);
        List<Long> normalizedStationIds = normalizeStationIds(stationId, stationIds);

        Page<LotteryTicketModel> ticketPage = lotteryTicketRepositoryPort
                .findAll(pageable, stationId, normalizedStationIds, statusEnum, parsedDrawDates, search);

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
            int page, int size, Long stationId, List<Long> stationIds, String drawDate,
            String search, String sortBy, String direction) {
        return getPublicTickets(page, size, stationId, stationIds, drawDate, search, null, sortBy, direction);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<LotteryTicketResponse> getPublicTickets(
            int page, int size, Long stationId, List<Long> stationIds, String drawDate,
            String search, TicketSearchMode searchMode, String sortBy, String direction) {

        PageRequest pageable = PageRequest.of(
                Math.max(0, page - 1),
                size,
                SortUtils.createSort(sortBy, direction)
        );

        List<LocalDate> parsedDrawDates = parseDrawDates(drawDate);
        List<Long> normalizedStationIds = normalizeStationIds(stationId, stationIds);

        Page<LotteryTicketModel> ticketPage = lotteryTicketRepositoryPort
                .findAllPublic(pageable, stationId, normalizedStationIds, parsedDrawDates, search, searchMode);

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
        // batchCode is resolved from import batch line when mapping responses.

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
    public void purgeImportBatchLineTickets(Long importBatchLineId) {
        List<Long> ticketIds = lotteryTicketSerialService.findDistinctTicketIdsByImportBatchLineId(importBatchLineId);
        Set<Long> stationIds = new HashSet<>();

        for (Long ticketId : ticketIds) {
            LotteryTicketModel ticket = getTicketOrThrow(ticketId);
            if (ticket.getStatus() != LotteryTicketStatus.IMPORTING) {
                throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_HAS_LOCKED_TICKETS);
            }

            long lockedSerials = lotteryTicketSerialService.countByStatuses(ticketId, NON_EDITABLE_SERIAL_STATUSES);
            if (lockedSerials > 0) {
                throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_HAS_LOCKED_TICKETS);
            }

            stationIds.add(ticket.getStationId());
        }

        lotteryTicketSerialService.hardDeleteByImportBatchLineId(importBatchLineId);
        ticketIds.forEach(lotteryTicketRepositoryPort::deleteById);
        stationIds.forEach(this::syncStationInventory);
    }

    @Override
    @Transactional
    public void hardDeleteImportBatchTicketsForReduction(
            Long importBatchId,
            List<Long> ticketIds,
            int requiredSerialCount
    ) {
        if (ticketIds == null || ticketIds.isEmpty()) {
            throw new DomainException(
                    ErrorCode.IMPORT_BATCH_DECLARE_QUANTITY_REDUCTION_TICKETS_INVALID,
                    null,
                    requiredSerialCount
            );
        }

        Set<Long> uniqueTicketIds = new HashSet<>(ticketIds);
        if (uniqueTicketIds.size() != ticketIds.size()) {
            throw new DomainException(
                    ErrorCode.IMPORT_BATCH_DECLARE_QUANTITY_REDUCTION_TICKETS_INVALID,
                    null,
                    requiredSerialCount
            );
        }

        ImportBatchModel batch = getImportBatchOrThrow(importBatchId);
        if (!batch.isEditable()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVALID_STATUS);
        }

        Map<Long, ImportBatchLineModel> linesById = importBatchLineRepositoryPort.findByImportBatchId(importBatchId)
                .stream()
                .collect(Collectors.toMap(ImportBatchLineModel::getId, line -> line));

        int removedSerialCount = 0;
        Set<Long> affectedLineIds = new HashSet<>();
        Set<Long> affectedStationIds = new HashSet<>();

        for (Long ticketId : ticketIds) {
            LotteryTicketModel ticket = getTicketOrThrow(ticketId);
            Long lineId = resolveImportBatchLineIdForTicketOrThrow(ticketId, linesById.keySet());
            ImportBatchLineModel line = linesById.get(lineId);

            if (line == null || !Objects.equals(line.getImportBatchId(), importBatchId)) {
                throw new DomainException(
                        ErrorCode.IMPORT_BATCH_DECLARE_QUANTITY_REDUCTION_TICKETS_INVALID,
                        null,
                        requiredSerialCount
                );
            }

            if (line.getStatus() != ImportBatchLineStatus.OPEN
                    && line.getStatus() != ImportBatchLineStatus.IMPORTING) {
                throw new DomainException(ErrorCode.IMPORT_BATCH_TICKET_DELETE_LINE_IMPORTED);
            }

            if (ticket.getStatus() != LotteryTicketStatus.IMPORTING) {
                throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_HAS_LOCKED_TICKETS);
            }

            long lockedSerials = lotteryTicketSerialService.countByStatuses(ticketId, NON_EDITABLE_SERIAL_STATUSES);
            if (lockedSerials > 0) {
                throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_HAS_LOCKED_TICKETS);
            }

            int serialCount = (int) lotteryTicketSerialService.countByTicketIdAndImportBatchLineId(ticketId, lineId);
            if (serialCount <= 0) {
                throw new DomainException(
                        ErrorCode.IMPORT_BATCH_DECLARE_QUANTITY_REDUCTION_TICKETS_INVALID,
                        null,
                        requiredSerialCount
                );
            }

            removedSerialCount += serialCount;
            affectedLineIds.add(lineId);
            affectedStationIds.add(ticket.getStationId());

            lotteryTicketSerialService.hardDeleteByTicketIdAndImportBatchLineId(ticketId, lineId);
            lotteryTicketRepositoryPort.deleteById(ticketId);
        }

        if (removedSerialCount != requiredSerialCount) {
            throw new DomainException(
                    ErrorCode.IMPORT_BATCH_DECLARE_QUANTITY_REDUCTION_TICKETS_INVALID,
                    null,
                    requiredSerialCount
            );
        }

        LocalDateTime now = LocalDateTime.now();
        for (Long lineId : affectedLineIds) {
            ImportBatchLineModel line = importBatchLineRepositoryPort.findById(lineId)
                    .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));
            int importedCount = (int) lotteryTicketSerialService.countByImportBatchLineId(lineId);
            line.updateImportProgress(importedCount, now);
            importBatchLineRepositoryPort.save(line);
        }

        ImportBatchModel refreshedBatch = getImportBatchOrThrow(importBatchId);
        refreshedBatch.setLines(importBatchLineRepositoryPort.findByImportBatchId(importBatchId));
        refreshedBatch.recalculateAggregates();
        refreshedBatch.refreshImportStatus(now);
        importBatchRepositoryPort.save(refreshedBatch);

        affectedStationIds.forEach(this::syncStationInventory);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ImportBatchReductionTicketResponse> listReductionTicketsByImportBatchLine(Long importBatchLineId) {
        List<Long> ticketIds = lotteryTicketSerialService.findDistinctTicketIdsByImportBatchLineId(importBatchLineId);
        if (ticketIds.isEmpty()) {
            return List.of();
        }

        Map<Long, LotteryTicketSerialModel> representativeSerials =
                lotteryTicketSerialService.findRepresentativeSerialsByTicketIds(ticketIds);

        List<ImportBatchReductionTicketResponse> tickets = new ArrayList<>();
        for (Long ticketId : ticketIds) {
            LotteryTicketModel ticket = getTicketOrThrow(ticketId);
            LotteryTicketSerialModel representative = representativeSerials.get(ticketId);
            int serialCount = (int) lotteryTicketSerialService.countByTicketIdAndImportBatchLineId(
                    ticketId,
                    importBatchLineId
            );

            tickets.add(ImportBatchReductionTicketResponse.builder()
                    .id(ticketId)
                    .numbers(ticket.getNumbers())
                    .serialNumber(representative != null ? representative.getSerialNumber() : null)
                    .serialCount(serialCount)
                    .status(ticket.getStatus() != null ? ticket.getStatus().name() : null)
                    .build());
        }

        return tickets;
    }

    @Override
    @Transactional
    public void activateTicketsForImportBatchLine(Long importBatchLineId) {
        activateImportBatchLineTickets(importBatchLineId);
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
    public List<OrderTicketSnapshot> sellOfflineForOrder(List<Long> ticketIds) {
        List<LotteryTicketModel> tickets = getTicketsOrThrow(ticketIds);
        validateRequestedSerialAvailability(tickets, true);

        return tickets.stream()
                .map(this::sellOfflineForValidatedTicket)
                .toList();
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
    public void returnSoldTicketForOrder(Long ticketSerialId) {
        LotteryTicketSerialModel serial = lotteryTicketSerialService.returnSoldToStock(ticketSerialId);
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
        List<LotteryTicketSerialResponse> serialResponses = serials.stream()
                .map(serial -> lotteryTicketApplicationMapper.toSerialResponse(
                        serial,
                        resolveBatchCode(serial)
                ))
                .toList();
        return lotteryTicketApplicationMapper.toResponseDetail(
                model,
                serialResponses,
                stationName,
                serials.isEmpty() ? null : resolveBatchCode(serials.getFirst())
        );
    }

    private LotteryTicketResponse mapToResponse(
            LotteryTicketModel model,
            LotteryTicketSerialModel serial,
            Map<Long, String> stationNameCache
    ) {
        String stationName = resolveStationName(model.getStationId(), stationNameCache);
        return lotteryTicketApplicationMapper.toResponse(
                model,
                serial,
                stationName,
                resolveBatchCode(serial)
        );
    }

    private String resolveBatchCode(LotteryTicketSerialModel serial) {
        return resolveBatchCodeForSerial(serial);
    }

    private String resolveBatchCodeForSerial(LotteryTicketSerialModel serial) {
        if (serial == null || serial.getImportBatchLineId() == null) {
            return null;
        }
        return importBatchLineRepositoryPort.findById(serial.getImportBatchLineId())
                .map(ImportBatchLineModel::getBatchCode)
                .orElse(null);
    }

    private String resolveStationName(Long stationId, Map<Long, String> stationNameCache) {
        return stationNameCache.computeIfAbsent(
                stationId,
                id -> lotteryStationServicePort.findModelById(id)
                        .map(LotteryStationModel::getName)
                        .orElse(null)
        );
    }

    private List<Long> normalizeStationIds(Long stationId, List<Long> stationIds) {
        LinkedHashSet<Long> mergedIds = new LinkedHashSet<>();
        if (stationId != null) {
            mergedIds.add(stationId);
        }
        if (stationIds != null) {
            stationIds.stream()
                    .filter(Objects::nonNull)
                    .forEach(mergedIds::add);
        }
        return new ArrayList<>(mergedIds);
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

    private List<LocalDate> parseDrawDates(String drawDate) {
        if (drawDate == null || drawDate.isBlank()) {
            return List.of();
        }
        LinkedHashSet<LocalDate> drawDates = new LinkedHashSet<>();
        for (String rawValue : drawDate.split(",")) {
            String value = rawValue.trim();
            if (value.isBlank()) {
                continue;
            }
            try {
                drawDates.add(LocalDate.parse(value));
            } catch (DateTimeParseException ignored) {
                log.debug("Skipping invalid drawDate filter value: {}", value);
            }
        }
        return new ArrayList<>(drawDates);
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

    private ImportBatchLineModel getDraftImportBatchLineForOperatorOrThrow(Long importBatchLineId, UUID operatorId) {
        if (importBatchLineId == null) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_IMPORT_BATCH_REQUIRED);
        }

        ImportBatchLineModel line = importBatchLineRepositoryPort.findById(importBatchLineId)
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));

        ImportBatchModel importBatch = getImportBatchOrThrow(line.getImportBatchId());
        importBatchDraftExpiryService.cancelIfOverdue(importBatch);
        importBatch = getImportBatchOrThrow(line.getImportBatchId());
        line = importBatchLineRepositoryPort.findById(importBatchLineId)
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));

        if (line.getStatus() == ImportBatchLineStatus.CANCELLED) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_CANCELLED);
        }
        if (importBatch.getStatus() == ImportBatchStatus.CANCELLED) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_CANCELLED);
        }
        if (!importBatch.isEditable()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVALID_STATUS);
        }

        if (importBatch.getImportedBy() == null || !importBatch.getImportedBy().equals(operatorId)) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_IMPORT_BATCH_MISMATCH);
        }

        return line;
    }

    private ImportBatchModel getImportBatchOrThrow(Long importBatchId) {
        return importBatchRepositoryPort.findById(importBatchId)
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));
    }

    private LotteryTicketModel applyImportBatchProgress(
            LotteryTicketModel ticket,
            ImportBatchLineModel importBatchLine,
            ImportBatchModel importBatch
    ) {
        LocalDateTime now = LocalDateTime.now();
        int importedCount = (int) lotteryTicketSerialService.countByImportBatchLineId(importBatchLine.getId());
        importBatchLine.updateImportProgress(importedCount, now);

        int declareQuantity = importBatchLine.getDeclareQuantity() != null ? importBatchLine.getDeclareQuantity() : 0;

        importBatchLineRepositoryPort.save(importBatchLine);

        ImportBatchModel refreshedBatch = importBatchRepositoryPort.findById(importBatch.getId())
                .orElse(importBatch);
        refreshedBatch.setLines(importBatchLineRepositoryPort.findByImportBatchId(importBatch.getId()));
        refreshedBatch.recalculateAggregates();
        refreshedBatch.refreshImportStatus(now);

        boolean batchJustCompleted = refreshedBatch.getStatus() == ImportBatchStatus.IMPORTED;
        importBatchRepositoryPort.save(refreshedBatch);

        if (batchJustCompleted) {
            refreshedBatch.getActiveLines().forEach(line ->
                    activateImportBatchLineTickets(line.getId())
            );
            ticket = getTicketOrThrow(ticket.getId());
            syncStationInventory(ticket.getStationId());
            return ticket;
        }

        if (importBatch.isEditable() && importedCount < declareQuantity) {
            ticket.setStatus(LotteryTicketStatus.IMPORTING);
            ticket.setActive(false);
            ticket = lotteryTicketRepositoryPort.save(ticket);
            syncStationInventory(ticket.getStationId());
        }

        return ticket;
    }

    private void activateImportBatchLineTickets(Long importBatchLineId) {
        lotteryTicketSerialService.findDistinctTicketIdsByImportBatchLineId(importBatchLineId)
                .forEach(ticketId -> {
                    LotteryTicketModel batchTicket = getTicketOrThrow(ticketId);
                    batchTicket.setActive(true);
                    if (batchTicket.getStatus() == LotteryTicketStatus.IMPORTING) {
                        batchTicket.setStatus(LotteryTicketStatus.IN_STOCK);
                    }
                    lotteryTicketRepositoryPort.save(batchTicket);
                });
    }

    private void validateTicketAgainstImportBatchLine(
            ImportBatchLineModel importBatchLine,
            ImportBatchModel importBatch,
            Long stationId,
            LocalDate drawDate
    ) {
        if (!importBatchLine.getLotteryStationId().equals(stationId)
                || !importBatch.getDrawDate().equals(drawDate)) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_IMPORT_BATCH_MISMATCH);
        }
    }

    private void validateImportQuantity(ImportBatchLineModel importBatchLine, int incomingSerialCount) {
        if (incomingSerialCount <= 0) {
            return;
        }

        int declareQuantity = importBatchLine.getDeclareQuantity() != null ? importBatchLine.getDeclareQuantity() : 0;
        if (declareQuantity <= 0) {
            return;
        }

        int importedCount = (int) lotteryTicketSerialService.countByImportBatchLineId(importBatchLine.getId());
        if (importedCount + incomingSerialCount > declareQuantity) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_QUANTITY_EXCEEDED);
        }
    }

    private void validateBulkTicketSections(List<CreateLotteryTicketNumberSectionRequest> tickets) {
        if (tickets == null || tickets.isEmpty()) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_NUMBERS_REQUIRED);
        }

        Set<String> normalizedNumbers = new HashSet<>();
        Set<String> normalizedSerials = new HashSet<>();

        for (CreateLotteryTicketNumberSectionRequest section : tickets) {
            String normalizedNumber = section.numbers() != null ? section.numbers().trim() : "";
            if (normalizedNumber.isEmpty()) {
                throw new DomainException(ErrorCode.LOTTERY_TICKET_NUMBERS_REQUIRED);
            }
            if (!normalizedNumbers.add(normalizedNumber)) {
                throw new DomainException(ErrorCode.LOTTERY_TICKET_NUMBERS_DUPLICATED_IN_REQUEST);
            }

            int filledSerialCount = 0;
            for (CreateLotteryTicketSerialRequest serial : section.serials()) {
                String normalizedSerial = serial.serialNumber() != null
                        ? serial.serialNumber().trim().toLowerCase(Locale.ROOT)
                        : "";
                if (normalizedSerial.isEmpty()) {
                    continue;
                }
                filledSerialCount += 1;
                if (!normalizedSerials.add(normalizedSerial)) {
                    throw new DomainException(ErrorCode.LOTTERY_TICKET_SERIAL_EXISTED);
                }
            }

            if (filledSerialCount == 0) {
                throw new DomainException(ErrorCode.LOTTERY_TICKET_SECTION_SERIALS_REQUIRED);
            }
        }
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
        return LotteryTicketNumber.from(
                numbers,
                station.getRegion().minLength(),
                station.getRegion().maxLength()
        );
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

    private Long resolveImportBatchLineIdForTicketOrThrow(Long ticketId, Set<Long> allowedLineIds) {
        List<LotteryTicketSerialModel> serials = lotteryTicketSerialService.findAllByTicketId(ticketId);
        Set<Long> lineIds = serials.stream()
                .map(LotteryTicketSerialModel::getImportBatchLineId)
                .filter(Objects::nonNull)
                .filter(allowedLineIds::contains)
                .collect(Collectors.toSet());

        if (lineIds.size() != 1) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_DECLARE_QUANTITY_REDUCTION_TICKETS_INVALID);
        }

        return lineIds.iterator().next();
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

    @Override
    @Transactional(readOnly = true)
    public java.util.List<com.daiphat.coreapi.application.dto.lotteries.TicketAvailabilityKey> findAvailableReplacementsInBulk(
            Collection<Long> stationIds,
            Collection<LocalDate> drawDates,
            Collection<String> numbers) {
        return lotteryTicketRepositoryPort.findAvailableReplacementsInBulk(stationIds, drawDates, numbers);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.List<com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketSerialResponse> getReplacementCandidates(Long stationId, String numbers, LocalDate drawDate) {
        return lotteryTicketSerialService.findAllReplacementCandidates(stationId, numbers, drawDate, com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK)
                .stream()
                .map(lotteryTicketApplicationMapper::toSerialResponse)
                .toList();
    }
}
