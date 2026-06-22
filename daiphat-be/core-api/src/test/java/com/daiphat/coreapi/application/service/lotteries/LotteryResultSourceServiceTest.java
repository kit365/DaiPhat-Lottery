package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourcePreviewResult;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryResultSourceServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultSourceSyncPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LotteryResultSourceServiceTest {

    @Mock
    private LotteryStationServicePort lotteryStationServicePort;

    @Mock
    private LotteryResultSourceSyncPort lotteryResultSourceSyncPort;

    private LotteryResultSourceServicePort lotteryResultSourceService;

    private LotteryStationModel stationModel;
    private final Long STATION_ID = 1L;
    private final LocalDate DRAW_DATE = LocalDate.now();

    @BeforeEach
    void setUp() {
        lotteryResultSourceService = new LotteryResultSourceService(lotteryStationServicePort, lotteryResultSourceSyncPort);
        stationModel = LotteryStationModel.builder()
                .id(STATION_ID)
                .name("Test Station")
                .region(LotteryRegionModel.builder().code("MIEN_NAM").type(com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType.TRADITIONAL).build())
                .build();
    }

    @Test
    @DisplayName("[DP-476] Ném lỗi khi stationId là null")
    void preview_throwsWhenStationIdIsNull() {
        assertThatThrownBy(() -> lotteryResultSourceService.preview(LotteryStationSourceType.MINH_NGOC, null, DRAW_DATE))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_RESULT_STATION_REQUIRED);
    }

    @Test
    @DisplayName("[DP-476] Ném lỗi khi drawDate là null")
    void preview_throwsWhenDrawDateIsNull() {
        assertThatThrownBy(() -> lotteryResultSourceService.preview(LotteryStationSourceType.MINH_NGOC, STATION_ID, null))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_RESULT_DRAW_DATE_REQUIRED);
    }

    @Test
    @DisplayName("[DP-476] Ném lỗi khi không tìm thấy nhà đài")
    void preview_throwsWhenStationNotFound() {
        when(lotteryStationServicePort.findModelById(STATION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lotteryResultSourceService.preview(LotteryStationSourceType.MINH_NGOC, STATION_ID, DRAW_DATE))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_STATION_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-476] Thành công khi preview kết quả với station có region")
    void preview_successWithRegion() {
        when(lotteryStationServicePort.findModelById(STATION_ID)).thenReturn(Optional.of(stationModel));
        LotteryResultSourcePreviewResult expectedResult = new LotteryResultSourcePreviewResult(null, null, null, null, null, null, null, 0, null, null, null);
        when(lotteryResultSourceSyncPort.preview(LotteryStationSourceType.MINH_NGOC, "Test Station", "MIEN_NAM", DRAW_DATE))
                .thenReturn(expectedResult);

        LotteryResultSourcePreviewResult result = lotteryResultSourceService.preview(LotteryStationSourceType.MINH_NGOC, STATION_ID, DRAW_DATE);

        assertThat(result).isEqualTo(expectedResult);
        verify(lotteryResultSourceSyncPort).preview(LotteryStationSourceType.MINH_NGOC, "Test Station", "MIEN_NAM", DRAW_DATE);
    }

    @Test
    @DisplayName("[DP-476] Thành công khi preview kết quả với station không có region")
    void preview_successWithoutRegion() {
        stationModel.setRegion(null);
        when(lotteryStationServicePort.findModelById(STATION_ID)).thenReturn(Optional.of(stationModel));
        LotteryResultSourcePreviewResult expectedResult = new LotteryResultSourcePreviewResult(null, null, null, null, null, null, null, 0, null, null, null);
        when(lotteryResultSourceSyncPort.preview(LotteryStationSourceType.MINH_NGOC, "Test Station", null, DRAW_DATE))
                .thenReturn(expectedResult);

        LotteryResultSourcePreviewResult result = lotteryResultSourceService.preview(LotteryStationSourceType.MINH_NGOC, STATION_ID, DRAW_DATE);

        assertThat(result).isEqualTo(expectedResult);
        verify(lotteryResultSourceSyncPort).preview(LotteryStationSourceType.MINH_NGOC, "Test Station", null, DRAW_DATE);
    }
}
