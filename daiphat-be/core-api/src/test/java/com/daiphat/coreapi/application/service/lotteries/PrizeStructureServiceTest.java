package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.RegionPrizeStructureRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureResponse;
import com.daiphat.coreapi.application.mapper.lotteries.PrizeStructureApplicationMapper;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryRegionRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureSourceSyncPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import com.daiphat.coreapi.application.port.in.lotteries.PrizeStructureServicePort;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PrizeStructureService Unit Tests")
class PrizeStructureServiceTest {

    private static final String REGION_CODE = "MIEN_BAC";
    private static final Long REGION_ID = 1L;

    @Mock
    private PrizeStructureRepositoryPort prizeStructureRepositoryPort;

    @Mock
    private LotteryRegionRepositoryPort lotteryRegionRepositoryPort;

    @Mock
    private PrizeStructureSourceSyncPort prizeStructureSourceSyncPort;

    @Mock
    private PrizeStructureApplicationMapper prizeStructureApplicationMapper;

    private PrizeStructureServicePort prizeStructureService;

    private LotteryRegionModel regionModel;

    @BeforeEach
    void setUp() {
        regionModel = LotteryRegionModel.builder()
                .id(REGION_ID)
                .code(REGION_CODE)
                .name("Miền Bắc")
                .build();
        prizeStructureService = new PrizeStructureService(
                prizeStructureRepositoryPort,
                lotteryRegionRepositoryPort,
                prizeStructureSourceSyncPort,
                prizeStructureApplicationMapper
        );
    }

    private PrizeStructureModel createValidModel() {
        return PrizeStructureModel.builder()
                .id(100L)
                .regionCode(REGION_CODE)
                .prizeCode("DB")
                .prizeLevel(PrizeLevel.SPECIAL)
                .prizeValue(BigDecimal.ZERO)
                .quantity(1)
                .matchFrom(MatchFrom.LAST)
                .matchDigits(2)
                .build();
    }

    @Test
    @DisplayName("[DP-467] getRegions: Lấy danh sách mã vùng thành công")
    void getRegions_success() {
        when(prizeStructureRepositoryPort.findDistinctRegionCodes()).thenReturn(List.of(REGION_CODE));
        List<String> regions = prizeStructureService.getRegions();
        assertThat(regions).hasSize(1).contains(REGION_CODE);
    }

