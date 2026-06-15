package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryStationApplicationMapper;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType;
import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

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
    private static final UUID ADMIN_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    @Mock
    private LotteryStationRepositoryPort lotteryStationRepositoryPort;

    @Mock
    private LotteryTicketRepositoryPort lotteryTicketRepositoryPort;

    @Mock
    private StationPrizeStructureSeeder stationPrizeStructureSeeder;

    @Mock
    private LotteryStationApplicationMapper lotteryStationApplicationMapper;

    @Mock
    private StoragePort storagePort;

    private LotteryStationService lotteryStationService;

    private CreateLotteryStationRequest createRequest;
    private LotteryStationModel stationModel;
    private LotteryStationModel savedStationModel;
    private LotteryStationResponse stationResponse;
    private List<PrizeStructureModel> seededPrizeStructures;

    @BeforeEach
    void setUp() {
        lotteryStationService = new LotteryStationService(
                lotteryStationRepositoryPort,
                lotteryTicketRepositoryPort,
                stationPrizeStructureSeeder,
                lotteryStationApplicationMapper,
                storagePort
        );

        createRequest = CreateLotteryStationRequest.builder()
                .name(STATION_NAME)
                .province("Hồ Chí Minh")
                .region(REGION)
                .type(LotteryStationType.TRADITIONAL.name())
                .numberLength(6)
                .price(BigDecimal.valueOf(10000))
                .build();

        stationModel = LotteryStationModel.builder()
                .name(STATION_NAME)
                .province("Hồ Chí Minh")
                .region(REGION)
                .type(LotteryStationType.TRADITIONAL)
                .numberLength(6)
                .price(BigDecimal.valueOf(10000))
                .build();

        savedStationModel = LotteryStationModel.builder()
                .id(STATION_ID)
                .name(STATION_NAME)
                .province("Hồ Chí Minh")
                .region(REGION)
                .type(LotteryStationType.TRADITIONAL)
                .numberLength(6)
                .price(BigDecimal.valueOf(10000))
                .status(LotteryStationStatus.DRAFT)
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
    void create_success_seedsPrizeStructuresFromRegion() {
        when(lotteryStationRepositoryPort.existsByName(STATION_NAME)).thenReturn(false);
        when(lotteryStationApplicationMapper.toModel(createRequest)).thenReturn(stationModel);
        when(lotteryStationRepositoryPort.save(any(LotteryStationModel.class))).thenReturn(savedStationModel);
        when(stationPrizeStructureSeeder.seedFromRegion(savedStationModel)).thenReturn(seededPrizeStructures);
        when(lotteryStationApplicationMapper.toResponse(savedStationModel)).thenReturn(stationResponse);

        LotteryStationResponse result = lotteryStationService.create(createRequest);

        assertThat(result.id()).isEqualTo(STATION_ID);
        verify(stationPrizeStructureSeeder).requireRegionHasPrizeStructures(REGION);
        verify(stationPrizeStructureSeeder).seedFromRegion(savedStationModel);

        assertThat(seededPrizeStructures).hasSize(11);
        Set<String> uniqueCodes = seededPrizeStructures.stream()
                .map(PrizeStructureModel::getPrizeCode)
                .collect(Collectors.toSet());
        assertThat(uniqueCodes).hasSize(11);
    }

    @Test
    void create_nameExisted_doesNotSeed() {
        when(lotteryStationRepositoryPort.existsByName(STATION_NAME)).thenReturn(true);

        assertThatThrownBy(() -> lotteryStationService.create(createRequest))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.LOTTERY_STATION_NAME_EXISTED);

        verify(lotteryStationRepositoryPort, never()).save(any());
        verify(stationPrizeStructureSeeder, never()).seedFromRegion(any());
    }

    @Test
    void submitForApproval_success_setsPendingApproval() {
        LotteryStationModel draftStation = LotteryStationModel.builder()
                .id(STATION_ID)
                .name(STATION_NAME)
                .region(REGION)
                .type(LotteryStationType.TRADITIONAL)
                .price(BigDecimal.valueOf(10000))
                .status(LotteryStationStatus.DRAFT)
                .build();
        LotteryStationResponse pendingResponse = LotteryStationResponse.builder()
                .id(STATION_ID)
                .name(STATION_NAME)
                .region(REGION)
                .type(LotteryStationType.TRADITIONAL.name())
                .status(LotteryStationStatus.PENDING_APPROVAL.name())
                .price(BigDecimal.valueOf(10000))
                .build();

        when(lotteryStationRepositoryPort.findById(STATION_ID)).thenReturn(Optional.of(draftStation));
        when(lotteryTicketRepositoryPort.sumQuantityByProductIdAndStatuses(eq(STATION_ID), any()))
                .thenReturn(0L);
        when(lotteryStationRepositoryPort.save(draftStation)).thenReturn(draftStation);
        when(lotteryStationApplicationMapper.toResponse(draftStation)).thenReturn(pendingResponse);

        LotteryStationResponse result = lotteryStationService.submitForApproval(STATION_ID);

        assertThat(result.status()).isEqualTo(LotteryStationStatus.PENDING_APPROVAL.name());
        assertThat(draftStation.getStatus()).isEqualTo(LotteryStationStatus.PENDING_APPROVAL);
    }

    @Test
    void approve_success_activatesStation() {
        LotteryStationModel pendingStation = LotteryStationModel.builder()
                .id(STATION_ID)
                .name(STATION_NAME)
                .region(REGION)
                .type(LotteryStationType.TRADITIONAL)
                .price(BigDecimal.valueOf(10000))
                .status(LotteryStationStatus.PENDING_APPROVAL)
                .build();
        LotteryStationResponse activeResponse = LotteryStationResponse.builder()
                .id(STATION_ID)
                .name(STATION_NAME)
                .region(REGION)
                .type(LotteryStationType.TRADITIONAL.name())
                .status(LotteryStationStatus.ACTIVE.name())
                .price(BigDecimal.valueOf(10000))
                .build();

        when(lotteryStationRepositoryPort.findById(STATION_ID)).thenReturn(Optional.of(pendingStation));
        when(lotteryTicketRepositoryPort.sumQuantityByProductIdAndStatuses(eq(STATION_ID), any()))
                .thenReturn(0L);
        when(lotteryStationRepositoryPort.save(pendingStation)).thenReturn(pendingStation);
        when(lotteryStationApplicationMapper.toResponse(pendingStation)).thenReturn(activeResponse);

        LotteryStationResponse result = lotteryStationService.approve(STATION_ID, ADMIN_ID);

        assertThat(result.status()).isEqualTo(LotteryStationStatus.ACTIVE.name());
        assertThat(pendingStation.getStatus()).isEqualTo(LotteryStationStatus.ACTIVE);
        assertThat(pendingStation.getApprovedById()).isEqualTo(ADMIN_ID);
        assertThat(pendingStation.getApprovedAt()).isNotNull();
    }

    @Test
    void update_withActiveStatus_throwsUseWorkflowError() {
        LotteryStationModel station = LotteryStationModel.builder()
                .id(STATION_ID)
                .name(STATION_NAME)
                .region(REGION)
                .type(LotteryStationType.TRADITIONAL)
                .price(BigDecimal.valueOf(10000))
                .status(LotteryStationStatus.DRAFT)
                .build();
        UpdateLotteryStationRequest request = UpdateLotteryStationRequest.builder()
                .status(LotteryStationStatus.ACTIVE.name())
                .build();

        when(lotteryStationRepositoryPort.findById(STATION_ID)).thenReturn(Optional.of(station));

        assertThatThrownBy(() -> lotteryStationService.update(STATION_ID, request))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.LOTTERY_STATION_STATUS_USE_WORKFLOW);

        verify(lotteryStationRepositoryPort, never()).save(any());
    }

    @Test
    void update_regionChange_reseedsPrizeStructures() {
        LotteryStationModel station = LotteryStationModel.builder()
                .id(STATION_ID)
                .name(STATION_NAME)
                .region("MIEN_NAM")
                .type(LotteryStationType.TRADITIONAL)
                .price(BigDecimal.valueOf(10000))
                .status(LotteryStationStatus.DRAFT)
                .build();

        UpdateLotteryStationRequest request = UpdateLotteryStationRequest.builder()
                .region("MIEN_BAC")
                .build();

        List<PrizeStructureModel> northPrizes = List.of(
                prizeStructure(PrizeLevel.SPECIAL, "DB", 1, 6, MatchFrom.LAST, 0)
        );

        when(lotteryStationRepositoryPort.findById(STATION_ID)).thenReturn(Optional.of(station));
        when(lotteryStationRepositoryPort.save(station)).thenReturn(station);
        when(lotteryTicketRepositoryPort.sumQuantityByProductIdAndStatuses(eq(STATION_ID), any()))
                .thenReturn(0L);
        when(stationPrizeStructureSeeder.reseedFromRegion(station)).thenReturn(northPrizes);
        when(lotteryStationApplicationMapper.toResponse(station)).thenReturn(stationResponse);

        lotteryStationService.update(STATION_ID, request);

        verify(stationPrizeStructureSeeder).reseedFromRegion(station);
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
                .productId(STATION_ID)
                .region(REGION)
                .prizeLevel(prizeLevel)
                .prizeCode(prizeCode)
                .prizeValue(BigDecimal.ZERO)
                .quantity(quantity)
                .matchDigits(matchDigits)
                .matchFrom(matchFrom)
                .displayOrder(displayOrder)
                .build();
    }
}
