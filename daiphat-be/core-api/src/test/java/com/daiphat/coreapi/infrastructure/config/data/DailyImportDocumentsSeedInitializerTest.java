package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.application.port.in.lotteries.LotterySupplierServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.application.service.lotteries.ReturnBatchImportSyncService;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.*;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DailyImportDocumentsSeedInitializerTest {
    @Test
    void repairsBothDailyDocumentsEvenWhenImportsAlreadyExist() {
        var imports = mock(ImportBatchRepository.class);
        var suppliers = mock(LotterySupplierServicePort.class);
        var settlements = mock(SupplierSettlementServicePort.class);
        var returns = mock(ReturnBatchImportSyncService.class);
        LocalDate today = LocalDate.of(2026, 10, 3);
        var supplier = LotterySupplierEntity.builder().id(1L).build();
        var first = ImportBatchEntity.builder().id(10L).supplier(supplier).drawDate(today).build();
        var second = ImportBatchEntity.builder().id(11L).supplier(supplier).drawDate(today.plusDays(1)).build();
        var old = ImportBatchEntity.builder().id(12L).supplier(supplier).drawDate(today.minusDays(1)).build();
        when(imports.findByNoteStartingWithAndDeletedAtIsNull(anyString())).thenReturn(List.of(first, second, old));
        var model = LotterySupplierModel.builder().id(1L).build();
        when(suppliers.getActiveModelById(1L)).thenReturn(model);
        when(settlements.findOrCreateForImport(model, today)).thenReturn(SupplierSettlementModel.builder().id(20L).build());
        when(settlements.findOrCreateForImport(model, today.plusDays(1))).thenReturn(SupplierSettlementModel.builder().id(21L).build());
        var seed = new DailyImportDocumentsSeedInitializer(imports, suppliers, settlements, returns,
                Clock.fixed(Instant.parse("2026-10-03T05:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh")));
        seed.run(null);
        assertThat(first.getSupplierSettlementId()).isEqualTo(20L);
        assertThat(second.getSupplierSettlementId()).isEqualTo(21L);
        verify(returns).refreshOpenPrimarySupplierReturn(1L, today, 20L);
        verify(returns).refreshOpenPrimarySupplierReturn(1L, today.plusDays(1), 21L);
        verify(settlements).recalculateTotalImportValue(20L);
        verify(settlements).recalculateTotalImportValue(21L);
        verify(imports, never()).saveAndFlush(old);
    }
}
