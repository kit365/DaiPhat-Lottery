package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryStationApplicationMapper;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryRegionRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationSourceSyncPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType;
import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("LotteryStationService Unit Tests")
class LotteryStationServiceTest {

    private static final Long STATION_ID = 42L;
    private static final String STATION_NAME = "TP. Hồ Chí Minh";
    private static final String REGION = "MIEN_NAM";

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
    private org.springframework.context.ApplicationEventPublisher applicationEventPublisher;

    private LotteryStationService lotteryStationService;

    private LotteryRegionModel southRegion;
    private LotteryRegionModel northRegion;
    private CreateLotteryStationRequest createRequest;
    private LotteryStationModel stationModel;
    private LotteryStationModel savedStationModel;
    private LotteryStationResponse stationResponse;
    private List<PrizeStructureModel> seededPrizeStructures;

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
                applicationEventPublisher
        );

        southRegion = buildRegion(REGION);
        northRegion = buildRegion("MIEN_BAC");

        createRequest = CreateLotteryStationRequest.builder()
                .name(STATION_NAME)
                .province("Hồ Chí Minh")
                .region(REGION)
                .price(BigDecimal.valueOf(10000))
                .drawDays(List.of(java.time.DayOfWeek.TUESDAY, java.time.DayOfWeek.WEDNESDAY))
                .drawTime(java.time.LocalTime.of(16, 15))
                .build();

        stationModel = LotteryStationModel.builder()
                .name(STATION_NAME)
                .province("Hồ Chí Minh")
                .price(BigDecimal.valueOf(10000))
                .drawDays(List.of(java.time.DayOfWeek.TUESDAY, java.time.DayOfWeek.WEDNESDAY))
                .drawTime(java.time.LocalTime.of(16, 15))
                .build();

        savedStationModel = LotteryStationModel.builder()
                .id(STATION_ID)
                .name(STATION_NAME)
                .province("Hồ Chí Minh")
                .region(southRegion)
                .price(BigDecimal.valueOf(10000))
                .status(LotteryStationStatus.DRAFT)
                .drawDays(List.of(java.time.DayOfWeek.TUESDAY, java.time.DayOfWeek.WEDNESDAY))
                .drawTime(java.time.LocalTime.of(16, 15))
                .build();

        stationResponse = LotteryStationResponse.builder()
                .id(STATION_ID)
                .name(STATION_NAME)
                .region(REGION)
                .type(LotteryStationType.TRADITIONAL.name())
                .status(LotteryStationStatus.DRAFT.name())
                .price(BigDecimal.valueOf(10000))
                .build();

        seededPrizeStructures = List.of(
                prizeStructure(PrizeLevel.SPECIAL, "DB", 1, 6, MatchFrom.LAST, 0),
                prizeStructure(PrizeLevel.FIRST, "G1", 1, 5, MatchFrom.LAST, 1),
                prizeStructure(PrizeLevel.SECOND, "G2", 1, 5, MatchFrom.LAST, 2),
                prizeStructure(PrizeLevel.THIRD, "G3", 2, 5, MatchFrom.LAST, 3),
                prizeStructure(PrizeLevel.FOURTH, "G4", 7, 5, MatchFrom.LAST, 4),
                prizeStructure(PrizeLevel.FIFTH, "G5", 1, 4, MatchFrom.LAST, 5),
                prizeStructure(PrizeLevel.SIXTH, "G6", 3, 4, MatchFrom.LAST, 6),
                prizeStructure(PrizeLevel.SEVENTH, "G7", 1, 3, MatchFrom.LAST, 7),
                prizeStructure(PrizeLevel.EIGHTH, "G8", 1, 2, MatchFrom.LAST, 8),
                prizeStructure(PrizeLevel.SUB_SPECIAL, "DB_PHU", 1, null, MatchFrom.EXACT, 9),
                prizeStructure(PrizeLevel.CONSOLATION, "KK", 3, 5, MatchFrom.LAST, 10)
        );
    }

    @Test
    void create_success_whenRegionHasPrizeStructures() {
        when(lotteryRegionRepositoryPort.findByCode(REGION)).thenReturn(Optional.of(southRegion));
        when(lotteryRegionRepositoryPort.save(any(LotteryRegionModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(lotteryStationRepositoryPort.existsByName(STATION_NAME)).thenReturn(false);
        when(lotteryStationApplicationMapper.toModel(createRequest)).thenReturn(stationModel);
        when(lotteryStationRepositoryPort.save(any(LotteryStationModel.class))).thenReturn(savedStationModel);
        when(prizeStructureRepositoryPort.findByRegionCode(REGION)).thenReturn(seededPrizeStructures);
        when(lotteryStationApplicationMapper.toResponse(savedStationModel)).thenReturn(stationResponse);

        LotteryStationResponse result = lotteryStationService.create(createRequest);

        assertThat(result.id()).isEqualTo(STATION_ID);
        verify(prizeStructureRepositoryPort).findByRegionCode(REGION);
        verify(lotteryStationRepositoryPort).save(any(LotteryStationModel.class));
    }

    @Test
    void create_nameExisted_doesNotSeed() {
        when(lotteryStationRepositoryPort.existsByName(STATION_NAME)).thenReturn(true);

        assertThatThrownBy(() -> lotteryStationService.create(createRequest))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.LOTTERY_STATION_NAME_EXISTED);

        verify(lotteryStationRepositoryPort, never()).save(any());
        verify(prizeStructureRepositoryPort, never()).findByRegionCode(any());
    }

    @Test
    void update_regionChange_validatesNewRegionPrizeStructures() {
        LotteryStationModel station = LotteryStationModel.builder()
                .id(STATION_ID)
                .name(STATION_NAME)
                .region(southRegion)
                .price(BigDecimal.valueOf(10000))
                .status(LotteryStationStatus.DRAFT)
                .drawDays(List.of(java.time.DayOfWeek.TUESDAY, java.time.DayOfWeek.WEDNESDAY))
                .drawTime(java.time.LocalTime.of(16, 15))
                .build();

        UpdateLotteryStationRequest request = UpdateLotteryStationRequest.builder()
                .region("MIEN_BAC")
                .build();

        List<PrizeStructureModel> northPrizes = List.of(
                prizeStructure(PrizeLevel.SPECIAL, "DB", 1, 6, MatchFrom.LAST, 0)
        );

        LotteryStationModel updatedStation = LotteryStationModel.builder()
                .id(STATION_ID)
                .name(STATION_NAME)
                .region(northRegion)
                .price(BigDecimal.valueOf(10000))
                .status(LotteryStationStatus.DRAFT)
                .drawDays(List.of(java.time.DayOfWeek.TUESDAY, java.time.DayOfWeek.WEDNESDAY))
                .drawTime(java.time.LocalTime.of(16, 15))
                .build();

        when(lotteryRegionRepositoryPort.findByCode("MIEN_BAC")).thenReturn(Optional.of(northRegion));
        when(lotteryRegionRepositoryPort.save(any(LotteryRegionModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(lotteryStationRepositoryPort.findById(STATION_ID)).thenReturn(Optional.of(station));
        when(lotteryStationRepositoryPort.save(station)).thenReturn(updatedStation);
        when(lotteryTicketRepositoryPort.sumQuantityByProductIdAndStatuses(eq(STATION_ID), any()))
                .thenReturn(0L);
        when(prizeStructureRepositoryPort.findByRegionCode("MIEN_BAC")).thenReturn(northPrizes);
        when(lotteryStationApplicationMapper.toResponse(updatedStation)).thenReturn(stationResponse);

        lotteryStationService.update(STATION_ID, request);

        verify(prizeStructureRepositoryPort).findByRegionCode("MIEN_BAC");
    }

    private LotteryRegionModel buildRegion(String code) {
        return LotteryRegionModel.builder()
                .id(1L)
                .code(code)
                .name(code)
                .type(LotteryStationType.TRADITIONAL)
                .minNumber(0)
                .maxNumber(999_999)
                .stationCount(0)
                .build();
    }

    private PrizeStructureModel prizeStructure(
            PrizeLevel prizeLevel,
            String prizeCode,
            int quantity,
            Integer matchDigits,
            MatchFrom matchFrom,
            int displayOrder
    ) {
        return PrizeStructureModel.builder()
                .regionCode(REGION)
                .prizeLevel(prizeLevel)
                .prizeCode(prizeCode)
                .prizeValue(BigDecimal.ZERO)
                .quantity(quantity)
                .matchDigits(matchDigits)
                .matchFrom(matchFrom)
                .displayOrder(displayOrder)
                .build();
    }

    @Test
    @DisplayName("[DP-551] sendUpcomingDrawReminderNotifications sends notifications for stations matching reminder time")
    void sendUpcomingDrawReminderNotifications_sendsNotifications() {
        // Arrange
        ReflectionTestUtils.setField(lotteryStationService, "drawReminderMinutes", 30L);
        LocalDate today = LocalDate.now();
        LocalTime currentMinute = LocalTime.now().withSecond(0).withNano(0);

        LotteryStationModel station1 = LotteryStationModel.builder()
                .id(101L)
                .name("Station 1")
                .status(LotteryStationStatus.ACTIVE)
                .drawTime(currentMinute.plusMinutes(30))
                .build();

        LotteryStationModel station2 = LotteryStationModel.builder()
                .id(102L)
                .name("Station 2")
                .status(LotteryStationStatus.ACTIVE)
                .drawTime(currentMinute.plusMinutes(30))
                .build();

        LotteryStationModel stationNotMatchingTime = LotteryStationModel.builder()
                .id(103L)
                .name("Station 3")
                .status(LotteryStationStatus.ACTIVE)
                .drawTime(currentMinute.plusMinutes(60)) // Does not match 30 min reminder
                .build();

        LotteryStationModel stationInactive = LotteryStationModel.builder()
                .id(104L)
                .name("Station 4")
                .status(LotteryStationStatus.INACTIVE)
                .drawTime(currentMinute.plusMinutes(30)) // Matches time but inactive
                .build();

        when(lotteryStationRepositoryPort.findByNextDrawDate(today))
                .thenReturn(List.of(station1, station2, stationNotMatchingTime, stationInactive));

        // Act
        int result = lotteryStationService.sendUpcomingDrawReminderNotifications();

        // Assert
        assertThat(result).isEqualTo(1); // 1 group of matching draw time

        ArgumentCaptor<com.daiphat.coreapi.application.event.LotteryStationDrawReminderEvent> captor =
                ArgumentCaptor.forClass(com.daiphat.coreapi.application.event.LotteryStationDrawReminderEvent.class);
        verify(applicationEventPublisher).publishEvent(captor.capture());

        com.daiphat.coreapi.application.event.LotteryStationDrawReminderEvent event = captor.getValue();
        assertThat(event.stationIds()).containsExactly(101L, 102L);
        assertThat(event.stationNames()).containsExactly("Station 1", "Station 2");
        assertThat(event.drawTime()).isEqualTo(currentMinute.plusMinutes(30));
        assertThat(event.remainingMinutes()).isEqualTo(30L);
    }
}
