package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryTicketApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("[DP-272][DP-325][DP-281][DP-234][DP-292] Core LotteryTicketService Unit Tests")
class LotteryTicketServiceTest {

    private static final Long PRODUCT_ID = 111L;
    private static final Long TICKET_ID = 222L;
    private static final UUID IMPORTED_BY_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");

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
    private static final String STATUS_RESERVED = "RESERVED";
    private static final String STATUS_DISPLAY_NAME = "Còn trong kho";
    private static final String STATUS_RESERVED_DISPLAY_NAME = "Đã giữ chỗ";

    private LotteryTicketService lotteryTicketService;

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
    private com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort orderRepositoryPort;

    @Mock
    private org.springframework.context.ApplicationEventPublisher applicationEventPublisher;

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
                lotteryStationServicePort,
                lotteryTicketApplicationMapper,
                lotteryTicketSerialService,
                storagePort,
                orderRepositoryPort,
                applicationEventPublisher
        );

        productModel = LotteryStationModel.builder()
                .id(PRODUCT_ID)
                .name(PRODUCT_NAME)
                .province("Hồ Chí Minh")
                .region("Miền Nam")
                .type(LotteryStationType.TRADITIONAL)
                .numberLength(5)
                .price(BigDecimal.valueOf(10000))
                .inventoryCount(10)
                .nextDrawDate(LocalDate.now())
                .status(LotteryStationStatus.ACTIVE)
                .build();

        createRequest = CreateLotteryTicketRequest.builder()
                .stationId(PRODUCT_ID)
                .serials(java.util.List.of(new com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest(SERIAL_NUMBER, TICKET_IMAGE)))
                .numbers(NUMBERS)
                .drawDate(LocalDate.now())
                .batchCode(BATCH_CODE)
                .build();

        mappedModel = LotteryTicketModel.builder()
                .stationId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .numbers(NUMBERS)
                .drawDate(createRequest.drawDate())
                .batchCode(BATCH_CODE)
                .build();

        existingModel = LotteryTicketModel.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .numbers(NUMBERS)
                .drawDate(createRequest.drawDate())
                .batchCode(BATCH_CODE)
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
                .batchCode(BATCH_CODE)
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
        lenient().when(lotteryTicketApplicationMapper.toResponseDetail(any(), anyList(), nullable(String.class)))
                .thenReturn(mappedResponse);
        lenient().when(lotteryTicketApplicationMapper.toResponse(any(LotteryTicketModel.class), any(), nullable(String.class)))
                .thenReturn(mappedResponse);
    }


    @Test
    @DisplayName("[DP-281][DP-234] GET_BY_ID: Lấy chi tiết vé số thành công với đầy đủ thông tin")
    void getById_success_returnsTicketDetails() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME))).thenReturn(mappedResponse);

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

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), eq(PRODUCT_ID), any(), any(), any()))
                .thenReturn(ticketPage);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME))).thenReturn(mappedResponse);
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(savedModel), anyList(), eq(PRODUCT_NAME))).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1, 10, PRODUCT_ID, null, null, null, "createdAt", "desc"
        );

        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).hasSize(2);
        assertThat(response.getPagination().getTotalRecords()).isEqualTo(2);
        assertThat(response.getPagination().getCurrentPage()).isEqualTo(1);
        assertThat(response.getPagination().getLimit()).isEqualTo(10);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET_ALL: Lấy danh sách vé số với bộ lọc status")
    void getAll_withStatusFilter_returnsFilteredTickets() {
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(
                List.of(existingModel),
                PageRequest.of(0, 10),
                1
        );

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), eq(PRODUCT_ID), eq(LotteryTicketStatus.IN_STOCK), any(), any()))
                .thenReturn(ticketPage);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME))).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1, 10, PRODUCT_ID, "IN_STOCK", null, null, null, null
        );

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

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), any(), eq(drawDate), any()))
                .thenReturn(ticketPage);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME))).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1, 10, null, null, drawDate.toString(), null, null, null
        );

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

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), any(), any(), eq("123")))
                .thenReturn(ticketPage);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME))).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1, 10, null, null, null, "123", null, null
        );

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

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), any(), any(), any()))
                .thenReturn(emptyPage);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1, 10, PRODUCT_ID, "RESERVED", null, null, null, null
        );

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

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), any(), any(), any()))
                .thenReturn(ticketPage);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME))).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1, 10, null, null, null, null, "drawDate", "asc"
        );

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

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), eq(null), any(), any()))
                .thenReturn(ticketPage);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME))).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1, 10, null, "INVALID_STATUS", null, null, null, null
        );

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

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), any(), eq(null), any()))
                .thenReturn(ticketPage);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME))).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1, 10, null, null, "invalid-date-format", null, null, null
        );

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
    @DisplayName("[DP-292] DELETE: Xóa vé số RESERVED thất bại")
    void delete_reservedTicket_throwsDomainException() {
        existingModel.setStatus(LotteryTicketStatus.RESERVED);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);

        verify(lotteryTicketRepositoryPort, never()).save(any());
        verify(lotteryStationServicePort, org.mockito.Mockito.never()).recalculateInventory(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số RETURNED thất bại")
    void delete_returnedTicket_throwsDomainException() {
        existingModel.setStatus(LotteryTicketStatus.RETURNED);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);

        verify(lotteryTicketRepositoryPort, never()).save(any());
        verify(lotteryStationServicePort, org.mockito.Mockito.never()).recalculateInventory(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số SOLD thất bại")
    void delete_soldTicket_throwsDomainException() {
        existingModel.setStatus(LotteryTicketStatus.SOLD);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);

        verify(lotteryTicketRepositoryPort, never()).save(any());
        verify(lotteryStationServicePort, org.mockito.Mockito.never()).recalculateInventory(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số PENDING_RETURN thất bại")
    void delete_pendingReturnTicket_throwsDomainException() {
        existingModel.setStatus(LotteryTicketStatus.PENDING_RETURN);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);

        verify(lotteryTicketRepositoryPort, never()).save(any());
        verify(lotteryStationServicePort, org.mockito.Mockito.never()).recalculateInventory(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("[DP-292] DELETE: Xóa vé số INTERNAL_FAULT thất bại")
    void delete_internalFaultTicket_throwsDomainException() {
        existingModel.setStatus(LotteryTicketStatus.INTERNAL_FAULT);

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
        existingModel.setBatchCode("BATCH-001");
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
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME))).thenReturn(expectedResponse);

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
    // CHANGE STATUS TESTS (DP-325)
    // ============================================================
    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái sang RESERVED không hợp lệ (không cho phép manual update)")
    void changeStatus_toReserved_invalidStatus_throwsException() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.changeStatus(TICKET_ID, LotteryTicketStatus.RESERVED))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }
    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái sang SOLD không hợp lệ (không cho phép manual update)")
    void changeStatus_toSold_invalidStatus_throwsException() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.changeStatus(TICKET_ID, LotteryTicketStatus.SOLD))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }

    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái từ RESERVED về IN_STOCK không hợp lệ")
    void changeStatus_fromReservedToInStock_invalidStatus() {
        existingModel.setStatus(LotteryTicketStatus.RESERVED);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.changeStatus(TICKET_ID, LotteryTicketStatus.IN_STOCK))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái sang INTERNAL_FAULT thành công")
    void changeStatus_toDamaged_success() {
        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .status("INTERNAL_FAULT")
                .statusDisplayName("Nhân viên làm hỏng")
                .build();

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.save(existingModel)).thenReturn(existingModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.getModelById(PRODUCT_ID)).thenReturn(productModel);
        org.mockito.Mockito.lenient().when(lotteryStationServicePort.findModelById(PRODUCT_ID)).thenReturn(java.util.Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponseDetail(eq(existingModel), anyList(), eq(PRODUCT_NAME))).thenReturn(expectedResponse);

        LotteryTicketResponse response = lotteryTicketService.changeStatus(TICKET_ID, LotteryTicketStatus.INTERNAL_FAULT);

        assertThat(response).isNotNull();
        assertThat(existingModel.getStatus()).isEqualTo(LotteryTicketStatus.INTERNAL_FAULT);
    }

    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Không cho đổi trạng thái thủ công sang EXPIRED")
    void changeStatus_toExpired_throwsInvalidStatus() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.changeStatus(TICKET_ID, LotteryTicketStatus.EXPIRED))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }

    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái thất bại khi vé không tồn tại")
    void changeStatus_notFound_throwsLotteryTicketNotFound() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lotteryTicketService.changeStatus(TICKET_ID, LotteryTicketStatus.RESERVED))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_NOT_FOUND);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái thất bại khi status null")
    void changeStatus_nullStatus_throwsInvalidInput() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.changeStatus(TICKET_ID, null))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_STATUS_REQUIRED);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái thất bại khi status rỗng")
    void changeStatus_blankStatus_throwsInvalidInput() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.changeStatus(TICKET_ID, null))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_STATUS_REQUIRED);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }





}