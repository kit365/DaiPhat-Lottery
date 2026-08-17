package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotterySupplierRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotterySupplierDefaultImportCostRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotterySupplierRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotterySupplierResponse;
import com.daiphat.coreapi.application.mapper.lotteries.LotterySupplierApplicationMapper;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotterySupplierType;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("LotterySupplierService Unit Tests")
class LotterySupplierServiceTest {

    @Mock
    private LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    @Mock
    private LotterySupplierApplicationMapper lotterySupplierApplicationMapper;
    @Mock
    private SupplierPaymentCutOffSyncService supplierPaymentCutOffSyncService;

    @InjectMocks
    private LotterySupplierService lotterySupplierService;

    @Test
    @DisplayName("create rejects duplicate code")
    void create_duplicateCode_throws() {
        CreateLotterySupplierRequest request = CreateLotterySupplierRequest.builder()
                .name("Minh Chính")
                .code("minh_chinh")
                .type(LotterySupplierType.DISTRIBUTOR)
                .contactPhone("0901234567")
                .importAllowFrom(LocalTime.of(8, 0))
                .returnCutOffTime(LocalTime.of(14, 30))
                .build();
        when(lotterySupplierRepositoryPort.existsByCode("MINH_CHINH")).thenReturn(true);

        assertThatThrownBy(() -> lotterySupplierService.create(request))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.LOTTERY_SUPPLIER_CODE_DUPLICATE);
    }

    @Test
    @DisplayName("create succeeds for unique code when inactive")
    void create_success() {
        CreateLotterySupplierRequest request = CreateLotterySupplierRequest.builder()
                .name("Minh Chính")
                .code("MINH_CHINH")
                .type(LotterySupplierType.DISTRIBUTOR)
                .contactPhone("0901234567")
                .isActive(false)
                .importAllowFrom(LocalTime.of(8, 0))
                .returnCutOffTime(LocalTime.of(14, 30))
                .paymentCutOffTime(LocalTime.of(19, 0))
                .build();
        LotterySupplierModel model = LotterySupplierModel.builder()
                .name("Minh Chính")
                .code("MINH_CHINH")
                .contactPhone("0901234567")
                .isActive(false)
                .build();
        LotterySupplierModel saved = LotterySupplierModel.builder()
                .id(1L)
                .name("Minh Chính")
                .code("MINH_CHINH")
                .contactPhone("0901234567")
                .isActive(false)
                .build();
        LotterySupplierResponse response = LotterySupplierResponse.builder()
                .id(1L)
                .name("Minh Chính")
                .code("MINH_CHINH")
                .isActive(false)
                .missingActivationFields(List.of("ADDRESS", "PAYMENT_TERM_DAYS", "DEFAULT_IMPORT_COST"))
                .build();

        when(lotterySupplierRepositoryPort.existsByCode("MINH_CHINH")).thenReturn(false);
        when(supplierPaymentCutOffSyncService.requirePaymentCutOffAfterReturn(
                LocalTime.of(19, 0), LocalTime.of(14, 30)))
                .thenReturn(LocalTime.of(19, 0));
        when(lotterySupplierApplicationMapper.toModel(request)).thenReturn(model);
        when(lotterySupplierRepositoryPort.save(model)).thenReturn(saved);
        when(lotterySupplierApplicationMapper.toResponse(saved)).thenReturn(response);

        LotterySupplierResponse result = lotterySupplierService.create(request);

        assertThat(result.id()).isEqualTo(1L);
        assertThat(model.getPaymentCutOffTime()).isEqualTo(LocalTime.of(19, 0));
        verify(lotterySupplierRepositoryPort).save(model);
    }

    @Test
    @DisplayName("create active without required fields is rejected")
    void create_activeIncomplete_throws() {
        CreateLotterySupplierRequest request = CreateLotterySupplierRequest.builder()
                .name("Minh Chính")
                .code("MINH_CHINH")
                .type(LotterySupplierType.DISTRIBUTOR)
                .contactPhone("0901234567")
                .isActive(true)
                .importAllowFrom(LocalTime.of(8, 0))
                .returnCutOffTime(LocalTime.of(14, 30))
                .paymentCutOffTime(LocalTime.of(19, 0))
                .build();
        LotterySupplierModel model = LotterySupplierModel.builder()
                .name("Minh Chính")
                .code("MINH_CHINH")
                .contactPhone("0901234567")
                .isActive(false)
                .build();

        when(lotterySupplierRepositoryPort.existsByCode("MINH_CHINH")).thenReturn(false);
        when(supplierPaymentCutOffSyncService.requirePaymentCutOffAfterReturn(
                LocalTime.of(19, 0), LocalTime.of(14, 30)))
                .thenReturn(LocalTime.of(19, 0));
        when(lotterySupplierApplicationMapper.toModel(request)).thenReturn(model);

        assertThatThrownBy(() -> lotterySupplierService.create(request))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.LOTTERY_SUPPLIER_ACTIVATION_INCOMPLETE);
    }

    @Test
    @DisplayName("getActiveModelById rejects inactive supplier")
    void getActiveModelById_inactive_throws() {
        when(lotterySupplierRepositoryPort.findById(1L)).thenReturn(Optional.of(
                LotterySupplierModel.builder().id(1L).isActive(false).build()
        ));

        assertThatThrownBy(() -> lotterySupplierService.getActiveModelById(1L))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.LOTTERY_SUPPLIER_INACTIVE);
    }

    @Test
    @DisplayName("ensureActiveSupplierConfigured rejects when none active")
    void ensureActiveSupplierConfigured_none_throws() {
        when(lotterySupplierRepositoryPort.existsActive()).thenReturn(false);

        assertThatThrownBy(() -> lotterySupplierService.ensureActiveSupplierConfigured())
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_NO_SUPPLIER_CONFIGURED);
    }

    @Test
    @DisplayName("update rejects missing supplier")
    void update_notFound_throws() {
        when(lotterySupplierRepositoryPort.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lotterySupplierService.update(99L, UpdateLotterySupplierRequest.builder()
                .name("X")
                .code("X")
                .type(LotterySupplierType.DISTRIBUTOR)
                .contactPhone("1")
                .importAllowFrom(LocalTime.of(8, 0))
                .returnCutOffTime(LocalTime.of(14, 30))
                .isActive(true)
                .build()))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.LOTTERY_SUPPLIER_NOT_FOUND);
    }

    @Test
    @DisplayName("updateDefaultImportCost writes only the NCC import cost")
    void updateDefaultImportCost_success() {
        LotterySupplierModel model = LotterySupplierModel.builder()
                .id(7L)
                .name("Minh Chính")
                .code("MINH_CHINH")
                .contactPhone("0901234567")
                .defaultImportCost(new java.math.BigDecimal("10000"))
                .isActive(false)
                .build();
        when(lotterySupplierRepositoryPort.findById(7L)).thenReturn(Optional.of(model));
        when(lotterySupplierRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(lotterySupplierApplicationMapper.toResponse(any())).thenReturn(
                LotterySupplierResponse.builder()
                        .id(7L)
                        .defaultImportCost(new java.math.BigDecimal("11000"))
                        .build()
        );

        lotterySupplierService.updateDefaultImportCost(
                7L,
                new UpdateLotterySupplierDefaultImportCostRequest(new java.math.BigDecimal("11000"))
        );

        org.mockito.ArgumentCaptor<LotterySupplierModel> captor =
                org.mockito.ArgumentCaptor.forClass(LotterySupplierModel.class);
        verify(lotterySupplierRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getDefaultImportCost()).isEqualByComparingTo("11000");
        assertThat(captor.getValue().getName()).isEqualTo("Minh Chính");
        assertThat(captor.getValue().getContactPhone()).isEqualTo("0901234567");
    }
}
