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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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

        LotteryProductModel product = lotteryProductRepositoryPort.findById(request.productId())
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_PRODUCT_NOT_FOUND));

        validateUniqueTicket(request.productId(), request.serialNumber(), request.numbers(), request.drawDate(), null);

        LotteryTicketModel model = lotteryTicketApplicationMapper.toModel(request);
        validateTicketNumbers(request.numbers(), product);
        validateDrawDate(request.drawDate());
        model.initializeImport(importedById);

        LotteryTicketModel saved = lotteryTicketRepositoryPort.save(model);
        if (saved.countsTowardInventory()) {
            adjustProductInventory(product, 1);
        }

        log.info("Lottery ticket imported with id: {}", saved.getId());
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public LotteryTicketResponse getById(UUID id) {
        LotteryTicketModel model = lotteryTicketRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
        return mapToResponse(model);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<LotteryTicketResponse> getAll(
            int page, int size, UUID productId, String status, String drawDate,
            String search, String sortBy, String direction) {

        Sort sort = Sort.by(
                Sort.Direction.fromOptionalString(direction).orElse(Sort.Direction.DESC),
                sortBy != null ? sortBy : "createdAt"
        );
        PageRequest pageable = PageRequest.of(Math.max(0, page - 1), size, sort);

        LotteryTicketStatus statusEnum = parseStatus(status);
        LocalDate parsedDrawDate = parseDrawDate(drawDate);

        Page<LotteryTicketResponse> resultPage = lotteryTicketRepositoryPort
                .findAll(pageable, productId, statusEnum, parsedDrawDate, search)
                .map(this::mapToResponse);

        return PageResponse.<LotteryTicketResponse>builder()
                .recordList(resultPage.getContent())
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(resultPage.getTotalElements())
                        .totalPages(resultPage.getTotalPages())
                        .currentPage(page)
                        .limit(size)
                        .build())
                .build();
    }

    @Override
    @Transactional
    public LotteryTicketResponse update(UUID id, UpdateLotteryTicketRequest request) {
        log.info("Updating lottery ticket with id: {}", id);

        LotteryTicketModel model = lotteryTicketRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));

        String nextSerialNumber = hasText(request.serialNumber()) ? request.serialNumber().trim() : model.getSerialNumber();
        String nextNumbers = hasText(request.numbers()) ? request.numbers().trim() : model.getNumbers();
        LocalDate nextDrawDate = request.drawDate() != null ? request.drawDate() : model.getDrawDate();

        LotteryProductModel product = null;
        if (hasText(request.numbers()) || request.drawDate() != null) {
            product = lotteryProductRepositoryPort.findById(model.getProductId())
                    .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_PRODUCT_NOT_FOUND));
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
            try {
                model.setStatus(LotteryTicketStatus.valueOf(request.status().trim().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
            }
        }

        LotteryTicketModel saved = lotteryTicketRepositoryPort.save(model);
        log.info("Lottery ticket updated with id: {}", saved.getId());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        log.info("Deleting lottery ticket with id: {}", id);

        LotteryTicketModel model = lotteryTicketRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));

        if (model.countsTowardInventory()) {
            LotteryProductModel product = lotteryProductRepositoryPort.findById(model.getProductId())
                    .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_PRODUCT_NOT_FOUND));
            adjustProductInventory(product, -1);
        }

        lotteryTicketRepositoryPort.deleteById(id);
    }

    @Override
    @Transactional
    public LotteryTicketResponse verify(UUID id, UUID verifierId) {
        log.info("Verifying lottery ticket with id: {} by user: {}", id, verifierId);

        LotteryTicketModel model = lotteryTicketRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));

        model.verify(verifierId);

        LotteryTicketModel saved = lotteryTicketRepositoryPort.save(model);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public LotteryTicketResponse changeStatus(UUID id, String status) {
        log.info("Changing status of lottery ticket with id: {} to {}", id, status);

        LotteryTicketModel model = lotteryTicketRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));

        if (status == null || status.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Trạng thái không được để trống.");
        }

        boolean wasInInventory = model.countsTowardInventory();

        switch (status.toUpperCase()) {
            case "RESERVED" -> model.reserve();
            case "SOLD_ONLINE" -> model.sellOnline();
            case "SOLD_OFFLINE" -> model.sellOffline();
            case "RETURNED_TO_ISSUER" -> model.returnToIssuer();
            case "DAMAGED" -> model.damage();
            case "EXPIRED" -> model.expire();
            default -> throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                    "Trạng thái chuyển đổi không hợp lệ: " + status);
        }

        boolean isInInventory = model.countsTowardInventory();
        if (wasInInventory != isInInventory) {
            LotteryProductModel product = lotteryProductRepositoryPort.findById(model.getProductId())
                    .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_PRODUCT_NOT_FOUND));
            adjustProductInventory(product, isInInventory ? 1 : -1);
        }

        LotteryTicketModel saved = lotteryTicketRepositoryPort.save(model);
        return mapToResponse(saved);
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

    private void adjustProductInventory(LotteryProductModel product, int delta) {
        if (delta > 0) {
            product.increaseInventory(delta);
        } else if (delta < 0) {
            product.decreaseInventory(Math.abs(delta));
        }
        lotteryProductRepositoryPort.save(product);
    }

    private void validateTicketNumbers(String numbers, LotteryProductModel product) {
        if (numbers == null || numbers.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Dãy số vé không được để trống.");
        }

        String normalizedNumbers = numbers.trim();
        if (!normalizedNumbers.matches("\\d+")) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Dãy số vé chỉ được chứa chữ số.");
        }

        Integer requiredLength = product.getNumberLength();
        if (requiredLength != null && normalizedNumbers.length() != requiredLength) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Dãy số vé phải gồm đúng " + requiredLength + " chữ số."
            );
        }
    }

    private void validateDrawDate(LocalDate drawDate) {
        if (drawDate == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Ngày quay không được để trống.");
        }

        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);
        if (!drawDate.equals(today) && !drawDate.equals(tomorrow)) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Ngày quay chỉ được phép là hôm nay hoặc ngày mai."
            );
        }
    }

    private void validateUniqueTicket(UUID productId, String serialNumber, String numbers, LocalDate drawDate, UUID currentId) {
        boolean existed = currentId == null
                ? lotteryTicketRepositoryPort.existsByUniqueFields(productId, serialNumber, numbers, drawDate)
                : lotteryTicketRepositoryPort.existsByUniqueFieldsAndIdNot(productId, serialNumber, numbers, drawDate, currentId);

        if (existed) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_SERIAL_EXISTED,
                    "Vé số với productId, serialNumber, numbers và drawDate này đã tồn tại trong hệ thống."
            );
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
