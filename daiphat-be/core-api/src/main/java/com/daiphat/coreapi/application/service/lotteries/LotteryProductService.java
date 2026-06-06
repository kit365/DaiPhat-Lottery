package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryProductRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryProductResponse;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryProductApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryProductServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryProductRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.LotteryProductModel;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryProductStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryProductType;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryProductRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LotteryProductService implements LotteryProductServicePort {

    private final LotteryProductRepositoryPort lotteryProductRepositoryPort;
    private final LotteryProductApplicationMapper lotteryProductApplicationMapper;

    @Override
    @Transactional
    public LotteryProductResponse create(CreateLotteryProductRequest request) {
        log.info("Creating new lottery product: {}", request.name());

        if (lotteryProductRepositoryPort.existsByName(request.name())) {
            throw new DomainException(ErrorCode.LOTTERY_PRODUCT_NAME_EXISTED);
        }

        LotteryProductModel model = lotteryProductApplicationMapper.toModel(request);
        // Model tự set status = DRAFT trong @Builder.Default

        LotteryProductModel saved = lotteryProductRepositoryPort.save(model);
        log.info("Lottery product created with id: {}", saved.getId());

        return lotteryProductApplicationMapper.toResponse(saved);
    }

    @Override
    public LotteryProductResponse getById(UUID id) {
        LotteryProductModel model = lotteryProductRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_PRODUCT_NOT_FOUND));
        return lotteryProductApplicationMapper.toResponse(model);
    }

    @Override
    public PageResponse<LotteryProductResponse> getAll(
            int page, int size, String search,
            String status, String type,
            String sortBy, String direction) {

        Sort sort = Sort.by(
                Sort.Direction.fromOptionalString(direction).orElse(Sort.Direction.DESC),
                sortBy != null ? sortBy : "createdAt"
        );
        PageRequest pageable = PageRequest.of(Math.max(0, page - 1), size, sort);

        LotteryProductStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            try {
                statusEnum = LotteryProductStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ignored) {
            }
        }

        Page<LotteryProductResponse> resultPage = lotteryProductRepositoryPort
                .findAll(pageable, search, statusEnum, type)
                .map(lotteryProductApplicationMapper::toResponse);

        return PageResponse.<LotteryProductResponse>builder()
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
    public LotteryProductResponse update(UUID id, UpdateLotteryProductRequest request) {
        log.info("Updating lottery product with id: {}", id);

        LotteryProductModel model = lotteryProductRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_PRODUCT_NOT_FOUND));

        if (!model.getName().equalsIgnoreCase(request.name()) && lotteryProductRepositoryPort.existsByName(request.name())) {
            throw new DomainException(ErrorCode.LOTTERY_PRODUCT_NAME_EXISTED);
        }

        model.setName(request.name());
        model.setProvince(request.province());
        model.setRegion(request.region());

        if (request.type() != null) {
            try {
                model.setType(LotteryProductType.valueOf(request.type().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new DomainException(ErrorCode.INVALID_INPUT, "Loại sản phẩm vé số không hợp lệ.");
            }
        }

        model.setNumberLength(request.numberLength());
        model.setMinNumber(request.minNumber());
        model.setMaxNumber(request.maxNumber());
        model.setDigitCount(request.digitCount());
        model.setPrice(request.price());
        model.setInventoryCount(request.inventoryCount());
        model.setDrawSchedule(request.drawSchedule());
        model.setDrawTime(request.drawTime());
        model.setNextDrawDate(request.nextDrawDate());
        model.setDescription(request.description());
        model.setDisplayOrder(request.displayOrder() != null ? request.displayOrder() : 0);

        if (request.status() != null && !request.status().isBlank()) {
            try {
                model.setStatus(LotteryProductStatus.valueOf(request.status().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new DomainException(ErrorCode.LOTTERY_PRODUCT_INVALID_STATUS);
            }
        }

        LotteryProductModel saved = lotteryProductRepositoryPort.save(model);
        log.info("Lottery product updated with id: {}", saved.getId());

        return lotteryProductApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        log.info("Deleting lottery product with id: {}", id);

        if (!lotteryProductRepositoryPort.findById(id).isPresent()) {
            throw new DomainException(ErrorCode.LOTTERY_PRODUCT_NOT_FOUND);
        }

        lotteryProductRepositoryPort.deleteById(id);
    }
}