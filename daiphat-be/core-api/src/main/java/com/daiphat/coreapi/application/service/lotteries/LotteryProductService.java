package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryProductRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryProductRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryProductResponse;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryProductApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryProductServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryProductRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryProductStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryProductType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryProductModel;
import com.daiphat.coreapi.shared.util.SortUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
@Service
@RequiredArgsConstructor
@Slf4j
public class LotteryProductService implements LotteryProductServicePort {

    private final LotteryProductRepositoryPort lotteryProductRepositoryPort;
    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final LotteryProductApplicationMapper lotteryProductApplicationMapper;

    private static final List<LotteryTicketStatus> INVENTORY_STATUSES =
            List.of(LotteryTicketStatus.IN_STOCK, LotteryTicketStatus.RESERVED);

    @Override
    @Transactional
    public LotteryProductResponse create(CreateLotteryProductRequest request) {
        log.info("Creating new lottery product: {}", request.name());

        if (lotteryProductRepositoryPort.existsByName(request.name())) {
            throw new DomainException(ErrorCode.LOTTERY_PRODUCT_NAME_EXISTED);
        }

        LotteryProductModel model = lotteryProductApplicationMapper.toModel(request);

        LotteryProductModel saved = lotteryProductRepositoryPort.save(model);
        log.info("Lottery product created with id: {}", saved.getId());

        return lotteryProductApplicationMapper.toResponse(saved);
    }

    @Override
    public LotteryProductResponse getById(Long id) {
        LotteryProductModel model = getProductOrThrow(id);
        recalculateInventory(model);
        return lotteryProductApplicationMapper.toResponse(model);
    }

    @Override
    public PageResponse<LotteryProductResponse> getAll(
            int page, int size, String search,
            String status, String type,
            String sortBy, String direction) {

        PageRequest pageable = PageRequest.of(
                Math.max(0, page - 1),
                size,
                SortUtils.createSort(sortBy, direction)
        );

        LotteryProductStatus statusEnum = parseStatus(status);

        Page<LotteryProductModel> resultPage = lotteryProductRepositoryPort
                .findAll(pageable, search, statusEnum, type);

        Page<LotteryProductResponse> responsePage = resultPage.map(model -> {
            recalculateInventory(model);
            return lotteryProductApplicationMapper.toResponse(model);
        });

        return buildPageResponse(responsePage, page, size);
    }

    @Override
    @Transactional
    public LotteryProductResponse update(Long id, UpdateLotteryProductRequest request) {
        log.info("Updating lottery product with id: {}", id);

        LotteryProductModel model = getProductOrThrow(id);

        if (hasText(request.name())
                && !model.getName().equalsIgnoreCase(request.name())
                && lotteryProductRepositoryPort.existsByName(request.name())) {
            throw new DomainException(ErrorCode.LOTTERY_PRODUCT_NAME_EXISTED);
        }

        if (hasText(request.name())) {
            model.setName(request.name().trim());
        }
        if (request.province() != null) {
            model.setProvince(request.province());
        }
        if (request.region() != null) {
            model.setRegion(request.region());
        }

        if (hasText(request.type())) {
            model.setType(parseType(request.type()));
        }

        if (request.numberLength() != null) {
            model.setNumberLength(request.numberLength());
        }
        if (request.minNumber() != null) {
            model.setMinNumber(request.minNumber());
        }
        if (request.maxNumber() != null) {
            model.setMaxNumber(request.maxNumber());
        }
        if (request.price() != null) {
            model.setPrice(request.price());
        }
        if (request.drawSchedule() != null) {
            model.setDrawSchedule(request.drawSchedule());
        }
        if (request.drawTime() != null) {
            model.setDrawTime(request.drawTime());
        }
        if (request.nextDrawDate() != null) {
            model.setNextDrawDate(request.nextDrawDate());
        }
        if (request.description() != null) {
            model.setDescription(request.description());
        }
        if (request.displayOrder() != null) {
            model.setDisplayOrder(request.displayOrder());
        }

        if (hasText(request.status())) {
            model.setStatus(parseStatusOrThrow(request.status()));
        }

        LotteryProductModel saved = lotteryProductRepositoryPort.save(model);
        recalculateInventory(saved);
        log.info("Lottery product updated with id: {}", saved.getId());

        return lotteryProductApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting lottery product with id: {}", id);

        getProductOrThrow(id);
        lotteryProductRepositoryPort.deleteById(id);
    }

    private LotteryProductModel getProductOrThrow(Long id) {
        return lotteryProductRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_PRODUCT_NOT_FOUND));
    }

    private LotteryProductType parseType(String type) {
        try {
            return LotteryProductType.valueOf(type.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException(ErrorCode.LOTTERY_PRODUCT_INVALID_TYPE);
        }
    }

    private LotteryProductStatus parseStatus(String status) {
        if (!hasText(status)) {
            return null;
        }
        try {
            return LotteryProductStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private LotteryProductStatus parseStatusOrThrow(String status) {
        try {
            return LotteryProductStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException(ErrorCode.LOTTERY_PRODUCT_INVALID_STATUS);
        }
    }

    private PageResponse<LotteryProductResponse> buildPageResponse(
            Page<LotteryProductResponse> pageResult,
            int page,
            int size
    ) {
        return PageResponse.<LotteryProductResponse>builder()
                .recordList(pageResult.getContent())
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(pageResult.getTotalElements())
                        .totalPages(pageResult.getTotalPages())
                        .currentPage(page)
                        .limit(size)
                        .build())
                .build();
    }

    private void recalculateInventory(LotteryProductModel model) {
        if (model.getId() == null) {
            return;
        }
        long ticketCount = lotteryTicketRepositoryPort.countByProductIdAndStatuses(
                model.getId(), INVENTORY_STATUSES);
        model.setInventoryCount((int) ticketCount);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
