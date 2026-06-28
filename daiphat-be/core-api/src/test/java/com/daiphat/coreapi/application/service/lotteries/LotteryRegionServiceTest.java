package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryRegionRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryRegionResponse;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryRegionApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryRegionServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryRegionRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LotteryRegionServiceTest {

    @Mock
    private LotteryRegionRepositoryPort lotteryRegionRepositoryPort;

    @Mock
    private LotteryRegionApplicationMapper lotteryRegionApplicationMapper;

    private LotteryRegionServicePort lotteryRegionService;

    private LotteryRegionModel regionModel;
    private LotteryRegionResponse regionResponse;

    @BeforeEach
    void setUp() {
        lotteryRegionService = new LotteryRegionService(lotteryRegionRepositoryPort, lotteryRegionApplicationMapper);

        regionModel = LotteryRegionModel.builder()
                .id(1L)
                .code("MIEN_BAC")
                .name("Miền Bắc")
                .minNumber(0)
                .maxNumber(99999)
                .build();

        regionResponse = LotteryRegionResponse.builder()
                .id(1L)
                .code("MIEN_BAC")
                .name("Miền Bắc")
                .minNumber(0)
                .maxNumber(99999)
                .build();
    }

    @Test
    @DisplayName("[DP-37] getAll: Lấy danh sách thành công")
    void getAll_success() {
        when(lotteryRegionRepositoryPort.findAll()).thenReturn(List.of(regionModel));
        when(lotteryRegionApplicationMapper.toResponse(regionModel)).thenReturn(regionResponse);

        List<LotteryRegionResponse> responses = lotteryRegionService.getAll();

        assertThat(responses).hasSize(1);
        assertThat(responses.getFirst().code()).isEqualTo("MIEN_BAC");
    }

    @Test
    @DisplayName("[DP-37] getByCode: Lấy theo mã thành công")
    void getByCode_success() {
        when(lotteryRegionRepositoryPort.findByCode("MIEN_BAC")).thenReturn(Optional.of(regionModel));
        when(lotteryRegionApplicationMapper.toResponse(regionModel)).thenReturn(regionResponse);

        LotteryRegionResponse response = lotteryRegionService.getByCode("MIEN_BAC");

        assertThat(response).isNotNull();
        assertThat(response.code()).isEqualTo("MIEN_BAC");
    }

    @Test
    @DisplayName("[DP-37] getByCode: Ném lỗi khi không tìm thấy")
    void getByCode_throwsNotFound() {
        when(lotteryRegionRepositoryPort.findByCode("INVALID")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lotteryRegionService.getByCode("INVALID"))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_REGION_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-37] update: Cập nhật thành công")
    void update_success() {
        UpdateLotteryRegionRequest request = new UpdateLotteryRegionRequest(0, 99999);

        when(lotteryRegionRepositoryPort.findByCode("MIEN_BAC")).thenReturn(Optional.of(regionModel));
        doAnswer(inv -> {
            UpdateLotteryRegionRequest req = inv.getArgument(0);
            LotteryRegionModel model = inv.getArgument(1);
            model.setMinNumber(req.minNumber());
            model.setMaxNumber(req.maxNumber());
            return null;
        }).when(lotteryRegionApplicationMapper).merge(request, regionModel);
        
        when(lotteryRegionRepositoryPort.save(regionModel)).thenReturn(regionModel);
        when(lotteryRegionApplicationMapper.toResponse(regionModel)).thenReturn(regionResponse);

        LotteryRegionResponse response = lotteryRegionService.update("MIEN_BAC", request);

        assertThat(response).isNotNull();
        assertThat(response.code()).isEqualTo("MIEN_BAC");
        verify(lotteryRegionRepositoryPort).save(regionModel);
    }

    @Test
    @DisplayName("[DP-37] update: Ném lỗi khi max < min")
    void update_throwsWhenMaxLessThanMin() {
        UpdateLotteryRegionRequest request = new UpdateLotteryRegionRequest(999, 0);

        when(lotteryRegionRepositoryPort.findByCode("MIEN_BAC")).thenReturn(Optional.of(regionModel));

        assertThatThrownBy(() -> lotteryRegionService.update("MIEN_BAC", request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_REGION_NUMBER_RANGE_INVALID);

        verify(lotteryRegionRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-37] update: Ném lỗi khi min null")
    void update_throwsWhenMinNull() {
        UpdateLotteryRegionRequest request = new UpdateLotteryRegionRequest(null, 99999);

        when(lotteryRegionRepositoryPort.findByCode("MIEN_BAC")).thenReturn(Optional.of(regionModel));

        assertThatThrownBy(() -> lotteryRegionService.update("MIEN_BAC", request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_REGION_NUMBER_RANGE_INVALID);
    }

    @Test
    @DisplayName("[DP-37] update: Ném lỗi khi max null")
    void update_throwsWhenMaxNull() {
        UpdateLotteryRegionRequest request = new UpdateLotteryRegionRequest(0, null);

        when(lotteryRegionRepositoryPort.findByCode("MIEN_BAC")).thenReturn(Optional.of(regionModel));

        assertThatThrownBy(() -> lotteryRegionService.update("MIEN_BAC", request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_REGION_NUMBER_RANGE_INVALID);
    }
}
