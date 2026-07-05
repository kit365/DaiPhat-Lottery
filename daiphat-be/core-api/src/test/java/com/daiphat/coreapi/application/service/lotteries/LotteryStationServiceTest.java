package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SyncLotteryStationsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationSchedulePublicResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationSyncResponse;
import com.daiphat.coreapi.application.dto.lotteries.LotteryStationSourcePreviewItem;
import com.daiphat.coreapi.application.dto.lotteries.LotteryStationSourcePreviewResult;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.event.LotteryStationDrawReminderEvent;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryStationApplicationMapper;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryRegionRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationSourceSyncPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LotteryStationService Unit Tests")
class LotteryStationServiceTest {

    @Mock
    private LotteryStationRepositoryPort lotteryStationRepositoryPort;
    @Mock
    private LotteryRegionRepositoryPort lotteryRegionRepositoryPort;
    @Mock
    private LotteryStationSourceSyncPort lotteryStationSourceSyncPort;
    @Mock
    private LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    @Mock
    private PrizeStructureRepositoryPort prizeStructureRepositoryPort;
    @Mock
    private LotteryStationApplicationMapper lotteryStationApplicationMapper;
    @Mock
    private StoragePort storagePort;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    private LotteryStationServicePort lotteryStationService;

    private LotteryStationModel stationModel;
    private LotteryRegionModel regionModel;

    @BeforeEach
    void setUp() {
        lotteryStationService = new LotteryStationService(
                lotteryStationRepositoryPort,
                lotteryRegionRepositoryPort,
                lotteryStationSourceSyncPort,
                lotteryTicketRepositoryPort,
                prizeStructureRepositoryPort,
                lotteryStationApplicationMapper,
                storagePort,
                eventPublisher
        );

        ReflectionTestUtils.setField(lotteryStationService, "drawReminderMinutes", 30L);

        regionModel = LotteryRegionModel.builder()
                .id(1L)
                .code("MIEN_NAM")
                .code("MIEN_NAM")
                .name("Miền Nam")
                .build();

        stationModel = LotteryStationModel.builder()
                .id(1L)
                .name("Station A")
                .province("Province A")
                .region(regionModel)
                .status(LotteryStationStatus.ACTIVE)
                .drawDays(new ArrayList<>(List.of(DayOfWeek.MONDAY)))
                .drawTime(LocalTime.of(16, 15))
                .nextDrawDate(LocalDate.now().plusDays(1))
                .build();
    }

    @Test
    @DisplayName("[DP-37] create_success")
    void create_success() {
        CreateLotteryStationRequest request = CreateLotteryStationRequest.builder()
                .name("Station B")
                .region("MIEN_NAM")
                .drawDays(List.of(DayOfWeek.TUESDAY))
                .drawTime(LocalTime.of(16, 15))
                .build();

        when(lotteryStationRepositoryPort.existsByName("Station B")).thenReturn(false);
        when(lotteryStationApplicationMapper.toModel(request)).thenReturn(stationModel);
        when(lotteryRegionRepositoryPort.findByCode("MIEN_NAM")).thenReturn(Optional.of(regionModel));
        when(prizeStructureRepositoryPort.findByRegionCode("MIEN_NAM")).thenReturn(List.of(PrizeStructureModel.builder().build()));
        when(lotteryStationRepositoryPort.save(any())).thenReturn(stationModel);
        when(lotteryStationApplicationMapper.toResponse(stationModel)).thenReturn(LotteryStationResponse.builder().id(1L).build());

        LotteryStationResponse res = lotteryStationService.create(request);

        assertThat(res.id()).isEqualTo(1L);
        verify(lotteryRegionRepositoryPort).save(regionModel);
    }

