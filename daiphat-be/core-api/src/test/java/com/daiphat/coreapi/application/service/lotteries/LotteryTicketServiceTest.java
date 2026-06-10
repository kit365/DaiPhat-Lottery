package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketRequest;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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
}
