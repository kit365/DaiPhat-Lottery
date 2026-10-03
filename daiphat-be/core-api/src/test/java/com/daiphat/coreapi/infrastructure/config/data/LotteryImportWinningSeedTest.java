package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.*;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LotteryImportWinningSeedTest {
    @Mock LotterySupplierRepository suppliers;
    @Mock LotteryStationRepository stations;
    @Mock ImportBatchRepository imports;
    @Mock ImportBatchLineRepository lines;
    @Mock LotteryTicketRepository tickets;
    @Mock LotteryTicketSerialRepository serials;
    @Mock LotterySerialSeedCleanup cleanup;
    @Mock SeedAccountResolver accounts;
    @Mock SeedSupplierSupport supplierSupport;
    @Mock Win50PayoutSeedSupport winningSupport;
    LotteryImportBatchSeedInitializer initializer;
    final LocalDate yesterday = LocalDate.of(2026, 10, 2);

    @BeforeEach
    void setup() {
        initializer = new LotteryImportBatchSeedInitializer(suppliers, stations, imports, lines, tickets,
                serials, cleanup, accounts, supplierSupport, winningSupport,
                Clock.fixed(Instant.parse("2026-10-03T05:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh")));
        ReflectionTestUtils.setField(initializer, "officialDemoEnabled", true);
        ReflectionTestUtils.setField(initializer, "rebuildOrders", true);
        ReflectionTestUtils.setField(initializer, "winningSeedEnabled", true);
        ReflectionTestUtils.setField(initializer, "serialsPerTicket", 15);
        when(accounts.findOperator()).thenReturn(UserEntity.builder().id(UUID.randomUUID()).build());
        when(supplierSupport.ensureMinhChinh(any())).thenReturn(LotterySupplierEntity.builder().id(1L).build());
        // Friday station: no ordinary Saturday/Sunday inventory is created in these tests.
        when(stations.findAll()).thenReturn(List.of(LotteryStationEntity.builder().id(1L)
                .name("Vĩnh Long").isActive(true).drawDays(List.of(DayOfWeek.FRIDAY)).build()));
    }

    @Test
    void addsOnlyHistoricalShortfallAndKeepsExistingInventory() {
        when(winningSupport.missingOrderPlans(true)).thenReturn(Win50PayoutSeedCatalog.OFFICIAL_ORDER_PLANS);
        when(winningSupport.loadClaimableInventory(true, yesterday, yesterday))
                .thenReturn(Collections.nCopies(20, LotteryTicketSerialEntity.builder().build()));
        when(imports.save(any())).thenAnswer(i -> {
            ImportBatchEntity batch = i.getArgument(0); batch.setId(1L); return batch;
        });
        AtomicLong ticketId = new AtomicLong();
        when(tickets.save(any())).thenAnswer(i -> {
            LotteryTicketEntity ticket = i.getArgument(0); ticket.setId(ticketId.incrementAndGet()); return ticket;
        });
        initializer.run(null);
        var saved = ArgumentCaptor.forClass(LotteryTicketEntity.class);
        verify(tickets, times(30)).save(saved.capture());
        assertThat(saved.getAllValues()).allMatch(t -> yesterday.equals(t.getDrawDate()));
        verifyNoInteractions(cleanup);
        verify(imports, never()).deleteAll(any(Iterable.class));
        verify(supplierSupport, never()).retireDemoSuppliers(any());
    }

    @Test
    void existingWinningOrdersDoNotAddHistoricalStockOnRestart() {
        when(winningSupport.missingOrderPlans(true)).thenReturn(List.of());
        initializer.run(null);
        verify(winningSupport, never()).loadClaimableInventory(anyBoolean(), any(), any());
        verify(tickets, never()).save(any());
        verify(imports, never()).save(any());
        verifyNoInteractions(cleanup);
    }
}