    @Test
    @DisplayName("[DP-37] create_throwsNameExisted")
    void create_throwsNameExisted() {
        CreateLotteryStationRequest request = CreateLotteryStationRequest.builder().name("Station A").build();
        when(lotteryStationRepositoryPort.existsByName("Station A")).thenReturn(true);

        assertThatThrownBy(() -> lotteryStationService.create(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_STATION_NAME_EXISTED);
    }

    @Test
    @DisplayName("[DP-37] getById_success")
    void getById_success() {
        when(lotteryStationRepositoryPort.findById(1L)).thenReturn(Optional.of(stationModel));
        when(lotteryTicketRepositoryPort.sumQuantityByProductIdAndStatuses(eq(1L), any())).thenReturn(10L);
        when(lotteryStationApplicationMapper.toResponse(stationModel)).thenReturn(LotteryStationResponse.builder().id(1L).inventoryCount(10).build());

        LotteryStationResponse res = lotteryStationService.getById(1L);
        assertThat(res.id()).isEqualTo(1L);
        assertThat(res.inventoryCount()).isEqualTo(10);
    }

    @Test
    @DisplayName("[DP-37] getModelById_success")
    void getModelById_success() {
        when(lotteryStationRepositoryPort.findById(1L)).thenReturn(Optional.of(stationModel));
        when(lotteryTicketRepositoryPort.sumQuantityByProductIdAndStatuses(eq(1L), any())).thenReturn(5L);

        LotteryStationModel res = lotteryStationService.getModelById(1L);
        assertThat(res.getId()).isEqualTo(1L);
        assertThat(res.getInventoryCount()).isEqualTo(5);
    }

    @Test
    @DisplayName("[DP-37] getProductOrThrow_throwsNotFound")
    void getProductOrThrow_throwsNotFound() {
        when(lotteryStationRepositoryPort.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lotteryStationService.getById(1L))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_STATION_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-37] findModelById_success")
    void findModelById_success() {
        when(lotteryStationRepositoryPort.findById(1L)).thenReturn(Optional.of(stationModel));
        Optional<LotteryStationModel> res = lotteryStationService.findModelById(1L);
        assertThat(res).isPresent();
    }

    @Test
    @DisplayName("[DP-37] findModelById_empty")
    void findModelById_empty() {
        when(lotteryStationRepositoryPort.findById(1L)).thenReturn(Optional.empty());
        Optional<LotteryStationModel> res = lotteryStationService.findModelById(1L);
        assertThat(res).isEmpty();
    }

    @Test
    @DisplayName("[DP-37] getScheduleModelsByDrawDate_success")
    void getScheduleModelsByDrawDate_success() {
        stationModel.setDrawDays(List.of(LocalDate.now().getDayOfWeek()));
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(stationModel));
        List<LotteryStationModel> res = lotteryStationService.getScheduleModelsByDrawDate(LocalDate.now());
        assertThat(res).hasSize(1);
    }

    @Test
    @DisplayName("[DP-37] getByDrawDate_success")
    void getByDrawDate_success() {
        stationModel.setDrawDays(List.of(LocalDate.now().getDayOfWeek()));
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(stationModel));
        when(lotteryStationApplicationMapper.toResponse(stationModel)).thenReturn(LotteryStationResponse.builder().id(1L).build());

