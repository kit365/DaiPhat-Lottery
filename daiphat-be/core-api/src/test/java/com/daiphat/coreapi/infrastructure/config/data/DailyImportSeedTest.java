package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.*;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DailyImportSeedTest {
    @ParameterizedTest
    @CsvSource({"false,false", "true,false", "false,true", "true,true"})
    void seedsDailyAndMissingWinningInventoryWithoutDuplicates(boolean rebuild, boolean missingWinners) {
        var imports = mock(ImportBatchRepository.class);
        var stations = mock(LotteryStationRepository.class);
        var tickets = mock(LotteryTicketRepository.class);
        var accounts = mock(SeedAccountResolver.class);
        var suppliers = mock(SeedSupplierSupport.class);
        var cleanup = mock(LotterySerialSeedCleanup.class);
        var winners = mock(Win50PayoutSeedSupport.class);
        var seed = new LotteryImportBatchSeedInitializer(mock(LotterySupplierRepository.class), stations,
                imports, mock(ImportBatchLineRepository.class), tickets, mock(LotteryTicketSerialRepository.class),
                cleanup, accounts, suppliers, winners,
                Clock.fixed(Instant.parse("2026-10-03T05:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh")));
        ReflectionTestUtils.setField(seed, "dailyOnly", true);
        ReflectionTestUtils.setField(seed, "rebuildDemo", rebuild);
        ReflectionTestUtils.setField(seed, "officialDemoEnabled", true);
        ReflectionTestUtils.setField(seed, "rebuildOrders", true);
        ReflectionTestUtils.setField(seed, "winningSeedEnabled", true);
        ReflectionTestUtils.setField(seed, "serialsPerTicket", 15);
        when(accounts.findOperator()).thenReturn(UserEntity.builder().id(UUID.randomUUID()).build());
        when(suppliers.ensureMinhChinh(any())).thenReturn(LotterySupplierEntity.builder().id(1L).build());
        when(winners.missingOrderPlans(true)).thenReturn(missingWinners
                ? Win50PayoutSeedCatalog.OFFICIAL_ORDER_PLANS : List.of());
        when(stations.findAll()).thenReturn(List.of(
                LotteryStationEntity.builder().id(1L).name("Hồ Chí Minh").isActive(true)
                        .drawDays(List.of(DayOfWeek.SATURDAY)).build(),
                LotteryStationEntity.builder().id(2L).name("Tiền Giang").isActive(true)
                        .drawDays(List.of(DayOfWeek.SUNDAY)).build(),
                LotteryStationEntity.builder().id(3L).name("Vĩnh Long").isActive(true)
                        .drawDays(List.of(DayOfWeek.FRIDAY)).build(),
                LotteryStationEntity.builder().id(4L).name("Tây Ninh").isActive(true)
                        .drawDays(List.of(DayOfWeek.THURSDAY)).build(),
                LotteryStationEntity.builder().id(5L).name("Đồng Nai").isActive(true)
                        .drawDays(List.of(DayOfWeek.WEDNESDAY)).build()));
        List<ImportBatchEntity> saved = new ArrayList<>();
        when(imports.findByNoteStartingWithAndDeletedAtIsNull(anyString())).thenAnswer(i -> List.copyOf(saved));
        when(imports.save(any())).thenAnswer(i -> {
            ImportBatchEntity batch = i.getArgument(0);
            if (!saved.contains(batch)) saved.add(batch);
            return batch;
        });
        when(tickets.save(any())).thenAnswer(i -> i.getArgument(0));
        seed.run(null);
        seed.run(null);
        assertThat(saved).hasSize(missingWinners ? 5 : 2);
        var daily = saved.stream().filter(b -> !b.getDrawDate().isBefore(LocalDate.of(2026, 10, 3))).toList();
        assertThat(daily).extracting(ImportBatchEntity::getDrawDate)
                .containsExactly(LocalDate.of(2026, 10, 3), LocalDate.of(2026, 10, 4));
        assertThat(daily).extracting(ImportBatchEntity::getTotalImportedQuantity).containsOnly(750);
        if (missingWinners) {
            var history = saved.stream().filter(b -> b.getDrawDate().isBefore(LocalDate.of(2026, 10, 3))).toList();
            assertThat(history).extracting(ImportBatchEntity::getTotalImportedQuantity).containsExactly(18, 18, 14);
            assertThat(history).extracting(ImportBatchEntity::getDrawDate).containsExactly(
                    LocalDate.of(2026, 10, 2), LocalDate.of(2026, 10, 1), LocalDate.of(2026, 9, 30));
            assertThat(history).allMatch(b -> b.getNote().startsWith(SeedDocumentCodes.IMPORT_NOTE_PREFIX + "MAIN-WINNERS"));
        }
        verifyNoInteractions(cleanup);
    }
}