    @Test
    @DisplayName("[DP-467] getByRegion: Lấy danh sách giải theo vùng thành công")
    void getByRegion_success() {
        PrizeStructureModel model = createValidModel();
        PrizeStructureResponse response = PrizeStructureResponse.builder().id(100L).regionCode(REGION_CODE).build();

        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));
        when(prizeStructureRepositoryPort.findByRegionCode(REGION_CODE)).thenReturn(List.of(model));
        when(prizeStructureApplicationMapper.toResponseList(List.of(model))).thenReturn(List.of(response));

        List<PrizeStructureResponse> result = prizeStructureService.getByRegion(REGION_CODE);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().id()).isEqualTo(100L);
    }

    @Test
    @DisplayName("[DP-467] getByRegion: Ném lỗi nếu vùng không tồn tại")
    void getByRegion_throwsWhenRegionNotFound() {
        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> prizeStructureService.getByRegion(REGION_CODE))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_REGION_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-467] getByRegion: Ném lỗi khi region null hoặc rỗng")
    void getByRegion_throwsWhenRegionBlank() {
        assertThatThrownBy(() -> prizeStructureService.getByRegion(null))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_REGION_REQUIRED);

        assertThatThrownBy(() -> prizeStructureService.getByRegion("   "))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_REGION_REQUIRED);
    }

    @Test
    @DisplayName("[DP-467] getModelsByRegion: Thành công")
    void getModelsByRegion_success() {
        PrizeStructureModel model = createValidModel();
        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));
        when(prizeStructureRepositoryPort.findByRegionCode(REGION_CODE)).thenReturn(List.of(model));

        List<PrizeStructureModel> result = prizeStructureService.getModelsByRegion(REGION_CODE);
        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getId()).isEqualTo(model.getId());
    }

    @Test
    @DisplayName("[DP-467] getModelById: Thành công")
    void getModelById_success() {
        PrizeStructureModel model = createValidModel();
        when(prizeStructureRepositoryPort.findById(100L)).thenReturn(Optional.of(model));

        PrizeStructureModel result = prizeStructureService.getModelById(100L);
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(100L);
    }

    @Test
    @DisplayName("[DP-467] findModelById: Thành công")
    void findModelById_success() {
        PrizeStructureModel model = createValidModel();
        when(prizeStructureRepositoryPort.findById(100L)).thenReturn(Optional.of(model));

        Optional<PrizeStructureModel> result = prizeStructureService.findModelById(100L);
        assertThat(result).isPresent();
        assertThat(result.get().getId()).isEqualTo(100L);
    }

    @Test
    @DisplayName("[DP-467] getById: Lấy chi tiết giải theo ID thành công")
    void getById_success() {
        Long prizeId = 100L;
        PrizeStructureModel model = createValidModel();
        PrizeStructureResponse response = PrizeStructureResponse.builder().id(prizeId).regionCode(REGION_CODE).build();

        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));
        when(prizeStructureRepositoryPort.findById(prizeId)).thenReturn(Optional.of(model));
        when(prizeStructureApplicationMapper.toResponse(model)).thenReturn(response);

        PrizeStructureResponse result = prizeStructureService.getById(REGION_CODE, prizeId);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(prizeId);
    }

    @Test
    @DisplayName("[DP-467] getById: Ném lỗi nếu giải không thuộc vùng chỉ định")
    void getById_throwsWhenRegionMismatch() {
        Long prizeId = 100L;
        PrizeStructureModel model = createValidModel();
        model.setRegionCode("MIEN_NAM");

        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));
        when(prizeStructureRepositoryPort.findById(prizeId)).thenReturn(Optional.of(model));

        assertThatThrownBy(() -> prizeStructureService.getById(REGION_CODE, prizeId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_REGION_INVALID);
    }

    @Test
    @DisplayName("[DP-467] getById: Ném lỗi nếu không tìm thấy giải")
    void getById_throwsWhenPrizeNotFound() {
        Long prizeId = 100L;

        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));
        when(prizeStructureRepositoryPort.findById(prizeId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> prizeStructureService.getById(REGION_CODE, prizeId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-467] create: Tạo cơ cấu giải thành công")
    void create_success() {
        RegionPrizeStructureRequest request = new RegionPrizeStructureRequest(
                "SPECIAL", "Đặc biệt", "DB", "Giải đặc biệt", BigDecimal.ZERO, 1, 6, "LAST", "Cuối", 0, true
        );
        PrizeStructureModel model = createValidModel();
        PrizeStructureResponse response = PrizeStructureResponse.builder().id(10L).prizeCode("DB").build();

        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));
        when(prizeStructureApplicationMapper.toModel(request, REGION_ID, REGION_CODE)).thenReturn(model);
        when(prizeStructureRepositoryPort.existsByRegionCodeAndPrizeCode(REGION_CODE, "DB")).thenReturn(false);
        when(prizeStructureRepositoryPort.save(model)).thenReturn(model);
        when(prizeStructureApplicationMapper.toResponse(model)).thenReturn(response);

        PrizeStructureResponse result = prizeStructureService.create(REGION_CODE, request);

        assertThat(result).isNotNull();
        assertThat(result.prizeCode()).isEqualTo("DB");
    }

    @Test
    @DisplayName("[DP-467] create: Ném lỗi trùng mã giải (PrizeCode)")
    void create_throwsWhenDuplicatePrizeCode() {
        RegionPrizeStructureRequest request = new RegionPrizeStructureRequest(
                "SPECIAL", "Đặc biệt", "DB", "Giải đặc biệt", BigDecimal.ZERO, 1, 6, "LAST", "Cuối", 0, true
        );
        PrizeStructureModel model = createValidModel();

        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));
        when(prizeStructureApplicationMapper.toModel(request, REGION_ID, REGION_CODE)).thenReturn(model);
        when(prizeStructureRepositoryPort.existsByRegionCodeAndPrizeCode(REGION_CODE, "DB")).thenReturn(true);

        assertThatThrownBy(() -> prizeStructureService.create(REGION_CODE, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_DUPLICATE_CODE);
    }

    @Test
    @DisplayName("[DP-467] update: Cập nhật cơ cấu giải thành công")
    void update_success() {
        Long prizeId = 100L;
        RegionPrizeStructureRequest request = new RegionPrizeStructureRequest(
                "SPECIAL", "Đặc biệt", "DB", "Giải đặc biệt cập nhật", BigDecimal.ZERO, 1, 6, "LAST", "Cuối", 0, true
        );
        PrizeStructureModel existingModel = createValidModel();
        PrizeStructureModel mergedModel = createValidModel();
        mergedModel.setDescription("Giải đặc biệt cập nhật");
        PrizeStructureResponse response = PrizeStructureResponse.builder().id(prizeId).prizeCode("DB").build();

        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));
        when(prizeStructureRepositoryPort.findById(prizeId)).thenReturn(Optional.of(existingModel));
        when(prizeStructureApplicationMapper.merge(request, existingModel)).thenReturn(mergedModel);
        when(prizeStructureRepositoryPort.existsByRegionCodeAndPrizeCodeExcludingId(REGION_CODE, "DB", prizeId)).thenReturn(false);
        when(prizeStructureRepositoryPort.save(mergedModel)).thenReturn(mergedModel);
        when(prizeStructureApplicationMapper.toResponse(mergedModel)).thenReturn(response);

        PrizeStructureResponse result = prizeStructureService.update(REGION_CODE, prizeId, request);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(prizeId);
    }

    @Test
    @DisplayName("[DP-467] update: Ném lỗi trùng mã giải (PrizeCode) khi cập nhật")
    void update_throwsWhenDuplicatePrizeCode() {
        Long prizeId = 100L;
        RegionPrizeStructureRequest request = new RegionPrizeStructureRequest(
                "SPECIAL", "Đặc biệt", "DB", "Giải đặc biệt cập nhật", BigDecimal.ZERO, 1, 6, "LAST", "Cuối", 0, true
        );
        PrizeStructureModel existingModel = createValidModel();
        PrizeStructureModel mergedModel = createValidModel();

        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));
        when(prizeStructureRepositoryPort.findById(prizeId)).thenReturn(Optional.of(existingModel));
        when(prizeStructureApplicationMapper.merge(request, existingModel)).thenReturn(mergedModel);
        when(prizeStructureRepositoryPort.existsByRegionCodeAndPrizeCodeExcludingId(REGION_CODE, "DB", prizeId)).thenReturn(true);

        assertThatThrownBy(() -> prizeStructureService.update(REGION_CODE, prizeId, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_DUPLICATE_CODE);
    }

    @Test
    @DisplayName("[DP-467] delete: Xóa cơ cấu giải thành công")
    void delete_success() {
        Long prizeId = 100L;
        PrizeStructureModel existingModel = createValidModel();

        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));
        when(prizeStructureRepositoryPort.findById(prizeId)).thenReturn(Optional.of(existingModel));

        prizeStructureService.delete(REGION_CODE, prizeId);

        verify(prizeStructureRepositoryPort).deleteById(prizeId);
    }

    @Test
    @DisplayName("[DP-467] replaceByRegion: Thay thế danh sách cơ cấu giải thành công")
    void replaceByRegion_success() {
        RegionPrizeStructureRequest request1 = new RegionPrizeStructureRequest(
                "SPECIAL", "Đặc biệt", "DB", "Giải đặc biệt", BigDecimal.ZERO, 1, 6, "LAST", "Cuối", 0, true
        );
        RegionPrizeStructureRequest request2 = new RegionPrizeStructureRequest(
                "FIRST", "Giải nhất", "G1", "Giải nhất", BigDecimal.ZERO, 10, 5, "LAST", "Cuối", 1, true
        );
        List<RegionPrizeStructureRequest> requests = List.of(request1, request2);

        PrizeStructureModel model1 = createValidModel();
        PrizeStructureModel model2 = createValidModel();
        model2.setPrizeCode("G1");

        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));
        when(prizeStructureApplicationMapper.toModel(request1, REGION_ID, REGION_CODE)).thenReturn(model1);
        when(prizeStructureApplicationMapper.toModel(request2, REGION_ID, REGION_CODE)).thenReturn(model2);
        
        when(prizeStructureRepositoryPort.saveAll(anyList())).thenReturn(List.of(model1, model2));
        when(prizeStructureApplicationMapper.toResponseList(anyList())).thenReturn(List.of(
                PrizeStructureResponse.builder().prizeCode("DB").build(),
                PrizeStructureResponse.builder().prizeCode("G1").build()
        ));

        List<PrizeStructureResponse> result = prizeStructureService.replaceByRegion(REGION_CODE, requests);

        verify(prizeStructureRepositoryPort).deleteByRegionCode(REGION_CODE);
        verify(prizeStructureRepositoryPort).saveAll(anyList());
        assertThat(result).hasSize(2);
    }

    @Test
    @DisplayName("[DP-467] replaceByRegion: Ném lỗi nếu danh sách rỗng")
    void replaceByRegion_throwsWhenListEmpty() {
        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));

        assertThatThrownBy(() -> prizeStructureService.replaceByRegion(REGION_CODE, List.of()))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_LIST_REQUIRED);
    }

    @Test
    @DisplayName("[DP-467] replaceByRegion: Ném lỗi nếu mã giải trùng nhau trong danh sách")
    void replaceByRegion_throwsWhenDuplicateCodeInList() {
        RegionPrizeStructureRequest request1 = new RegionPrizeStructureRequest(
                "SPECIAL", "Đặc biệt", "DB", "Giải đặc biệt", BigDecimal.ZERO, 1, 6, "LAST", "Cuối", 0, true
        );
        RegionPrizeStructureRequest request2 = new RegionPrizeStructureRequest(
                "FIRST", "Giải nhất", "DB", "Giải nhất nhưng lại để code DB", BigDecimal.ZERO, 10, 5, "LAST", "Cuối", 1, true
        );
        List<RegionPrizeStructureRequest> requests = List.of(request1, request2);

        PrizeStructureModel model1 = createValidModel();
        PrizeStructureModel model2 = createValidModel();

        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));
        when(prizeStructureApplicationMapper.toModel(request1, REGION_ID, REGION_CODE)).thenReturn(model1);
        when(prizeStructureApplicationMapper.toModel(request2, REGION_ID, REGION_CODE)).thenReturn(model2);

        assertThatThrownBy(() -> prizeStructureService.replaceByRegion(REGION_CODE, requests))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_TEMPLATE_DUPLICATE_CODE);
    }

    @Test
    @DisplayName("[DP-467] syncByRegion: Đồng bộ thành công (có đủ Created, Updated, Skipped, Deleted)")
    void syncByRegion_success() {
        com.daiphat.coreapi.application.dto.request.lotteries.SyncPrizeStructuresRequest request = 
                new com.daiphat.coreapi.application.dto.request.lotteries.SyncPrizeStructuresRequest(
                        com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType.MINH_NGOC, REGION_CODE
                );

        // Nguồn trả về 3 giải: "DB" (Created), "G1" (Updated), "G2" (Skipped)
        com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem itemDB = 
                com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem.builder().prizeDisplayName("Đặc biệt").prizeCode("DB").prizeValue(BigDecimal.ZERO).quantity(1).matchFrom("LAST").matchDigits(6).build();
        com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem itemG1 = 
                com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem.builder().prizeDisplayName("Giải nhất").prizeCode("G1").prizeValue(BigDecimal.TEN).quantity(1).matchFrom("LAST").matchDigits(5).note("Có thay đổi").build();
        com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem itemG2 = 
                com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem.builder().prizeDisplayName("Giải nhì").prizeCode("G2").prizeValue(BigDecimal.ZERO).quantity(1).matchFrom("LAST").matchDigits(5).build();

        com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourcePreviewResult preview = 
                com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourcePreviewResult.builder().source("MinhNgoc").fetchedAt(java.time.LocalDateTime.now()).items(List.of(itemDB, itemG1, itemG2)).build();

        // Database hiện có: "G1" (cũ), "G2" (giống y hệt nguồn -> Skipped), "G3" (dư thừa -> Bị xóa)
        PrizeStructureModel existingG1 = createValidModel();
        existingG1.setId(101L);
        existingG1.setPrizeCode("G1");
        existingG1.setPrizeValue(BigDecimal.ZERO); // Giá trị cũ là ZERO, nguồn là TEN -> Cần update

        PrizeStructureModel existingG2 = createValidModel();
        existingG2.setId(102L);
        existingG2.setPrizeCode("G2");
        existingG2.setPrizeValue(BigDecimal.ZERO); 
        existingG2.setPrizeDisplayName("Giải nhì");
        existingG2.setMatchDigits(5);

        PrizeStructureModel obsoleteG3 = createValidModel();
        obsoleteG3.setId(103L);
        obsoleteG3.setPrizeCode("G3");

        PrizeStructureModel mappedDB = createValidModel();
        mappedDB.setPrizeCode("DB");

        PrizeStructureModel mappedG1 = createValidModel();
        mappedG1.setPrizeCode("G1");
        mappedG1.setPrizeValue(BigDecimal.TEN);

        PrizeStructureModel mappedG2 = createValidModel();
        mappedG2.setPrizeCode("G2");
        mappedG2.setPrizeValue(BigDecimal.ZERO);
        mappedG2.setPrizeDisplayName("Giải nhì");
        mappedG2.setMatchDigits(5);

        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));
        when(prizeStructureSourceSyncPort.preview(request.source(), REGION_CODE)).thenReturn(preview);
        when(prizeStructureRepositoryPort.findByRegionCode(REGION_CODE)).thenReturn(List.of(existingG1, existingG2, obsoleteG3));

        when(prizeStructureApplicationMapper.toModel(itemDB, regionModel)).thenReturn(mappedDB);
        when(prizeStructureApplicationMapper.toModel(itemG1, regionModel)).thenReturn(mappedG1);
        when(prizeStructureApplicationMapper.toModel(itemG2, regionModel)).thenReturn(mappedG2);

        when(prizeStructureApplicationMapper.toSyncItemResponse(any(), any(), any(), any()))
                .thenAnswer(inv -> com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureSyncItemResponse.builder()
                        .prizeCode(((com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel) inv.getArgument(1)).getPrizeCode())
                        .build());

        when(prizeStructureApplicationMapper.finalizeSyncItemResponse(any(), any()))
                .thenAnswer(inv -> inv.getArgument(0));

        when(prizeStructureRepositoryPort.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureSyncResponse response = 
                com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureSyncResponse.builder()
                .createdCount(1).updatedCount(1).deletedCount(1).skippedCount(1).build();

        when(prizeStructureApplicationMapper.toSyncResponse(eq(preview), eq(regionModel), eq(1), eq(1), eq(1), eq(1), anyList()))
                .thenReturn(response);

        com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureSyncResponse result = 
                prizeStructureService.syncByRegion(request);

        verify(prizeStructureRepositoryPort).deleteById(103L); // G3 is deleted
        assertThat(result.createdCount()).isEqualTo(1);
        assertThat(result.updatedCount()).isEqualTo(1);
        assertThat(result.skippedCount()).isEqualTo(1);
        assertThat(result.deletedCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("[DP-467] syncByRegion: Ném lỗi khi dữ liệu nguồn rỗng")
    void syncByRegion_throwsWhenPreviewEmpty() {
        com.daiphat.coreapi.application.dto.request.lotteries.SyncPrizeStructuresRequest request = 
                new com.daiphat.coreapi.application.dto.request.lotteries.SyncPrizeStructuresRequest(
                        com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType.MINH_NGOC, REGION_CODE
                );

        com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourcePreviewResult emptyPreview = 
                com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourcePreviewResult.builder().source("MinhNgoc").fetchedAt(java.time.LocalDateTime.now()).items(List.of()).build();

        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));
        when(prizeStructureSourceSyncPort.preview(request.source(), REGION_CODE)).thenReturn(emptyPreview);

        assertThatThrownBy(() -> prizeStructureService.syncByRegion(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_SYNC_SOURCE_EMPTY);
    }

    @Test
    @DisplayName("[DP-467] syncByRegion: Ném lỗi khi dữ liệu nguồn có mã giải trùng lặp")
    void syncByRegion_throwsWhenSourceHasDuplicateCodes() {
        com.daiphat.coreapi.application.dto.request.lotteries.SyncPrizeStructuresRequest request = 
                new com.daiphat.coreapi.application.dto.request.lotteries.SyncPrizeStructuresRequest(
                        com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType.MINH_NGOC, REGION_CODE
                );

        com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem item1 = 
                com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem.builder().prizeDisplayName("Đặc biệt 1").prizeCode("DB").prizeValue(BigDecimal.ZERO).quantity(1).matchFrom("LAST").matchDigits(6).build();
        com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem item2 = 
                com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem.builder().prizeDisplayName("Đặc biệt 2").prizeCode("db").prizeValue(BigDecimal.ZERO).quantity(1).matchFrom("LAST").matchDigits(6).build();

        com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourcePreviewResult preview = 
                com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourcePreviewResult.builder().source("MinhNgoc").fetchedAt(java.time.LocalDateTime.now()).items(List.of(item1, item2)).build();

        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));
        when(prizeStructureSourceSyncPort.preview(request.source(), REGION_CODE)).thenReturn(preview);

        assertThatThrownBy(() -> prizeStructureService.syncByRegion(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_SYNC_SOURCE_INVALID);
    }

    @Test
    @DisplayName("[DP-467] syncByRegion: Ném lỗi khi dữ liệu nguồn chứa mã giải rỗng")
    void syncByRegion_throwsWhenSourceHasBlankCode() {
        com.daiphat.coreapi.application.dto.request.lotteries.SyncPrizeStructuresRequest request = 
                new com.daiphat.coreapi.application.dto.request.lotteries.SyncPrizeStructuresRequest(
                        com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType.MINH_NGOC, REGION_CODE
                );

        com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem itemBlank = 
                com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem.builder().prizeDisplayName("Đặc biệt rỗng").prizeCode("   ").prizeValue(BigDecimal.ZERO).quantity(1).matchFrom("LAST").matchDigits(6).build();

        com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourcePreviewResult preview = 
                com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourcePreviewResult.builder().source("MinhNgoc").fetchedAt(java.time.LocalDateTime.now()).items(List.of(itemBlank)).build();

        when(lotteryRegionRepositoryPort.findByCode(REGION_CODE)).thenReturn(Optional.of(regionModel));
        when(prizeStructureSourceSyncPort.preview(request.source(), REGION_CODE)).thenReturn(preview);

        assertThatThrownBy(() -> prizeStructureService.syncByRegion(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PRIZE_STRUCTURE_SYNC_SOURCE_INVALID);
    }
}
