package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryTicketApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryProductRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryProductModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.shared.util.SortUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LotteryTicketService implements LotteryTicketServicePort {

    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final LotteryProductRepositoryPort lotteryProductRepositoryPort;
    private final LotteryTicketApplicationMapper lotteryTicketApplicationMapper;

    @Override
    @Transactional
    public LotteryTicketResponse create(CreateLotteryTicketRequest request, UUID importedById) {
        log.info("Importing lottery ticket with serial: {}", request.serialNumber());

        LotteryProductModel product = getProductOrThrow(request.productId());

        validateUniqueTicket(request.productId(), request.serialNumber(), request.numbers(), request.drawDate(), null);

        LotteryTicketModel model = lotteryTicketApplicationMapper.toModel(request);
        validateTicketNumbers(request.numbers(), product);
        validateDrawDate(request.drawDate());
        model.initializeImport(importedById);

        LotteryTicketModel saved = lotteryTicketRepositoryPort.save(model);
        if (saved.countsTowardInventory()) {
            persistInventoryAdjustment(product, 1);
        }

        log.info("Lottery ticket imported with id: {}", saved.getId());
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public LotteryTicketResponse getById(Long id) {
        LotteryTicketModel model = getTicketOrThrow(id);
        return mapToResponse(model);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<LotteryTicketResponse> getAll(
            int page, int size, Long productId, String status, String drawDate,
            String search, String sortBy, String direction) {

        PageRequest pageable = PageRequest.of(
                Math.max(0, page - 1),
                size,
                SortUtils.createSort(sortBy, direction)
        );

        LotteryTicketStatus statusEnum = parseStatus(status);
        LocalDate parsedDrawDate = parseDrawDate(drawDate);

        Page<LotteryTicketResponse> resultPage = lotteryTicketRepositoryPort
                .findAll(pageable, productId, statusEnum, parsedDrawDate, search)
                .map(this::mapToResponse);

        return buildPageResponse(resultPage, page, size);
    }

    @Override
    @Transactional
    public LotteryTicketResponse update(Long id, UpdateLotteryTicketRequest request) {
        log.info("Updating lottery ticket with id: {}", id);

        LotteryTicketModel model = getTicketOrThrow(id);

        String nextSerialNumber = hasText(request.serialNumber()) ? request.serialNumber().trim() : model.getSerialNumber();
        String nextNumbers = hasText(request.numbers()) ? request.numbers().trim() : model.getNumbers();
        LocalDate nextDrawDate = request.drawDate() != null ? request.drawDate() : model.getDrawDate();

        LotteryProductModel product = null;
        if (hasText(request.numbers()) || request.drawDate() != null) {
            product = getProductOrThrow(model.getProductId());
        }

        validateUniqueTicket(model.getProductId(), nextSerialNumber, nextNumbers, nextDrawDate, id);

        if (request.ticketImg() != null) {
            model.setTicketImg(request.ticketImg());
        }
        if (hasText(request.serialNumber())) {
            model.setSerialNumber(nextSerialNumber);
        }
        if (hasText(request.numbers())) {
            validateTicketNumbers(nextNumbers, product);
            model.setNumbers(nextNumbers);
        }
        if (request.drawDate() != null) {
            validateDrawDate(nextDrawDate);
            model.setDrawDate(nextDrawDate);
        }
        if (hasText(request.batchCode())) {
            model.setBatchCode(request.batchCode().trim());
        }

        if (hasText(request.status())) {
            model.setStatus(parseStatusOrThrow(request.status()));
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
            LotteryProductModel product = getProductOrThrow(model.getProductId());
            persistInventoryAdjustment(product, -1);
        }

        model.softDelete();
        lotteryTicketRepositoryPort.save(model);
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
    public LotteryTicketResponse changeStatus(Long id, String status) {
        log.info("Changing status of lottery ticket with id: {} to {}", id, status);

        LotteryTicketModel model = getTicketOrThrow(id);

        if (status == null || status.isBlank()) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_STATUS_REQUIRED);
        }

        boolean wasInInventory = model.countsTowardInventory();

        switch (status.toUpperCase()) {
            case "RESERVED" -> model.reserve();
            case "SOLD_ONLINE" -> model.sellOnline();
            case "SOLD_OFFLINE" -> model.sellOffline();
            case "RETURNED_TO_ISSUER" -> model.returnToIssuer();
            case "DAMAGED" -> model.damage();
            case "EXPIRED" -> model.expire();
            default -> throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }

        boolean isInInventory = model.countsTowardInventory();
        if (wasInInventory != isInInventory) {
            LotteryProductModel product = getProductOrThrow(model.getProductId());
            persistInventoryAdjustment(product, isInInventory ? 1 : -1);
        }

        LotteryTicketModel saved = lotteryTicketRepositoryPort.save(model);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void restore(Long id) {
        log.info("Restoring lottery ticket with id: {}", id);

        LotteryTicketModel model = getTicketIncludingDeletedOrThrow(id);

        if (!model.isDeleted()) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_NOT_DELETED);
        }

        model.setDeletedAt(null);
        model.setStatus(LotteryTicketStatus.IN_STOCK);

        if (model.countsTowardInventory()) {
            LotteryProductModel product = getProductOrThrow(model.getProductId());
            persistInventoryAdjustment(product, 1);
        }

        lotteryTicketRepositoryPort.save(model);
        log.info("Lottery ticket restored with id: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<LotteryTicketResponse> getAllDeleted(int page, int size) {
        log.info("Getting all deleted lottery tickets, page: {}, size: {}", page, size);

        PageRequest pageable = PageRequest.of(
                Math.max(0, page - 1),
                size,
                SortUtils.createSort("deletedAt", "desc")
        );

        Page<LotteryTicketResponse> resultPage = lotteryTicketRepositoryPort
                .findAllDeleted(pageable)
                .map(this::mapToResponse);

        return buildPageResponse(resultPage, page, size);
    }

    private LotteryTicketResponse mapToResponse(LotteryTicketModel model) {
        String productName = lotteryProductRepositoryPort.findById(model.getProductId())
                .map(LotteryProductModel::getName)
                .orElse(null);

        LotteryTicketResponse base = lotteryTicketApplicationMapper.toResponse(model);

        return LotteryTicketResponse.builder()
                .id(base.id())
                .productId(base.productId())
                .productName(productName)
                .ticketImg(base.ticketImg())
                .serialNumber(base.serialNumber())
                .numbers(base.numbers())
                .drawDate(base.drawDate())
                .batchCode(base.batchCode())
                .status(base.status())
                .statusDisplayName(base.statusDisplayName())
                .importedById(base.importedById())
                .importedAt(base.importedAt())
                .verified(base.verified())
                .verifiedById(base.verifiedById())
                .verifiedAt(base.verifiedAt())
                .returnedAt(base.returnedAt())
                .createdAt(base.createdAt())
                .updatedAt(base.updatedAt())
                .createdBy(base.createdBy())
                .lastModifiedBy(base.lastModifiedBy())
                .build();
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

    private LotteryTicketStatus parseStatusOrThrow(String status) {
        try {
            return LotteryTicketStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
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
            return null;
        }
    }

    private void persistInventoryAdjustment(LotteryProductModel product, int delta) {
        if (delta > 0) {
            product.increaseInventory(delta);
        } else if (delta < 0) {
            product.decreaseInventory(Math.abs(delta));
        }
        lotteryProductRepositoryPort.save(product);
    }

    private LotteryProductModel getProductOrThrow(Long id) {
        return lotteryProductRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_PRODUCT_NOT_FOUND));
    }

    private LotteryTicketModel getTicketOrThrow(Long id) {
        return lotteryTicketRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
    }

    private LotteryTicketModel getTicketIncludingDeletedOrThrow(Long id) {
        return lotteryTicketRepositoryPort.findByIdIncludingDeleted(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
    }

    private PageResponse<LotteryTicketResponse> buildPageResponse(
            Page<LotteryTicketResponse> pageResult,
            int page,
            int size
    ) {
        return PageResponse.<LotteryTicketResponse>builder()
                .recordList(pageResult.getContent())
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(pageResult.getTotalElements())
                        .totalPages(pageResult.getTotalPages())
                        .currentPage(page)
                        .limit(size)
                        .build())
                .build();
    }

    private void validateTicketNumbers(String numbers, LotteryProductModel product) {
        if (numbers == null || numbers.isBlank()) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_NUMBERS_REQUIRED);
        }

        String normalizedNumbers = numbers.trim();
        if (!normalizedNumbers.matches("\\d+")) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_NUMBERS_INVALID);
        }

        Integer requiredLength = product.getNumberLength();
        if (requiredLength != null && normalizedNumbers.length() != requiredLength) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_NUMBERS_LENGTH_INVALID);
        }
    }

    private void validateDrawDate(LocalDate drawDate) {
        if (drawDate == null) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_DRAW_DATE_REQUIRED);
        }

        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);
        if (!drawDate.equals(today) && !drawDate.equals(tomorrow)) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_DRAW_DATE_INVALID);
        }
    }

    private void validateUniqueTicket(Long productId, String serialNumber, String numbers, LocalDate drawDate, Long currentId) {
        boolean existed = currentId == null
                ? lotteryTicketRepositoryPort.existsByUniqueFields(productId, serialNumber, numbers, drawDate)
                : lotteryTicketRepositoryPort.existsByUniqueFieldsAndIdNot(productId, serialNumber, numbers, drawDate, currentId);

        if (existed) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_SERIAL_EXISTED);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
