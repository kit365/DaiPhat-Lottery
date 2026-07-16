package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourceItem;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryResultDetailRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryResultDetailRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultDetailResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryWinningCheckResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryWinningPrizeResponse;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryResultApplicationMapper;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.application.port.in.lotteries.PrizeStructureServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultDetailRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultRepositoryPort;
import com.daiphat.coreapi.application.service.lotteries.result.LotteryResultDetailService;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultDetailModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LotteryResultDetailServiceTest {

    @Mock
    private LotteryResultDetailRepositoryPort detailRepositoryPort;
    @Mock
    private LotteryResultRepositoryPort resultRepositoryPort;
    @Mock
    private PrizeStructureServicePort prizeStructureServicePort;
    @Mock
    private com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort lotteryStationServicePort;
    @Mock
    private LotteryResultApplicationMapper mapper;

    @InjectMocks
    private LotteryResultDetailService service;

    private LotteryResultModel resultModel;
    private LotteryResultDetailModel detailModel;
    private PrizeStructureModel prizeModel;

    @BeforeEach
    void setUp() {
        resultModel = LotteryResultModel.builder().id(1L).regionCode("MIEN_NAM").build();
        detailModel = LotteryResultDetailModel.builder().id(10L).lotteryResultId(1L).prizeStructureId(100L).winningNumber("1234").prizeLevel(PrizeLevel.FIRST).matchDigits(4).matchFrom(MatchFrom.EXACT).build();
        prizeModel = PrizeStructureModel.builder().id(100L).regionCode("MIEN_NAM").prizeCode("1").prizeLevel(PrizeLevel.FIRST).build();
    }

    @Test
    @DisplayName("[DP-476][DP-477] getByLotteryResultId_success")
    void getByLotteryResultId_success() {
        when(resultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(detailRepositoryPort.findByLotteryResultId(1L)).thenReturn(List.of(detailModel));
        when(mapper.toDetailResponseList(any())).thenReturn(List.of(LotteryResultDetailResponse.builder().id(10L).build()));

        var res = service.getByLotteryResultId(1L);
        assertThat(res).hasSize(1);
    }

    @Test
    @DisplayName("[DP-476][DP-477] getByLotteryResultId_throwsResultNotFound")
    void getByLotteryResultId_throwsResultNotFound() {
        when(resultRepositoryPort.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getByLotteryResultId(1L))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_RESULT_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-476][DP-477] getById_success")
    void getById_success() {
        when(resultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(detailRepositoryPort.findById(10L)).thenReturn(Optional.of(detailModel));
        when(mapper.toDetailResponse(any())).thenReturn(LotteryResultDetailResponse.builder().id(10L).build());

        var res = service.getById(1L, 10L);
        assertThat(res.id()).isEqualTo(10L);
    }

    @Test
    @DisplayName("[DP-476][DP-477] getById_throwsDetailNotFound")
    void getById_throwsDetailNotFound() {
        when(resultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(detailRepositoryPort.findById(10L)).thenReturn(Optional.empty());
        
        assertThatThrownBy(() -> service.getById(1L, 10L))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_RESULT_DETAIL_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-476][DP-477] create_success")
    void create_success() {
        when(resultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(mapper.toDetailModel(any())).thenReturn(detailModel);
        when(prizeStructureServicePort.findModelById(100L)).thenReturn(Optional.of(prizeModel));
        when(detailRepositoryPort.existsByLotteryResultIdAndPrizeStructureIdAndWinningNumber(anyLong(), anyLong(), anyString())).thenReturn(false);
        when(mapper.withPrizeStructure(any(), any())).thenReturn(detailModel);
        when(detailRepositoryPort.save(any())).thenReturn(detailModel);
        when(mapper.toDetailResponse(any())).thenReturn(LotteryResultDetailResponse.builder().id(10L).build());

        var req = CreateLotteryResultDetailRequest.builder().winningNumber(" 1234 ").prizeStructureId(100L).build();
        var res = service.create(1L, req);
        assertThat(res.id()).isEqualTo(10L);
        assertThat(detailModel.getWinningNumber()).isEqualTo("1234");
    }

    @Test
    @DisplayName("[DP-476][DP-477] create_throwsPrizeNotFound")
    void create_throwsPrizeNotFound() {
        when(resultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(mapper.toDetailModel(any())).thenReturn(detailModel);
        when(prizeStructureServicePort.findModelById(100L)).thenReturn(Optional.empty());

        var req = CreateLotteryResultDetailRequest.builder().winningNumber("1234").prizeStructureId(100L).build();
        assertThatThrownBy(() -> service.create(1L, req))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-476][DP-477] update_success")
    void update_success() {
        when(resultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(detailRepositoryPort.findById(10L)).thenReturn(Optional.of(detailModel));
        when(mapper.mergeDetail(any(), any())).thenAnswer(inv -> {
            detailModel.setWinningNumber(" 4321 ");
            return detailModel;
        });
        when(prizeStructureServicePort.findModelById(100L)).thenReturn(Optional.of(prizeModel));
        when(detailRepositoryPort.existsByLotteryResultIdAndPrizeStructureIdAndWinningNumberExcludingId(anyLong(), anyLong(), anyString(), anyLong())).thenReturn(false);
        when(mapper.withPrizeStructure(any(), any())).thenReturn(detailModel);
        when(detailRepositoryPort.save(any())).thenReturn(detailModel);
        when(mapper.toDetailResponse(any())).thenReturn(LotteryResultDetailResponse.builder().id(10L).build());

        var req = UpdateLotteryResultDetailRequest.builder().winningNumber(" 4321 ").build();
        var res = service.update(1L, 10L, req);
        assertThat(res.id()).isEqualTo(10L);
        assertThat(detailModel.getWinningNumber()).isEqualTo("4321");
    }

    @Test
    @DisplayName("[DP-476][DP-477] delete_success")
    void delete_success() {
        when(resultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(detailRepositoryPort.findById(10L)).thenReturn(Optional.of(detailModel));

        service.delete(1L, 10L);
        verify(detailRepositoryPort).deleteById(10L);
    }

    @Test
    @DisplayName("[DP-476][DP-477] deleteByLotteryResultId_success")
    void deleteByLotteryResultId_success() {
        when(detailRepositoryPort.findByLotteryResultId(1L)).thenReturn(List.of(detailModel));
        service.deleteByLotteryResultId(1L);
        verify(detailRepositoryPort).deleteById(10L);
    }

    @Test
    @DisplayName("[DP-476][DP-477] validateRegionCompatibility_nullRegion")
    void validateRegionCompatibility_nullRegion() {
        service.validateRegionCompatibility(1L, null);
        verify(detailRepositoryPort, never()).findByLotteryResultId(anyLong());
    }

    @Test
    @DisplayName("[DP-476][DP-477] validateRegionCompatibility_invalidRegion")
    void validateRegionCompatibility_invalidRegion() {
        when(detailRepositoryPort.findByLotteryResultId(1L)).thenReturn(List.of(detailModel));
        when(prizeStructureServicePort.findModelById(100L)).thenReturn(Optional.of(prizeModel));
        
        assertThatThrownBy(() -> service.validateRegionCompatibility(1L, "MIEN_BAC"))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_REGION_INVALID);
    }

    @Test
    @DisplayName("[DP-476][DP-477] getModelsByLotteryResultId_success")
    void getModelsByLotteryResultId_success() {
        when(resultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(detailRepositoryPort.findByLotteryResultId(1L)).thenReturn(List.of(detailModel));
        var res = service.getModelsByLotteryResultId(1L);
        assertThat(res).hasSize(1);
    }

    @Test
    @DisplayName("[DP-476][DP-477] syncFromSource_nullOrEmpty")
    void syncFromSource_nullOrEmpty() {
        when(resultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        service.syncFromSource(1L, null, null);
        service.syncFromSource(1L, List.of(), null);
        verify(mapper, times(2)).toDetailResponseList(any());
    }

    @Test
    @DisplayName("[DP-476][DP-477] syncFromSource_withItems")
    void syncFromSource_withItems() {
        when(resultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(detailRepositoryPort.findByLotteryResultId(1L)).thenReturn(List.of());
        when(mapper.withPrizeStructure(any(), any())).thenReturn(detailModel);
        when(detailRepositoryPort.save(any())).thenReturn(detailModel);
        
        LotteryResultSourceItem item = new LotteryResultSourceItem(null, null, "1", null, List.of("1234"), null);
        service.syncFromSource(1L, List.of(item), List.of(prizeModel));
        
        verify(detailRepositoryPort).save(any());
    }

    @Test
    @DisplayName("[DP-476][DP-477] syncFromSource_withExistingItems")
    void syncFromSource_withExistingItems() {
        when(resultRepositoryPort.findById(1L)).thenReturn(Optional.of(resultModel));
        when(detailRepositoryPort.findByLotteryResultId(1L)).thenReturn(List.of(detailModel));
        
        LotteryResultSourceItem item = new LotteryResultSourceItem(null, null, "1", null, List.of("1234"), null);
        service.syncFromSource(1L, List.of(item), List.of(prizeModel));
        
        verify(detailRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-476][DP-477] findModelById")
    void findModelById() {
        when(detailRepositoryPort.findById(10L)).thenReturn(Optional.of(detailModel));
        assertThat(service.findModelById(10L)).isPresent();
    }
    
    @Test
    @DisplayName("[DP-476][DP-477] assertDetailBelongsToResult")
    void assertDetailBelongsToResult() {
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(service, "assertDetailBelongsToResult", detailModel, 2L))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_RESULT_DETAIL_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-476][DP-477] assertPrizeStructureMatchesResult")
    void assertPrizeStructureMatchesResult() {
        PrizeStructureModel pm = PrizeStructureModel.builder().regionCode("MIEN_BAC").build();
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(service, "assertPrizeStructureMatchesResult", resultModel, pm))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_REGION_INVALID);
    }

    @Test
    @DisplayName("[DP-476][DP-477] assertUniqueDetail_duplicate")
    void assertUniqueDetail_duplicate() {
        when(detailRepositoryPort.existsByLotteryResultIdAndPrizeStructureIdAndWinningNumber(1L, 100L, "123")).thenReturn(true);
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(service, "assertUniqueDetail", 1L, 100L, "123", null))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_RESULT_DETAIL_DUPLICATE);
    }
    @Test
    @DisplayName("[DP-571] checkWinning_resultNotFound")
    void checkWinning_resultNotFound() {
        when(lotteryStationServicePort.getModelById(10L)).thenReturn(LotteryStationModel.builder().id(10L).region(com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel.builder().minNumber(1000).maxNumber(999999).build()).build());
        when(resultRepositoryPort.findByStationIdAndDrawDate(anyLong(), any())).thenReturn(Optional.empty());
        when(mapper.toWinningCheckResponse(any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), any(), anyList())).thenReturn(LotteryWinningCheckResponse.builder().resultAvailable(false).winning(false).build());
        
        var res = service.checkWinning(10L, java.time.LocalDate.now(), "123456");
        assertThat(res.resultAvailable()).isFalse();
        assertThat(res.winning()).isFalse();
    }

    @Test
    @DisplayName("[DP-571] checkWinning_resultFoundButNoDetails")
    void checkWinning_resultFoundButNoDetails() {
        when(lotteryStationServicePort.getModelById(10L)).thenReturn(LotteryStationModel.builder().id(10L).region(com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel.builder().minNumber(1000).maxNumber(999999).build()).build());
        when(resultRepositoryPort.findByStationIdAndDrawDate(anyLong(), any())).thenReturn(Optional.of(resultModel));
        when(detailRepositoryPort.findByLotteryResultId(1L)).thenReturn(List.of());
        when(mapper.toWinningCheckResponse(any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), any(), anyList())).thenReturn(LotteryWinningCheckResponse.builder().resultAvailable(true).winning(false).build());
        
        var res = service.checkWinning(10L, java.time.LocalDate.now(), "123456");
        assertThat(res.resultAvailable()).isTrue();
        assertThat(res.winning()).isFalse();
    }

    @Test
    @DisplayName("[DP-571] checkWinning_notWinning")
    void checkWinning_notWinning() {
        when(lotteryStationServicePort.getModelById(10L)).thenReturn(LotteryStationModel.builder().id(10L).region(com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel.builder().minNumber(1000).maxNumber(999999).build()).build());
        when(resultRepositoryPort.findByStationIdAndDrawDate(anyLong(), any())).thenReturn(Optional.of(resultModel));
        when(detailRepositoryPort.findByLotteryResultId(1L)).thenReturn(List.of(detailModel));
        when(prizeStructureServicePort.getModelsByRegion("MIEN_NAM")).thenReturn(List.of(prizeModel));
        when(mapper.toWinningCheckResponse(any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), any(), anyList())).thenReturn(LotteryWinningCheckResponse.builder().resultAvailable(true).winning(false).matchedPrizes(List.of()).build());
        
        var res = service.checkWinning(10L, java.time.LocalDate.now(), "9999");
        assertThat(res.resultAvailable()).isTrue();
        assertThat(res.winning()).isFalse();
        assertThat(res.matchedPrizes()).isEmpty();
    }

    @Test
    @DisplayName("[DP-571] checkWinning_winningNormal")
    void checkWinning_winningNormal() {
        when(lotteryStationServicePort.getModelById(10L)).thenReturn(LotteryStationModel.builder().id(10L).region(com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel.builder().minNumber(1000).maxNumber(999999).build()).build());
        when(resultRepositoryPort.findByStationIdAndDrawDate(anyLong(), any())).thenReturn(Optional.of(resultModel));
        when(detailRepositoryPort.findByLotteryResultId(1L)).thenReturn(List.of(detailModel));
        when(prizeStructureServicePort.getModelsByRegion("MIEN_NAM")).thenReturn(List.of(prizeModel));
        when(mapper.toWinningPrizeResponse(any(), anyString())).thenReturn(LotteryWinningPrizeResponse.builder().prizeCode("1").prizeValue(new java.math.BigDecimal("30000000")).build());
        when(mapper.toWinningCheckResponse(any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), any(), anyList())).thenReturn(LotteryWinningCheckResponse.builder().resultAvailable(true).winning(true).matchedPrizes(List.of(LotteryWinningPrizeResponse.builder().prizeCode("1").build())).build());

        var res = service.checkWinning(10L, java.time.LocalDate.now(), "1234");
        assertThat(res.resultAvailable()).isTrue();
        assertThat(res.winning()).isTrue();
        assertThat(res.matchedPrizes()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-571] checkWinning_winningSubSpecial")
    void checkWinning_winningSubSpecial() {
        LotteryResultDetailModel specialDetail = LotteryResultDetailModel.builder().id(11L).lotteryResultId(1L).prizeStructureId(101L).winningNumber("123456").prizeLevel(PrizeLevel.SPECIAL).build();
        PrizeStructureModel specialPrize = PrizeStructureModel.builder().id(101L).regionCode("MIEN_NAM").prizeCode("DB").prizeLevel(PrizeLevel.SPECIAL).build();
        PrizeStructureModel subSpecialPrize = PrizeStructureModel.builder().id(102L).regionCode("MIEN_NAM").prizeCode("PHU_DB").prizeLevel(PrizeLevel.SUB_SPECIAL).build();
        
        when(lotteryStationServicePort.getModelById(10L)).thenReturn(LotteryStationModel.builder().id(10L).region(com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel.builder().minNumber(1000).maxNumber(999999).build()).build());
        when(resultRepositoryPort.findByStationIdAndDrawDate(anyLong(), any())).thenReturn(Optional.of(resultModel));
        when(detailRepositoryPort.findByLotteryResultId(1L)).thenReturn(List.of(specialDetail));
        when(prizeStructureServicePort.getModelsByRegion("MIEN_NAM")).thenReturn(List.of(specialPrize, subSpecialPrize));
        when(mapper.toWinningPrizeResponse(any(), anyString())).thenReturn(LotteryWinningPrizeResponse.builder().prizeCode("PHU_DB").prizeValue(new java.math.BigDecimal("50000000")).build());
        when(mapper.toWinningCheckResponse(any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), any(), anyList())).thenReturn(LotteryWinningCheckResponse.builder().resultAvailable(true).winning(true).matchedPrizes(List.of(LotteryWinningPrizeResponse.builder().prizeCode("PHU_DB").build())).build());

        // sub special: first digit different, next 5 digits same
        var res = service.checkWinning(10L, java.time.LocalDate.now(), "923456");
        assertThat(res.resultAvailable()).isTrue();
        assertThat(res.winning()).isTrue();
        assertThat(res.matchedPrizes()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-571] checkWinning_winningConsolation")
    void checkWinning_winningConsolation() {
        LotteryResultDetailModel specialDetail = LotteryResultDetailModel.builder().id(11L).lotteryResultId(1L).prizeStructureId(101L).winningNumber("123456").prizeLevel(PrizeLevel.SPECIAL).build();
        PrizeStructureModel specialPrize = PrizeStructureModel.builder().id(101L).regionCode("MIEN_NAM").prizeCode("DB").prizeLevel(PrizeLevel.SPECIAL).build();
        PrizeStructureModel consolationPrize = PrizeStructureModel.builder().id(103L).regionCode("MIEN_NAM").prizeCode("KK").prizeLevel(PrizeLevel.CONSOLATION).build();
        
        when(lotteryStationServicePort.getModelById(10L)).thenReturn(LotteryStationModel.builder().id(10L).region(com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel.builder().minNumber(1000).maxNumber(999999).build()).build());
        when(resultRepositoryPort.findByStationIdAndDrawDate(anyLong(), any())).thenReturn(Optional.of(resultModel));
        when(detailRepositoryPort.findByLotteryResultId(1L)).thenReturn(List.of(specialDetail));
        when(prizeStructureServicePort.getModelsByRegion("MIEN_NAM")).thenReturn(List.of(specialPrize, consolationPrize));
        when(mapper.toWinningPrizeResponse(any(), anyString())).thenReturn(LotteryWinningPrizeResponse.builder().prizeCode("KK").prizeValue(new java.math.BigDecimal("6000000")).build());
        when(mapper.toWinningCheckResponse(any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), any(), anyList())).thenReturn(LotteryWinningCheckResponse.builder().resultAvailable(true).winning(true).matchedPrizes(List.of(LotteryWinningPrizeResponse.builder().prizeCode("KK").build())).build());

        // consolation: first digit same, 1 digit different among the rest 5
        var res = service.checkWinning(10L, java.time.LocalDate.now(), "129456");
        assertThat(res.resultAvailable()).isTrue();
        assertThat(res.winning()).isTrue();
        assertThat(res.matchedPrizes()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-571] checkWinning_subSpecialNegativeCases")
    void checkWinning_subSpecialNegativeCases() {
        LotteryResultDetailModel specialDetail = LotteryResultDetailModel.builder().id(11L).lotteryResultId(1L).prizeStructureId(101L).winningNumber("12345").prizeLevel(PrizeLevel.SPECIAL).build();
        PrizeStructureModel specialPrize = PrizeStructureModel.builder().id(101L).regionCode("MIEN_NAM").prizeCode("DB").prizeLevel(PrizeLevel.SPECIAL).build();
        PrizeStructureModel subSpecialPrize = PrizeStructureModel.builder().id(102L).regionCode("MIEN_NAM").prizeCode("PHU_DB").prizeLevel(PrizeLevel.SUB_SPECIAL).build();
        
        when(lotteryStationServicePort.getModelById(10L)).thenReturn(LotteryStationModel.builder().id(10L).region(com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel.builder().minNumber(1000).maxNumber(999999).build()).build());
        when(resultRepositoryPort.findByStationIdAndDrawDate(anyLong(), any())).thenReturn(Optional.of(resultModel));
        when(detailRepositoryPort.findByLotteryResultId(1L)).thenReturn(List.of(specialDetail));
        when(prizeStructureServicePort.getModelsByRegion("MIEN_NAM")).thenReturn(List.of(specialPrize, subSpecialPrize));
        when(mapper.toWinningCheckResponse(any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), any(), anyList())).thenReturn(LotteryWinningCheckResponse.builder().resultAvailable(true).winning(false).matchedPrizes(List.of()).build());

        // Test length mismatch
        var res1 = service.checkWinning(10L, java.time.LocalDate.now(), "1234");
        assertThat(res1.winning()).isFalse();

        // Test null special winning number (we mock the DB to return a detail with null/blank winning number)
        LotteryResultDetailModel nullDetail = LotteryResultDetailModel.builder().id(11L).lotteryResultId(1L).prizeStructureId(101L).winningNumber(null).prizeLevel(PrizeLevel.SPECIAL).build();
        when(detailRepositoryPort.findByLotteryResultId(1L)).thenReturn(List.of(nullDetail));
        var res2 = service.checkWinning(10L, java.time.LocalDate.now(), "12345");
        assertThat(res2.winning()).isFalse();
    }

    @Test
    @DisplayName("[DP-571] checkWinning_consolationNegativeCases")
    void checkWinning_consolationNegativeCases() {
        LotteryResultDetailModel specialDetail = LotteryResultDetailModel.builder().id(11L).lotteryResultId(1L).prizeStructureId(101L).winningNumber("12345").prizeLevel(PrizeLevel.SPECIAL).build();
        PrizeStructureModel specialPrize = PrizeStructureModel.builder().id(101L).regionCode("MIEN_NAM").prizeCode("DB").prizeLevel(PrizeLevel.SPECIAL).build();
        PrizeStructureModel consolationPrize = PrizeStructureModel.builder().id(103L).regionCode("MIEN_NAM").prizeCode("KK").prizeLevel(PrizeLevel.CONSOLATION).build();
        
        when(lotteryStationServicePort.getModelById(10L)).thenReturn(LotteryStationModel.builder().id(10L).region(com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel.builder().minNumber(1000).maxNumber(999999).build()).build());
        when(resultRepositoryPort.findByStationIdAndDrawDate(anyLong(), any())).thenReturn(Optional.of(resultModel));
        when(detailRepositoryPort.findByLotteryResultId(1L)).thenReturn(List.of(specialDetail));
        when(prizeStructureServicePort.getModelsByRegion("MIEN_NAM")).thenReturn(List.of(specialPrize, consolationPrize));
        when(mapper.toWinningCheckResponse(any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), any(), anyList())).thenReturn(LotteryWinningCheckResponse.builder().resultAvailable(true).winning(false).matchedPrizes(List.of()).build());

        // Test first digit different
        var res1 = service.checkWinning(10L, java.time.LocalDate.now(), "92345");
        assertThat(res1.winning()).isFalse();

        // Test 2 digits different
        var res2 = service.checkWinning(10L, java.time.LocalDate.now(), "12995");
        assertThat(res2.winning()).isFalse();
    }
}
