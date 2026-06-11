package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryTicketApplicationMapper;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryProductRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryProductStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryProductType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryProductModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("[DP-272][DP-325] Core LotteryTicketService Unit Tests")
class LotteryTicketServiceTest {

    private static final UUID PRODUCT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID TICKET_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
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
    private LotteryProductRepositoryPort lotteryProductRepositoryPort;

    @Mock
    private LotteryTicketApplicationMapper lotteryTicketApplicationMapper;

    private LotteryProductModel productModel;
    private CreateLotteryTicketRequest createRequest;
    private LotteryTicketModel mappedModel;
    private LotteryTicketModel existingModel;
    private LotteryTicketModel savedModel;
    private LotteryTicketResponse mappedResponse;

    @BeforeEach
    void setUp() {
        lotteryTicketService = new LotteryTicketService(
                lotteryTicketRepositoryPort,
                lotteryProductRepositoryPort,
                lotteryTicketApplicationMapper
        );

        productModel = LotteryProductModel.builder()
                .id(PRODUCT_ID)
                .name(PRODUCT_NAME)
                .province("Hồ Chí Minh")
                .region("Miền Nam")
                .type(LotteryProductType.TRADITIONAL)
                .numberLength(5)
                .price(BigDecimal.valueOf(10000))
                .inventoryCount(10)
                .nextDrawDate(LocalDate.now())
                .status(LotteryProductStatus.ACTIVE)
                .build();

        createRequest = CreateLotteryTicketRequest.builder()
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers(NUMBERS)
                .drawDate(LocalDate.now())
                .batchCode(BATCH_CODE)
                .build();

        mappedModel = LotteryTicketModel.builder()
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers(NUMBERS)
                .drawDate(createRequest.drawDate())
                .batchCode(BATCH_CODE)
                .build();

        existingModel = LotteryTicketModel.builder()
                .id(TICKET_ID)
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
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
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
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
                .productId(PRODUCT_ID)
                .productName(PRODUCT_NAME)
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
    }

