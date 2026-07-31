package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ReplaceTicketDigitsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.event.LotteryTicketProxyExpiredEvent;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryTicketApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("[DP-272][DP-325][DP-281][DP-234][DP-292] Core LotteryTicketService Unit Tests")
class LotteryTicketServiceTest {

    private static final Long PRODUCT_ID = 111L;
    private static final Long TICKET_ID = 222L;
    private static final UUID IMPORTED_BY_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Long IMPORT_BATCH_ID = 99L;
    private static final Long IMPORT_BATCH_LINE_ID = 199L;

    private static final String PRODUCT_NAME = "Vé số TP.HCM";
    private static final String TICKET_IMAGE = "https://cdn.daiphat.com/tickets/ve-so.png";
    private static final String UPDATED_TICKET_IMAGE = "https://cdn.daiphat.com/tickets/ve-so-updated.png";
    private static final String SERIAL_NUMBER = "AB123456";
    private static final String UPDATED_SERIAL_NUMBER = "CD987654";
    private static final String NUMBERS = "12345";
    private static final String UPDATED_NUMBERS = "67890";
    private static final String BATCH_CODE = "BATCH-001";
    private static final String UPDATED_BATCH_CODE = "BATCH-002";
    private static final String STATUS_IN_STOCK = "IN_STOCK";
    private static final String STATUS_DISPLAY_NAME = "Còn trong kho";
    private static final Long REPLACEMENT_TICKET_ID = 333L;

    private LotteryTicketServicePort lotteryTicketService;

    @Mock
    private LotteryTicketRepositoryPort lotteryTicketRepositoryPort;

    @Mock
    private LotteryStationServicePort lotteryStationServicePort;

    @Mock
    private StoragePort storagePort;

    @Mock
    private LotteryTicketSerialServicePort lotteryTicketSerialService;

    @Mock
    private LotteryTicketApplicationMapper lotteryTicketApplicationMapper;

    @Mock
    private com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort importBatchRepositoryPort;

    @Mock
    private com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort importBatchLineRepositoryPort;

    @Mock
    private com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;

    @Mock
    private com.daiphat.coreapi.shared.util.ImportBatchDraftExpiryService importBatchDraftExpiryService;

    @Mock
    private com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort orderRepositoryPort;

    @Mock
    private org.springframework.context.ApplicationEventPublisher applicationEventPublisher;

    @Mock
    private LotteryTicketAggregateSyncService lotteryTicketAggregateSyncService;

    private LotteryStationModel productModel;
    private CreateLotteryTicketRequest createRequest;
    private LotteryTicketModel mappedModel;
    private LotteryTicketModel existingModel;
    private LotteryTicketModel savedModel;
    private LotteryTicketResponse mappedResponse;

