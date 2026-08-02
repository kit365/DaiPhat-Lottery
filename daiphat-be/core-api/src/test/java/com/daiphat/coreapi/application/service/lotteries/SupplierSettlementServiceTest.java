package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.out.lotteries.SupplierSettlementRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SupplierSettlementService")
class SupplierSettlementServiceTest {

    @Mock
    private SupplierSettlementRepositoryPort supplierSettlementRepositoryPort;

    @InjectMocks
    private SupplierSettlementService supplierSettlementService;

    @Test
    @DisplayName("reuses existing settlement for same supplier and draw date")
    void findOrCreate_reusesExisting() {
        LocalDate drawDate = LocalDate.of(2026, 7, 31);
        LotterySupplierModel supplier = LotterySupplierModel.builder()
                .id(7L)
                .paymentTermDays(3)
                .build();
        SupplierSettlementModel existing = SupplierSettlementModel.builder()
                .id(99L)
                .lotterySupplierId(7L)
                .periodFrom(drawDate)
                .periodTo(drawDate.plusDays(3))
                .status(SupplierSettlementStatus.OPEN)
                .build();
        when(supplierSettlementRepositoryPort.findBySupplierIdAndPeriodFrom(7L, drawDate))
                .thenReturn(Optional.of(existing));

        SupplierSettlementModel result = supplierSettlementService.findOrCreateForImport(supplier, drawDate);

        assertThat(result.getId()).isEqualTo(99L);
        verify(supplierSettlementRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("creates settlement with periodTo = drawDate + paymentTermDays")
    void findOrCreate_createsWithPaymentTerm() {
        LocalDate drawDate = LocalDate.of(2026, 7, 31);
        LotterySupplierModel supplier = LotterySupplierModel.builder()
                .id(7L)
                .paymentTermDays(5)
                .build();
        when(supplierSettlementRepositoryPort.findBySupplierIdAndPeriodFrom(7L, drawDate))
                .thenReturn(Optional.empty());
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(invocation -> {
            SupplierSettlementModel model = invocation.getArgument(0);
            model.setId(11L);
            return model;
        });

        SupplierSettlementModel result = supplierSettlementService.findOrCreateForImport(supplier, drawDate);

        ArgumentCaptor<SupplierSettlementModel> captor = ArgumentCaptor.forClass(SupplierSettlementModel.class);
        verify(supplierSettlementRepositoryPort).save(captor.capture());
        SupplierSettlementModel saved = captor.getValue();
        assertThat(saved.getPeriodFrom()).isEqualTo(drawDate);
        assertThat(saved.getPeriodTo()).isEqualTo(drawDate.plusDays(5));
        assertThat(saved.getStatus()).isEqualTo(SupplierSettlementStatus.OPEN);
        assertThat(result.getId()).isEqualTo(11L);
    }

    @Test
    @DisplayName("paymentTermDays 0 means periodTo equals periodFrom")
    void findOrCreate_sameDayPaymentTerm() {
        LocalDate drawDate = LocalDate.of(2026, 7, 31);
        LotterySupplierModel supplier = LotterySupplierModel.builder()
                .id(7L)
                .paymentTermDays(0)
                .build();
        when(supplierSettlementRepositoryPort.findBySupplierIdAndPeriodFrom(7L, drawDate))
                .thenReturn(Optional.empty());
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        supplierSettlementService.findOrCreateForImport(supplier, drawDate);

        ArgumentCaptor<SupplierSettlementModel> captor = ArgumentCaptor.forClass(SupplierSettlementModel.class);
        verify(supplierSettlementRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getPeriodTo()).isEqualTo(drawDate);
    }

    @Test
    @DisplayName("recalculateTotalImportValue updates remaining from imported cost sum")
    void recalculateTotalImportValue_updatesAmounts() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(5L)
                .totalPaidAmount(new BigDecimal("100.000"))
                .totalReturnValue(BigDecimal.ZERO)
                .status(SupplierSettlementStatus.OPEN)
                .build();
        when(supplierSettlementRepositoryPort.findById(5L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(5L))
                .thenReturn(new BigDecimal("9500.5"));
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        supplierSettlementService.recalculateTotalImportValue(5L);

        ArgumentCaptor<SupplierSettlementModel> captor = ArgumentCaptor.forClass(SupplierSettlementModel.class);
        verify(supplierSettlementRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getTotalImportValue()).isEqualByComparingTo("9500.500");
        assertThat(captor.getValue().getRemainingAmount()).isEqualByComparingTo("9400.500");
    }

    @Test
    @DisplayName("recalculateTotalReturnValue subtracts prepared returns from remaining")
    void recalculateTotalReturnValue_updatesRemaining() {
        SupplierSettlementModel settlement = SupplierSettlementModel.builder()
                .id(5L)
                .totalImportValue(new BigDecimal("10000.000"))
                .totalPaidAmount(new BigDecimal("500.000"))
                .status(SupplierSettlementStatus.OPEN)
                .build();
        when(supplierSettlementRepositoryPort.findById(5L)).thenReturn(Optional.of(settlement));
        when(supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(5L))
                .thenReturn(new BigDecimal("10000.000"));
        when(supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(5L))
                .thenReturn(new BigDecimal("1500.250"));
        when(supplierSettlementRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        supplierSettlementService.recalculateTotalReturnValue(5L);

        ArgumentCaptor<SupplierSettlementModel> captor = ArgumentCaptor.forClass(SupplierSettlementModel.class);
        verify(supplierSettlementRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getTotalReturnValue()).isEqualByComparingTo("1500.250");
        // remaining = 10000 - 1500.250 - 500 = 7999.750
        assertThat(captor.getValue().getRemainingAmount()).isEqualByComparingTo("7999.750");
    }
}
