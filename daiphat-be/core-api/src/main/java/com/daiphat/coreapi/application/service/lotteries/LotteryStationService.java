package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.application.event.LotteryStationDrawReminderEvent;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryStationApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.shared.util.StorageUtils;
import com.daiphat.coreapi.shared.util.StorageFolderConstants;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import com.daiphat.coreapi.shared.util.SortUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class LotteryStationService implements LotteryStationServicePort {

    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;
    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final StationPrizeStructureSeeder stationPrizeStructureSeeder;
    private final LotteryStationApplicationMapper lotteryStationApplicationMapper;
    private final StoragePort storagePort;
    private final ApplicationEventPublisher eventPublisher;

    private static final List<LotteryTicketStatus> INVENTORY_STATUSES =
            List.of(LotteryTicketStatus.IN_STOCK);

    @Value("${daiphat.lottery.draw-reminder-minutes:30}")
    private long drawReminderMinutes;

    @Override
    @Transactional
    public LotteryStationResponse create(CreateLotteryStationRequest request) {
        log.info("Creating new lottery product: {}", request.name());

        if (lotteryStationRepositoryPort.existsByName(request.name())) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_NAME_EXISTED);
        }

        LotteryStationModel model = lotteryStationApplicationMapper.toModel(request);
        stationPrizeStructureSeeder.requireRegionHasPrizeStructures(model.getRegion());
        if (model.getStatus() == null) {
            model.setStatus(LotteryStationStatus.ACTIVE);
        }
        syncNextDrawDate(model);

        LotteryStationModel saved = lotteryStationRepositoryPort.save(model);
        log.info("Lottery product created with id: {}", saved.getId());

        List<PrizeStructureModel> defaultPrizeStructures = stationPrizeStructureSeeder.seedFromRegion(saved);
        log.info("Seeded {} default prize structures for lottery product: {}",
                defaultPrizeStructures.size(), saved.getId());

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
        String previousRegion = model.getRegion();
        boolean regionChanged = false;

        if (hasText(request.name())) {
            if (!model.getName().equalsIgnoreCase(request.name())
                    && lotteryStationRepositoryPort.existsByName(request.name())) {
                throw new DomainException(ErrorCode.LOTTERY_STATION_NAME_EXISTED);
            }
            model.setName(request.name().trim());
        }

        if (request.region() != null) {
            String newRegion = request.region().trim();
            if (hasText(newRegion) && !newRegion.equalsIgnoreCase(previousRegion != null ? previousRegion : "")) {
                regionChanged = true;
            }
        }

        lotteryStationApplicationMapper.updateModel(model, request);
        syncNextDrawDate(model);

        if (hasText(request.status()) && parseStatus(request.status()) == LotteryStationStatus.INACTIVE) {
            model.deactivate();
        }

        if (regionChanged) {
            stationPrizeStructureSeeder.requireRegionHasPrizeStructures(model.getRegion());
        }

        LotteryStationModel saved = lotteryStationRepositoryPort.save(model);

        if (regionChanged) {
            List<PrizeStructureModel> reseeded = stationPrizeStructureSeeder.reseedFromRegion(saved);
            log.info("Re-seeded {} prize structures after region change for station: {}",
                    reseeded.size(), saved.getId());
        }

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

        StorageResult result = storagePort.upload(new UploadRequest(
                request.data(),
                request.fileName(),
                request.contentType(),
                StorageFolderConstants.STATION_IMAGE_FOLDER
        ));

        model.setImage(result.url());
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

    @Override
    @Transactional
    public int recalculateNextDrawDates() {
        int updatedCount = 0;
        for (LotteryStationModel station : lotteryStationRepositoryPort.findAll()) {
            if (station.getId() == null) {
                continue;
            }
            try {
                updatedCount += lotteryStationRepositoryPort.updateNextDrawDate(
                        station.getId(),
                        resolveNextDrawDate(station)
                );
            } catch (DomainException ex) {
                log.warn("Skipping nextDrawDate recalculation for station {}: {}", station.getId(), ex.getMessage());
            }
        }
        return updatedCount;
    }

    @Override
    @Transactional
    public int sendUpcomingDrawReminderNotifications() {
        LocalDate today = LocalDate.now();
        LocalTime currentMinute = LocalTime.now().withSecond(0).withNano(0);
        Map<LocalTime, List<LotteryStationModel>> stationsByReminderSlot = new LinkedHashMap<>();

        for (LotteryStationModel station : lotteryStationRepositoryPort.findByNextDrawDate(today)) {
            if (station.getId() == null
                    || station.getStatus() != LotteryStationStatus.ACTIVE
                    || station.getDrawTime() == null) {
                continue;
            }

            LocalTime reminderTime = station.getDrawTime()
                    .minusMinutes(drawReminderMinutes)
                    .withSecond(0)
                    .withNano(0);
            if (!currentMinute.equals(reminderTime)) {
                continue;
            }

            stationsByReminderSlot.computeIfAbsent(station.getDrawTime(), ignored -> new ArrayList<>()).add(station);
        }

        stationsByReminderSlot.forEach((drawTime, stations) -> eventPublisher.publishEvent(
                LotteryStationDrawReminderEvent.builder()
                        .stationIds(stations.stream().map(LotteryStationModel::getId).toList())
                        .stationNames(stations.stream().map(LotteryStationModel::getName).toList())
                        .drawTime(drawTime)
                        .remainingMinutes(drawReminderMinutes)
                        .build()
        ));

        return stationsByReminderSlot.size();
    }

    private void syncNextDrawDate(LotteryStationModel station) {
        station.setNextDrawDate(resolveNextDrawDate(station));
    }

    private LocalDate resolveNextDrawDate(LotteryStationModel station) {
        return DrawScheduleUtils.resolveNextDrawDate(station.getDrawDays(), station.getDrawTime());
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