    @Test
    @DisplayName("[DP-272] CREATE: Tạo vé số thành công với dữ liệu hợp lệ và tăng tồn kho")
    void create_success_withValidDataAndIncreaseInventory() {
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFields(PRODUCT_ID, SERIAL_NUMBER, NUMBERS, createRequest.drawDate()))
                .thenReturn(false);
        when(lotteryTicketApplicationMapper.toModel(createRequest)).thenReturn(mappedModel);
        when(lotteryTicketRepositoryPort.save(mappedModel)).thenReturn(savedModel);
        when(lotteryProductRepositoryPort.save(any(LotteryProductModel.class))).thenReturn(productModel);
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponse(savedModel)).thenReturn(mappedResponse);

        LotteryTicketResponse response = lotteryTicketService.create(createRequest, IMPORTED_BY_ID);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(TICKET_ID);
        assertThat(response.productId()).isEqualTo(PRODUCT_ID);
        assertThat(response.productName()).isEqualTo(PRODUCT_NAME);
        assertThat(response.status()).isEqualTo(STATUS_IN_STOCK);
        assertThat(productModel.getInventoryCount()).isEqualTo(11);

        verify(lotteryTicketRepositoryPort).save(mappedModel);
        verify(lotteryProductRepositoryPort).save(productModel);
        assertThat(mappedModel.getImportedById()).isEqualTo(IMPORTED_BY_ID);
        assertThat(mappedModel.getImportedAt()).isNotNull();
        assertThat(mappedModel.getStatus()).isEqualTo(LotteryTicketStatus.IN_STOCK);
        assertThat(mappedModel.isVerified()).isFalse();
    }

    @Test
    @DisplayName("[DP-272] CREATE: Tạo vé số thành công khi product chưa có tồn kho, vẫn cộng đúng 1")
    void create_success_whenProductInventoryIsNull() {
        productModel.setInventoryCount(null);

        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFields(PRODUCT_ID, SERIAL_NUMBER, NUMBERS, createRequest.drawDate()))
                .thenReturn(false);
        when(lotteryTicketApplicationMapper.toModel(createRequest)).thenReturn(mappedModel);
        when(lotteryTicketRepositoryPort.save(mappedModel)).thenReturn(savedModel);
        when(lotteryProductRepositoryPort.save(any(LotteryProductModel.class))).thenReturn(productModel);
        when(lotteryTicketApplicationMapper.toResponse(savedModel)).thenReturn(mappedResponse);

        LotteryTicketResponse response = lotteryTicketService.create(createRequest, IMPORTED_BY_ID);

        assertThat(response).isNotNull();
        assertThat(productModel.getInventoryCount()).isEqualTo(1);
        verify(lotteryProductRepositoryPort).save(productModel);
    }

    @Test
    @DisplayName("[DP-272] CREATE: Tạo vé số thất bại khi sản phẩm không tồn tại")
    void create_productNotFound_throwsLotteryProductNotFound() {
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lotteryTicketService.create(createRequest, IMPORTED_BY_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_PRODUCT_NOT_FOUND);

        verify(lotteryTicketRepositoryPort, never()).save(any());
        verify(lotteryProductRepositoryPort, never()).save(any(LotteryProductModel.class));
    }

    @Test
    @DisplayName("[DP-272] CREATE: Tạo vé số thất bại khi trùng bộ khóa duy nhất")
    void create_duplicateUniqueFields_throwsLotteryTicketSerialExisted() {
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFields(PRODUCT_ID, SERIAL_NUMBER, NUMBERS, createRequest.drawDate()))
                .thenReturn(true);

        assertThatThrownBy(() -> lotteryTicketService.create(createRequest, IMPORTED_BY_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_SERIAL_EXISTED);

        verify(lotteryTicketApplicationMapper, never()).toModel(any());
        verify(lotteryTicketRepositoryPort, never()).save(any());
        verify(lotteryProductRepositoryPort, never()).save(any(LotteryProductModel.class));
    }

    @Test
    @DisplayName("[DP-272] CREATE: Tạo vé số thất bại khi dãy số để trống")
    void create_blankNumbers_throwsInvalidInput() {
        CreateLotteryTicketRequest invalidRequest = CreateLotteryTicketRequest.builder()
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers("   ")
                .drawDate(LocalDate.now())
                .batchCode(BATCH_CODE)
                .build();

        LotteryTicketModel invalidModel = LotteryTicketModel.builder()
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers("   ")
                .drawDate(invalidRequest.drawDate())
                .batchCode(BATCH_CODE)
                .build();

        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFields(PRODUCT_ID, SERIAL_NUMBER, "   ", invalidRequest.drawDate()))
                .thenReturn(false);
        when(lotteryTicketApplicationMapper.toModel(invalidRequest)).thenReturn(invalidModel);

        assertThatThrownBy(() -> lotteryTicketService.create(invalidRequest, IMPORTED_BY_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-272] CREATE: Tạo vé số thất bại khi dãy số chứa ký tự không phải số")
    void create_numbersContainNonDigit_throwsInvalidInput() {
        CreateLotteryTicketRequest invalidRequest = CreateLotteryTicketRequest.builder()
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers("12A45")
                .drawDate(LocalDate.now())
                .batchCode(BATCH_CODE)
                .build();

        LotteryTicketModel invalidModel = LotteryTicketModel.builder()
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers("12A45")
                .drawDate(invalidRequest.drawDate())
                .batchCode(BATCH_CODE)
                .build();

        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFields(PRODUCT_ID, SERIAL_NUMBER, "12A45", invalidRequest.drawDate()))
                .thenReturn(false);
        when(lotteryTicketApplicationMapper.toModel(invalidRequest)).thenReturn(invalidModel);

        assertThatThrownBy(() -> lotteryTicketService.create(invalidRequest, IMPORTED_BY_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-272] CREATE: Tạo vé số thất bại khi độ dài dãy số không khớp sản phẩm")
    void create_numbersLengthMismatch_throwsInvalidInput() {
        CreateLotteryTicketRequest invalidRequest = CreateLotteryTicketRequest.builder()
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers("1234")
                .drawDate(LocalDate.now())
                .batchCode(BATCH_CODE)
                .build();

        LotteryTicketModel invalidModel = LotteryTicketModel.builder()
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers("1234")
                .drawDate(invalidRequest.drawDate())
                .batchCode(BATCH_CODE)
                .build();

        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFields(PRODUCT_ID, SERIAL_NUMBER, "1234", invalidRequest.drawDate()))
                .thenReturn(false);
        when(lotteryTicketApplicationMapper.toModel(invalidRequest)).thenReturn(invalidModel);

        assertThatThrownBy(() -> lotteryTicketService.create(invalidRequest, IMPORTED_BY_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-272] CREATE: Tạo vé số thất bại khi ngày quay để trống")
    void create_drawDateIsNull_throwsInvalidInput() {
        CreateLotteryTicketRequest invalidRequest = CreateLotteryTicketRequest.builder()
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers(NUMBERS)
                .drawDate(null)
                .batchCode(BATCH_CODE)
                .build();

        LotteryTicketModel invalidModel = LotteryTicketModel.builder()
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers(NUMBERS)
                .drawDate(null)
                .batchCode(BATCH_CODE)
                .build();

        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFields(PRODUCT_ID, SERIAL_NUMBER, NUMBERS, null))
                .thenReturn(false);
        when(lotteryTicketApplicationMapper.toModel(invalidRequest)).thenReturn(invalidModel);

        assertThatThrownBy(() -> lotteryTicketService.create(invalidRequest, IMPORTED_BY_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-272] CREATE: Tạo vé số thất bại khi ngày quay không phải hôm nay hoặc ngày mai")
    void create_drawDateOutsideAllowedWindow_throwsInvalidInput() {
        LocalDate invalidDrawDate = LocalDate.now().plusDays(2);
        CreateLotteryTicketRequest invalidRequest = CreateLotteryTicketRequest.builder()
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers(NUMBERS)
                .drawDate(invalidDrawDate)
                .batchCode(BATCH_CODE)
                .build();

        LotteryTicketModel invalidModel = LotteryTicketModel.builder()
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers(NUMBERS)
                .drawDate(invalidDrawDate)
                .batchCode(BATCH_CODE)
                .build();

        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFields(PRODUCT_ID, SERIAL_NUMBER, NUMBERS, invalidDrawDate))
                .thenReturn(false);
        when(lotteryTicketApplicationMapper.toModel(invalidRequest)).thenReturn(invalidModel);

        assertThatThrownBy(() -> lotteryTicketService.create(invalidRequest, IMPORTED_BY_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(lotteryTicketRepositoryPort, never()).save(any());
        verify(lotteryProductRepositoryPort, never()).save(any(LotteryProductModel.class));
    }

    @Test
    @DisplayName("[DP-272] CREATE: Tạo vé số thành công khi ngày quay là ngày mai")
    void create_success_whenDrawDateIsTomorrow() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        CreateLotteryTicketRequest request = CreateLotteryTicketRequest.builder()
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers(NUMBERS)
                .drawDate(tomorrow)
                .batchCode(BATCH_CODE)
                .build();

        LotteryTicketModel requestModel = LotteryTicketModel.builder()
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers(NUMBERS)
                .drawDate(tomorrow)
                .batchCode(BATCH_CODE)
                .build();

        LotteryTicketModel persistedModel = LotteryTicketModel.builder()
                .id(TICKET_ID)
                .productId(PRODUCT_ID)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers(NUMBERS)
                .drawDate(tomorrow)
                .batchCode(BATCH_CODE)
                .status(LotteryTicketStatus.IN_STOCK)
                .importedById(IMPORTED_BY_ID)
                .importedAt(LocalDateTime.now())
                .build();

        LotteryTicketResponse response = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .productId(PRODUCT_ID)
                .productName(PRODUCT_NAME)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers(NUMBERS)
                .drawDate(tomorrow)
                .batchCode(BATCH_CODE)
                .status(STATUS_IN_STOCK)
                .statusDisplayName(STATUS_DISPLAY_NAME)
                .importedById(IMPORTED_BY_ID)
                .importedAt(persistedModel.getImportedAt())
                .verified(false)
                .build();

        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFields(PRODUCT_ID, SERIAL_NUMBER, NUMBERS, tomorrow))
                .thenReturn(false);
        when(lotteryTicketApplicationMapper.toModel(request)).thenReturn(requestModel);
        when(lotteryTicketRepositoryPort.save(requestModel)).thenReturn(persistedModel);
        when(lotteryProductRepositoryPort.save(any(LotteryProductModel.class))).thenReturn(productModel);
        when(lotteryTicketApplicationMapper.toResponse(persistedModel)).thenReturn(response);

        LotteryTicketResponse result = lotteryTicketService.create(request, IMPORTED_BY_ID);

        assertThat(result).isNotNull();
        assertThat(result.drawDate()).isEqualTo(tomorrow);
        verify(lotteryTicketRepositoryPort).save(requestModel);
        verify(lotteryProductRepositoryPort).save(productModel);
    }

    @Test
    @DisplayName("[DP-325] UPDATE: Cập nhật vé số thành công với đầy đủ thông tin hợp lệ")
    void update_success_withAllValidFields() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        UpdateLotteryTicketRequest request = new UpdateLotteryTicketRequest(
                UPDATED_TICKET_IMAGE,
                "  " + UPDATED_SERIAL_NUMBER + "  ",
                "  " + UPDATED_NUMBERS + "  ",
                tomorrow,
                "  " + UPDATED_BATCH_CODE + "  ",
                "reserved"
        );

        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .productId(PRODUCT_ID)
                .productName(PRODUCT_NAME)
                .ticketImg(UPDATED_TICKET_IMAGE)
                .serialNumber(UPDATED_SERIAL_NUMBER)
                .numbers(UPDATED_NUMBERS)
                .drawDate(tomorrow)
                .batchCode(UPDATED_BATCH_CODE)
                .status(STATUS_RESERVED)
                .statusDisplayName(STATUS_RESERVED_DISPLAY_NAME)
                .importedById(IMPORTED_BY_ID)
                .importedAt(existingModel.getImportedAt())
                .verified(false)
                .createdAt(existingModel.getCreatedAt())
                .updatedAt(LocalDateTime.now())
                .build();

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFieldsAndIdNot(PRODUCT_ID, UPDATED_SERIAL_NUMBER, UPDATED_NUMBERS, tomorrow, TICKET_ID))
                .thenReturn(false);
        when(lotteryTicketRepositoryPort.save(existingModel)).thenReturn(existingModel);
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(expectedResponse);

        LotteryTicketResponse result = lotteryTicketService.update(TICKET_ID, request);

        assertThat(result).isNotNull();
        assertThat(result.ticketImg()).isEqualTo(UPDATED_TICKET_IMAGE);
        assertThat(result.serialNumber()).isEqualTo(UPDATED_SERIAL_NUMBER);
        assertThat(result.numbers()).isEqualTo(UPDATED_NUMBERS);
        assertThat(result.drawDate()).isEqualTo(tomorrow);
        assertThat(result.batchCode()).isEqualTo(UPDATED_BATCH_CODE);
        assertThat(result.status()).isEqualTo(STATUS_RESERVED);

        assertThat(existingModel.getTicketImg()).isEqualTo(UPDATED_TICKET_IMAGE);
        assertThat(existingModel.getSerialNumber()).isEqualTo(UPDATED_SERIAL_NUMBER);
        assertThat(existingModel.getNumbers()).isEqualTo(UPDATED_NUMBERS);
        assertThat(existingModel.getDrawDate()).isEqualTo(tomorrow);
        assertThat(existingModel.getBatchCode()).isEqualTo(UPDATED_BATCH_CODE);
        assertThat(existingModel.getStatus()).isEqualTo(LotteryTicketStatus.RESERVED);

        verify(lotteryProductRepositoryPort, org.mockito.Mockito.times(2)).findById(PRODUCT_ID);
        verify(lotteryTicketRepositoryPort).save(existingModel);
    }

    @Test
    @DisplayName("[DP-325] UPDATE: Cập nhật vé số thành công chỉ với status hợp lệ mà không cần tải product")
    void update_success_withStatusOnlyDoesNotFetchProduct() {
        UpdateLotteryTicketRequest request = new UpdateLotteryTicketRequest(
                null,
                null,
                null,
                null,
                null,
                "sold_online"
        );

        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .productId(PRODUCT_ID)
                .productName(PRODUCT_NAME)
                .ticketImg(TICKET_IMAGE)
                .serialNumber(SERIAL_NUMBER)
                .numbers(NUMBERS)
                .drawDate(createRequest.drawDate())
                .batchCode(BATCH_CODE)
                .status("SOLD_ONLINE")
                .statusDisplayName("Đã bán online")
                .importedById(IMPORTED_BY_ID)
                .importedAt(existingModel.getImportedAt())
                .verified(false)
                .build();

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFieldsAndIdNot(PRODUCT_ID, SERIAL_NUMBER, NUMBERS, createRequest.drawDate(), TICKET_ID))
                .thenReturn(false);
        when(lotteryTicketRepositoryPort.save(existingModel)).thenReturn(existingModel);
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(expectedResponse);

        LotteryTicketResponse result = lotteryTicketService.update(TICKET_ID, request);

        assertThat(result).isNotNull();
        assertThat(result.status()).isEqualTo("SOLD_ONLINE");
        assertThat(existingModel.getStatus()).isEqualTo(LotteryTicketStatus.SOLD_ONLINE);

        verify(lotteryTicketRepositoryPort).save(existingModel);
    }

    @Test
    @DisplayName("[DP-325] UPDATE: Cập nhật vé số thành công khi request rỗng, giữ nguyên dữ liệu cũ")
    void update_success_withEmptyRequestKeepsExistingValues() {
        UpdateLotteryTicketRequest request = new UpdateLotteryTicketRequest(null, null, null, null, null, null);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFieldsAndIdNot(PRODUCT_ID, SERIAL_NUMBER, NUMBERS, createRequest.drawDate(), TICKET_ID))
                .thenReturn(false);
        when(lotteryTicketRepositoryPort.save(existingModel)).thenReturn(existingModel);
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(mappedResponse);

        LotteryTicketResponse result = lotteryTicketService.update(TICKET_ID, request);

        assertThat(result).isNotNull();
        assertThat(existingModel.getTicketImg()).isEqualTo(TICKET_IMAGE);
        assertThat(existingModel.getSerialNumber()).isEqualTo(SERIAL_NUMBER);
        assertThat(existingModel.getNumbers()).isEqualTo(NUMBERS);
        assertThat(existingModel.getDrawDate()).isEqualTo(createRequest.drawDate());
        assertThat(existingModel.getBatchCode()).isEqualTo(BATCH_CODE);
        assertThat(existingModel.getStatus()).isEqualTo(LotteryTicketStatus.IN_STOCK);

        verify(lotteryTicketRepositoryPort).save(existingModel);
    }

    @Test
    @DisplayName("[DP-325] UPDATE: Cập nhật vé số thất bại khi vé không tồn tại")
    void update_ticketNotFound_throwsLotteryTicketNotFound() {
        UpdateLotteryTicketRequest request = new UpdateLotteryTicketRequest(
                UPDATED_TICKET_IMAGE,
                UPDATED_SERIAL_NUMBER,
                UPDATED_NUMBERS,
                LocalDate.now(),
                UPDATED_BATCH_CODE,
                STATUS_RESERVED
        );

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lotteryTicketService.update(TICKET_ID, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_NOT_FOUND);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] UPDATE: Cập nhật vé số thất bại khi trùng bộ khóa duy nhất")
    void update_duplicateUniqueFields_throwsLotteryTicketSerialExisted() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        UpdateLotteryTicketRequest request = new UpdateLotteryTicketRequest(
                UPDATED_TICKET_IMAGE,
                UPDATED_SERIAL_NUMBER,
                UPDATED_NUMBERS,
                tomorrow,
                UPDATED_BATCH_CODE,
                STATUS_RESERVED
        );

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFieldsAndIdNot(PRODUCT_ID, UPDATED_SERIAL_NUMBER, UPDATED_NUMBERS, tomorrow, TICKET_ID))
                .thenReturn(true);

        assertThatThrownBy(() -> lotteryTicketService.update(TICKET_ID, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_SERIAL_EXISTED);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] UPDATE: Cập nhật vé số thất bại khi sản phẩm không tồn tại lúc đổi số hoặc ngày quay")
    void update_productNotFoundWhenValidatingNumbers_throwsLotteryProductNotFound() {
        UpdateLotteryTicketRequest request = new UpdateLotteryTicketRequest(
                null,
                null,
                UPDATED_NUMBERS,
                null,
                null,
                null
        );

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lotteryTicketService.update(TICKET_ID, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_PRODUCT_NOT_FOUND);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] UPDATE: Cập nhật vé số thất bại khi dãy số để trống")
    void update_blankNumbers_throwsInvalidInput() {
        UpdateLotteryTicketRequest request = new UpdateLotteryTicketRequest(
                null,
                null,
                "   ",
                null,
                null,
                null
        );

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFieldsAndIdNot(PRODUCT_ID, SERIAL_NUMBER, NUMBERS, createRequest.drawDate(), TICKET_ID))
                .thenReturn(false);
        when(lotteryTicketRepositoryPort.save(existingModel)).thenReturn(existingModel);
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(mappedResponse);

        LotteryTicketResponse result = lotteryTicketService.update(TICKET_ID, request);

        assertThat(result).isNotNull();
        assertThat(existingModel.getNumbers()).isEqualTo(NUMBERS);
        verify(lotteryTicketRepositoryPort).save(existingModel);
    }

    @Test
    @DisplayName("[DP-325] UPDATE: Cập nhật vé số thất bại khi dãy số chứa ký tự không phải số")
    void update_numbersContainNonDigit_throwsInvalidInput() {
        UpdateLotteryTicketRequest request = new UpdateLotteryTicketRequest(
                null,
                null,
                "12A45",
                null,
                null,
                null
        );

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFieldsAndIdNot(PRODUCT_ID, SERIAL_NUMBER, "12A45", createRequest.drawDate(), TICKET_ID))
                .thenReturn(false);

        assertThatThrownBy(() -> lotteryTicketService.update(TICKET_ID, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] UPDATE: Cập nhật vé số thất bại khi độ dài dãy số không khớp sản phẩm")
    void update_numbersLengthMismatch_throwsInvalidInput() {
        UpdateLotteryTicketRequest request = new UpdateLotteryTicketRequest(
                null,
                null,
                "1234",
                null,
                null,
                null
        );

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFieldsAndIdNot(PRODUCT_ID, SERIAL_NUMBER, "1234", createRequest.drawDate(), TICKET_ID))
                .thenReturn(false);

        assertThatThrownBy(() -> lotteryTicketService.update(TICKET_ID, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] UPDATE: Cập nhật vé số thất bại khi ngày quay không hợp lệ")
    void update_drawDateOutsideAllowedWindow_throwsInvalidInput() {
        LocalDate invalidDrawDate = LocalDate.now().plusDays(2);
        UpdateLotteryTicketRequest request = new UpdateLotteryTicketRequest(
                null,
                null,
                null,
                invalidDrawDate,
                null,
                null
        );

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFieldsAndIdNot(PRODUCT_ID, SERIAL_NUMBER, NUMBERS, invalidDrawDate, TICKET_ID))
                .thenReturn(false);

        assertThatThrownBy(() -> lotteryTicketService.update(TICKET_ID, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] UPDATE: Cập nhật vé số thất bại khi status không hợp lệ")
    void update_invalidStatus_throwsLotteryTicketInvalidStatus() {
        UpdateLotteryTicketRequest request = new UpdateLotteryTicketRequest(
                null,
                null,
                null,
                null,
                null,
                "not-a-valid-status"
        );

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.existsByUniqueFieldsAndIdNot(PRODUCT_ID, SERIAL_NUMBER, NUMBERS, createRequest.drawDate(), TICKET_ID))
                .thenReturn(false);

        assertThatThrownBy(() -> lotteryTicketService.update(TICKET_ID, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    // ============================================================
    // GET BY ID TESTS (DP-325)
    // ============================================================

    @Test
    @DisplayName("[DP-325] GET_BY_ID: Lấy chi tiết vé số thành công với đầy đủ thông tin")
    void getById_success_returnsTicketDetails() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(mappedResponse);

        LotteryTicketResponse response = lotteryTicketService.getById(TICKET_ID);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(TICKET_ID);
        assertThat(response.productId()).isEqualTo(PRODUCT_ID);
        assertThat(response.productName()).isEqualTo(PRODUCT_NAME);
        assertThat(response.ticketImg()).isEqualTo(TICKET_IMAGE);
        assertThat(response.serialNumber()).isEqualTo(SERIAL_NUMBER);
        assertThat(response.numbers()).isEqualTo(NUMBERS);
        assertThat(response.status()).isEqualTo(STATUS_IN_STOCK);
        assertThat(response.batchCode()).isEqualTo(BATCH_CODE);
        assertThat(response.importedById()).isEqualTo(IMPORTED_BY_ID);
        assertThat(response.verified()).isFalse();

        verify(lotteryTicketRepositoryPort).findById(TICKET_ID);
        verify(lotteryProductRepositoryPort).findById(PRODUCT_ID);
    }

    @Test
    @DisplayName("[DP-325] GET_BY_ID: Lấy chi tiết vé số thất bại khi vé không tồn tại")
    void getById_notFound_throwsLotteryTicketNotFound() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lotteryTicketService.getById(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_NOT_FOUND);

        verify(lotteryTicketRepositoryPort).findById(TICKET_ID);
        verify(lotteryProductRepositoryPort, never()).findById(any());
    }

    // ============================================================
    // GET ALL TESTS (DP-325)
    // ============================================================

    @Test
    @DisplayName("[DP-325] GET_ALL: Lấy danh sách vé số thành công với phân trang")
    void getAll_success_returnsPaginatedTickets() {
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(
                List.of(existingModel, savedModel),
                PageRequest.of(0, 10),
                2
        );

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), eq(PRODUCT_ID), any(), any(), any()))
                .thenReturn(ticketPage);
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(mappedResponse);
        when(lotteryTicketApplicationMapper.toResponse(savedModel)).thenReturn(mappedResponse);

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
    @DisplayName("[DP-325] GET_ALL: Lấy danh sách vé số với bộ lọc status")
    void getAll_withStatusFilter_returnsFilteredTickets() {
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(
                List.of(existingModel),
                PageRequest.of(0, 10),
                1
        );

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), eq(PRODUCT_ID), eq(LotteryTicketStatus.IN_STOCK), any(), any()))
                .thenReturn(ticketPage);
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1, 10, PRODUCT_ID, "IN_STOCK", null, null, null, null
        );

        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).hasSize(1);
        assertThat(response.getRecordList().getFirst().status()).isEqualTo(STATUS_IN_STOCK);
    }

    @Test
    @DisplayName("[DP-325] GET_ALL: Lấy danh sách vé số với bộ lọc drawDate")
    void getAll_withDrawDateFilter_returnsFilteredTickets() {
        LocalDate drawDate = LocalDate.now();
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(
                List.of(existingModel),
                PageRequest.of(0, 10),
                1
        );

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), any(), eq(drawDate), any()))
                .thenReturn(ticketPage);
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1, 10, null, null, drawDate.toString(), null, null, null
        );

        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-325] GET_ALL: Lấy danh sách vé số với bộ lọc search")
    void getAll_withSearchFilter_returnsFilteredTickets() {
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(
                List.of(existingModel),
                PageRequest.of(0, 10),
                1
        );

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), any(), any(), eq("123")))
                .thenReturn(ticketPage);
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1, 10, null, null, null, "123", null, null
        );

        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-325] GET_ALL: Lấy danh sách vé số không có kết quả trả về empty page")
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
    @DisplayName("[DP-325] GET_ALL: Lấy danh sách vé số với sort direction asc")
    void getAll_withAscendingSort_returnsSortedTickets() {
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(
                List.of(existingModel),
                PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "drawDate")),
                1
        );

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), any(), any(), any()))
                .thenReturn(ticketPage);
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1, 10, null, null, null, null, "drawDate", "asc"
        );

        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-325] GET_ALL: Lấy danh sách vé số với status không hợp lệ bỏ qua filter")
    void getAll_withInvalidStatus_ignoresFilter() {
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(
                List.of(existingModel),
                PageRequest.of(0, 10),
                1
        );

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), eq(null), any(), any()))
                .thenReturn(ticketPage);
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(mappedResponse);

        PageResponse<LotteryTicketResponse> response = lotteryTicketService.getAll(
                1, 10, null, "INVALID_STATUS", null, null, null, null
        );

        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-325] GET_ALL: Lấy danh sách vé số với drawDate không hợp lệ bỏ qua filter")
    void getAll_withInvalidDrawDate_ignoresFilter() {
        Page<LotteryTicketModel> ticketPage = new PageImpl<>(
                List.of(existingModel),
                PageRequest.of(0, 10),
                1
        );

        when(lotteryTicketRepositoryPort.findAll(any(PageRequest.class), any(), any(), eq(null), any()))
                .thenReturn(ticketPage);
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(mappedResponse);

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
    @DisplayName("[DP-325] DELETE: Xóa vé số IN_STOCK thành công và giảm tồn kho đúng 1 đơn vị")
    void delete_inStockTicket_success_decreasesInventoryByOne() {
        int initialInventory = 10;
        productModel.setInventoryCount(initialInventory);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryProductRepositoryPort.save(any(LotteryProductModel.class))).thenReturn(productModel);
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        assertThat(productModel.getInventoryCount()).isEqualTo(initialInventory - 1);
        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
        verify(lotteryProductRepositoryPort).save(productModel);
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số RESERVED thành công và giảm tồn kho")
    void delete_reservedTicket_success_decreasesInventory() {
        existingModel.setStatus(LotteryTicketStatus.RESERVED);
        int initialInventory = 15;
        productModel.setInventoryCount(initialInventory);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryProductRepositoryPort.save(any(LotteryProductModel.class))).thenReturn(productModel);
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        assertThat(productModel.getInventoryCount()).isEqualTo(initialInventory - 1);
        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
        verify(lotteryProductRepositoryPort).save(productModel);
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số RETURNED_TO_ISSUER không giảm tồn kho (không tính vào kho)")
    void delete_returnedToIssuerTicket_success_doesNotDecreaseInventory() {
        existingModel.setStatus(LotteryTicketStatus.RETURNED_TO_ISSUER);
        int initialInventory = 10;
        productModel.setInventoryCount(initialInventory);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        assertThat(productModel.getInventoryCount()).isEqualTo(initialInventory);
        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
        verify(lotteryProductRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số SOLD_ONLINE không giảm tồn kho (đã bán)")
    void delete_soldOnlineTicket_success_doesNotDecreaseInventory() {
        existingModel.setStatus(LotteryTicketStatus.SOLD_ONLINE);
        int initialInventory = 10;
        productModel.setInventoryCount(initialInventory);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        assertThat(productModel.getInventoryCount()).isEqualTo(initialInventory);
        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
        verify(lotteryProductRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số SOLD_OFFLINE không giảm tồn kho (đã bán offline)")
    void delete_soldOfflineTicket_success_doesNotDecreaseInventory() {
        existingModel.setStatus(LotteryTicketStatus.SOLD_OFFLINE);
        int initialInventory = 10;
        productModel.setInventoryCount(initialInventory);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        assertThat(productModel.getInventoryCount()).isEqualTo(initialInventory);
        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
        verify(lotteryProductRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số DAMAGED không giảm tồn kho (đã hỏng)")
    void delete_damagedTicket_success_doesNotDecreaseInventory() {
        existingModel.setStatus(LotteryTicketStatus.DAMAGED);
        int initialInventory = 10;
        productModel.setInventoryCount(initialInventory);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        assertThat(productModel.getInventoryCount()).isEqualTo(initialInventory);
        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
        verify(lotteryProductRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số EXPIRED không giảm tồn kho (đã hết hạn)")
    void delete_expiredTicket_success_doesNotDecreaseInventory() {
        existingModel.setStatus(LotteryTicketStatus.EXPIRED);
        int initialInventory = 10;
        productModel.setInventoryCount(initialInventory);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        assertThat(productModel.getInventoryCount()).isEqualTo(initialInventory);
        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
        verify(lotteryProductRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số thất bại khi vé không tồn tại - ném DomainException LOTTERY_TICKET_NOT_FOUND")
    void delete_ticketNotFound_throwsLotteryTicketNotFound() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_NOT_FOUND);

        verify(lotteryTicketRepositoryPort, never()).save(any());
        verify(lotteryProductRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số thất bại khi product không tồn tại - ném DomainException")
    void delete_productNotFound_throwsDomainException() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_PRODUCT_NOT_FOUND);

        verify(lotteryTicketRepositoryPort, never()).save(any());
        verify(lotteryProductRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số khi tồn kho đang là 0 vẫn thành công - save product được gọi")
    void delete_whenInventoryIsZero_success_callsSaveProduct() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryProductRepositoryPort.save(any(LotteryProductModel.class))).thenReturn(productModel);
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
        verify(lotteryProductRepositoryPort).save(any(LotteryProductModel.class));
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số khi tồn kho là null không gây NullPointerException - save product được gọi")
    void delete_whenInventoryIsNull_success_callsSaveProduct() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryProductRepositoryPort.save(any(LotteryProductModel.class))).thenReturn(productModel);
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
        verify(lotteryProductRepositoryPort).save(any(LotteryProductModel.class));
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số với id khác nhau gọi đúng id")
    void delete_withDifferentIds_callsCorrectId() {
        UUID differentTicketId = UUID.fromString("99999999-9999-9999-9999-999999999999");
        LotteryTicketModel differentTicket = LotteryTicketModel.builder()
                .id(differentTicketId)
                .productId(PRODUCT_ID)
                .status(LotteryTicketStatus.IN_STOCK)
                .build();

        when(lotteryTicketRepositoryPort.findById(differentTicketId)).thenReturn(Optional.of(differentTicket));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryProductRepositoryPort.save(any(LotteryProductModel.class))).thenReturn(productModel);
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(differentTicket);

        lotteryTicketService.delete(differentTicketId);

        verify(lotteryTicketRepositoryPort).findById(differentTicketId);
        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số soft delete - gọi softDelete() trên model và save()")
    void delete_callsSoftDeleteAndSave() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryProductRepositoryPort.save(any(LotteryProductModel.class))).thenReturn(productModel);
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số khi tồn kho là giá trị lớn hoạt động đúng")
    void delete_withLargeInventory_success() {
        int initialInventory = 100000;
        productModel.setInventoryCount(initialInventory);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryProductRepositoryPort.save(any(LotteryProductModel.class))).thenReturn(productModel);
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        assertThat(productModel.getInventoryCount()).isEqualTo(initialInventory - 1);
        verify(lotteryProductRepositoryPort).save(productModel);
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số đã verify thành công (chỉ status IN_STOCK mới tính inventory)")
    void delete_verifiedTicket_stillDecreasesInventoryIfInStock() {
        existingModel.setVerified(true);
        existingModel.setVerifiedById(UUID.fromString("55555555-5555-5555-5555-555555555555"));
        existingModel.setVerifiedAt(LocalDateTime.now().minusDays(1));
        int initialInventory = 10;
        productModel.setInventoryCount(initialInventory);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryProductRepositoryPort.save(any(LotteryProductModel.class))).thenReturn(productModel);
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        assertThat(productModel.getInventoryCount()).isEqualTo(initialInventory - 1);
        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số có đầy đủ thông tin (serial, numbers, batch) thành công")
    void delete_ticketWithFullDetails_success() {
        existingModel.setSerialNumber("AB123456");
        existingModel.setNumbers("12345");
        existingModel.setBatchCode("BATCH-001");
        existingModel.setTicketImg("https://cdn.example.com/ticket.png");
        int initialInventory = 10;
        productModel.setInventoryCount(initialInventory);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryProductRepositoryPort.save(any(LotteryProductModel.class))).thenReturn(productModel);
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        assertThat(productModel.getInventoryCount()).isEqualTo(initialInventory - 1);
        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số khi product inventory chưa được set - save product được gọi")
    void delete_productWithUninitializedInventory_callsSave() {
        LotteryProductModel uninitializedProduct = LotteryProductModel.builder()
                .id(PRODUCT_ID)
                .name(PRODUCT_NAME)
                .inventoryCount(null)
                .build();

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(uninitializedProduct));
        when(lotteryProductRepositoryPort.save(any(LotteryProductModel.class))).thenReturn(uninitializedProduct);
        when(lotteryTicketRepositoryPort.save(any(LotteryTicketModel.class))).thenReturn(existingModel);

        lotteryTicketService.delete(TICKET_ID);

        verify(lotteryTicketRepositoryPort).save(any(LotteryTicketModel.class));
        verify(lotteryProductRepositoryPort).save(any(LotteryProductModel.class));
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số thất bại khi repository ném DataAccessException khi save product")
    void delete_repositoryThrowsDataAccessExceptionOnProductSave_propagates() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        org.mockito.Mockito.doThrow(new org.springframework.dao.DataAccessResourceFailureException("Database error"))
                .when(lotteryProductRepositoryPort).save(any());

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(org.springframework.dao.DataAccessResourceFailureException.class);

        verify(lotteryTicketRepositoryPort).findById(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số không tồn tại khi findById ném exception")
    void delete_findByIdThrowsException_propagates() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID))
                .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("Connection lost"));

        assertThatThrownBy(() -> lotteryTicketService.delete(TICKET_ID))
                .isInstanceOf(org.springframework.dao.DataAccessResourceFailureException.class);
    }

    @Test
    @DisplayName("[DP-325] DELETE: Xóa vé số đã bị soft delete trước đó ném DomainException")
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
                .productId(PRODUCT_ID)
                .productName(PRODUCT_NAME)
                .serialNumber(SERIAL_NUMBER)
                .numbers(NUMBERS)
                .verified(true)
                .verifiedById(verifierId)
                .verifiedAt(LocalDateTime.now())
                .build();

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.save(existingModel)).thenReturn(existingModel);
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(expectedResponse);

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
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    // ============================================================
    // CHANGE STATUS TESTS (DP-325)
    // ============================================================

    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái sang RESERVED thành công")
    void changeStatus_toReserved_success() {
        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .productId(PRODUCT_ID)
                .status("RESERVED")
                .statusDisplayName("Đã giữ chỗ")
                .build();

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.save(existingModel)).thenReturn(existingModel);
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(expectedResponse);

        LotteryTicketResponse response = lotteryTicketService.changeStatus(TICKET_ID, "RESERVED");

        assertThat(response).isNotNull();
        assertThat(existingModel.getStatus()).isEqualTo(LotteryTicketStatus.RESERVED);

        verify(lotteryTicketRepositoryPort).save(existingModel);
    }

    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái sang SOLD_ONLINE thành công và giảm tồn kho")
    void changeStatus_toSoldOnline_successAndDecreasesInventory() {
        productModel.setInventoryCount(10);
        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .productId(PRODUCT_ID)
                .status("SOLD_ONLINE")
                .statusDisplayName("Đã bán online")
                .build();

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.save(existingModel)).thenReturn(existingModel);
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryProductRepositoryPort.save(any(LotteryProductModel.class))).thenReturn(productModel);
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(expectedResponse);

        LotteryTicketResponse response = lotteryTicketService.changeStatus(TICKET_ID, "SOLD_ONLINE");

        assertThat(response).isNotNull();
        assertThat(existingModel.getStatus()).isEqualTo(LotteryTicketStatus.SOLD_ONLINE);
        assertThat(productModel.getInventoryCount()).isEqualTo(9);

        verify(lotteryTicketRepositoryPort).save(existingModel);
        verify(lotteryProductRepositoryPort).save(productModel);
    }

    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái từ IN_STOCK sang SOLD_OFFLINE thành công")
    void changeStatus_fromInStockToSoldOffline_success() {
        productModel.setInventoryCount(10);

        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .productId(PRODUCT_ID)
                .status("SOLD_OFFLINE")
                .statusDisplayName("Đã bán offline")
                .build();

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.save(existingModel)).thenReturn(existingModel);
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryProductRepositoryPort.save(any(LotteryProductModel.class))).thenReturn(productModel);
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(expectedResponse);

        LotteryTicketResponse response = lotteryTicketService.changeStatus(TICKET_ID, "SOLD_OFFLINE");

        assertThat(response).isNotNull();
        assertThat(existingModel.getStatus()).isEqualTo(LotteryTicketStatus.SOLD_OFFLINE);
        assertThat(productModel.getInventoryCount()).isEqualTo(9);

        verify(lotteryProductRepositoryPort).save(productModel);
    }

    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái từ RESERVED sang SOLD_ONLINE thành công")
    void changeStatus_fromReservedToSoldOnline_success() {
        existingModel.setStatus(LotteryTicketStatus.RESERVED);
        productModel.setInventoryCount(10);

        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .productId(PRODUCT_ID)
                .status("SOLD_ONLINE")
                .statusDisplayName("Đã bán online")
                .build();

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.save(existingModel)).thenReturn(existingModel);
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryProductRepositoryPort.save(any(LotteryProductModel.class))).thenReturn(productModel);
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(expectedResponse);

        LotteryTicketResponse response = lotteryTicketService.changeStatus(TICKET_ID, "SOLD_ONLINE");

        assertThat(response).isNotNull();
        assertThat(existingModel.getStatus()).isEqualTo(LotteryTicketStatus.SOLD_ONLINE);
        assertThat(productModel.getInventoryCount()).isEqualTo(9);

        verify(lotteryProductRepositoryPort).save(productModel);
    }

    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái từ RESERVED về IN_STOCK không hợp lệ")
    void changeStatus_fromReservedToInStock_invalidStatus() {
        existingModel.setStatus(LotteryTicketStatus.RESERVED);

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.changeStatus(TICKET_ID, "IN_STOCK"))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái sang DAMAGED thành công")
    void changeStatus_toDamaged_success() {
        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .productId(PRODUCT_ID)
                .status("DAMAGED")
                .statusDisplayName("Đã hỏng")
                .build();

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.save(existingModel)).thenReturn(existingModel);
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(expectedResponse);

        LotteryTicketResponse response = lotteryTicketService.changeStatus(TICKET_ID, "DAMAGED");

        assertThat(response).isNotNull();
        assertThat(existingModel.getStatus()).isEqualTo(LotteryTicketStatus.DAMAGED);
    }

    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái sang EXPIRED thành công")
    void changeStatus_toExpired_success() {
        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .productId(PRODUCT_ID)
                .status("EXPIRED")
                .statusDisplayName("Đã hết hạn")
                .build();

        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));
        when(lotteryTicketRepositoryPort.save(existingModel)).thenReturn(existingModel);
        when(lotteryProductRepositoryPort.findById(PRODUCT_ID)).thenReturn(Optional.of(productModel));
        when(lotteryTicketApplicationMapper.toResponse(existingModel)).thenReturn(expectedResponse);

        LotteryTicketResponse response = lotteryTicketService.changeStatus(TICKET_ID, "EXPIRED");

        assertThat(response).isNotNull();
        assertThat(existingModel.getStatus()).isEqualTo(LotteryTicketStatus.EXPIRED);
    }

    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái thất bại khi vé không tồn tại")
    void changeStatus_notFound_throwsLotteryTicketNotFound() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lotteryTicketService.changeStatus(TICKET_ID, "RESERVED"))
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
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái thất bại khi status rỗng")
    void changeStatus_blankStatus_throwsInvalidInput() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.changeStatus(TICKET_ID, "   "))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-325] CHANGE_STATUS: Đổi trạng thái thất bại khi status không hợp lệ")
    void changeStatus_invalidStatus_throwsLotteryTicketInvalidStatus() {
        when(lotteryTicketRepositoryPort.findById(TICKET_ID)).thenReturn(Optional.of(existingModel));

        assertThatThrownBy(() -> lotteryTicketService.changeStatus(TICKET_ID, "INVALID_STATUS"))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);

        verify(lotteryTicketRepositoryPort, never()).save(any());
    }
}
