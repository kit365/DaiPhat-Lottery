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
import java.util.List;
import java.util.Optional;
@Service
@RequiredArgsConstructor
@Slf4j
public class LotteryStationService implements LotteryStationServicePort {

    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;
    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final LotteryStationApplicationMapper lotteryStationApplicationMapper;
    private final StoragePort storagePort;

    private static final List<LotteryTicketStatus> INVENTORY_STATUSES =
            List.of(LotteryTicketStatus.IN_STOCK);

    @Override
    @Transactional
    public LotteryStationResponse create(CreateLotteryStationRequest request) {
        log.info("Creating new lottery product: {}", request.name());

        if (lotteryStationRepositoryPort.existsByName(request.name())) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_NAME_EXISTED);
        }

        LotteryStationModel model = lotteryStationApplicationMapper.toModel(request);
        if (model.getStatus() == null) {
            model.setStatus(LotteryStationStatus.ACTIVE);
        }

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
    public LotteryStationModel getModelById(Long id) {
        LotteryStationModel model = getProductOrThrow(id);
        recalculateInventory(model);
        return model;
    }

    @Override
    public Optional<LotteryStationModel> findModelById(Long id) {
        return lotteryStationRepositoryPort.findById(id)
                .map(model -> {
                    recalculateInventory(model);
                    return model;
                });
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
    public List<LotteryStationResponse> getByDrawDate(LocalDate drawDate) {
        return lotteryStationRepositoryPort.findByNextDrawDate(drawDate).stream()
                .peek(this::recalculateInventory)
                .map(lotteryStationApplicationMapper::toResponse)
                .toList();
    }

    @Override
    public List<LotteryStationResponse> getDrawingToday() {
        return getByDrawDate(LocalDate.now());
    }

    @Override
    public List<LotteryStationResponse> getDrawingTomorrow() {
        return getByDrawDate(LocalDate.now().plusDays(1));
    }

    @Override
    @Transactional
    public LotteryStationResponse update(Long id, UpdateLotteryStationRequest request) {
        log.info("Updating lottery product with id: {}", id);

        LotteryStationModel model = getProductOrThrow(id);

        if (hasText(request.name())) {
            if (!model.getName().equalsIgnoreCase(request.name())
                    && lotteryStationRepositoryPort.existsByName(request.name())) {
                throw new DomainException(ErrorCode.LOTTERY_STATION_NAME_EXISTED);
            }
            model.setName(request.name().trim());
        }

        lotteryStationApplicationMapper.updateModel(model, request);

        LotteryStationModel saved = lotteryStationRepositoryPort.save(model);
        recalculateInventory(saved);
        log.info("Lottery product updated with id: {}", saved.getId());

        return lotteryStationApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting lottery station with id: {}", id);
        getProductOrThrow(id);
        lotteryStationRepositoryPort.deleteById(id);
        log.info("Successfully deleted lottery station: {}", id);
    }

    @Override
    @Transactional
    public LotteryStationResponse uploadImage(Long id, UploadRequest request) {
        LotteryStationModel model = getProductOrThrow(id);
        StorageUtils.validateImageUpload(request);

        // Delete old image if it exists
        // Wait, LotteryStation doesn't store ImagePublicId in DB, it only stores image url.
        // Assuming we just overwrite or upload a new one.
        StorageResult result = storagePort.upload(new UploadRequest(
                request.data(),
                request.fileName(),
                request.contentType(),
                StorageFolderConstants.STATION_IMAGE_FOLDER
        ));

        model.setImage(result.url());
        // Option to save thumbnail url if needed, for now just image
        LotteryStationModel saved = lotteryStationRepositoryPort.save(model);
        return lotteryStationApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void recalculateInventory(Long id) {
        LotteryStationModel model = getProductOrThrow(id);
        recalculateInventory(model);
        lotteryStationRepositoryPort.save(model);
    }

    private LotteryStationModel getProductOrThrow(Long id) {
        return lotteryStationRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_STATION_NOT_FOUND));
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
        long ticketCount = lotteryTicketRepositoryPort.sumQuantityByProductIdAndStatuses(
                model.getId(), INVENTORY_STATUSES);
        model.setInventoryCount((int) ticketCount);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