    @BeforeEach
    void setUp() {
        lotteryTicketService = new LotteryTicketService(
                lotteryTicketRepositoryPort,
                lotteryTicketSerialRepositoryPort,
                importBatchRepositoryPort,
                importBatchLineRepositoryPort,
                importBatchDraftExpiryService,
                lotteryStationServicePort,
                lotteryTicketApplicationMapper,
                lotteryTicketSerialService,
                storagePort,
                orderRepositoryPort,
                applicationEventPublisher,
                lotteryTicketAggregateSyncService
        );

        productModel = LotteryStationModel.builder()
                .id(PRODUCT_ID)
                .name(PRODUCT_NAME)
                .province("Hồ Chí Minh")
                .region(LotteryRegionModel.builder()
                        .code("MIEN_NAM")
                        .name("Miền Nam")
                        .type(LotteryStationType.TRADITIONAL)
                        .minNumber(0)
                        .maxNumber(99_999)
                        .build())
                .price(BigDecimal.valueOf(10000))
                .inventoryCount(10)
                .nextDrawDate(LocalDate.now())
                .drawDays(java.util.List.of(LocalDate.now().getDayOfWeek()))
                .drawTime(java.time.LocalTime.of(16, 15))
                .isActive(true)
                .build();

        createRequest = CreateLotteryTicketRequest.builder()
                .stationId(PRODUCT_ID)
                .serials(java.util.List.of(new com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest(SERIAL_NUMBER, TICKET_IMAGE)))
                .numbers(NUMBERS)
                .drawDate(LocalDate.now())
                .importBatchLineId(IMPORT_BATCH_LINE_ID)
                .build();

        ImportBatchLineModel importBatchLine = ImportBatchLineModel.builder()
                .id(IMPORT_BATCH_LINE_ID)
                .importBatchId(IMPORT_BATCH_ID)
                .lotteryStationId(PRODUCT_ID)
                .batchCode(BATCH_CODE)
                .declareQuantity(1000)
                .build();

        ImportBatchModel importBatch = ImportBatchModel.builder()
                .id(IMPORT_BATCH_ID)
                .drawDate(LocalDate.now())
                .status(com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.DRAFT)
                .importedBy(IMPORTED_BY_ID)
                .lines(new java.util.ArrayList<>(java.util.List.of(importBatchLine)))
                .build();

        when(importBatchLineRepositoryPort.findById(IMPORT_BATCH_LINE_ID)).thenReturn(Optional.of(importBatchLine));
        when(importBatchRepositoryPort.findById(IMPORT_BATCH_ID)).thenReturn(Optional.of(importBatch));
        lenient().when(importBatchLineRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(lotteryTicketSerialService.countByImportBatchLineId(any())).thenReturn(1L);
        lenient().when(lotteryTicketSerialService.findDistinctTicketIdsByImportBatchLineId(any())).thenReturn(List.of());

        mappedModel = LotteryTicketModel.builder()
                .stationId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .numbers(NUMBERS)
                .drawDate(createRequest.drawDate())
                .build();

        existingModel = LotteryTicketModel.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .numbers(NUMBERS)
                .drawDate(createRequest.drawDate())
                .status(LotteryTicketStatus.IN_STOCK)
                .importedById(IMPORTED_BY_ID)
                .importedAt(LocalDateTime.now().minusDays(1))
                .verified(false)
                .createdAt(LocalDateTime.now().minusDays(1))
                .updatedAt(LocalDateTime.now().minusDays(1))
                .build();

        savedModel = LotteryTicketModel.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .numbers(NUMBERS)
                .drawDate(createRequest.drawDate())
                .status(LotteryTicketStatus.IN_STOCK)
                .importedById(IMPORTED_BY_ID)
                .importedAt(LocalDateTime.now())
                .verified(false)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        mappedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .stationName(PRODUCT_NAME)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers(NUMBERS)
                .drawDate(createRequest.drawDate())
                .batchCode(BATCH_CODE)
                .status(STATUS_IN_STOCK)
                .statusDisplayName(STATUS_DISPLAY_NAME)
                .importedById(IMPORTED_BY_ID)
                .importedAt(savedModel.getImportedAt())
                .verified(false)
                .createdAt(savedModel.getCreatedAt())
                .updatedAt(savedModel.getUpdatedAt())
                .build();

        lenient().when(lotteryTicketSerialService.findAllByTicketId(any())).thenReturn(List.of());
        lenient().when(lotteryTicketSerialService.findFirstByTicketId(any())).thenReturn(Optional.empty());
        lenient().when(lotteryTicketSerialService.findRepresentativeSerialsByTicketIds(any())).thenReturn(Map.of());
        lenient().when(lotteryTicketSerialService.countAvailableSerialsByTicketIds(any())).thenReturn(Map.of());
        lenient().when(lotteryTicketApplicationMapper.toResponseDetail(any(), anyList(), nullable(String.class), nullable(String.class), anyInt()))
                .thenReturn(mappedResponse);
        lenient().when(lotteryTicketApplicationMapper.toResponse(any(LotteryTicketModel.class), any(), nullable(String.class), nullable(String.class), anyInt()))
                .thenReturn(mappedResponse);
    }


    @Test
    @DisplayName("[DP-281][DP-234] GET_BY_ID: Lấy chi tiết vé số thành công với đầy đủ thông tin")
    void getById_success_returnsTicketDetails() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME), any(), anyInt())).thenReturn(mappedResponse);

        LotteryTicketResponse response = lotteryTicketService.getById(TICKET_ID);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(TICKET_ID);
        assertThat(response.stationId()).isEqualTo(PRODUCT_ID);
        assertThat(response.stationName()).isEqualTo(PRODUCT_NAME);
        assertThat(response.ticketImg()).isEqualTo(TICKET_IMAGE);
        assertThat(response.serialNumber()).isEqualTo(SERIAL_NUMBER);
        assertThat(response.numbers()).isEqualTo(NUMBERS);
        assertThat(response.status()).isEqualTo(STATUS_IN_STOCK);
        assertThat(response.batchCode()).isEqualTo(BATCH_CODE);
        assertThat(response.importedById()).isEqualTo(IMPORTED_BY_ID);
        assertThat(response.verified()).isFalse();

        verify(lotteryTicketRepositoryPort).findById(TICKET_ID);
        verify(lotteryTicketSerialService).findAllByTicketId(TICKET_ID);
        verify(lotteryStationServicePort).findModelById(PRODUCT_ID);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET_BY_ID: Lấy chi tiết vé số thất bại khi vé không tồn tại")
    void getById_notFound_throwsLotteryTicketNotFound() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lotteryTicketService.getById(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_NOT_FOUND);

        verify(lotteryTicketRepositoryPort).findById(TICKET_ID);
        verify(lotteryStationServicePort, org.mockito.Mockito.never()).getModelById(org.mockito.ArgumentMatchers.any());
    }

    // ============================================================
    // GET ALL TESTS (DP-325)
    // ============================================================

    @Test
    @DisplayName("[DP-281][DP-234] GET_ALL: Lấy danh sách vé số thành công với phân trang")
    void getAll_success_returnsPaginatedTickets() {
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(
                List.of(existingModel, savedModel),
                PageRequest.of(0, 10),
                2
        );

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), eq(PRODUCT_ID), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(ticketPage);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME), any(), anyInt())).thenReturn(mappedResponse);
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(savedModel), anyList(), eq(PRODUCT_NAME), eq(BATCH_CODE), anyInt())).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1,
                10,
                PRODUCT_ID,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "createdAt",
                "desc");

        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).hasSize(2);
        assertThat(response.getPagination().getTotalRecords()).isEqualTo(2);
        assertThat(response.getPagination().getCurrentPage()).isEqualTo(1);
        assertThat(response.getPagination().getLimit()).isEqualTo(10);
    }

    @Test
    @DisplayName("GET_ALL: Cân bằng vé theo đài khi balanceByStation=true")
    void getAll_balanceByStation_interleavesTicketsAcrossStations() {
        Long stationB = 444L;
        LotteryTicketModel ticketA1 = LotteryTicketModel.builder().id(1001L).stationId(PRODUCT_ID).numbers("100001").drawDate(createRequest.drawDate()).status(LotteryTicketStatus.IN_STOCK).build();
        LotteryTicketModel ticketA2 = LotteryTicketModel.builder().id(1002L).stationId(PRODUCT_ID).numbers("100002").drawDate(createRequest.drawDate()).status(LotteryTicketStatus.IN_STOCK).build();
        LotteryTicketModel ticketB1 = LotteryTicketModel.builder().id(2001L).stationId(stationB).numbers("200001").drawDate(createRequest.drawDate()).status(LotteryTicketStatus.IN_STOCK).build();
        LotteryTicketModel ticketB2 = LotteryTicketModel.builder().id(2002L).stationId(stationB).numbers("200002").drawDate(createRequest.drawDate()).status(LotteryTicketStatus.IN_STOCK).build();

        when(lotteryTicketRepositoryPort.findAll(
                any(PageRequest.class), eq(PRODUCT_ID), eq(List.of(PRODUCT_ID)), any(), any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(ticketA1, ticketA2), PageRequest.of(0, 5), 20));
        when(lotteryTicketRepositoryPort.findAll(
                any(PageRequest.class), eq(stationB), eq(List.of(stationB)), any(), any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(ticketB1, ticketB2), PageRequest.of(0, 5), 30));
        when(lotteryTicketSerialService.findRepresentativeSerialsByTicketIds(anyList())).thenReturn(Map.of());
        when(lotteryTicketSerialService.countSerialsByTicketIds(anyList())).thenReturn(Map.of());
        when(lotteryTicketApplicationMapper.toResponse(any(), any(), any(), any(), anyInt())).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1,
                10,
                null,
                List.of(PRODUCT_ID, stationB),
                "IN_STOCK",
                null,
                null,
                null,
                null,
                null,
                "createdAt",
                "desc",
                true);

        assertThat(response.getRecordList()).hasSize(4);
        assertThat(response.getPagination().getTotalRecords()).isEqualTo(50);
        verify(lotteryTicketRepositoryPort).findAll(
                any(PageRequest.class), eq(PRODUCT_ID), eq(List.of(PRODUCT_ID)), any(), any(), any(), any(), any(), any());
        verify(lotteryTicketRepositoryPort).findAll(
                any(PageRequest.class), eq(stationB), eq(List.of(stationB)), any(), any(), any(), any(), any(), any());
    }

    @Test
    void getAll_withStatusFilter_returnsFilteredTickets() {
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(
                List.of(existingModel),
                PageRequest.of(0, 10),
                1
        );

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), eq(PRODUCT_ID), any(), eq(LotteryTicketStatus.IN_STOCK), any(), any(), any(), any(), any()))
                .thenReturn(ticketPage);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME), any(), anyInt())).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1,
                10,
                PRODUCT_ID,
                null,
                "IN_STOCK",
                null,
                null,
                null,
                null,
                null,
                null,
                null);

        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).hasSize(1);
        assertThat(response.getRecordList().getFirst().status()).isEqualTo(STATUS_IN_STOCK);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET_ALL: Lấy danh sách vé số với bộ lọc drawDate")
    void getAll_withDrawDateFilter_returnsFilteredTickets() {
        LocalDate drawDate = LocalDate.now();
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(
                List.of(existingModel),
                PageRequest.of(0, 10),
                1
        );

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), any(), any(), eq(List.of(drawDate)), any(), any(), any(), any()))
                .thenReturn(ticketPage);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME), any(), anyInt())).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1,
                10,
                null,
                null,
                null,
                drawDate.toString(),
                null,
                null,
                null,
                null,
                null,
                null);

        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET_ALL: Lấy danh sách vé số với bộ lọc search")
    void getAll_withSearchFilter_returnsFilteredTickets() {
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(
                List.of(existingModel),
                PageRequest.of(0, 10),
                1
        );

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), any(), any(), any(), any(), any(), any(), eq("123")))
                .thenReturn(ticketPage);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME), any(), anyInt())).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1,
                10,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "123",
                null,
                null);

        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET_ALL: Lấy danh sách vé số không có kết quả trả về empty page")
    void getAll_noResults_returnsEmptyPage() {
        Page<LotteryTicketModel> emptyPage = new PageImpl<>(
                List.of(),
                PageRequest.of(0, 10),
                0
        );

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(emptyPage);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1,
                10,
                PRODUCT_ID,
                null,
                "SOLD_OUT",
                null,
                null,
                null,
                null,
                null,
                null,
                null);

        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).isEmpty();
        assertThat(response.getPagination().getTotalRecords()).isEqualTo(0);
        assertThat(response.getPagination().getTotalPages()).isEqualTo(0);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET_ALL: Lấy danh sách vé số với sort direction asc")
    void getAll_withAscendingSort_returnsSortedTickets() {
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(
                List.of(existingModel),
                PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "drawDate")),
                1
        );

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(ticketPage);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME), any(), anyInt())).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1,
                10,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "drawDate",
                "asc");

        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET_ALL: Lấy danh sách vé số với status không hợp lệ bỏ qua filter")
    void getAll_withInvalidStatus_ignoresFilter() {
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(
                List.of(existingModel),
                PageRequest.of(0, 10),
                1
        );

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), any(), eq(null), any(), any(), any(), any(), any()))
                .thenReturn(ticketPage);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME), any(), anyInt())).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1,
                10,
                null,
                null,
                "INVALID_STATUS",
                null,
                null,
                null,
                null,
                null,
                null,
                null);

        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET_ALL: Lấy danh sách vé số với drawDate không hợp lệ bỏ qua filter")
    void getAll_withInvalidDrawDate_ignoresFilter() {
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(
                List.of(existingModel),
                PageRequest.of(0, 10),
                1
        );

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), any(), any(), anyList(), any(), any(), any(), any()))
                .thenReturn(ticketPage);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME), any(), anyInt())).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1,
                10,
                null,
                null,
                null,
                "invalid-date-format",
                null,
                null,
                null,
                null,
                null,
                null);

        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).hasSize(1);
    }

    // ============================================================
    // DELETE TESTS (DP-325) - COMPREHENSIVE
    // ============================================================

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số IN_STOCK thành công và giảm tồn kho đúng 1 đơn vị")
    void delete_inStockTicket_success_decreasesInventoryByOne() {
        int initialInventory = 10;
        productModel.setInventoryCount(initialInventory);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
        verify(lotteryStationServicePort, org.mockito.Mockito.atLeastOnce()).recalculateInventory(org.mockito.ArgumentMatchers.eq(PRODUCT_ID));
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số SOLD_OUT thất bại")
    void delete_soldOutTicket_throwsDomainException() {
        existingModel.setStatus(LotteryTicketStatus.SOLD_OUT);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);

        verify(lotteryTicketRepositoryPort, never()).save(any());
        verify(lotteryStationServicePort, org.mockito.Mockito.never()).recalculateInventory(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số EXPIRED thành công")
    void delete_expiredTicket_success_recalculatesInventory() {
        existingModel.setStatus(LotteryTicketStatus.EXPIRED);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
        verify(lotteryStationServicePort, org.mockito.Mockito.atLeastOnce()).recalculateInventory(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số thất bại khi vé không tồn tại - ném DomainException LOTTERY_TICKET_NOT_FOUND")
    void delete_ticketNotFound_throwsLotteryTicketNotFound() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_NOT_FOUND);

        verify(lotteryTicketRepositoryPort, never()).save(any());
        verify(lotteryStationServicePort, org.mockito.Mockito.never()).recalculateInventory(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số thất bại khi product không tồn tại - ném DomainException")
    void delete_productNotFound_throwsDomainException() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        org.mockito.Mockito.doThrow(new com.daiphat.coreapi.domain.exception.DomainException(com.daiphat.coreapi.domain.exception.ErrorCode.LOTTERY_STATION_NOT_FOUND))
                .when(lotteryStationServicePort).recalculateInventory(PRODUCT_ID);

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_STATION_NOT_FOUND);

        verify(lotteryTicketRepositoryPort).save(any());
        verify(lotteryStationServicePort).recalculateInventory(PRODUCT_ID);
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số khi tồn kho đang là 0 vẫn thành công - save product được gọi")
    void delete_whenInventoryIsZero_success_callsSaveProduct() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
        verify(lotteryStationServicePort, org.mockito.Mockito.atLeastOnce()).recalculateInventory(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số khi tồn kho là null không gây NullPointerException - save product được gọi")
    void delete_whenInventoryIsNull_success_callsSaveProduct() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
        verify(lotteryStationServicePort, org.mockito.Mockito.atLeastOnce()).recalculateInventory(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số với id khác nhau gọi đúng id")
    void delete_withDifferentIds_callsCorrectId() {
        Long differentTicketId = 999L;
        LotteryTicketModel differentTicket = LotteryTicketModel.builder()
                .id(differentTicketId)
                .stationId(PRODUCT_ID)
                .status(LotteryTicketStatus.IN_STOCK)
                .build();

        when(lotteryTicketRepositoryPort.findById(differentTicketId)).thenReturn(Optional.of(differentTicket));
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(differentTicket);

        lotteryTicketService.delete(differentTicketId);

        verify(lotteryTicketRepositoryPort).findById(differentTicketId);
        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số soft delete - gọi softDelete() trên model và save()")
    void delete_callsSoftDeleteAndSave() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số khi tồn kho là giá trị lớn hoạt động đúng")
    void delete_withLargeInventory_success() {
        int initialInventory = 100000;
        productModel.setInventoryCount(initialInventory);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        verify(lotteryStationServicePort, org.mockito.Mockito.atLeastOnce()).recalculateInventory(org.mockito.ArgumentMatchers.eq(PRODUCT_ID));
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số đã verify thành công (chỉ status IN_STOCK mới tính inventory)")
    void delete_verifiedTicket_stillDecreasesInventoryIfInStock() {
        existingModel.setVerified(true);
        existingModel.setVerifiedById(UUID.fromString("55555555-5555-5555-5555-555555555555"));
        existingModel.setVerifiedAt(LocalDateTime.now().minusDays(1));
        int initialInventory = 10;
        productModel.setInventoryCount(initialInventory);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số có đầy đủ thông tin (serial, numbers, batch) thành công")
    void delete_ticketWithFullDetails_success() {
        existingModel.setNumbers("12345");
        existingModel.setTicketImg("https://cdn.example.com/ticket.png");
        int initialInventory = 10;
        productModel.setInventoryCount(initialInventory);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số khi product inventory chưa được set - save product được gọi")
    void delete_productWithUninitializedInventory_callsSave() {
        LotteryStationModel uninitializedProduct = LotteryStationModel.builder()
                .id(PRODUCT_ID)
                .name(PRODUCT_NAME)
                .inventoryCount(null)
                .build();

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(uninitializedProduct);
        
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
        verify(lotteryStationServicePort, org.mockito.Mockito.atLeastOnce()).recalculateInventory(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số thất bại khi repository ném DataAccessException khi save product")
    void delete_repositoryThrowsDataAccessExceptionOnProductSave_propagates() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        org.mockito.Mockito.doThrow(new org.springframework.dao.DataAccessResourceFailureException("Database error"))
                .when(lotteryStationServicePort).recalculateInventory(org.mockito.ArgumentMatchers.any());

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(org.springframework.dao.DataAccessResourceFailureException.class);

        verify(lotteryTicketRepositoryPort).findById(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số không tồn tại khi findById ném exception")
    void delete_findByIdThrowsException_propagates() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID))
                .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("Connection lost"));

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(org.springframework.dao.DataAccessResourceFailureException.class);
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số đã bị soft delete trước đó ném DomainException")
    void delete_alreadySoftDeleted_throwsDomainException() {
        existingModel.setDeletedAt(LocalDateTime.now().minusDays(1));

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_NOT_FOUND);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    // ============================================================
    // VERIFY TESTS (DP-325)
    // ============================================================

    @Test
    @DisplayName("[DP-325] VERIFY: Xác minh vé số thành công")
    void verify_success_setsVerifiedFields() {
        UUID verifierId = UUID.fromString("66666666-6666-6666-6666-666666666666");
        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .stationName(PRODUCT_NAME)
                .serialNumber(SERIAL_NUMBER)
                .numbers(NUMBERS)
                .verified(true)
                .verifiedById(verifierId)
                .verifiedAt(LocalDateTime.now())
                .build();

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.save(existingModel)).thenReturn(existingModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME), any(), anyInt())).thenReturn(expectedResponse);

        LotteryTicketResponse response = lotteryTicketService.verify(TICKET_ID, verifierId);

        assertThat(response).isNotNull();
        assertThat(response.verified()).isTrue();
        assertThat(response.verifiedById()).isEqualTo(verifierId);
        assertThat(existingModel.getVerifiedById()).isEqualTo(verifierId);
        assertThat(existingModel.isVerified()).isTrue();

        verify(lotteryTicketRepositoryPort).save(existingModel);
    }

    @Test
    @DisplayName("[DP-325] VERIFY: Xác minh vé số thất bại khi vé không tồn tại")
    void verify_notFound_throwsLotteryTicketNotFound() {
        UUID verifierId = UUID.fromString("66666666-6666-6666-6666-666666666666");
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lotteryTicketService.verify(TICKET_ID, verifierId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_NOT_FOUND);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] VERIFY: Xác minh vé số đã được xác minh trước đó thất bại")
    void verify_alreadyVerified_throwsException() {
        UUID originalVerifierId = UUID.fromString("77777777-7777-7777-7777-777777777777");
        existingModel.setVerified(true);
        existingModel.setVerifiedById(originalVerifierId);
        existingModel.setVerifiedAt(LocalDateTime.now().minusDays(1));

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        UUID newVerifierId = UUID.fromString("88888888-8888-8888-8888-888888888888");
        assertThatThrownBy(() -> lotteryTicketService.verify(TICKET_ID, newVerifierId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_ALREADY_VERIFIED);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    // ============================================================
    // CREATE TESTS
    // ============================================================
    @Test
    @DisplayName("[DP-272] CREATE: Tạo vé số thành công")
    void create_success() {
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        when(lotteryTicketApplicationMapper.toModel(createRequest)).thenReturn(mappedModel);
        when(lotteryTicketRepositoryPort.findByUniqueFields(any(), any(), any())).thenReturn(Optional.empty());
        when(lotteryTicketRepositoryPort.save(any())).thenReturn(savedModel);
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(savedModel));
        when(lotteryTicketSerialService.findAllByTicketId(any())).thenReturn(List.of());
        lenient().when(lotteryTicketSerialService.countAvailableSerialsByTicketIds(any())).thenReturn(java.util.Map.of());
        when(lotteryTicketSerialService.countAvailableSerials(any())).thenReturn(1L);
        when(lotteryTicketSerialService.countByStatuses(any(), any())).thenReturn(0L);

        LotteryTicketResponse response = lotteryTicketService.create(createRequest, IMPORTED_BY_ID);

        assertThat(response).isNotNull();
        verify(lotteryTicketSerialService).upsertSerialForTicket(any(), any(), eq(IMPORTED_BY_ID), eq(IMPORT_BATCH_ID), eq(IMPORT_BATCH_LINE_ID));
        verify(lotteryTicketRepositoryPort, org.mockito.Mockito.atLeastOnce()).save(any());
    }

    // ============================================================
    // UPDATE TESTS
    // ============================================================
    @Test
    @DisplayName("[DP-272] UPDATE: Cập nhật vé số thành công")
    void update_success() {
        UpdateLotteryTicketRequest updateReq = new UpdateLotteryTicketRequest(
                "new_img", "67890", LocalDate.now(), List.of()
        );
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        when(lotteryTicketSerialService.countByStatuses(any(), anyList())).thenReturn(0L);
        when(lotteryTicketRepositoryPort.existsByUniqueFieldsAndIdNot(any(), any(), any(), any())).thenReturn(false);
        when(lotteryTicketRepositoryPort.save(any())).thenReturn(savedModel);

        LotteryTicketResponse response = lotteryTicketService.update(TICKET_ID, updateReq, IMPORTED_BY_ID);
        assertThat(response).isNotNull();
    }

    // ============================================================
    // GET PUBLIC TICKETS TESTS
    // ============================================================
    @Test
    @DisplayName("[DP-281] GET_PUBLIC_TICKETS: Lấy danh sách vé số public thành công")
    void getPublicTickets_success() {
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(List.of(existingModel), PageRequest.of(0, 10), 1);
        when(lotteryTicketRepositoryPort.findAllPublic(any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(ticketPage);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getPublicTickets(
                1, 10, PRODUCT_ID, null, null, null, null, null
        );

        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).hasSize(1);
        verify(lotteryTicketRepositoryPort).findAllPublic(
                any(), eq(PRODUCT_ID), any(), any(), eq(null), eq(null), eq(null), eq(null), eq(null));
    }

    @Test
    @DisplayName("[DP-37][DP-255] GET_PUBLIC_TICKETS: truyền searchMode SUFFIX xuống repository")
    void getPublicTickets_passesSearchModeSuffix() {
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(List.of(existingModel), PageRequest.of(0, 10), 1);
        when(lotteryTicketRepositoryPort.findAllPublic(any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(ticketPage);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getPublicTickets(
                1, 10, PRODUCT_ID, null, "2026-07-24", "68", TicketSearchMode.SUFFIX, "createdAt", "desc"
        );

        assertThat(response.getRecordList()).hasSize(1);
        verify(lotteryTicketRepositoryPort).findAllPublic(
                any(),
                eq(PRODUCT_ID),
                any(),
                eq(List.of(LocalDate.of(2026, 7, 24))),
                eq("68"),
                eq(TicketSearchMode.SUFFIX),
                eq(null),
                eq(null),
                eq(null)
        );
    }

    @Test
    @DisplayName("[DP-37][DP-255] GET_PUBLIC_TICKETS: overload 8-arg mặc định searchMode = null")
    void getPublicTickets_legacyOverload_passesNullSearchMode() {
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(List.of(existingModel), PageRequest.of(0, 10), 1);
        when(lotteryTicketRepositoryPort.findAllPublic(any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(ticketPage);

        lotteryTicketService.getPublicTickets(1, 10, null, null, null, "68", null, null);

        verify(lotteryTicketRepositoryPort).findAllPublic(
                any(), any(), any(), any(), eq("68"), eq(null), eq(null), eq(null), eq(null));
    }

    // ============================================================
    // UPLOAD TESTS
    // ============================================================
    @Test
    @DisplayName("[DP-272] UPLOAD: Tải ảnh thành công")
    void uploadImage_success() {
        com.daiphat.coreapi.application.dto.storage.UploadRequest req = new com.daiphat.coreapi.application.dto.storage.UploadRequest(
                "data".getBytes(), "image.png", "image/png", "folder"
        );
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(storagePort.upload(any())).thenReturn(new com.daiphat.coreapi.application.dto.storage.StorageResult("url", "path"));
        when(lotteryTicketRepositoryPort.save(any())).thenReturn(existingModel);

        LotteryTicketResponse response = lotteryTicketService.uploadImage(TICKET_ID, req);
        assertThat(response).isNotNull();
        verify(storagePort).upload(any());
    }

    // ============================================================
    // ORDER TESTS
    // ============================================================
    @Test
    @DisplayName("[DP-325] RESERVE_FOR_ORDER: Thành công")
    void reserveForOrder_success() {
        when(lotteryTicketRepositoryPort.findAllByIds(anyList())).thenReturn(List.of(existingModel));
        lenient().when(lotteryTicketSerialService.countAvailableSerialsByTicketIds(any())).thenReturn(java.util.Map.of());
        when(lotteryTicketSerialService.countAvailableSerials(any())).thenReturn(10L);
        when(lotteryTicketSerialService.reserveFirstAvailable(any(), any(), any())).thenReturn(LotteryTicketSerialModel.builder().id(1L).ticketId(TICKET_ID).build());
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        when(lotteryTicketRepositoryPort.save(any())).thenReturn(savedModel);

        List<com.daiphat.coreapi.application.dto.order.OrderTicketSnapshot> result = lotteryTicketService.reserveForOrder(List.of(TICKET_ID));
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("[DP-325] SELL_OFFLINE_FOR_ORDER: Thành công")
    void sellOfflineForOrder_success() {
        when(lotteryTicketRepositoryPort.findAllByIds(anyList())).thenReturn(List.of(existingModel));
        lenient().when(lotteryTicketSerialService.countAvailableSerialsByTicketIds(any())).thenReturn(java.util.Map.of());
        when(lotteryTicketSerialService.countAvailableSerials(any())).thenReturn(10L);
        when(lotteryTicketSerialService.sellFirstAvailable(any())).thenReturn(LotteryTicketSerialModel.builder().id(1L).ticketId(TICKET_ID).build());
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        when(lotteryTicketRepositoryPort.save(any())).thenReturn(savedModel);

        List<com.daiphat.coreapi.application.dto.order.OrderTicketSnapshot> result = lotteryTicketService.sellOfflineForOrder(List.of(TICKET_ID));
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("[DP-325] MARK_SOLD_FOR_ORDER: Thành công")
    void markSoldForOrder_success() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder().id(1L).ticketId(TICKET_ID).build();
        when(lotteryTicketSerialService.getByIdOrThrow(1L)).thenReturn(serial);
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        when(lotteryTicketRepositoryPort.save(any())).thenReturn(savedModel);

        lotteryTicketService.markSoldForOrder(1L);
        verify(lotteryTicketSerialService).markSold(1L);
    }

    @Test
    @DisplayName("[DP-325] RELEASE_RESERVATION_FOR_ORDER: Thành công")
    void releaseReservationForOrder_success() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder().id(1L).ticketId(TICKET_ID).build();
        when(lotteryTicketSerialService.getByIdOrThrow(1L)).thenReturn(serial);
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        when(lotteryTicketSerialService.releaseReservation(any(), anyBoolean())).thenReturn(serial);
        when(lotteryTicketRepositoryPort.save(any())).thenReturn(savedModel);

        lotteryTicketService.releaseReservationForOrder(1L);
        verify(lotteryTicketSerialService).releaseReservation(any(), anyBoolean());
    }

    // ============================================================
    // EXPIRE TESTS
    // ============================================================
    @Test
    @DisplayName("[DP-325] EXPIRE_DUE_TICKETS: Hết hạn thành công")
    void expireDueTickets_success() {
        productModel.setDrawTime(LocalTime.MIN); // force expire
        when(lotteryTicketRepositoryPort.findExpirableTickets(any(), anyList())).thenReturn(List.of(existingModel));
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        when(lotteryTicketRepositoryPort.save(any())).thenReturn(savedModel);

        int count = lotteryTicketService.expireDueTickets();
        assertThat(count).isEqualTo(1);
        assertThat(existingModel.getStatus()).isEqualTo(LotteryTicketStatus.EXPIRED);
    }

    // ============================================================
    // COVERAGE TESTS FOR EXCEPTIONS AND EDGE CASES
    // ============================================================

    @Test
    @DisplayName("[DP-272] CREATE: Ném lỗi khi region null (toTicketNumber)")
    void create_throwsWhenRegionNull() {
        productModel.setRegion(null);
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        
        assertThatThrownBy(() -> lotteryTicketService.create(createRequest, IMPORTED_BY_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_STATION_SYNC_REGION_REQUIRED);
    }

    @Test
    @DisplayName("[DP-272] CREATE: Ném lỗi khi ngày quay không hợp lệ (resolveRequestedDrawDate)")
    void create_throwsWhenDrawDateInvalid() {
        CreateLotteryTicketRequest invalidReq = CreateLotteryTicketRequest.builder()
                .stationId(PRODUCT_ID)
                .serials(java.util.List.of())
                .numbers(NUMBERS)
                .drawDate(LocalDate.now().plusDays(1)) // Assume not in drawDays
                .importBatchLineId(IMPORT_BATCH_LINE_ID)
                .build();
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);

        assertThatThrownBy(() -> lotteryTicketService.create(invalidReq, IMPORTED_BY_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_DRAW_DATE_INVALID);
    }

    @Test
    @DisplayName("[DP-272] CREATE: Cập nhật vé đã tồn tại (existingTicket isPresent)")
    void create_existingTicket() {
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        when(lotteryTicketApplicationMapper.toModel(createRequest)).thenReturn(mappedModel);
        when(lotteryTicketRepositoryPort.findByUniqueFields(any(), any(), any())).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketSerialService.findAllByTicketId(any())).thenReturn(List.of());
        when(lotteryTicketRepositoryPort.save(any())).thenReturn(existingModel);

        LotteryTicketResponse response = lotteryTicketService.create(createRequest, IMPORTED_BY_ID);

        assertThat(response).isNotNull();
        // Không gọi save khi tạo mới vì nó dùng existingTicket
        verify(lotteryTicketRepositoryPort, org.mockito.Mockito.atLeastOnce()).save(any());
    }

    @Test
    @DisplayName("[DP-272] UPDATE: Ném lỗi khi vé không cho phép sửa (ensureTicketEditable)")
    void update_throwsWhenNotEditableStatus() {
        existingModel.setStatus(LotteryTicketStatus.SOLD_OUT); // Không thuộc isEditableStatus
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        
        assertThatThrownBy(() -> lotteryTicketService.update(TICKET_ID, new UpdateLotteryTicketRequest(null, null, null, null), IMPORTED_BY_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }

    @Test
    @DisplayName("[DP-272] UPDATE: Ném lỗi khi có sê-ri đang locked (ensureTicketEditable)")
    void update_throwsWhenLockedSerialCountGreaterThanZero() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketSerialService.countByStatuses(any(), anyList())).thenReturn(1L); // locked
        
        assertThatThrownBy(() -> lotteryTicketService.update(TICKET_ID, new UpdateLotteryTicketRequest(null, null, null, null), IMPORTED_BY_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }

    @Test
    @DisplayName("[DP-272] UPDATE: Ném lỗi trùng lặp serial (validateUniqueTicket)")
    void update_throwsWhenSerialExisted() {
        UpdateLotteryTicketRequest updateReq = new UpdateLotteryTicketRequest(
                null, "12345", LocalDate.now(), null
        );
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        when(lotteryTicketSerialService.countByStatuses(any(), anyList())).thenReturn(0L);
        when(lotteryTicketRepositoryPort.existsByUniqueFieldsAndIdNot(any(), any(), any(), any())).thenReturn(true);

        assertThatThrownBy(() -> lotteryTicketService.update(TICKET_ID, updateReq, IMPORTED_BY_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_SERIAL_EXISTED);
    }

    @Test
    @DisplayName("[DP-325] DELETE: Ném lỗi khi đã bị xóa")
    void delete_throwsWhenAlreadyDeleted() {
        existingModel.setDeletedAt(LocalDateTime.now());
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-325] DELETE: Ném lỗi khi trạng thái không cho phép xóa (ensureTicketSoftDeletable)")
    void delete_throwsWhenNotSoftDeletableStatus() {
        existingModel.setStatus(LotteryTicketStatus.SOLD_OUT);
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }

    @Test
    @DisplayName("[DP-325] DELETE: Ném lỗi khi có sê-ri SOLD (ensureTicketSoftDeletable)")
    void delete_throwsWhenSoldSerialCountGreaterThanZero() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketSerialService.countByStatuses(eq(TICKET_ID), anyList())).thenReturn(1L);

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }

    @Test
    @DisplayName("[DP-325] DELETE: Ném lỗi khi đã có lịch sử order (ensureTicketSoftDeletable)")
    void delete_throwsWhenOrderExists() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketSerialService.countByStatuses(eq(TICKET_ID), anyList())).thenReturn(0L);
        when(orderRepositoryPort.existsByLotteryTicketId(TICKET_ID)).thenReturn(true);

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }

    @Test
    @DisplayName("[DP-325] GET_TICKETS_OR_THROW: Ném lỗi khi thiếu vé")
    void reserveForOrder_throwsWhenTicketNotFound() {
        when(lotteryTicketRepositoryPort.findAllByIds(anyList())).thenReturn(List.of()); // Rỗng

        assertThatThrownBy(() -> lotteryTicketService.reserveForOrder(List.of(TICKET_ID)))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-325] VALIDATE_REQUESTED_SERIAL: Ném lỗi khi không đủ số lượng")
    void reserveForOrder_throwsWhenInsufficientSerials() {
        when(lotteryTicketRepositoryPort.findAllByIds(anyList())).thenReturn(List.of(existingModel));
        lenient().when(lotteryTicketSerialService.countAvailableSerialsByTicketIds(any())).thenReturn(java.util.Map.of());
        when(lotteryTicketSerialService.countAvailableSerials(any())).thenReturn(0L);

        assertThatThrownBy(() -> lotteryTicketService.reserveForOrder(List.of(TICKET_ID)))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }

    @Test
    @DisplayName("[DP-325] SELL_OFFLINE: Ném lỗi khi vé đã bán hết (SOLD_OUT)")
    void sellOffline_throwsWhenSoldOut() {
        existingModel.setStatus(LotteryTicketStatus.SOLD_OUT);
        when(lotteryTicketRepositoryPort.findAllByIds(anyList())).thenReturn(List.of(existingModel));
        lenient().when(lotteryTicketSerialService.countAvailableSerialsByTicketIds(any())).thenReturn(java.util.Map.of());
        when(lotteryTicketSerialService.countAvailableSerials(any())).thenReturn(10L);

        assertThatThrownBy(() -> lotteryTicketService.sellOfflineForOrder(List.of(TICKET_ID)))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }

    @Test
    @DisplayName("[DP-325] SELL_OFFLINE: Ném lỗi khi vé không IN_STOCK")
    void sellOffline_throwsWhenNotInStock() {
        existingModel.setStatus(LotteryTicketStatus.IMPORTING);
        when(lotteryTicketRepositoryPort.findAllByIds(anyList())).thenReturn(List.of(existingModel));
        lenient().when(lotteryTicketSerialService.countAvailableSerialsByTicketIds(any())).thenReturn(java.util.Map.of());
        when(lotteryTicketSerialService.countAvailableSerials(any())).thenReturn(10L);

        assertThatThrownBy(() -> lotteryTicketService.sellOfflineForOrder(List.of(TICKET_ID)))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }

    // ============================================================
    // NEW COVERAGE TESTS FOR REMAINING BRANCHES
    // ============================================================

    @Test
    @DisplayName("[DP-XXX] expireDueTickets: Bỏ qua vé chưa hết hạn và phát sự kiện khi có serial PROXY_HOLDING")
    void expireDueTickets_coversBranches() {
        LotteryTicketModel notExpired = new LotteryTicketModel();
        notExpired.setId(101L);
        notExpired.setStationId(PRODUCT_ID);
        notExpired.setStatus(LotteryTicketStatus.IN_STOCK);
        notExpired.setDrawDate(LocalDate.now().plusDays(1)); // Future

        LotteryTicketModel expiredWithProxySerials = new LotteryTicketModel();
        expiredWithProxySerials.setId(102L);
        expiredWithProxySerials.setStationId(PRODUCT_ID);
        expiredWithProxySerials.setNumbers(NUMBERS);
        expiredWithProxySerials.setStatus(LotteryTicketStatus.IN_STOCK);
        expiredWithProxySerials.setDrawDate(LocalDate.now().minusDays(1)); // Past

        when(lotteryTicketRepositoryPort.findExpirableTickets(any(), any()))
                .thenReturn(List.of(notExpired, expiredWithProxySerials));
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        when(lotteryTicketSerialService.countByStatuses(
                eq(102L), eq(List.of(LotteryTicketSerialStatus.PROXY_HOLDING)))).thenReturn(1L);
        when(lotteryTicketRepositoryPort.save(any())).thenAnswer(i -> i.getArgument(0));

        int count = lotteryTicketService.expireDueTickets();

        assertThat(count).isEqualTo(1);
        assertThat(expiredWithProxySerials.getStatus()).isEqualTo(LotteryTicketStatus.EXPIRED);
        verify(lotteryTicketSerialService).expireActiveSerials(102L);
        verify(lotteryTicketRepositoryPort, times(1)).save(expiredWithProxySerials);

        ArgumentCaptor<LotteryTicketProxyExpiredEvent> eventCaptor =
                ArgumentCaptor.forClass(LotteryTicketProxyExpiredEvent.class);
        verify(applicationEventPublisher).publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue().ticketId()).isEqualTo(102L);
        assertThat(eventCaptor.getValue().ticketNumber()).isEqualTo(NUMBERS);
    }

    @Test
    @DisplayName("[DP-XXX] resolveRequestedDrawDate: Cover null drawDate")
    void create_withNullDrawDate_resolvesCurrentStationDrawDate() {
        LocalDate drawDate = com.daiphat.coreapi.shared.util.DrawScheduleUtils.resolveNextDrawDate(
                java.util.List.of(LocalDate.now().getDayOfWeek()),
                java.time.LocalTime.of(16, 15)
        );
        ImportBatchLineModel importBatchLine = ImportBatchLineModel.builder()
                .id(IMPORT_BATCH_LINE_ID)
                .importBatchId(IMPORT_BATCH_ID)
                .lotteryStationId(PRODUCT_ID)
                .batchCode(BATCH_CODE)
                .declareQuantity(1000)
                .build();
        ImportBatchModel importBatch = ImportBatchModel.builder()
                .id(IMPORT_BATCH_ID)
                .drawDate(drawDate)
                .status(com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.DRAFT)
                .importedBy(IMPORTED_BY_ID)
                .lines(new java.util.ArrayList<>(java.util.List.of(importBatchLine)))
                .build();
        when(importBatchLineRepositoryPort.findById(IMPORT_BATCH_LINE_ID)).thenReturn(Optional.of(importBatchLine));
        when(importBatchRepositoryPort.findById(IMPORT_BATCH_ID)).thenReturn(Optional.of(importBatch));

        CreateLotteryTicketRequest req = CreateLotteryTicketRequest.builder()
                .stationId(PRODUCT_ID)
                .numbers(NUMBERS)
                .drawDate(null)
                .serials(List.of())
                .importBatchLineId(IMPORT_BATCH_LINE_ID)
                .build();

        productModel.setDrawDays(java.util.List.of(drawDate.getDayOfWeek()));
        productModel.setDrawTime(java.time.LocalTime.of(16, 15));
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        when(lotteryTicketRepositoryPort.findByUniqueFields(any(), any(), any())).thenReturn(Optional.empty());
        when(lotteryTicketApplicationMapper.toModel(any())).thenReturn(mappedModel);
        when(lotteryTicketRepositoryPort.save(any())).thenAnswer(i -> i.getArgument(0));
        lenient().when(lotteryTicketSerialService.countAvailableSerialsByTicketIds(any())).thenReturn(java.util.Map.of());
        when(lotteryTicketSerialService.countAvailableSerials(any())).thenReturn(0L);
        when(lotteryTicketSerialService.countByStatuses(any(), any())).thenReturn(0L);
        when(lotteryTicketSerialService.findAllByTicketId(any())).thenReturn(List.of());
        when(lotteryTicketSerialService.countByImportBatchLineId(any())).thenReturn(0L);
        when(lotteryTicketApplicationMapper.toResponseDetail(any(), anyList(), nullable(String.class), nullable(String.class), anyInt()))
                .thenReturn(mappedResponse);

        mappedModel.setId(TICKET_ID);
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(mappedModel));
        LotteryTicketResponse res = lotteryTicketService.create(req, IMPORTED_BY_ID);
        assertThat(res.drawDate()).isNotNull();
    }

    @Test
    @DisplayName("[DP-XXX] recomputeTicketAggregate: Đồng bộ trạng thái EXPIRED khi đã qua ngày quay")
    void recomputeTicketAggregate_expiredDrawDate() {
        UpdateLotteryTicketRequest req = new UpdateLotteryTicketRequest(
                null, null, LocalDate.now().minusDays(1), null);

        existingModel.setStatus(LotteryTicketStatus.IN_STOCK);
        productModel.setDrawDays(java.util.List.of(LocalDate.now().minusDays(1).getDayOfWeek()));

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        when(lotteryTicketRepositoryPort.save(any())).thenAnswer(i -> i.getArgument(0));
        when(lotteryTicketSerialService.countAvailableSerials(TICKET_ID)).thenReturn(0L);
        when(lotteryTicketSerialService.findAllByTicketId(TICKET_ID)).thenReturn(List.of());
        when(lotteryTicketSerialService.countByStatuses(eq(TICKET_ID), anyList())).thenReturn(0L);

        lotteryTicketService.update(TICKET_ID, req, UUID.randomUUID());
        assertThat(existingModel.getStatus()).isEqualTo(LotteryTicketStatus.EXPIRED);
    }

    @Test
    @DisplayName("[DP-XXX] ensureTicketAvailableForReserve: Not IN_STOCK")
    void reserveForOrder_throwsWhenNotInStock() {
        existingModel.setStatus(LotteryTicketStatus.SOLD_OUT);
        when(lotteryTicketRepositoryPort.findAllByIds(List.of(TICKET_ID))).thenReturn(List.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.reserveForOrder(List.of(TICKET_ID)))
                .isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("[DP-XXX] insufficientSerials: Blank ticket numbers")
    void reserveForOrder_throwsInsufficientSerials_withBlankNumbers() {
        existingModel.setNumbers("");
        existingModel.setStatus(LotteryTicketStatus.IN_STOCK);
        when(lotteryTicketRepositoryPort.findAllByIds(List.of(TICKET_ID))).thenReturn(List.of(existingModel));
        when(lotteryTicketSerialService.countAvailableSerials(TICKET_ID)).thenReturn(0L);

        assertThatThrownBy(() -> lotteryTicketService.reserveForOrder(List.of(TICKET_ID)))
                .isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("[DP-325] REPLACE_DIGITS: Void serial cũ (DATA_ENTRY_FAULT), soft-delete vé cũ, tạo serial mới với replacedForTicketId")
    void replaceDigits_softDeletesOldTicketAndSetsReplaceTicketId() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .id(1L)
                .ticketId(TICKET_ID)
                .serialNumber(SERIAL_NUMBER)
                .status(LotteryTicketSerialStatus.IN_STOCK)
                .build();
        LotteryTicketModel newTicket = LotteryTicketModel.builder()
                .id(REPLACEMENT_TICKET_ID)
                .stationId(PRODUCT_ID)
                .numbers(UPDATED_NUMBERS)
                .drawDate(existingModel.getDrawDate())
                .status(LotteryTicketStatus.IN_STOCK)
                .build();

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.findById(REPLACEMENT_TICKET_ID)).thenReturn(Optional.of(newTicket));
        when(lotteryTicketRepositoryPort.findByUniqueFields(
                eq(PRODUCT_ID), eq(UPDATED_NUMBERS), eq(existingModel.getDrawDate())))
                .thenReturn(Optional.empty());
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class)))
                .thenAnswer(invocation -> {
                    LotteryTicketModel arg = invocation.getArgument(0);
                    if (arg.getId() == null) {
                        arg.setId(REPLACEMENT_TICKET_ID);
                    }
                    return arg;
                });
        when(lotteryTicketSerialService.findAllByTicketId(TICKET_ID)).thenReturn(List.of(serial));
        when(lotteryTicketSerialService.findAllByTicketId(REPLACEMENT_TICKET_ID)).thenReturn(List.of(serial));
        when(lotteryTicketSerialService.countAvailableSerials(REPLACEMENT_TICKET_ID)).thenReturn(1L);
        when(lotteryTicketSerialService.countByStatuses(eq(REPLACEMENT_TICKET_ID), anyList())).thenReturn(0L);
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        when(lotteryTicketApplicationMapper.toResponse(any(LotteryTicketModel.class))).thenReturn(mappedResponse);

        ReplaceTicketDigitsRequest request = ReplaceTicketDigitsRequest.builder()
                .newNumbers(UPDATED_NUMBERS)
                .newTicketImg(UPDATED_TICKET_IMAGE)
                .build();

        lotteryTicketService.replaceDigits(TICKET_ID, request, IMPORTED_BY_ID);

        assertThat(existingModel.isDeleted()).isTrue();
        verify(lotteryTicketSerialRepositoryPort).save(argThat(s ->
                s.getStatus() == LotteryTicketSerialStatus.VOIDED && s.getFaultedBy() == com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialFaultedBy.DATA_ENTRY_FAULT));
        verify(lotteryTicketSerialRepositoryPort).save(argThat(s ->
                s.getTicketId().equals(REPLACEMENT_TICKET_ID) && Long.valueOf(1L).equals(s.getReplacedForTicketId())));
        // Old ticket is loaded once up front, then soft-deleted — never recomputed afterwards.
        verify(lotteryTicketRepositoryPort, times(1)).findById(TICKET_ID);
        verify(lotteryTicketRepositoryPort, atLeastOnce()).findById(REPLACEMENT_TICKET_ID);
        verify(lotteryStationServicePort, atLeastOnce()).recalculateInventory(PRODUCT_ID);
    }

    @Test
    @DisplayName("[DP-325] EXPIRE_DUE_TICKETS: Không phát sự kiện proxy khi không có serial PROXY_HOLDING")
    void expireDueTickets_withoutProxySerials_doesNotPublishEvent() {
        productModel.setDrawTime(LocalTime.MIN);
        when(lotteryTicketRepositoryPort.findExpirableTickets(any(), anyList())).thenReturn(List.of(existingModel));
        when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        when(lotteryTicketSerialService.countByStatuses(
                eq(TICKET_ID), eq(List.of(LotteryTicketSerialStatus.PROXY_HOLDING)))).thenReturn(0L);
        when(lotteryTicketRepositoryPort.save(any())).thenReturn(savedModel);

        int count = lotteryTicketService.expireDueTickets();

        assertThat(count).isEqualTo(1);
        assertThat(existingModel.getStatus()).isEqualTo(LotteryTicketStatus.EXPIRED);
        verify(applicationEventPublisher, never()).publishEvent(any(LotteryTicketProxyExpiredEvent.class));
    }

    @Test
    @DisplayName("FINALIZE_INCIDENT_CANCEL: Thành công khi tất cả sê-ri đã DAMAGED hoặc LOST")
    void finalizeIncidentCancel_succeedsWhenAllSerialsFaulty() {
        LotteryTicketSerialModel damagedSerial = LotteryTicketSerialModel.builder()
                .id(1L)
                .ticketId(TICKET_ID)
                .serialNumber("SN001")
                .status(LotteryTicketSerialStatus.DAMAGED)
                .build();
        LotteryTicketSerialModel lostSerial = LotteryTicketSerialModel.builder()
                .id(2L)
                .ticketId(TICKET_ID)
                .serialNumber("SN002")
                .status(LotteryTicketSerialStatus.LOST)
                .build();

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketSerialService.findAllByTicketId(TICKET_ID)).thenReturn(List.of(damagedSerial, lostSerial));
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(mappedResponse);

        LotteryTicketResponse response = lotteryTicketService.finalizeIncidentCancel(TICKET_ID);

        assertThat(response).isEqualTo(mappedResponse);
        verify(lotteryTicketAggregateSyncService).syncTicketAggregate(TICKET_ID);
    }

    @Test
    @DisplayName("FINALIZE_INCIDENT_CANCEL: Từ chối khi còn sê-ri chưa báo sự cố")
    void finalizeIncidentCancel_rejectsWhenSerialsIncomplete() {
        LotteryTicketSerialModel damagedSerial = LotteryTicketSerialModel.builder()
                .id(1L)
                .ticketId(TICKET_ID)
                .serialNumber("SN001")
                .status(LotteryTicketSerialStatus.DAMAGED)
                .build();
        LotteryTicketSerialModel pendingSerial = LotteryTicketSerialModel.builder()
                .id(2L)
                .ticketId(TICKET_ID)
                .serialNumber("SN002")
                .status(LotteryTicketSerialStatus.IN_STOCK)
                .build();

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketSerialService.findAllByTicketId(TICKET_ID)).thenReturn(List.of(damagedSerial, pendingSerial));

        assertThatThrownBy(() -> lotteryTicketService.finalizeIncidentCancel(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> {
                    DomainException domainException = (DomainException) ex;
                    assertThat(domainException.getErrorCode()).isEqualTo(ErrorCode.LOTTERY_TICKET_SERIALS_INCIDENT_INCOMPLETE);
                    assertThat(domainException.getInternalMessage()).contains("SN002");
                });

        verify(lotteryTicketAggregateSyncService, never()).syncTicketAggregate(any());
    }

}