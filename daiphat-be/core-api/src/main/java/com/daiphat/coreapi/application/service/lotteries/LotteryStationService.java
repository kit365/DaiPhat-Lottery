package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryStationApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
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
public class LotteryStationService implements LotteryStationServicePort {

    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;
    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final LotteryStationApplicationMapper lotteryStationApplicationMapper;

    private static final List<LotteryTicketStatus> INVENTORY_STATUSES =
            List.of(LotteryTicketStatus.IN_STOCK, LotteryTicketStatus.RESERVED);

    @Override
    @Transactional
    public LotteryStationResponse create(CreateLotteryStationRequest request) {
        log.info("Creating new lottery product: {}", request.name());

        if (lotteryStationRepositoryPort.existsByName(request.name())) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_NAME_EXISTED);
        }

        LotteryStationModel model = lotteryStationApplicationMapper.toModel(request);

        LotteryStationModel saved = lotteryStationRepositoryPort.save(model);
        log.info("Lottery product created with id: {}", saved.getId());

        return lotteryStationApplicationMapper.toResponse(saved);
    }

    @Override
    public LotteryStationResponse getById(Long id) {
        LotteryStationModel model = getProductOrThrow(id);
        recalculateInventory(model);
        return lotteryStationApplicationMapper.toResponse(model);
    }

    @Override
    public PageResponse<LotteryStationResponse> getAll(
            int page, int size, String search,
            String status, String type,
            String sortBy, String direction) {

        PageRequest pageable = PageRequest.of(
                Math.max(0, page - 1),
                size,
                SortUtils.createSort(sortBy, direction)
        );

        LotteryStationStatus statusEnum = parseStatus(status);

        Page<LotteryStationModel> resultPage = lotteryStationRepositoryPort
                .findAll(pageable, search, statusEnum, type);

        Page<LotteryStationResponse> responsePage = resultPage.map(model -> {
            recalculateInventory(model);
            return lotteryStationApplicationMapper.toResponse(model);
        });

        return buildPageResponse(responsePage, page, size);
    }

    @Override
    @Transactional
    public LotteryStationResponse update(Long id, UpdateLotteryStationRequest request) {
        log.info("Updating lottery product with id: {}", id);

        LotteryStationModel model = getProductOrThrow(id);

        if (hasText(request.name())
                && !model.getName().equalsIgnoreCase(request.name())
                && lotteryStationRepositoryPort.existsByName(request.name())) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_NAME_EXISTED);
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

        LotteryStationModel saved = lotteryStationRepositoryPort.save(model);
        recalculateInventory(saved);
        log.info("Lottery product updated with id: {}", saved.getId());

        return lotteryStationApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting lottery product with id: {}", id);

        getProductOrThrow(id);
        lotteryStationRepositoryPort.deleteById(id);
    }

    private LotteryStationModel getProductOrThrow(Long id) {
        return lotteryStationRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_STATION_NOT_FOUND));
    }

    private LotteryStationType parseType(String type) {
        try {
            return LotteryStationType.valueOf(type.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_INVALID_TYPE);
        }
    }

    private LotteryStationStatus parseStatus(String status) {
        if (!hasText(status)) {
            return null;
        }
        try {
            return LotteryStationStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private LotteryStationStatus parseStatusOrThrow(String status) {
        try {
            return LotteryStationStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_INVALID_STATUS);
        }
    }

    private PageResponse<LotteryStationResponse> buildPageResponse(
            Page<LotteryStationResponse> pageResult,
            int page,
            int size
    ) {
        return PageResponse.<LotteryStationResponse>builder()
                .recordList(pageResult.getContent())
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(pageResult.getTotalElements())
                        .totalPages(pageResult.getTotalPages())
                        .currentPage(page)
                        .limit(size)
                        .build())
                .build();
    }

    private void recalculateInventory(LotteryStationModel model) {
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
