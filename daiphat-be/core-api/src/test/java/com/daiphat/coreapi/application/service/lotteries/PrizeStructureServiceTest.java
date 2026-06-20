//package com.daiphat.coreapi.application.service.lotteries;
//
//import com.daiphat.coreapi.application.dto.request.lotteries.RegionPrizeStructureRequest;
//import com.daiphat.coreapi.application.dto.response.lotteries.RegionPrizeStructureResponse;
//import com.daiphat.coreapi.application.mapper.lotteries.RegionPrizeStructureApplicationMapper;
//import com.daiphat.coreapi.application.port.out.lotteries.RegionPrizeStructureRepositoryPort;
//import com.daiphat.coreapi.domain.exception.DomainException;
//import com.daiphat.coreapi.domain.exception.ErrorCode;
//import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
//import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
//import com.daiphat.coreapi.domain.model.lotteries.RegionPrizeStructureModel;
//import org.junit.jupiter.api.BeforeEach;
//import org.junit.jupiter.api.DisplayName;
//import org.junit.jupiter.api.Test;
//import org.junit.jupiter.api.extension.ExtendWith;
//import org.mockito.ArgumentCaptor;
//import org.mockito.Captor;
//import org.mockito.Mock;
//import org.mockito.junit.jupiter.MockitoExtension;
//
//import java.math.BigDecimal;
//import java.util.List;
//import java.util.Optional;
//
//import static org.assertj.core.api.Assertions.assertThat;
//import static org.assertj.core.api.Assertions.assertThatThrownBy;
//import static org.mockito.ArgumentMatchers.any;
//import static org.mockito.Mockito.verify;
//import static org.mockito.Mockito.when;
//
//@ExtendWith(MockitoExtension.class)
//@DisplayName("RegionPrizeStructureService Unit Tests")
//class PrizeStructureServiceTest {
//
//    private static final String REGION = "MIEN_BAC";
//
//    @Mock
//    private RegionPrizeStructureRepositoryPort regionPrizeStructureRepositoryPort;
//
//    @Captor
//    private ArgumentCaptor<List<RegionPrizeStructureModel>> modelsCaptor;
//
//    private PrizeStructureService prizeStructureService;
//
//    @BeforeEach
//    void setUp() {
//        prizeStructureService = new PrizeStructureService(
//                regionPrizeStructureRepositoryPort,
//                new RegionPrizeStructureApplicationMapper()
//        );
//    }
//
//    @Test
//    @DisplayName("replaceByRegion should replace all prize structures for region")
//    void replaceByRegion_shouldReplaceAll() {
//        List<RegionPrizeStructureRequest> requests = List.of(
//                regionRequest("DB", PrizeLevel.SPECIAL, 6, MatchFrom.LAST, 0),
//                regionRequest("G1", PrizeLevel.FIRST, 5, MatchFrom.LAST, 1)
//        );
//
//        when(regionPrizeStructureRepositoryPort.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
//
//        List<RegionPrizeStructureResponse> responses =
//                prizeStructureService.replaceByRegion(REGION, requests);
//
//        verify(regionPrizeStructureRepositoryPort).deleteByRegion(REGION);
//        verify(regionPrizeStructureRepositoryPort).saveAll(modelsCaptor.capture());
//
//        assertThat(responses).hasSize(2);
//        assertThat(modelsCaptor.getValue())
//                .extracting(RegionPrizeStructureModel::getPrizeCode)
//                .containsExactly("DB", "G1");
//        assertThat(modelsCaptor.getValue())
//                .allMatch(model -> REGION.equals(model.getRegion()));
//    }
//
//    @Test
//    @DisplayName("replaceByRegion should reject empty list")
//    void replaceByRegion_shouldRejectEmptyList() {
//        assertThatThrownBy(() -> prizeStructureService.replaceByRegion(REGION, List.of()))
//                .isInstanceOf(DomainException.class)
//                .extracting(ex -> ((DomainException) ex).getErrorCode())
//                .isEqualTo(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_LIST_REQUIRED);
//    }
//
//    @Test
//    @DisplayName("replaceByRegion should reject duplicate prize codes")
//    void replaceByRegion_shouldRejectDuplicateCodes() {
//        List<RegionPrizeStructureRequest> requests = List.of(
//                regionRequest("DB", PrizeLevel.SPECIAL, 6, MatchFrom.LAST, 0),
//                regionRequest("db", PrizeLevel.FIRST, 5, MatchFrom.LAST, 1)
//        );
//
//        assertThatThrownBy(() -> prizeStructureService.replaceByRegion(REGION, requests))
//                .isInstanceOf(DomainException.class)
//                .extracting(ex -> ((DomainException) ex).getErrorCode())
//                .isEqualTo(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_DUPLICATE_CODE);
//    }
//
//    @Test
//    @DisplayName("create should reject duplicate prize code in region")
//    void create_shouldRejectDuplicateCode() {
//        when(regionPrizeStructureRepositoryPort.existsByRegionAndPrizeCode(REGION, "DB")).thenReturn(true);
//
//        assertThatThrownBy(() -> prizeStructureService.create(
//                REGION,
//                regionRequest("DB", PrizeLevel.SPECIAL, 6, MatchFrom.LAST, 0)))
//                .isInstanceOf(DomainException.class)
//                .extracting(ex -> ((DomainException) ex).getErrorCode())
//                .isEqualTo(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_DUPLICATE_CODE);
//    }
//
//    @Test
//    @DisplayName("getByRegion should require region")
//    void getByRegion_shouldRequireRegion() {
//        assertThatThrownBy(() -> prizeStructureService.getByRegion(" "))
//                .isInstanceOf(DomainException.class)
//                .extracting(ex -> ((DomainException) ex).getErrorCode())
//                .isEqualTo(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_REGION_REQUIRED);
//    }
//
//    @Test
//    @DisplayName("delete should soft delete region prize structure")
//    void delete_shouldSoftDelete() {
//        RegionPrizeStructureModel existing = RegionPrizeStructureModel.builder()
//                .id(1L)
//                .region(REGION)
//                .prizeLevel(PrizeLevel.SPECIAL)
//                .prizeCode("DB")
//                .prizeValue(BigDecimal.ZERO)
//                .quantity(1)
//                .matchDigits(6)
//                .matchFrom(MatchFrom.LAST)
//                .build();
//
//        when(regionPrizeStructureRepositoryPort.findById(1L)).thenReturn(Optional.of(existing));
//        when(regionPrizeStructureRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
//
//        prizeStructureService.delete(REGION, 1L);
//
//        ArgumentCaptor<RegionPrizeStructureModel> captor = ArgumentCaptor.forClass(RegionPrizeStructureModel.class);
//        verify(regionPrizeStructureRepositoryPort).save(captor.capture());
//        assertThat(captor.getValue().isDeleted()).isTrue();
//    }
//
//    private RegionPrizeStructureRequest regionRequest(
//            String code,
//            PrizeLevel level,
//            Integer matchDigits,
//            MatchFrom matchFrom,
//            int displayOrder) {
//        return new RegionPrizeStructureRequest(
//                false,
//                level.name(),
//                null,
//                code,
//                BigDecimal.ZERO,
//                1,
//                matchDigits,
//                matchFrom.name(),
//                null,
//                displayOrder
//        );
//    }
//}
