package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryResultRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ResyncLotteryResultRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryResultRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultResponse;
import com.daiphat.coreapi.application.event.LotteryResultSyncRequestedEvent;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryResultApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryResultDetailServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryResultSourceServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.PrizeStructureServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultRepositoryPort;
import com.daiphat.coreapi.application.service.lotteries.result.LotteryResultService;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LotteryResultServiceTest {

    @Mock
    private LotteryResultRepositoryPort lotteryResultRepositoryPort;
    @Mock
    private LotteryResultDetailServicePort lotteryResultDetailServicePort;
    @Mock
    private LotteryResultSourceServicePort lotteryResultSourceServicePort;
    @Mock
    private LotteryStationServicePort lotteryStationServicePort;
    @Mock
    private PrizeStructureServicePort prizeStructureServicePort;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private LotteryResultApplicationMapper mapper;
    @InjectMocks
    private LotteryResultService service;

    private LotteryResultModel resultModel;
    private LotteryStationModel stationModel;

    @BeforeEach
    void setUp() {
        resultModel = LotteryResultModel.builder().id(1L).stationId(10L).drawDate(LocalDate.now()).status(LotteryResultStatus.PENDING).build();
        stationModel = LotteryStationModel.builder().id(10L).build();
        ReflectionTestUtils.setField(service, "resultPollSeconds", 60);
        ReflectionTestUtils.setField(service, "historicalResultPollSeconds", 10);
        ReflectionTestUtils.setField(service, "drawDeadlineMinutes", 30L);
    }

    @Test
    @DisplayName("[DP-476][DP-477] create_success")
    void create_success() {
        when(mapper.toModel(any())).thenReturn(resultModel);
        when(lotteryStationServicePort.findModelById(10L)).thenReturn(Optional.of(stationModel));
        when(lotteryResultRepositoryPort.existsByStationIdAndDrawDate(anyLong(), any())).thenReturn(false);
        when(mapper.withStation(any(LotteryResultModel.class), any())).thenReturn(resultModel);
        when(lotteryResultRepositoryPort.save(any())).thenReturn(resultModel);
        when(mapper.toResponse(any())).thenReturn(LotteryResultResponse.builder().id(1L).drawDate(LocalDate.now()).stationName("Station").build());

        var req = CreateLotteryResultRequest.builder().build();
        var res = service.create(req);
        assertThat(res.id()).isEqualTo(1L);
    }

    @Test
    @DisplayName("[DP-476][DP-477] create_duplicate")
    void create_duplicate() {
        when(mapper.toModel(any())).thenReturn(resultModel);
        when(lotteryStationServicePort.findModelById(10L)).thenReturn(Optional.of(stationModel));
        when(lotteryResultRepositoryPort.existsByStationIdAndDrawDate(anyLong(), any())).thenReturn(true);

        var req = CreateLotteryResultRequest.builder().build();
        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_RESULT_DUPLICATE_STATION_DRAW_DATE);
    }

    @Test
    @DisplayName("[DP-476][DP-477] getById_success")
    void getById_success() {
        when(lotteryResultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(mapper.toResponse(any())).thenReturn(LotteryResultResponse.builder().id(1L).drawDate(LocalDate.now()).stationName("Station").build());
        var res = service.getById(1L);
        assertThat(res.id()).isEqualTo(1L);
    }

    @Test
    @DisplayName("[DP-476][DP-477] getById_notFound")
    void getById_notFound() {
        when(lotteryResultRepositoryPort.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getById(1L))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_RESULT_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-476][DP-477] getModelById")
    void getModelById() {
        when(lotteryResultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        assertThat(service.getModelById(1L).getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("[DP-476][DP-477] findModelById")
    void findModelById() {
        when(lotteryResultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        assertThat(service.findModelById(1L)).isPresent();
    }

    @Test
    @DisplayName("[DP-476][DP-477] getAll")
    void getAll() {
        when(lotteryResultRepositoryPort.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(resultModel)));
        when(mapper.toResponse(any())).thenReturn(LotteryResultResponse.builder().id(1L).drawDate(LocalDate.now()).stationName("Station").build());
        var res = service.getAll(1, 10);
        assertThat(res.getRecordList()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-476][DP-477] update_success")
    void update_success() {
        when(lotteryResultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(mapper.merge(any(), any())).thenReturn(resultModel);
        when(lotteryStationServicePort.findModelById(10L)).thenReturn(Optional.of(stationModel));
        when(lotteryResultRepositoryPort.existsByStationIdAndDrawDateExcludingId(anyLong(), any(), anyLong())).thenReturn(false);
        when(mapper.withStation(any(LotteryResultModel.class), any())).thenReturn(resultModel);
        when(lotteryResultRepositoryPort.save(any())).thenReturn(resultModel);
        when(mapper.toResponse(any())).thenReturn(LotteryResultResponse.builder().id(1L).drawDate(LocalDate.now()).stationName("Station").build());

        var req = UpdateLotteryResultRequest.builder().build();
        var res = service.update(1L, req);
        assertThat(res.id()).isEqualTo(1L);
    }

    @Test
    @DisplayName("[DP-476][DP-477] delete_success")
    void delete_success() {
        when(lotteryResultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        service.delete(1L);
        verify(lotteryResultDetailServicePort).deleteByLotteryResultId(1L);
        verify(lotteryResultRepositoryPort).deleteById(1L);
    }

    @Test
    @DisplayName("[DP-476][DP-477] requestResync_success")
    void requestResync_success() {
        when(lotteryResultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(lotteryResultRepositoryPort.updateStatusIfCurrentIn(anyLong(), anyList(), anyString(), anyString(), any(), anyString())).thenReturn(1);
        when(mapper.toResponse(any())).thenReturn(LotteryResultResponse.builder().id(1L).drawDate(LocalDate.now()).stationName("Station").build());

        var req = ResyncLotteryResultRequest.builder().source(LotteryStationSourceType.DEFAULT).build();
        var res = service.requestResync(1L, req, UUID.randomUUID());
        assertThat(res.id()).isEqualTo(1L);
        verify(eventPublisher).publishEvent(any(LotteryResultSyncRequestedEvent.class));
    }

    @Test
    @DisplayName("[DP-476][DP-477] requestResync_fails")
    void requestResync_fails() {
        when(lotteryResultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(lotteryResultRepositoryPort.updateStatusIfCurrentIn(anyLong(), anyList(), anyString(), anyString(), any(), anyString())).thenReturn(0);

        var req = ResyncLotteryResultRequest.builder().build();
        assertThatThrownBy(() -> service.requestResync(1L, req, null))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_RESULT_RESYNC_NOT_ALLOWED);
    }

    @Test
    @DisplayName("[DP-476][DP-477] syncHistoricalBacklog")
    void syncHistoricalBacklog() {
        when(lotteryResultRepositoryPort.findHistoricalResultsWithoutDetails(any(), anyList(), anyInt())).thenReturn(List.of(resultModel));
        resultModel.setDrawDate(LocalDate.now().minusDays(1)); // Make it historical
        int count = service.syncHistoricalBacklog(10);
        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("[DP-476][DP-477] getBoardSummary_futureDate")
    void getBoardSummary_futureDate() {
        var res = service.getBoardSummary("MIEN_NAM", LocalDate.now().plusDays(1));
        assertThat(res.results()).isEmpty();
    }

    @Test
    @DisplayName("[DP-476][DP-477] getBoardSummary_success")
    void getBoardSummary_success() {
        when(lotteryStationServicePort.getScheduleModelsByDrawDate(any())).thenReturn(List.of(
                LotteryStationModel.builder().id(10L).region(com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel.builder().code("MIEN_NAM").build()).build()
        ));
        when(lotteryStationServicePort.findModelById(10L)).thenReturn(Optional.of(stationModel));
        when(lotteryResultRepositoryPort.findByStationIdAndDrawDate(anyLong(), any())).thenReturn(Optional.of(resultModel));
        when(mapper.withStation(any(LotteryResultModel.class), any())).thenReturn(resultModel);
        when(mapper.toResponse(any())).thenReturn(LotteryResultResponse.builder().id(1L).drawDate(LocalDate.now()).stationName("Station").build());
        
        var res = service.getBoardSummary("MIEN_NAM", LocalDate.now().minusDays(1));
        assertThat(res.results()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-476][DP-477] getBoardDetails_empty")
    void getBoardDetails_empty() {
        assertThat(service.getBoardDetails(null).results()).isEmpty();
        assertThat(service.getBoardDetails(List.of()).results()).isEmpty();
    }

    @Test
    @DisplayName("[DP-476][DP-477] getBoardDetails_success")
    void getBoardDetails_success() {
        when(lotteryResultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(mapper.toResponse(any())).thenReturn(LotteryResultResponse.builder().id(1L).drawDate(LocalDate.now()).stationName("Station").build());
        var res = service.getBoardDetails(List.of(1L));
        assertThat(res.results()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-476][DP-477] getFullBoard_success")
    void getFullBoard_success() {
        when(lotteryStationServicePort.getScheduleModelsByDrawDate(any())).thenReturn(List.of(
                LotteryStationModel.builder().id(10L).region(com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel.builder().code("MIEN_NAM").build()).build()
        ));
        when(lotteryStationServicePort.findModelById(10L)).thenReturn(Optional.of(stationModel));
        when(lotteryResultRepositoryPort.findByStationIdAndDrawDate(anyLong(), any())).thenReturn(Optional.of(resultModel));
        when(mapper.withStation(any(LotteryResultModel.class), any())).thenReturn(resultModel);
        when(mapper.toResponse(any())).thenReturn(LotteryResultResponse.builder().id(1L).drawDate(LocalDate.now()).stationName("Station").build());
        var res = service.getFullBoard("MIEN_NAM", LocalDate.now(), LotteryStationSourceType.DEFAULT);
        assertThat(res.results()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-476][DP-477] getManagementBoard_success")
    void getManagementBoard_success() {
        when(lotteryStationServicePort.getScheduleModelsByDrawDate(any())).thenReturn(List.of(
                LotteryStationModel.builder().id(10L).region(com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel.builder().code("MIEN_NAM").build()).build()
        ));
        when(lotteryStationServicePort.findModelById(10L)).thenReturn(Optional.of(stationModel));
        when(lotteryResultRepositoryPort.findByStationIdAndDrawDate(anyLong(), any())).thenReturn(Optional.of(resultModel));
        when(mapper.withStation(any(LotteryResultModel.class), any())).thenReturn(resultModel);
        when(mapper.toResponse(any())).thenReturn(LotteryResultResponse.builder().id(1L).drawDate(LocalDate.now()).stationName("Station").build());
        var res = service.getManagementBoard("MIEN_NAM", LocalDate.now().minusDays(1), LocalDate.now(), LotteryStationSourceType.DEFAULT);
        assertThat(res.results()).hasSize(2);
    }

    @Test
    @DisplayName("[DP-476][DP-477] getManagementBoard_invalidDates")
    void getManagementBoard_invalidDates() {
        assertThatThrownBy(() -> service.getManagementBoard("MIEN_NAM", LocalDate.now(), LocalDate.now().minusDays(1), LotteryStationSourceType.DEFAULT))
            .isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("[DP-476][DP-477] ensureResultForBoard_createNew")
    void ensureResultForBoard_createNew() {
        when(lotteryStationServicePort.findModelById(10L)).thenReturn(Optional.of(stationModel));
        when(lotteryResultRepositoryPort.findByStationIdAndDrawDate(anyLong(), any())).thenReturn(Optional.empty());
        when(lotteryResultRepositoryPort.save(any())).thenReturn(resultModel);
        when(mapper.withStation(any(LotteryResultModel.class), any())).thenReturn(resultModel);
        
        var res = service.ensureResultForBoard(10L, LocalDate.now());
        assertThat(res).isNotNull();
    }

    @Test
    @DisplayName("[DP-476][DP-477] syncResult_notFound")
    void syncResult_notFound() {
        when(lotteryResultRepositoryPort.findById(1L)).thenReturn(Optional.empty());
        service.syncResult(1L, LotteryStationSourceType.DEFAULT);
        verify(lotteryResultRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-476][DP-477] syncResult_success")
    void syncResult_success() {
        when(lotteryResultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(lotteryStationServicePort.findModelById(10L)).thenReturn(Optional.of(stationModel));
        when(lotteryResultSourceServicePort.preview(any(), anyLong(), any())).thenReturn(new com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourcePreviewResult(null, null, null, null, null, null, null, 0, null, List.of(), null));
        service.syncResult(1L, LotteryStationSourceType.DEFAULT);
        verify(lotteryResultDetailServicePort).syncFromSource(anyLong(), anyList(), anyList());
    }

    @Test
    @DisplayName("[DP-476][DP-477] syncResult_domainExceptionEmptySource_withSave")
    void syncResult_domainExceptionEmptySource_withSave() {
        when(lotteryResultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(lotteryStationServicePort.findModelById(10L)).thenReturn(Optional.of(stationModel));
        when(lotteryResultSourceServicePort.preview(any(), anyLong(), any())).thenThrow(new DomainException(ErrorCode.LOTTERY_RESULT_SOURCE_EMPTY));
        when(lotteryResultDetailServicePort.getByLotteryResultId(1L)).thenReturn(List.of());
        when(prizeStructureServicePort.getModelsByRegion(any())).thenReturn(List.of());
        
        service.syncResult(1L, LotteryStationSourceType.DEFAULT);
        verify(lotteryResultRepositoryPort, times(1)).save(any());
    }

    @Test
    @DisplayName("[DP-476][DP-477] syncResult_locked")
    void syncResult_locked() {
        java.util.concurrent.ConcurrentMap<String, java.util.concurrent.locks.ReentrantLock> syncLocks = 
            (java.util.concurrent.ConcurrentMap) ReflectionTestUtils.getField(service, "syncLocks");
        java.util.concurrent.locks.ReentrantLock mockLock = mock(java.util.concurrent.locks.ReentrantLock.class);
        when(mockLock.tryLock()).thenReturn(false);
        String lockKey = LotteryStationSourceType.DEFAULT.value() + ":1";
        syncLocks.put(lockKey, mockLock);
        
        service.syncResult(1L, LotteryStationSourceType.DEFAULT);
        verify(lotteryResultRepositoryPort, never()).findById(anyLong());
        
        syncLocks.remove(lockKey);
    }

    @Test
    @DisplayName("[DP-476][DP-477] syncResult_domainExceptionNotHandled")
    void syncResult_domainExceptionNotHandled() {
        when(lotteryResultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(lotteryStationServicePort.findModelById(10L)).thenReturn(Optional.of(stationModel));
        when(lotteryResultSourceServicePort.preview(any(), anyLong(), any())).thenThrow(new DomainException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        assertThatThrownBy(() -> service.syncResult(1L, LotteryStationSourceType.DEFAULT))
            .isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("[DP-476][DP-477] validateLiveRequest_invalidRegion")
    void validateLiveRequest_invalidRegion() {
        assertThatThrownBy(() -> service.getBoardSummary(null, LocalDate.now()))
            .isInstanceOf(DomainException.class).extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_REGION_REQUIRED);
        assertThatThrownBy(() -> service.getBoardSummary("  ", LocalDate.now()))
            .isInstanceOf(DomainException.class).extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_REGION_REQUIRED);
    }
    
    @Test
    @DisplayName("[DP-476][DP-477] validateLiveRequest_nullDate")
    void validateLiveRequest_nullDate() {
        assertThatThrownBy(() -> service.getBoardSummary("MIEN_NAM", null))
            .isInstanceOf(DomainException.class).extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_RESULT_DRAW_DATE_REQUIRED);
    }

    @Test
    @DisplayName("[DP-476][DP-477] validateAdminLiveRequest_invalidInputs")
    void validateAdminLiveRequest_invalidInputs() {
        assertThatThrownBy(() -> service.getManagementBoard(null, LocalDate.now(), LocalDate.now(), LotteryStationSourceType.DEFAULT))
            .isInstanceOf(DomainException.class).extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_REGION_REQUIRED);
        assertThatThrownBy(() -> service.getManagementBoard("MIEN_NAM", null, LocalDate.now(), LotteryStationSourceType.DEFAULT))
            .isInstanceOf(DomainException.class).extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_RESULT_DRAW_DATE_REQUIRED);
        assertThatThrownBy(() -> service.getManagementBoard("MIEN_NAM", LocalDate.now(), null, LotteryStationSourceType.DEFAULT))
            .isInstanceOf(DomainException.class).extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_RESULT_DRAW_DATE_REQUIRED);
        assertThatThrownBy(() -> service.getManagementBoard("MIEN_NAM", LocalDate.now(), LocalDate.now().minusDays(1), LotteryStationSourceType.DEFAULT))
            .isInstanceOf(DomainException.class).extracting("errorCode").isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("[DP-476][DP-477] markHistoricalRequestIfNeeded")
    void markHistoricalRequestIfNeeded() {
        LotteryResultModel model = LotteryResultModel.builder().id(1L).drawDate(LocalDate.now().minusDays(1)).build();
        when(lotteryResultDetailServicePort.getModelsByLotteryResultId(1L)).thenReturn(List.of());
        LotteryResultModel marked = ReflectionTestUtils.invokeMethod(service, "markHistoricalRequestIfNeeded", model);
        assertThat(marked.getRequestedAt()).isNotNull();

        LotteryResultModel model2 = LotteryResultModel.builder().id(2L).drawDate(LocalDate.now()).build();
        LotteryResultModel res2 = ReflectionTestUtils.invokeMethod(service, "markHistoricalRequestIfNeeded", model2);
        assertThat(res2.getRequestedAt()).isNull();

        LotteryResultModel model3 = LotteryResultModel.builder().id(3L).drawDate(LocalDate.now().minusDays(1)).build();
        model3.setRequestedAt(java.time.LocalDateTime.now().minusSeconds(1));
        LotteryResultModel res4 = ReflectionTestUtils.invokeMethod(service, "markHistoricalRequestIfNeeded", model3);
        assertThat(res4.getRequestedAt()).isAfter(java.time.LocalDateTime.now().minusSeconds(5));
    }

    @Test
    @DisplayName("[DP-476][DP-477] isLiveWindowOpen")
    void isLiveWindowOpen() {
        LotteryResultModel r = LotteryResultModel.builder().drawDate(LocalDate.now()).build();
        LotteryStationModel s = LotteryStationModel.builder().drawTime(java.time.LocalTime.now().minusMinutes(10)).build();
        boolean res = ReflectionTestUtils.invokeMethod(service, "isLiveWindowOpen", r, s);
        assertThat(res).isTrue();

        r.setDrawDate(LocalDate.now().minusDays(1));
        boolean res2 = ReflectionTestUtils.invokeMethod(service, "isLiveWindowOpen", r, s);
        assertThat(res2).isFalse();

        boolean res3 = ReflectionTestUtils.invokeMethod(service, "isLiveWindowOpen", null, s);
        assertThat(res3).isFalse();

        s.setDrawTime(java.time.LocalTime.now().plusMinutes(10));
        r.setDrawDate(LocalDate.now());
        boolean res4 = ReflectionTestUtils.invokeMethod(service, "isLiveWindowOpen", r, s);
        assertThat(res4).isFalse();
    }

    @Test
    @DisplayName("[DP-476][DP-477] isAfterBacklogDeadline")
    void isAfterBacklogDeadline() {
        LotteryStationModel s = LotteryStationModel.builder().drawTime(java.time.LocalTime.now().minusMinutes(40)).build();
        boolean res = ReflectionTestUtils.invokeMethod(service, "isAfterBacklogDeadline", s, LocalDate.now());
        assertThat(res).isTrue();

        s.setDrawTime(java.time.LocalTime.now());
        boolean res2 = ReflectionTestUtils.invokeMethod(service, "isAfterBacklogDeadline", s, LocalDate.now());
        assertThat(res2).isFalse();

        boolean res3 = ReflectionTestUtils.invokeMethod(service, "isAfterBacklogDeadline", null, LocalDate.now());
        assertThat(res3).isFalse();
    }

    @Test
    @DisplayName("[DP-476][DP-477] isHistoricalBacklogCandidate")
    void isHistoricalBacklogCandidate() {
        LotteryResultModel r = LotteryResultModel.builder().stationId(10L).drawDate(LocalDate.now().minusDays(1)).build();
        boolean res = ReflectionTestUtils.invokeMethod(service, "isHistoricalBacklogCandidate", r);
        assertThat(res).isTrue();

        r.setDrawDate(null);
        boolean res2 = ReflectionTestUtils.invokeMethod(service, "isHistoricalBacklogCandidate", r);
        assertThat(res2).isFalse();

        r.setDrawDate(LocalDate.now().plusDays(1));
        boolean res3 = ReflectionTestUtils.invokeMethod(service, "isHistoricalBacklogCandidate", r);
        assertThat(res3).isFalse();

        r.setDrawDate(LocalDate.now());
        when(lotteryStationServicePort.findModelById(10L)).thenReturn(Optional.of(LotteryStationModel.builder().drawTime(java.time.LocalTime.now().minusMinutes(40)).build()));
        boolean res4 = ReflectionTestUtils.invokeMethod(service, "isHistoricalBacklogCandidate", r);
        assertThat(res4).isTrue();
    }

    @Test
    @DisplayName("[DP-476][DP-477] applySyncOutcome")
    void applySyncOutcome() {
        LotteryResultModel r = LotteryResultModel.builder().id(1L).build();
        List<com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultDetailResponse> details = List.of(
            com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultDetailResponse.builder().prizeCode("DB").build()
        );
        List<com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel> prizes = List.of(
            com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel.builder().prizeCode("DB").prizeLevel(com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel.SPECIAL).build()
        );

        ReflectionTestUtils.invokeMethod(service, "applySyncOutcome", r, details, prizes, LotteryStationSourceType.DEFAULT, false, stationModel);
        assertThat(r.getStatus()).isEqualTo(com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus.COMPLETED);

        ReflectionTestUtils.invokeMethod(service, "applySyncOutcome", r, List.of(), prizes, LotteryStationSourceType.DEFAULT, true, stationModel);
        assertThat(r.getStatus()).isEqualTo(com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus.DRAWING);

        ReflectionTestUtils.invokeMethod(service, "applySyncOutcome", r, List.of(), prizes, LotteryStationSourceType.DEFAULT, false, stationModel);
        assertThat(r.getStatus()).isEqualTo(com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus.FAILED);

        ReflectionTestUtils.invokeMethod(service, "applySyncOutcome", r, List.of(com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultDetailResponse.builder().prizeCode("1").build()), prizes, LotteryStationSourceType.DEFAULT, false, stationModel);
        assertThat(r.getStatus()).isEqualTo(com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus.PARTIAL);
    }

    @Test
    @DisplayName("[DP-476][DP-477] resolvePollAfterSeconds")
    void resolvePollAfterSeconds() {
        LotteryResultModel r = LotteryResultModel.builder()
            .drawDate(LocalDate.now().minusDays(1))
            .requestedAt(java.time.LocalDateTime.now())
            .status(com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus.PENDING)
            .build();
        Integer poll1 = ReflectionTestUtils.invokeMethod(service, "resolvePollAfterSeconds", r, List.of());
        assertThat(poll1).isEqualTo(10);

        r.setDrawDate(LocalDate.now());
        Integer poll2 = ReflectionTestUtils.invokeMethod(service, "resolvePollAfterSeconds", r, List.of());
        assertThat(poll2).isEqualTo(60);
        
        r.setStatus(com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus.COMPLETED);
        Integer poll3 = ReflectionTestUtils.invokeMethod(service, "resolvePollAfterSeconds", r, List.of());
        assertThat(poll3).isNull();

        Integer poll4 = ReflectionTestUtils.invokeMethod(service, "resolvePollAfterSeconds", null, List.of());
        assertThat(poll4).isNull();
    }

}
