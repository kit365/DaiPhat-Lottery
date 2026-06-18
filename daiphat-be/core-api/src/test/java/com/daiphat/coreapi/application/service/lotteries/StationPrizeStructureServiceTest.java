package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureResponse;
import com.daiphat.coreapi.application.mapper.lotteries.PrizeStructureApplicationMapper;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StationPrizeStructureService Unit Tests")
class StationPrizeStructureServiceTest {

    private static final Long STATION_ID = 10L;
    private static final Long PRIZE_ID = 20L;
    private static final String REGION = "MIEN_NAM";

    @Mock
    private LotteryStationRepositoryPort lotteryStationRepositoryPort;

    @Mock
    private PrizeStructureRepositoryPort prizeStructureRepositoryPort;

    private StationPrizeStructureService stationPrizeStructureService;

    private LotteryStationModel stationModel;

    @BeforeEach
    void setUp() {
        stationPrizeStructureService = new StationPrizeStructureService(
                lotteryStationRepositoryPort,
                prizeStructureRepositoryPort,
                new PrizeStructureApplicationMapper()
        );

        stationModel = LotteryStationModel.builder()
                .id(STATION_ID)
                .name("TP.HCM")
                .region(LotteryRegionModel.builder()
                        .code(REGION)
                        .name("Miền Nam")
                        .type(LotteryStationType.TRADITIONAL)
                        .minNumber(0)
                        .maxNumber(999_999)
                        .build())
                .build();
    }

    @Test
    void getByProductId_success() {
        PrizeStructureModel model = prizeModel(PRIZE_ID, "DB", PrizeLevel.SPECIAL, 6, MatchFrom.LAST, 0);

        when(lotteryStationRepositoryPort.findById(STATION_ID)).thenReturn(Optional.of(stationModel));
        when(prizeStructureRepositoryPort.findByProductId(STATION_ID)).thenReturn(List.of(model));

        List<PrizeStructureResponse> responses = stationPrizeStructureService.getByProductId(STATION_ID);

        assertThat(responses).hasSize(1);
        assertThat(responses.getFirst().prizeCode()).isEqualTo("DB");
    }

    @Test
    void getById_success() {
        PrizeStructureModel model = prizeModel(PRIZE_ID, "DB", PrizeLevel.SPECIAL, 6, MatchFrom.LAST, 0);

        when(lotteryStationRepositoryPort.findById(STATION_ID)).thenReturn(Optional.of(stationModel));
        when(prizeStructureRepositoryPort.findById(PRIZE_ID)).thenReturn(Optional.of(model));

        PrizeStructureResponse response = stationPrizeStructureService.getById(STATION_ID, PRIZE_ID);

        assertThat(response.prizeCode()).isEqualTo("DB");
    }

    @Test
    void getById_productMismatch_throws() {
        PrizeStructureModel model = prizeModel(PRIZE_ID, "DB", PrizeLevel.SPECIAL, 6, MatchFrom.LAST, 0);
        model.setProductId(999L);

        when(lotteryStationRepositoryPort.findById(STATION_ID)).thenReturn(Optional.of(stationModel));
        when(prizeStructureRepositoryPort.findById(PRIZE_ID)).thenReturn(Optional.of(model));

        assertThatThrownBy(() -> stationPrizeStructureService.getById(STATION_ID, PRIZE_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.PRIZE_STRUCTURE_PRODUCT_MISMATCH);
    }

    private PrizeStructureModel prizeModel(
            Long id,
            String code,
            PrizeLevel level,
            Integer matchDigits,
            MatchFrom matchFrom,
            int displayOrder) {
        return PrizeStructureModel.builder()
                .id(id)
                .productId(STATION_ID)
                .region(REGION)
                .prizeLevel(level)
                .prizeCode(code)
                .prizeValue(BigDecimal.ZERO)
                .quantity(1)
                .matchDigits(matchDigits)
                .matchFrom(matchFrom)
                .displayOrder(displayOrder)
                .build();
    }
}