        List<LotteryStationResponse> res = lotteryStationService.getByDrawDate(LocalDate.now());
        assertThat(res).hasSize(1);
    }

    @Test
    @DisplayName("[DP-37] getDrawingToday_success")
    void getDrawingToday_success() {
        stationModel.setDrawDays(List.of(LocalDate.now().getDayOfWeek()));
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(stationModel));
        when(lotteryStationApplicationMapper.toResponse(stationModel)).thenReturn(LotteryStationResponse.builder().id(1L).build());

        List<LotteryStationResponse> res = lotteryStationService.getDrawingToday();
        assertThat(res).hasSize(1);
    }

    @Test
    @DisplayName("[DP-37] getDrawingTomorrow_success")
    void getDrawingTomorrow_success() {
        stationModel.setDrawDays(List.of(LocalDate.now().plusDays(1).getDayOfWeek()));
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(stationModel));
        when(lotteryStationApplicationMapper.toResponse(stationModel)).thenReturn(LotteryStationResponse.builder().id(1L).build());

        List<LotteryStationResponse> res = lotteryStationService.getDrawingTomorrow();
        assertThat(res).hasSize(1);
    }

    @Test
    @DisplayName("[DP-37] getAll_pagedSorting_success")
    void getAll_pagedSorting_success() {
        Page<LotteryStationModel> page = new PageImpl<>(List.of(stationModel));
        when(lotteryStationRepositoryPort.findAll(any(PageRequest.class), eq("Search"), eq(LotteryStationStatus.ACTIVE), eq("TYPE"), eq("REG"), anyList())).thenReturn(page);
        when(lotteryStationApplicationMapper.toResponse(stationModel)).thenReturn(LotteryStationResponse.builder().id(1L).build());

        PageResponse<LotteryStationResponse> res = lotteryStationService.getAll(1, 10, "Search", "ACTIVE", "TYPE", "REG", List.of("MON"), "id", "asc");
        assertThat(res.getRecordList()).hasSize(1);
        assertThat(res.getPagination().getTotalRecords()).isEqualTo(1);
    }

    @Test
    @DisplayName("[DP-37] getAll_defaultSorting_success")
    void getAll_defaultSorting_success() {
        LotteryStationModel model2 = LotteryStationModel.builder().drawDays(List.of(DayOfWeek.TUESDAY)).name("B").build();
        Page<LotteryStationModel> page = new PageImpl<>(List.of(model2, stationModel)); // TUESDAY, MONDAY
        when(lotteryStationRepositoryPort.findAll(any(PageRequest.class), any(), any(), any(), any(), any())).thenReturn(page);
        when(lotteryStationApplicationMapper.toResponse(any())).thenReturn(LotteryStationResponse.builder().build());

        PageResponse<LotteryStationResponse> res = lotteryStationService.getAll(1, 10, null, null, null, null, null, null, null);
        assertThat(res.getRecordList()).hasSize(2); // Sorted by MONDAY then TUESDAY
    }

    @Test
    @DisplayName("[DP-37] getPublicSchedule_success")
    void getPublicSchedule_success() {
        LotteryStationModel modelA = LotteryStationModel.builder().name("A").region(regionModel).status(LotteryStationStatus.ACTIVE).drawTime(LocalTime.of(16,0)).build();
        LotteryStationModel modelB = LotteryStationModel.builder().name("B").region(regionModel).status(LotteryStationStatus.ACTIVE).drawTime(LocalTime.of(17,0)).build();
        LotteryStationModel modelC = LotteryStationModel.builder().name("C").region(regionModel).status(LotteryStationStatus.ACTIVE).drawTime(null).build();
        LotteryStationModel modelD = LotteryStationModel.builder().name("D").region(LotteryRegionModel.builder().code("MIEN_BAC").build()).status(LotteryStationStatus.ACTIVE).drawTime(LocalTime.of(16,0)).build();

        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(modelD, modelC, modelB, modelA));
        when(lotteryStationApplicationMapper.toSchedulePublicResponse(any())).thenReturn(LotteryStationSchedulePublicResponse.builder().build());

        List<LotteryStationSchedulePublicResponse> res = lotteryStationService.getPublicSchedule(null, null, null, null);
        assertThat(res).hasSize(4); // A, B, C, D sorted by Region(Nam(1), Bac(3)), Time
    }

    @Test
    @DisplayName("[DP-37] getPublicSchedule_filtersStationIds")
    void getPublicSchedule_filtersStationIds() {
        LotteryStationModel modelA = LotteryStationModel.builder().id(1L).name("A").region(regionModel).status(LotteryStationStatus.ACTIVE).drawTime(LocalTime.of(16, 0)).build();
        LotteryStationModel modelB = LotteryStationModel.builder().id(2L).name("B").region(regionModel).status(LotteryStationStatus.ACTIVE).drawTime(LocalTime.of(17, 0)).build();
        LotteryStationModel modelC = LotteryStationModel.builder().id(3L).name("C").region(regionModel).status(LotteryStationStatus.ACTIVE).drawTime(null).build();

        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(modelC, modelB, modelA));
        when(lotteryStationApplicationMapper.toSchedulePublicResponse(any())).thenReturn(LotteryStationSchedulePublicResponse.builder().build());

        List<LotteryStationSchedulePublicResponse> res = lotteryStationService.getPublicSchedule(null, null, List.of(1L, 3L), null);
        assertThat(res).hasSize(2);
    }

    @Test
    @DisplayName("[DP-37] update_success")
    void update_success() {
        UpdateLotteryStationRequest req = UpdateLotteryStationRequest.builder().name("New Name").region("MIEN_BAC").status("INACTIVE").build();
        LotteryRegionModel bacRegion = LotteryRegionModel.builder().code("MIEN_BAC").build();

        when(lotteryStationRepositoryPort.findById(1L)).thenReturn(Optional.of(stationModel));
        when(lotteryRegionRepositoryPort.findByCode("MIEN_BAC")).thenReturn(Optional.of(bacRegion));
        when(prizeStructureRepositoryPort.findByRegionCode("MIEN_BAC")).thenReturn(List.of(PrizeStructureModel.builder().build()));
        when(lotteryStationRepositoryPort.save(any())).thenReturn(stationModel);
        when(lotteryStationApplicationMapper.toResponse(stationModel)).thenReturn(LotteryStationResponse.builder().id(1L).build());

        LotteryStationResponse res = lotteryStationService.update(1L, req);
        assertThat(res.id()).isEqualTo(1L);
        verify(lotteryStationRepositoryPort).save(stationModel);
        verify(lotteryRegionRepositoryPort, times(2)).save(any()); // decrease old, increase new
    }

    @Test
    @DisplayName("[DP-37] update_throwsNameExisted")
    void update_throwsNameExisted() {
        UpdateLotteryStationRequest req = UpdateLotteryStationRequest.builder().name("New Name").build();
        when(lotteryStationRepositoryPort.findById(1L)).thenReturn(Optional.of(stationModel));
        when(lotteryStationRepositoryPort.existsByName("New Name")).thenReturn(true);

        assertThatThrownBy(() -> lotteryStationService.update(1L, req))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_STATION_NAME_EXISTED);
    }

    @Test
    @DisplayName("[DP-37] delete_success")
    void delete_success() {
        when(lotteryStationRepositoryPort.findById(1L)).thenReturn(Optional.of(stationModel));
        lotteryStationService.delete(1L);
        verify(lotteryStationRepositoryPort).deleteById(1L);
        verify(lotteryRegionRepositoryPort).save(regionModel); // decrease
    }

    @Test
    @DisplayName("[DP-37] uploadImage_success")
    void uploadImage_success() {
        UploadRequest req = new UploadRequest("data".getBytes(), "test.png", "image/png", null);
        when(lotteryStationRepositoryPort.findById(1L)).thenReturn(Optional.of(stationModel));
        when(storagePort.upload(any())).thenReturn(new StorageResult("id", "url"));
        when(lotteryStationRepositoryPort.save(any())).thenReturn(stationModel);
        when(lotteryStationApplicationMapper.toResponse(stationModel)).thenReturn(LotteryStationResponse.builder().id(1L).build());

        LotteryStationResponse res = lotteryStationService.uploadImage(1L, req);
        assertThat(res.id()).isEqualTo(1L);
        verify(storagePort).upload(any());
    }

    @Test
    @DisplayName("[DP-37] syncStations_success_createsAndUpdates")
    void syncStations_success() {
        SyncLotteryStationsRequest req = SyncLotteryStationsRequest.builder()
                .source(LotteryStationSourceType.MINH_NGOC)
                .region("MIEN_NAM")
                .defaultPrice(BigDecimal.valueOf(10000))
                .build();

        LotteryStationSourcePreviewItem item1 = LotteryStationSourcePreviewItem.builder()
                .name("New Station")
                .canonicalName("New Station")
                .region("MIEN_NAM")
                .drawDays(List.of("MONDAY"))
                .drawTime("16:15")
                .build();

        LotteryStationSourcePreviewItem item2 = LotteryStationSourcePreviewItem.builder()
                .name("Station A")
                .canonicalName("Station A")
                .region("MIEN_NAM")
                .drawDays(List.of("MONDAY"))
                .drawTime("16:15")
                .build();

        LotteryStationSourcePreviewResult preview = LotteryStationSourcePreviewResult.builder()
                .source(LotteryStationSourceType.MINH_NGOC.name())
                .items(List.of(item1, item2))
                .build();

        when(lotteryRegionRepositoryPort.findByCode("MIEN_NAM")).thenReturn(Optional.of(regionModel));
        when(lotteryStationSourceSyncPort.preview(any(), eq("MIEN_NAM"))).thenReturn(preview);
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(stationModel)); // station A exists
        when(prizeStructureRepositoryPort.findByRegionCode("MIEN_NAM")).thenReturn(List.of(PrizeStructureModel.builder().build()));
        when(lotteryStationRepositoryPort.save(any())).thenReturn(stationModel); // save both new and updated

        LotteryStationSyncResponse res = lotteryStationService.syncStations(req);

        assertThat(res.createdCount()).isEqualTo(1);
        assertThat(res.updatedCount()).isEqualTo(1);
        assertThat(res.items()).hasSize(2);
    }

    @Test
    @DisplayName("[DP-37] syncStations_throwsEmpty")
    void syncStations_throwsEmpty() {
        SyncLotteryStationsRequest req = SyncLotteryStationsRequest.builder().region("MIEN_NAM").build();
        when(lotteryRegionRepositoryPort.findByCode("MIEN_NAM")).thenReturn(Optional.of(regionModel));
        when(lotteryStationSourceSyncPort.preview(any(), any())).thenReturn(LotteryStationSourcePreviewResult.builder().build());

        assertThatThrownBy(() -> lotteryStationService.syncStations(req))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_STATION_SYNC_SOURCE_EMPTY);
    }

    @Test
    @DisplayName("[DP-37] syncStations_throwsInvalid")
    void syncStations_throwsInvalid() {
        SyncLotteryStationsRequest req = SyncLotteryStationsRequest.builder().region("MIEN_NAM").build();
        LotteryStationSourcePreviewItem item1 = LotteryStationSourcePreviewItem.builder().build(); // invalid
        LotteryStationSourcePreviewResult preview = LotteryStationSourcePreviewResult.builder().items(List.of(item1)).build();

        when(lotteryRegionRepositoryPort.findByCode("MIEN_NAM")).thenReturn(Optional.of(regionModel));
        when(lotteryStationSourceSyncPort.preview(any(), any())).thenReturn(preview);

        assertThatThrownBy(() -> lotteryStationService.syncStations(req))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_STATION_SYNC_SOURCE_INVALID);
    }

    @Test
    @DisplayName("[DP-37] syncStations_throwsDuplicate")
    void syncStations_throwsDuplicate() {
        SyncLotteryStationsRequest req = SyncLotteryStationsRequest.builder().region("MIEN_NAM").build();
        LotteryStationSourcePreviewItem item1 = LotteryStationSourcePreviewItem.builder()
                .canonicalName("A").region("MIEN_NAM").drawDays(List.of("MONDAY")).drawTime("16:15").build();
        LotteryStationSourcePreviewItem item2 = LotteryStationSourcePreviewItem.builder()
                .canonicalName("a").region("MIEN_NAM").drawDays(List.of("MONDAY")).drawTime("16:15").build(); // duplicate normalized
        LotteryStationSourcePreviewResult preview = LotteryStationSourcePreviewResult.builder().items(List.of(item1, item2)).build();

        when(lotteryRegionRepositoryPort.findByCode("MIEN_NAM")).thenReturn(Optional.of(regionModel));
        when(lotteryStationSourceSyncPort.preview(any(), any())).thenReturn(preview);

        assertThatThrownBy(() -> lotteryStationService.syncStations(req))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_STATION_SYNC_SOURCE_DUPLICATE);
    }

    @Test
    @DisplayName("[DP-37] recalculateInventory_withNullId_skips")
    void recalculateInventory_nullId() {
        LotteryStationModel model = LotteryStationModel.builder().build();
        ReflectionTestUtils.invokeMethod(lotteryStationService, "recalculateInventory", model);
        assertThat(model.getInventoryCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("[DP-37] recalculateNextDrawDates_success")
    void recalculateNextDrawDates_success() {
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(stationModel));
        when(lotteryStationRepositoryPort.updateNextDrawDate(eq(1L), any())).thenReturn(1);

        int updated = lotteryStationService.recalculateNextDrawDates();
        assertThat(updated).isEqualTo(1);
    }

    @Test
    @DisplayName("[DP-37] recalculateNextDrawDates_handlesException")
    void recalculateNextDrawDates_handlesException() {
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(stationModel));
        when(lotteryStationRepositoryPort.updateNextDrawDate(eq(1L), any())).thenThrow(new DomainException(ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE));

        int updated = lotteryStationService.recalculateNextDrawDates();
        assertThat(updated).isEqualTo(0);
    }

    @Test
    @DisplayName("[DP-37] sendUpcomingDrawReminderNotifications_success")
    void sendUpcomingDrawReminderNotifications_success() {
        LocalTime current = LocalTime.now().withSecond(0).withNano(0);
        stationModel.setDrawTime(current.plusMinutes(30));
        when(lotteryStationRepositoryPort.findByNextDrawDate(any())).thenReturn(List.of(stationModel));

        int result = lotteryStationService.sendUpcomingDrawReminderNotifications();
        assertThat(result).isEqualTo(1);
        verify(eventPublisher).publishEvent(any(LotteryStationDrawReminderEvent.class));
    }

    @Test
    @DisplayName("[DP-37] realignActiveTicketsToCurrentDraw_skipsWhenSameDate")
    void realignActiveTicketsToCurrentDraw_skipsWhenSameDate() {
        LocalDate date = LocalDate.now();
        stationModel.setNextDrawDate(date);
        ReflectionTestUtils.invokeMethod(lotteryStationService, "realignActiveTicketsToCurrentDraw", stationModel, date);
        verify(lotteryTicketRepositoryPort, never()).findAllByStationIdAndDrawDateAndStatuses(anyLong(), any(), anyList());
    }

    @Test
    @DisplayName("[DP-37] realignActiveTicketsToCurrentDraw_updatesTickets")
    void realignActiveTicketsToCurrentDraw_updatesTickets() {
        LocalDate oldDate = LocalDate.now().minusDays(1);
        stationModel.setNextDrawDate(LocalDate.now());
        LotteryTicketModel ticket = LotteryTicketModel.builder().id(1L).drawDate(oldDate).build();

        when(lotteryTicketRepositoryPort.findAllByStationIdAndDrawDateAndStatuses(eq(1L), eq(oldDate), anyList()))
                .thenReturn(List.of(ticket));

        ReflectionTestUtils.invokeMethod(lotteryStationService, "realignActiveTicketsToCurrentDraw", stationModel, oldDate);

        verify(lotteryTicketRepositoryPort).save(ticket);
        assertThat(ticket.getDrawDate()).isEqualTo(stationModel.getNextDrawDate());
    }

    @Test
    @DisplayName("[DP-37] parseDrawDays_throwsWhenInvalid")
    void parseDrawDays_throwsWhenInvalid() {
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(lotteryStationService, "parseDrawDays", List.of("INVALID"), "Test"))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE);
    }

    @Test
    @DisplayName("[DP-37] parseDrawTime_throwsWhenInvalid")
    void parseDrawTime_throwsWhenInvalid() {
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(lotteryStationService, "parseDrawTime", "invalid", "Test"))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE);
    }

    @Test
    @DisplayName("[DP-37] syncNextDrawDate_wrapsException")
    void syncNextDrawDate_wrapsException() {
        stationModel.setDrawDays(List.of()); // Invalid draw days will throw from DrawScheduleUtils
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(lotteryStationService, "syncNextDrawDate", stationModel))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE);
    }

    @Test
    @DisplayName("[DP-37] parseDrawDays_throwsWhenIllegalArgument")
    void parseDrawDays_throwsWhenIllegalArgument() {
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(lotteryStationService, "parseDrawDays", List.of("INVALID_DAY"), "Test"))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE);
    }

    @Test
    @DisplayName("[DP-37] parseDrawTime_throwsWhenBlank")
    void parseDrawTime_throwsWhenBlank() {
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(lotteryStationService, "parseDrawTime", " ", "Test"))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE);
    }

    @Test
    @DisplayName("[DP-37] requireCanonicalName_fallbackToName")
    void requireCanonicalName_fallbackToName() {
        LotteryStationSourcePreviewItem item = LotteryStationSourcePreviewItem.builder().name("Fallback Name").build();
        String result = ReflectionTestUtils.invokeMethod(lotteryStationService, "requireCanonicalName", item);
        assertThat(result).isEqualTo("Fallback Name");
    }

    @Test
    @DisplayName("[DP-37] requireCanonicalName_throwsWhenBothBlank")
    void requireCanonicalName_throwsWhenBothBlank() {
        LotteryStationSourcePreviewItem item = LotteryStationSourcePreviewItem.builder().build();
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(lotteryStationService, "requireCanonicalName", item))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_STATION_SYNC_CANONICAL_NAME_REQUIRED);
    }

    @Test
    @DisplayName("[DP-37] matchesRegion_trueForBlankRegion")
    void matchesRegion_trueForBlankRegion() {
        boolean result = ReflectionTestUtils.invokeMethod(lotteryStationService, "matchesRegion", stationModel, " ");
        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("[DP-37] matchesRegion_falseForNullModelRegion")
    void matchesRegion_falseForNullModelRegion() {
        stationModel.setRegion(null);
        boolean result = ReflectionTestUtils.invokeMethod(lotteryStationService, "matchesRegion", stationModel, "MIEN_NAM");
        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("[DP-37] comparePublicSchedule_regionSort")
    void comparePublicSchedule_regionSort() {
        LotteryStationModel left = LotteryStationModel.builder().region(LotteryRegionModel.builder().code("MIEN_TRUNG").build()).build();
        LotteryStationModel right = LotteryStationModel.builder().region(LotteryRegionModel.builder().code("MIEN_NAM").build()).build();
        int result = ReflectionTestUtils.invokeMethod(lotteryStationService, "comparePublicSchedule", left, right);
        assertThat(result).isPositive(); // TRUNG (2) > NAM (1)
    }

    @Test
    @DisplayName("[DP-37] comparePublicSchedule_nameSort")
    void comparePublicSchedule_nameSort() {
        LotteryStationModel left = LotteryStationModel.builder().name("A").region(LotteryRegionModel.builder().code("MIEN_NAM").build()).drawTime(LocalTime.of(16,0)).build();
        LotteryStationModel right = LotteryStationModel.builder().name("B").region(LotteryRegionModel.builder().code("MIEN_NAM").build()).drawTime(LocalTime.of(16,0)).build();
        int result = ReflectionTestUtils.invokeMethod(lotteryStationService, "comparePublicSchedule", left, right);
        assertThat(result).isNegative();
    }

    @Test
    @DisplayName("[DP-37] requireRegionHasPrizeStructures_throwsWhenNull")
    void requireRegionHasPrizeStructures_throwsWhenNull() {
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(lotteryStationService, "requireRegionHasPrizeStructures", (LotteryRegionModel) null))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_REGION_REQUIRED);
    }

    @Test
    @DisplayName("[DP-37] requireRegionHasPrizeStructures_throwsWhenNotFound")
    void requireRegionHasPrizeStructures_throwsWhenNotFound() {
        when(prizeStructureRepositoryPort.findByRegionCode(any())).thenReturn(List.of());
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(lotteryStationService, "requireRegionHasPrizeStructures", regionModel))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-37] sortStationsByDrawDayThenName_nullDays")
    void sortStationsByDrawDayThenName_nullDays() {
        LotteryStationModel a = LotteryStationModel.builder().name("Z").build();
        LotteryStationModel b = LotteryStationModel.builder().name("A").build();
        List<LotteryStationModel> result = ReflectionTestUtils.invokeMethod(lotteryStationService, "sortStationsByDrawDayThenName", List.of(a, b));
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getName()).isEqualTo("A");
    }

    @Test
    @DisplayName("[DP-37] getMinDayValue_nullDays")
    void getMinDayValue_nullDays() {
        int result = ReflectionTestUtils.invokeMethod(lotteryStationService, "getMinDayValue", (List<DayOfWeek>) null);
        assertThat(result).isEqualTo(99);
    }
    @Test
    @DisplayName("[DP-37] matchesRegion_falseWhenRegionRegionIsNull")
    void matchesRegion_falseWhenRegionRegionIsNull() {
        stationModel.setRegion(LotteryRegionModel.builder().code(null).build());
        boolean result = ReflectionTestUtils.invokeMethod(lotteryStationService, "matchesRegion", stationModel, "MIEN_NAM");
        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("[DP-37] sortDrawDays_nullOrEmpty")
    void sortDrawDays_nullOrEmpty() {
        LotteryStationModel m1 = LotteryStationModel.builder().drawDays(null).build();
        ReflectionTestUtils.invokeMethod(lotteryStationService, "sortDrawDays", m1);
        assertThat(m1.getDrawDays()).isNull();

        LotteryStationModel m2 = LotteryStationModel.builder().drawDays(List.of()).build();
        ReflectionTestUtils.invokeMethod(lotteryStationService, "sortDrawDays", m2);
        assertThat(m2.getDrawDays()).isEmpty();
    }

    @Test
    @DisplayName("[DP-37] sortDrawDays_populated")
    void sortDrawDays_populated() {
        LotteryStationModel m1 = LotteryStationModel.builder().drawDays(List.of(DayOfWeek.SUNDAY, DayOfWeek.MONDAY)).build();
        ReflectionTestUtils.invokeMethod(lotteryStationService, "sortDrawDays", m1);
        assertThat(m1.getDrawDays()).containsExactly(DayOfWeek.MONDAY, DayOfWeek.SUNDAY);
    }

    @Test
    @DisplayName("[DP-37] recalculateInventory_byId")
    void recalculateInventory_byId() {
        when(lotteryStationRepositoryPort.findById(1L)).thenReturn(Optional.of(stationModel));
        when(lotteryTicketRepositoryPort.sumQuantityByProductIdAndStatuses(anyLong(), anyList())).thenReturn(10L);
        lotteryStationService.recalculateInventory(1L);
        verify(lotteryStationRepositoryPort).save(stationModel);
        assertThat(stationModel.getInventoryCount()).isEqualTo(10);
    }

    @Test
    @DisplayName("[DP-37] parseDrawDays_nullOrEmpty")
    void parseDrawDays_nullOrEmpty() {
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(lotteryStationService, "parseDrawDays", (List<String>) null, "Test"))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(lotteryStationService, "parseDrawDays", List.of(), "Test"))
                .isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("[DP-37] resolveRegion_throwsWhenNotFound")
    void resolveRegion_throwsWhenNotFound() {
        when(lotteryRegionRepositoryPort.findByCode(anyString())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(lotteryStationService, "resolveRegion", "INVALID"))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_STATION_SYNC_REGION_UNSUPPORTED);
    }

    @Test
    @DisplayName("[DP-37] createStationFromSource_nullDefaultPrice")
    void createStationFromSource_nullDefaultPrice() {
        LotteryStationSourcePreviewItem item = LotteryStationSourcePreviewItem.builder().canonicalName("Name").drawTime("16:15").drawDays(List.of("MONDAY")).build();
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(lotteryStationService, "createStationFromSource", item, null, regionModel))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_STATION_SYNC_DEFAULT_PRICE_REQUIRED);
    }

    @Test
    @DisplayName("[DP-37] comparePublicSchedule_timeCompare")
    void comparePublicSchedule_timeCompare() {
        LotteryStationModel left = LotteryStationModel.builder().region(regionModel).drawTime(LocalTime.of(16,0)).build();
        LotteryStationModel right = LotteryStationModel.builder().region(regionModel).drawTime(null).build();
        int result = ReflectionTestUtils.invokeMethod(lotteryStationService, "comparePublicSchedule", left, right);
        assertThat(result).isNegative(); // left has time, right doesn't

        int result2 = ReflectionTestUtils.invokeMethod(lotteryStationService, "comparePublicSchedule", right, left);
        assertThat(result2).isPositive(); // left doesn't have time, right does
    }

    @Test
    @DisplayName("[DP-37] update_noRegionChangeAndInactive")
    void update_noRegionChangeAndInactive() {
        when(lotteryStationRepositoryPort.findById(1L)).thenReturn(Optional.of(stationModel));
        when(lotteryStationRepositoryPort.save(any())).thenAnswer(i -> i.getArgument(0));

        UpdateLotteryStationRequest req = UpdateLotteryStationRequest.builder()
                .name("New Name")
                .status("INACTIVE")
                .build();
        lotteryStationService.update(1L, req);
        assertThat(stationModel.getStatus()).isEqualTo(LotteryStationStatus.INACTIVE);
    }

    @Test
    @DisplayName("[DP-37] hasDrawDay_emptyOrNull")
    void hasDrawDay_emptyOrNull() {
        stationModel.setDrawDays(null);
        boolean r1 = ReflectionTestUtils.invokeMethod(lotteryStationService, "hasDrawDay", stationModel, DayOfWeek.MONDAY);
        assertThat(r1).isFalse();

        stationModel.setDrawDays(List.of());
        boolean r2 = ReflectionTestUtils.invokeMethod(lotteryStationService, "hasDrawDay", stationModel, DayOfWeek.MONDAY);
        assertThat(r2).isFalse();
    }
    
    @Test
    @DisplayName("[DP-37] realignActiveTicketsToCurrentDraw_nulls")
    void realignActiveTicketsToCurrentDraw_nulls() {
        ReflectionTestUtils.invokeMethod(lotteryStationService, "realignActiveTicketsToCurrentDraw", LotteryStationModel.builder().build(), LocalDate.now());
        ReflectionTestUtils.invokeMethod(lotteryStationService, "realignActiveTicketsToCurrentDraw", stationModel, (LocalDate) null);
        verify(lotteryTicketRepositoryPort, never()).findAllByStationIdAndDrawDateAndStatuses(anyLong(), any(), anyList());
    }

    @Test
    @DisplayName("[DP-37] realignActiveTicketsToCurrentDraw_datesEqual")
    void realignActiveTicketsToCurrentDraw_datesEqual() {
        LocalDate now = LocalDate.now();
        stationModel.setNextDrawDate(now);
        ReflectionTestUtils.invokeMethod(lotteryStationService, "realignActiveTicketsToCurrentDraw", stationModel, now);
        verify(lotteryTicketRepositoryPort, never()).findAllByStationIdAndDrawDateAndStatuses(anyLong(), any(), anyList());
    }

    @Test
    @DisplayName("[DP-37] increaseRegionStationCount_null")
    void increaseRegionStationCount_null() {
        ReflectionTestUtils.invokeMethod(lotteryStationService, "increaseRegionStationCount", (LotteryRegionModel) null);
        verify(lotteryRegionRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-37] decreaseRegionStationCount_null")
    void decreaseRegionStationCount_null() {
        ReflectionTestUtils.invokeMethod(lotteryStationService, "decreaseRegionStationCount", (LotteryRegionModel) null);
        verify(lotteryRegionRepositoryPort, never()).save(any());
    }
}
