package com.daiphat.coreapi.application.service.lotteries.result;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryResultRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ResyncLotteryResultRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SyncLotteryResultsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryResultRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ManagementLotteryResultBoardResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultDetailResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultBoardDetailsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultBoardSummaryResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultFullBoardResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultLiveItemResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultSyncBatchResponse;
import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourcePreviewResult;
import com.daiphat.coreapi.application.event.LotteryResultCompletedEvent;
import com.daiphat.coreapi.application.event.LotteryResultSyncRequestedEvent;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryResultApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryResultDetailServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryResultSourceServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryResultServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.PrizeStructureServicePort;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LotteryResultService implements LotteryResultServicePort {

    private static final Set<PrizeLevel> CORE_RESULT_LEVELS = EnumSet.of(
            PrizeLevel.SPECIAL,
            PrizeLevel.FIRST,
            PrizeLevel.SECOND,
            PrizeLevel.THIRD,
            PrizeLevel.FOURTH,
            PrizeLevel.FIFTH,
            PrizeLevel.SIXTH,
            PrizeLevel.SEVENTH,
            PrizeLevel.EIGHTH
    );

    private final LotteryResultRepositoryPort lotteryResultRepositoryPort;
    private final LotteryResultDetailServicePort lotteryResultDetailServicePort;
    private final LotteryResultSourceServicePort lotteryResultSourceServicePort;
    private final LotteryStationServicePort lotteryStationServicePort;
    private final PrizeStructureServicePort prizeStructureServicePort;
    private final ApplicationEventPublisher eventPublisher;
    private final LotteryResultApplicationMapper lotteryResultApplicationMapper;
    private final ConcurrentMap<String, ReentrantLock> syncLocks = new ConcurrentHashMap<>();

    @Value("${daiphat.lottery.result-poll-seconds}")
    private Integer resultPollSeconds;

    @Value("${daiphat.lottery.historical-result-poll-seconds}")
    private Integer historicalResultPollSeconds;

    @Value("${daiphat.lottery.draw-deadline-minutes}")
    private long drawDeadlineMinutes;

    @Override
    @Transactional
    public LotteryResultResponse create(CreateLotteryResultRequest request) {
        LotteryResultModel model = lotteryResultApplicationMapper.toModel(request);
        model.validate();

        LotteryStationModel station = getStationOrThrow(model.getStationId());
        assertUniqueResult(model.getStationId(), model.getDrawDate(), null);

        LotteryResultModel saved = lotteryResultApplicationMapper.withStation(
                lotteryResultRepositoryPort.save(
                        lotteryResultApplicationMapper.withStation(model, station)
                ),
                station
        );
        log.info("Created lottery result id={} for station={} drawDate={}", saved.getId(), saved.getStationId(), saved.getDrawDate());
        return lotteryResultApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public LotteryResultResponse getById(Long id) {
        return lotteryResultApplicationMapper.toResponse(getResultOrThrow(id));
    }

    @Override
    @Transactional(readOnly = true)
    public LotteryResultModel getModelById(Long id) {
        return getResultOrThrow(id);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<LotteryResultModel> findModelById(Long id) {
        return lotteryResultRepositoryPort.findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<LotteryResultResponse> getAll(int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(page - 1, 0), size);
        Page<LotteryResultResponse> responsePage = lotteryResultRepositoryPort.findAll(pageable)
                .map(lotteryResultApplicationMapper::toResponse);
        return PageResponse.from(responsePage, page, size);
    }

    @Override
    @Transactional
    public LotteryResultBoardSummaryResponse getBoardSummary(String region, LocalDate drawDate) {
        validateLiveRequest(region, drawDate);
        if (drawDate.isAfter(LocalDate.now())) {
            return LotteryResultBoardSummaryResponse.builder()
                    .region(region.trim().toUpperCase())
                    .drawDate(drawDate)
                    .results(List.of())
                    .build();
        }

        List<LotteryResultResponse> results = getStationsForRegionAndDate(region, drawDate).stream()
                .map(station -> ensureResultForBoard(station.getId(), drawDate))
                .map(this::markHistoricalRequestIfNeeded)
                .map(lotteryResultApplicationMapper::toResponse)
                .toList();

        return LotteryResultBoardSummaryResponse.builder()
                .region(region.trim().toUpperCase())
                .drawDate(drawDate)
                .results(results)
                .build();
    }

    @Override
    @Transactional(noRollbackFor = DomainException.class)
    public LotteryResultBoardDetailsResponse getBoardDetails(List<Long> resultIds) {
        if (resultIds == null || resultIds.isEmpty()) {
            return LotteryResultBoardDetailsResponse.builder()
                    .results(List.of())
                    .build();
        }

        List<LotteryResultLiveItemResponse> results = resultIds.stream()
                .map(this::getResultOrThrow)
                .map(this::buildReadOnlyItemWithHistoricalMark)
                .toList();

        return LotteryResultBoardDetailsResponse.builder()
                .results(results)
                .build();
    }

    @Override
    @Transactional(noRollbackFor = DomainException.class)
    public LotteryResultFullBoardResponse getFullBoard(String region, LocalDate drawDate, LotteryStationSourceType sourceType) {
        validateLiveRequest(region, drawDate);

        List<LotteryStationModel> stations = getStationsForRegionAndDate(region, drawDate);

        List<LotteryResultLiveItemResponse> liveItems = new ArrayList<>();
        for (LotteryStationModel station : stations) {
            LotteryResultModel result = ensureResultForBoard(station.getId(), drawDate);
            liveItems.add(buildReadOnlyItemWithHistoricalMark(result));
        }

        return LotteryResultFullBoardResponse.builder()
                .region(region.trim().toUpperCase())
                .drawDate(drawDate)
                .results(liveItems)
                .build();
    }

    @Override
    @Transactional(noRollbackFor = DomainException.class)
    public ManagementLotteryResultBoardResponse getManagementBoard(
            String region,
            LocalDate fromDate,
            LocalDate toDate,
            LotteryStationSourceType sourceType
    ) {
        validateAdminLiveRequest(region, fromDate, toDate);

        List<LotteryResultLiveItemResponse> liveItems = new ArrayList<>();

        LocalDate currentDate = fromDate;
        while (!currentDate.isAfter(toDate)) {
            List<LotteryStationModel> stations = getStationsForRegionAndDate(region, currentDate);
            for (LotteryStationModel station : stations) {
                LotteryResultModel result = ensureResultForBoard(station.getId(), currentDate);
                liveItems.add(buildReadOnlyItemWithHistoricalMark(result));
            }
            currentDate = currentDate.plusDays(1);
        }

        liveItems.sort(Comparator
                .comparing((LotteryResultLiveItemResponse item) -> item.result().drawDate())
                .reversed()
                .thenComparing(item -> item.result().stationName(), String.CASE_INSENSITIVE_ORDER));

        return ManagementLotteryResultBoardResponse.builder()
                .region(region.trim().toUpperCase())
                .fromDate(fromDate)
                .toDate(toDate)
                .results(liveItems)
                .build();
    }

    @Override
    @Transactional
    public LotteryResultModel ensureResultForBoard(Long stationId, LocalDate drawDate) {
        LotteryStationModel station = getStationOrThrow(stationId);
        return ensureResultForBoardInternal(station, drawDate);
    }

    @Override
    @Transactional
    public LotteryResultResponse requestResync(Long id, ResyncLotteryResultRequest request, UUID actorId) {
        LotteryResultModel existing = getResultOrThrow(id);
        LotteryStationSourceType sourceType = request != null && request.source() != null
                ? request.source()
                : LotteryStationSourceType.DEFAULT;

        int updatedRows = lotteryResultRepositoryPort.updateStatusIfCurrentIn(
                id,
                List.of(LotteryResultStatus.PARTIAL.name(), LotteryResultStatus.FAILED.name()),
                LotteryResultStatus.PENDING.name(),
                sourceType.value(),
                java.time.LocalDateTime.now(),
                actorId != null ? actorId.toString() : "SYSTEM"
        );
        if (updatedRows == 0) {
            throw new DomainException(ErrorCode.LOTTERY_RESULT_RESYNC_NOT_ALLOWED);
        }

        requestManualResync(id, sourceType);
        return lotteryResultApplicationMapper.toResponse(
                lotteryResultRepositoryPort.findById(id).orElse(existing)
        );
    }

    @Override
    @Transactional
    public LotteryResultSyncBatchResponse requestBoardSync(SyncLotteryResultsRequest request) {
        validateAdminLiveRequest(request.region(), request.fromDate(), request.toDate());
        LotteryStationSourceType sourceType = request.source() != null
                ? request.source()
                : LotteryStationSourceType.DEFAULT;

        int queuedCount = 0;
        LocalDate currentDate = request.fromDate();
        while (!currentDate.isAfter(request.toDate())) {
            List<LotteryStationModel> stations = getStationsForRegionAndDate(request.region(), currentDate);
            for (LotteryStationModel station : stations) {
                LotteryResultModel result = ensureResultForBoardInternal(station, currentDate);
                requestManualResync(result.getId(), sourceType);
                queuedCount++;
            }
            currentDate = currentDate.plusDays(1);
        }

        return new LotteryResultSyncBatchResponse(queuedCount);
    }

    @Override
    public void requestManualResync(Long resultId, LotteryStationSourceType sourceType) {
        eventPublisher.publishEvent(new LotteryResultSyncRequestedEvent(resultId, sourceType));
    }

    @Override
    @Transactional(noRollbackFor = DomainException.class)
    public void syncResult(Long resultId, LotteryStationSourceType sourceType) {
        String lockKey = buildLockKey(resultId, sourceType);
        ReentrantLock lock = syncLocks.computeIfAbsent(lockKey, ignored -> new ReentrantLock());
        if (!lock.tryLock()) {
            log.info("Skip duplicate lottery result sync request for resultId={} source={}", resultId, sourceType);
            return;
        }

        try {
            LotteryResultModel result = lotteryResultRepositoryPort.findById(resultId).orElse(null);
            if (result == null) {
                return;
            }

            LotteryStationModel station = getStationOrThrow(result.getStationId());
            LotteryStationSourceType effectiveSource = sourceType != null ? sourceType : LotteryStationSourceType.DEFAULT;
            boolean liveWindowOpen = isLiveWindowOpen(result, station);
            if (liveWindowOpen && result.getStatus() != LotteryResultStatus.COMPLETED) {
                result.setStatus(LotteryResultStatus.DRAWING);
                lotteryResultRepositoryPort.save(lotteryResultApplicationMapper.withStation(result, station));
            }
            List<PrizeStructureModel> prizeStructures = prizeStructureServicePort.getModelsByRegion(result.getRegionCode());
            LotteryResultSourcePreviewResult preview = lotteryResultSourceServicePort.preview(
                    effectiveSource,
                    result.getStationId(),
                    result.getDrawDate()
            );

            List<LotteryResultDetailResponse> details = lotteryResultDetailServicePort.syncFromSource(
                    resultId,
                    preview.items(),
                    prizeStructures
            );

            applySyncOutcome(result, details, prizeStructures, effectiveSource, liveWindowOpen, station);
        } catch (DomainException ex) {
            if (ex.getErrorCode() == ErrorCode.LOTTERY_RESULT_SOURCE_EMPTY
                    || ex.getErrorCode() == ErrorCode.LOTTERY_RESULT_SOURCE_INVALID) {
                lotteryResultRepositoryPort.findById(resultId).ifPresent(result -> {
                    LotteryStationModel station = getStationOrThrow(result.getStationId());
                    List<LotteryResultDetailResponse> existingDetails =
                            lotteryResultDetailServicePort.getByLotteryResultId(resultId);
                    applySyncOutcome(
                            result,
                            existingDetails,
                            prizeStructureServicePort.getModelsByRegion(result.getRegionCode()),
                            sourceType != null ? sourceType : LotteryStationSourceType.DEFAULT,
                            isLiveWindowOpen(result, station),
                            station
                    );
                });
                return;
            }
            throw ex;
        } finally {
            lock.unlock();
            if (!lock.hasQueuedThreads()) {
                syncLocks.remove(lockKey, lock);
            }
        }
    }

    private LotteryResultLiveItemResponse buildReadOnlyItemWithHistoricalMark(LotteryResultModel result) {
        List<LotteryResultDetailResponse> details = lotteryResultApplicationMapper.toDetailResponseList(
                lotteryResultDetailServicePort.getModelsByLotteryResultId(result.getId())
        );
        LotteryResultModel markedResult = markHistoricalRequestIfNeeded(result, details);
        return LotteryResultLiveItemResponse.builder()
                .result(lotteryResultApplicationMapper.toResponse(markedResult))
                .details(details)
                .status(markedResult.getStatus() != null ? markedResult.getStatus().name() : null)
                .pollAfterSeconds(resolvePollAfterSeconds(markedResult, details))
                .build();
    }

    private void validateLiveRequest(String region, LocalDate drawDate) {
        if (region == null || region.isBlank()) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_REGION_REQUIRED);
        }
        if (drawDate == null) {
            throw new DomainException(ErrorCode.LOTTERY_RESULT_DRAW_DATE_REQUIRED);
        }
    }

    private void validateAdminLiveRequest(String region, LocalDate fromDate, LocalDate toDate) {
        if (region == null || region.isBlank()) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_REGION_REQUIRED);
        }
        if (fromDate == null || toDate == null) {
            throw new DomainException(ErrorCode.LOTTERY_RESULT_DRAW_DATE_REQUIRED);
        }

        if (toDate.isBefore(fromDate)) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Khoảng ngày không hợp lệ.");
        }
    }

    private List<LotteryStationModel> getStationsForRegionAndDate(String region, LocalDate drawDate) {
        return lotteryStationServicePort.getScheduleModelsByDrawDate(drawDate).stream()
                .filter(station -> station.getRegion() != null && region.equalsIgnoreCase(station.getRegion().region()))
                .toList();
    }

    @Override
    @Transactional
    public LotteryResultResponse update(Long id, UpdateLotteryResultRequest request) {
        LotteryResultModel existing = getResultOrThrow(id);
        LotteryResultModel merged = lotteryResultApplicationMapper.merge(existing, request);
        merged.validate();

        LotteryStationModel station = getStationOrThrow(merged.getStationId());
        assertUniqueResult(merged.getStationId(), merged.getDrawDate(), id);
        lotteryResultDetailServicePort.validateRegionCompatibility(
                id,
                station.getRegion() != null ? station.getRegion().region() : null
        );

        LotteryResultModel saved = lotteryResultApplicationMapper.withStation(
                lotteryResultRepositoryPort.save(
                        lotteryResultApplicationMapper.withStation(merged, station)
                ),
                station
        );
        log.info("Updated lottery result id={}", saved.getId());
        return lotteryResultApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        getResultOrThrow(id);
        lotteryResultDetailServicePort.deleteByLotteryResultId(id);
        lotteryResultRepositoryPort.deleteById(id);
        log.info("Deleted lottery result id={}", id);
    }

    @Override
    @Transactional
    public int syncHistoricalBacklog(int limit) {
        List<LotteryResultModel> candidates = lotteryResultRepositoryPort.findHistoricalResultsWithoutDetails(
                LocalDate.now(),
                List.of(
                        LotteryResultStatus.PENDING.name(),
                        LotteryResultStatus.PARTIAL.name(),
                        LotteryResultStatus.COMPLETED.name()
                ),
                Math.max(limit * 3, limit)
        ).stream()
                .filter(this::isHistoricalBacklogCandidate)
                .limit(Math.max(limit, 1))
                .toList();

        for (LotteryResultModel candidate : candidates) {
            syncResult(candidate.getId(), LotteryStationSourceType.DEFAULT);
        }
        return candidates.size();
    }

    private LotteryResultModel getResultOrThrow(Long id) {
        return lotteryResultRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_RESULT_NOT_FOUND));
    }

    private LotteryStationModel getStationOrThrow(Long stationId) {
        return lotteryStationServicePort.findModelById(stationId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_STATION_NOT_FOUND));
    }

    private void assertUniqueResult(Long stationId, java.time.LocalDate drawDate, Long excludeId) {
        boolean existed = excludeId == null
                ? lotteryResultRepositoryPort.existsByStationIdAndDrawDate(stationId, drawDate)
                : lotteryResultRepositoryPort.existsByStationIdAndDrawDateExcludingId(stationId, drawDate, excludeId);
        if (existed) {
            throw new DomainException(ErrorCode.LOTTERY_RESULT_DUPLICATE_STATION_DRAW_DATE);
        }
    }

    private LotteryResultModel ensureResultForBoardInternal(LotteryStationModel station, LocalDate drawDate) {
        return lotteryResultRepositoryPort.findByStationIdAndDrawDate(station.getId(), drawDate)
                .map(existing -> lotteryResultApplicationMapper.withStation(existing, station))
                .orElseGet(() -> {
                    LotteryResultModel created = LotteryResultModel.builder()
                            .stationId(station.getId())
                            .drawDate(drawDate)
                            .source(LotteryStationSourceType.DEFAULT.value())
                            .official(false)
                            .status(LotteryResultStatus.PENDING)
                            .build();
                    created.validate();
                    LotteryResultModel saved = lotteryResultRepositoryPort.save(
                            lotteryResultApplicationMapper.withStation(created, station)
                    );
                    return lotteryResultApplicationMapper.withStation(saved, station);
                });
    }

    private LotteryResultModel markHistoricalRequestIfNeeded(LotteryResultModel result) {
        List<LotteryResultDetailResponse> details = lotteryResultApplicationMapper.toDetailResponseList(
                lotteryResultDetailServicePort.getModelsByLotteryResultId(result.getId())
        );
        return markHistoricalRequestIfNeeded(result, details);
    }

    private LotteryResultModel markHistoricalRequestIfNeeded(
            LotteryResultModel result,
            List<LotteryResultDetailResponse> details
    ) {
        if (result == null || result.getId() == null || result.getDrawDate() == null) {
            return result;
        }

        if (!result.getDrawDate().isBefore(LocalDate.now())) {
            return result;
        }

        if (details != null && !details.isEmpty()) {
            return result;
        }

        if (result.getRequestedAt() != null
                && result.getRequestedAt().isAfter(LocalDateTime.now().minusSeconds(historicalResultPollSeconds))) {
            return result;
        }

        LocalDateTime requestedAt = LocalDateTime.now();
        lotteryResultRepositoryPort.updateRequestedAt(result.getId(), requestedAt);
        result.setRequestedAt(requestedAt);
        return result;
    }

    private boolean isHistoricalBacklogCandidate(LotteryResultModel result) {
        if (result == null || result.getDrawDate() == null) {
            return false;
        }

        if (result.getDrawDate().isBefore(LocalDate.now())) {
            return true;
        }

        if (!result.getDrawDate().isEqual(LocalDate.now())) {
            return false;
        }

        LotteryStationModel station = getStationOrThrow(result.getStationId());
        return isAfterBacklogDeadline(station, result.getDrawDate());
    }

    private boolean isAfterBacklogDeadline(LotteryStationModel station, LocalDate drawDate) {
        if (station == null || station.getDrawTime() == null || drawDate == null) {
            return false;
        }

        LocalDateTime deadline = LocalDateTime.of(drawDate, station.getDrawTime())
                .plusMinutes(drawDeadlineMinutes);
        return !LocalDateTime.now().isBefore(deadline);
    }

    private Integer resolvePollAfterSeconds(
            LotteryResultModel result,
            List<LotteryResultDetailResponse> details
    ) {
        if (result == null || result.getStatus() == null) {
            return null;
        }

        if (result.getDrawDate() != null
                && result.getDrawDate().isBefore(LocalDate.now())
                && (details == null || details.isEmpty())
                && result.getRequestedAt() != null) {
            return historicalResultPollSeconds;
        }

        return switch (result.getStatus()) {
            case PENDING, DRAWING -> resultPollSeconds;
            default -> null;
        };
    }

    private void applySyncOutcome(
            LotteryResultModel result,
            List<LotteryResultDetailResponse> details,
            List<PrizeStructureModel> prizeStructures,
            LotteryStationSourceType sourceType,
            boolean liveWindowOpen,
            LotteryStationModel station
    ) {
        LotteryResultStatus nextStatus;
        if (isCoreResultCompleted(details, prizeStructures)) {
            nextStatus = LotteryResultStatus.COMPLETED;
        } else if (liveWindowOpen) {
            nextStatus = LotteryResultStatus.DRAWING;
        } else if (details.isEmpty()) {
            nextStatus = LotteryResultStatus.FAILED;
        } else {
            nextStatus = LotteryResultStatus.PARTIAL;
        }

        boolean firstCompleted = nextStatus == LotteryResultStatus.COMPLETED && result.getPublishedAt() == null;

        result.setStatus(nextStatus);
        result.setSource(sourceType.value());
        result.setLastSyncedAt(LocalDateTime.now());
        result.setRequestedAt(null);
        if (firstCompleted) {
            result.setPublishedAt(LocalDateTime.now());
        }
        lotteryResultRepositoryPort.save(lotteryResultApplicationMapper.withStation(result, station));

        if (firstCompleted) {
            eventPublisher.publishEvent(LotteryResultCompletedEvent.builder()
                    .resultId(result.getId())
                    .stationId(station != null ? station.getId() : result.getStationId())
                    .stationName(station != null ? station.getName() : result.getStationName())
                    .drawDate(result.getDrawDate())
                    .build());
        }
    }

    private boolean isCoreResultCompleted(
            List<LotteryResultDetailResponse> details,
            List<PrizeStructureModel> prizeStructures
    ) {
        Set<String> expectedCodes = prizeStructures.stream()
                .filter(prize -> CORE_RESULT_LEVELS.contains(prize.getPrizeLevel()))
                .map(PrizeStructureModel::getPrizeCode)
                .collect(Collectors.toSet());

        Set<String> actualCodes = details.stream()
                .map(LotteryResultDetailResponse::prizeCode)
                .collect(Collectors.toSet());
        return !expectedCodes.isEmpty() && actualCodes.containsAll(expectedCodes);
    }

    private String buildLockKey(Long resultId, LotteryStationSourceType sourceType) {
        String source = sourceType != null ? sourceType.value() : LotteryStationSourceType.DEFAULT.value();
        return source + ":" + resultId;
    }

    private boolean isLiveWindowOpen(LotteryResultModel result, LotteryStationModel station) {
        if (result == null || station == null || result.getDrawDate() == null || station.getDrawTime() == null) {
            return false;
        }
        if (!LocalDate.now().equals(result.getDrawDate())) {
            return false;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime drawAt = LocalDateTime.of(result.getDrawDate(), station.getDrawTime());
        LocalDateTime deadline = drawAt.plusMinutes(drawDeadlineMinutes);
        return !now.isBefore(drawAt) && !now.isAfter(deadline);
    }
}
