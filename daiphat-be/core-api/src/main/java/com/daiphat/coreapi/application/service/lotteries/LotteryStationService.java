package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SyncLotteryStationsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationSyncItemResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationSyncResponse;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.lotteries.LotteryStationSourcePreviewItem;
import com.daiphat.coreapi.application.dto.lotteries.LotteryStationSourcePreviewResult;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.application.event.LotteryStationDrawReminderEvent;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryStationApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryRegionRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationSourceSyncPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.SyncAction;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
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

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class LotteryStationService implements LotteryStationServicePort {

    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;
    private final LotteryRegionRepositoryPort lotteryRegionRepositoryPort;
    private final LotteryStationSourceSyncPort lotteryStationSourceSyncPort;
    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final PrizeStructureRepositoryPort prizeStructureRepositoryPort;
    private final LotteryStationApplicationMapper lotteryStationApplicationMapper;
    private final StoragePort storagePort;
    private final ApplicationEventPublisher eventPublisher;

    private static final List<LotteryTicketStatus> INVENTORY_STATUSES =
            List.of(LotteryTicketStatus.IN_STOCK);
    private static final List<LotteryTicketStatus> REALIGNABLE_TICKET_STATUSES =
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
        model.setRegion(resolveRegion(request.region()));
        requireRegionHasPrizeStructures(model.getRegion());
        if (model.getStatus() == null) {
            model.setStatus(LotteryStationStatus.ACTIVE);
        }
        syncNextDrawDate(model);

        LotteryStationModel saved = lotteryStationRepositoryPort.save(model);
        increaseRegionStationCount(saved.getRegion());
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
    public List<LotteryStationModel> getModelsByDrawDate(LocalDate drawDate) {
        return findStationsMatchingDrawDate(drawDate).stream()
                .peek(this::recalculateInventory)
                .toList();
    }

    @Override
    public List<LotteryStationModel> getScheduleModelsByDrawDate(LocalDate drawDate) {
        return findStationsMatchingDrawDate(drawDate);
    }

    @Override
    public PageResponse<LotteryStationResponse> getAll(
            int page, int size, String search,
            String status, String type, String region, List<String> drawDay,
            String sortBy, String direction) {

        LotteryStationStatus statusEnum = parseStatus(status);

        if (sortBy == null || sortBy.isBlank()) {
            return getAllWithDefaultSorting(page, size, search, statusEnum, type, region, drawDay);
        } else {
            PageRequest pageable = PageRequest.of(
                    Math.max(0, page - 1),
                    size,
                    SortUtils.createSort(sortBy, direction)
            );

            Page<LotteryStationModel> resultPage = lotteryStationRepositoryPort
                    .findAll(pageable, search, statusEnum, type, region, drawDay);

            Page<LotteryStationResponse> responsePage = resultPage.map(model -> {
                recalculateInventory(model);
                return lotteryStationApplicationMapper.toResponse(model);
            });

            return PageResponse.from(responsePage, page, size);
        }
    }

    private PageResponse<LotteryStationResponse> getAllWithDefaultSorting(
            int page,
            int size,
            String search,
            LotteryStationStatus status,
            String type,
            String region,
            List<String> drawDay
    ) {
        PageRequest unpaged = PageRequest.of(0, 1000);
        Page<LotteryStationModel> allPage = lotteryStationRepositoryPort
                .findAll(unpaged, search, status, type, region, drawDay);

        List<LotteryStationModel> allModels = sortStationsByDrawDayThenName(allPage.getContent());
        int total = allModels.size();
        int start = Math.max(0, (page - 1) * size);
        int end = Math.min(total, start + size);
        List<LotteryStationModel> pagedModels = start <= total ? allModels.subList(start, end) : List.of();

        List<LotteryStationResponse> responseList = pagedModels.stream().map(model -> {
            recalculateInventory(model);
            return lotteryStationApplicationMapper.toResponse(model);
        }).toList();

        return PageResponse.from(responseList, total, page, size);
    }

    private List<LotteryStationModel> sortStationsByDrawDayThenName(List<LotteryStationModel> stations) {
        List<LotteryStationModel> sortedModels = new ArrayList<>(stations);
        sortedModels.sort((a, b) -> {
            int minA = getMinDayValue(a.getDrawDays());
            int minB = getMinDayValue(b.getDrawDays());
            if (minA != minB) {
                return Integer.compare(minA, minB);
            }
            if (a.getName() != null && b.getName() != null) {
                return a.getName().compareToIgnoreCase(b.getName());
            }
            return 0;
        });
        return sortedModels;
    }

    private int getMinDayValue(List<DayOfWeek> days) {
        if (days == null || days.isEmpty()) return 99;
        return days.stream().mapToInt(DayOfWeek::getValue).min().orElse(99);
    }

    @Override
    public List<LotteryStationResponse> getByDrawDate(LocalDate drawDate) {
        return findStationsMatchingDrawDate(drawDate).stream()
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
        LotteryRegionModel previousRegion = model.getRegion();
        LocalDate previousNextDrawDate = model.getNextDrawDate();
        boolean regionChanged = false;

        if (hasText(request.name())) {
            if (!model.getName().equalsIgnoreCase(request.name())
                    && lotteryStationRepositoryPort.existsByName(request.name())) {
                throw new DomainException(ErrorCode.LOTTERY_STATION_NAME_EXISTED);
            }
            model.setName(request.name().trim());
        }

        if (request.region() != null) {
            LotteryRegionModel newRegion = resolveRegion(request.region());
            if (previousRegion == null || !previousRegion.region().equalsIgnoreCase(newRegion.region())) {
                regionChanged = true;
            }
        }

        lotteryStationApplicationMapper.updateModel(model, request);
        if (request.region() != null) {
            model.setRegion(resolveRegion(request.region()));
        }
        syncNextDrawDate(model);

        if (hasText(request.status()) && parseStatus(request.status()) == LotteryStationStatus.INACTIVE) {
            model.deactivate();
        }

        if (regionChanged) {
            requireRegionHasPrizeStructures(model.getRegion());
        }

        LotteryStationModel saved = lotteryStationRepositoryPort.save(model);
        if (regionChanged) {
            decreaseRegionStationCount(previousRegion);
            increaseRegionStationCount(saved.getRegion());
        }
        realignActiveTicketsToCurrentDraw(saved, previousNextDrawDate);

        recalculateInventory(saved);
        log.info("Lottery product updated with id: {}", saved.getId());

        return lotteryStationApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting lottery station with id: {}", id);
        LotteryStationModel station = getProductOrThrow(id);
        decreaseRegionStationCount(station.getRegion());
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
    public LotteryStationSyncResponse syncStations(SyncLotteryStationsRequest request) {
        LotteryStationSourceType sourceType = request.source();
        LotteryRegionModel stationRegion = resolveRegion(request.region());
        LotteryStationSourcePreviewResult preview = lotteryStationSourceSyncPort.preview(sourceType, stationRegion.region());
        validateSyncSourceResult(preview, stationRegion);

        Map<String, LotteryStationModel> existingStations = indexExistingStations(stationRegion);
        List<LotteryStationSyncItemResponse> items = new ArrayList<>();
        int createdCount = 0;
        int updatedCount = 0;

        for (LotteryStationSourcePreviewItem previewItem : preview.items()) {
            String canonicalName = requireCanonicalName(previewItem);
            String normalizedKey = normalizeName(canonicalName);
            LotteryStationModel existing = existingStations.get(normalizedKey);

            if (existing == null) {
                LotteryStationModel created = createStationFromSource(previewItem, request.defaultPrice(), stationRegion);
                existingStations.put(normalizedKey, created);
                createdCount++;
                items.add(buildSyncItem(created, canonicalName, SyncAction.CREATED, "Tạo mới từ nguồn " + preview.source()));
                continue;
            }

            LotteryStationModel updated = updateStationFromSource(
                    existing,
                    previewItem,
                    stationRegion,
                    request.defaultPrice()
            );
            updatedCount++;
            String updateNote = request.defaultPrice() != null
                    ? "Cập nhật lịch quay và áp lại giá mặc định từ nguồn " + preview.source()
                    : "Cập nhật lịch quay từ nguồn " + preview.source();
            items.add(buildSyncItem(updated, canonicalName, SyncAction.UPDATED, updateNote));
        }

        return LotteryStationSyncResponse.builder()
                .source(preview.source())
                .requestUrl(preview.requestUrl())
                .fetchedAt(preview.fetchedAt())
                .totalFetched(preview.totalItems())
                .createdCount(createdCount)
                .updatedCount(updatedCount)
                .skippedCount(0)
                .warnings(List.of())
                .items(items)
                .build();
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
        try {
            station.setNextDrawDate(resolveNextDrawDate(station));
        } catch (DomainException ex) {
            if (ex.getErrorCode() == ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE) {
                throw new DomainException(
                        ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE,
                        "Nhà đài " + station.getName()
                                + " có lịch quay không hợp lệ. drawDays=" + station.getDrawDays()
                                + ", drawTime=" + station.getDrawTime()
                );
            }
            throw ex;
        }
    }

    private List<LotteryStationModel> findStationsMatchingDrawDate(LocalDate drawDate) {
        DayOfWeek targetDay = drawDate.getDayOfWeek();
        return lotteryStationRepositoryPort.findAll().stream()
                .filter(this::isStationActive)
                .filter(station -> hasDrawDay(station, targetDay))
                .sorted(Comparator.comparing(LotteryStationModel::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private boolean isStationActive(LotteryStationModel station) {
        return station != null
                && station.getStatus() == LotteryStationStatus.ACTIVE
                && !station.isDeleted();
    }

    private boolean hasDrawDay(LotteryStationModel station, DayOfWeek targetDay) {
        return station.getDrawDays() != null
                && !station.getDrawDays().isEmpty()
                && station.getDrawDays().contains(targetDay);
    }

    private LocalDate resolveNextDrawDate(LotteryStationModel station) {
        return DrawScheduleUtils.resolveNextDrawDate(station.getDrawDays(), station.getDrawTime());
    }

    private LotteryStationModel getProductOrThrow(Long id) {
        return lotteryStationRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_STATION_NOT_FOUND));
    }

    private void validateSyncSourceResult(
            LotteryStationSourcePreviewResult preview,
            LotteryRegionModel stationRegion
    ) {
        if (preview == null || preview.items() == null || preview.items().isEmpty()) {
            throw new DomainException(
                    ErrorCode.LOTTERY_STATION_SYNC_SOURCE_EMPTY,
                    "Nguồn dữ liệu không trả về danh sách nhà đài hợp lệ."
            );
        }

        List<String> invalidStations = preview.items().stream()
                .filter(item -> !stationRegion.region().equalsIgnoreCase(item.region())
                        || !hasText(item.canonicalName())
                        || !hasText(item.drawTime())
                        || item.drawDays() == null
                        || item.drawDays().isEmpty())
                .map(item -> hasText(item.canonicalName()) ? item.canonicalName() : item.name())
                .toList();

        if (!invalidStations.isEmpty()) {
            throw new DomainException(
                    ErrorCode.LOTTERY_STATION_SYNC_SOURCE_INVALID,
                    "Nguồn dữ liệu chưa đủ sạch để đồng bộ. Thiếu lịch quay hoặc tên chuẩn cho các đài: "
                            + String.join(", ", invalidStations)
            );
        }

        List<String> duplicateStations = preview.items().stream()
                .map(this::requireCanonicalName)
                .map(this::normalizeName)
                .distinct()
                .toList();
        if (duplicateStations.size() != preview.items().size()) {
            throw new DomainException(
                    ErrorCode.LOTTERY_STATION_SYNC_SOURCE_DUPLICATE,
                    "Nguồn dữ liệu chứa nhà đài bị trùng tên chuẩn, chưa thể đồng bộ an toàn."
            );
        }
    }

    private Map<String, LotteryStationModel> indexExistingStations(LotteryRegionModel stationRegion) {
        Map<String, LotteryStationModel> indexed = new LinkedHashMap<>();
        for (LotteryStationModel station : lotteryStationRepositoryPort.findAll()) {
            if (station.getRegion() == null
                    || !stationRegion.region().equalsIgnoreCase(station.getRegion().region())) {
                continue;
            }
            if (hasText(station.getProvince())) {
                indexed.putIfAbsent(normalizeName(station.getProvince()), station);
            }
            if (hasText(station.getName())) {
                indexed.putIfAbsent(normalizeName(station.getName()), station);
            }
        }
        return indexed;
    }

    private LotteryStationModel createStationFromSource(
            LotteryStationSourcePreviewItem previewItem,
            BigDecimal defaultPrice,
            LotteryRegionModel stationRegion
    ) {
        if (defaultPrice == null) {
            throw new DomainException(
                    ErrorCode.LOTTERY_STATION_SYNC_DEFAULT_PRICE_REQUIRED,
                    "Nguồn dữ liệu có nhà đài mới. Vui lòng truyền defaultPrice để tạo mới an toàn."
            );
        }

        LotteryStationModel station = LotteryStationModel.builder()
                .name(requireCanonicalName(previewItem))
                .province(requireCanonicalName(previewItem))
                .region(stationRegion)
                .price(defaultPrice)
                .drawDays(parseDrawDays(previewItem.drawDays(), previewItem.canonicalName()))
                .drawTime(parseDrawTime(previewItem.drawTime(), previewItem.canonicalName()))
                .status(LotteryStationStatus.ACTIVE)
                .build();

        syncNextDrawDate(station);
        requireRegionHasPrizeStructures(station.getRegion());
        LotteryStationModel saved = lotteryStationRepositoryPort.save(station);
        increaseRegionStationCount(saved.getRegion());
        return saved;
    }

    private LotteryStationModel updateStationFromSource(
            LotteryStationModel station,
            LotteryStationSourcePreviewItem previewItem,
            LotteryRegionModel stationRegion,
            BigDecimal defaultPrice
    ) {
        LocalDate previousNextDrawDate = station.getNextDrawDate();
        station.setName(requireCanonicalName(previewItem));
        station.setProvince(requireCanonicalName(previewItem));
        station.setRegion(stationRegion);
        if (defaultPrice != null) {
            station.setPrice(defaultPrice);
        }
        station.setDrawDays(parseDrawDays(previewItem.drawDays(), previewItem.canonicalName()));
        station.setDrawTime(parseDrawTime(previewItem.drawTime(), previewItem.canonicalName()));
        syncNextDrawDate(station);
        LotteryStationModel saved = lotteryStationRepositoryPort.save(station);
        realignActiveTicketsToCurrentDraw(saved, previousNextDrawDate);
        return saved;
    }

    private LotteryStationSyncItemResponse buildSyncItem(
            LotteryStationModel station,
            String canonicalName,
            SyncAction action,
            String note
    ) {
        return LotteryStationSyncItemResponse.builder()
                .stationId(station.getId())
                .name(station.getName())
                .canonicalName(canonicalName)
                .action(action)
                .note(note)
                .build();
    }

    private String requireCanonicalName(LotteryStationSourcePreviewItem previewItem) {
        if (hasText(previewItem.canonicalName())) {
            return previewItem.canonicalName().trim();
        }
        if (hasText(previewItem.name())) {
            return previewItem.name().trim();
        }
        throw new DomainException(
                ErrorCode.LOTTERY_STATION_SYNC_CANONICAL_NAME_REQUIRED,
                "Nhà đài từ nguồn dữ liệu thiếu tên chuẩn."
        );
    }

    private List<DayOfWeek> parseDrawDays(List<String> rawDrawDays, String stationName) {
        if (rawDrawDays == null || rawDrawDays.isEmpty()) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE,
                    "Nhà đài " + stationName + " thiếu ngày quay.");
        }
        try {
            return rawDrawDays.stream()
                    .map(day -> DayOfWeek.valueOf(day.trim().toUpperCase(Locale.ROOT)))
                    .distinct()
                    .toList();
        } catch (IllegalArgumentException ex) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE,
                    "Nhà đài " + stationName + " có ngày quay không hợp lệ.");
        }
    }

    private LocalTime parseDrawTime(String rawDrawTime, String stationName) {
        if (!hasText(rawDrawTime)) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE,
                    "Nhà đài " + stationName + " thiếu giờ quay.");
        }
        try {
            return LocalTime.parse(rawDrawTime.trim());
        } catch (Exception ex) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE,
                    "Nhà đài " + stationName + " có giờ quay không hợp lệ.");
        }
    }

    private String normalizeName(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace("đ", "d")
                .replace("Đ", "D");
        return normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
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

    private void recalculateInventory(LotteryStationModel model) {
        if (model.getId() == null) {
            return;
        }
        long ticketCount = lotteryTicketRepositoryPort.sumQuantityByProductIdAndStatuses(
                model.getId(), INVENTORY_STATUSES);
        model.setInventoryCount((int) ticketCount);
    }

    private void realignActiveTicketsToCurrentDraw(LotteryStationModel station, LocalDate previousNextDrawDate) {
        if (station.getId() == null || previousNextDrawDate == null || station.getNextDrawDate() == null) {
            return;
        }
        if (previousNextDrawDate.equals(station.getNextDrawDate())) {
            return;
        }

        List<LotteryTicketModel> ticketsToRealign =
                lotteryTicketRepositoryPort.findAllByStationIdAndDrawDateAndStatuses(
                        station.getId(),
                        previousNextDrawDate,
                        REALIGNABLE_TICKET_STATUSES
                );

        for (com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel ticket : ticketsToRealign) {
            ticket.setDrawDate(station.getNextDrawDate());
            lotteryTicketRepositoryPort.save(ticket);
        }
    }

    private LotteryRegionModel resolveRegion(String rawRegion) {
        String normalizedRegion = LotteryRegionModel.normalizeCode(rawRegion);
        return lotteryRegionRepositoryPort.findByCode(normalizedRegion)
                .orElseThrow(() -> new DomainException(
                        ErrorCode.LOTTERY_STATION_SYNC_REGION_UNSUPPORTED,
                        "Miền chưa được hỗ trợ để đồng bộ: " + rawRegion
                ));
    }

    private void requireRegionHasPrizeStructures(LotteryRegionModel region) {
        if (region == null) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_REGION_REQUIRED);
        }
        if (prizeStructureRepositoryPort.findByRegionCode(region.region()).isEmpty()) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_NOT_FOUND);
        }
    }

    private void increaseRegionStationCount(LotteryRegionModel region) {
        if (region == null) {
            return;
        }
        region.increaseStationCount();
        lotteryRegionRepositoryPort.save(region);
    }

    private void decreaseRegionStationCount(LotteryRegionModel region) {
        if (region == null) {
            return;
        }
        region.decreaseStationCount();
        lotteryRegionRepositoryPort.save(region);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
