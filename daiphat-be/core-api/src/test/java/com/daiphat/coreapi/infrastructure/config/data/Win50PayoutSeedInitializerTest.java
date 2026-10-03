package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.application.port.in.lotteries.LotteryResultServicePort;
import com.daiphat.coreapi.domain.model.enums.lottery.*;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.*;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.*;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderRepository;
import com.daiphat.coreapi.shared.time.VietnamClock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.*;
import java.util.*;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class Win50PayoutSeedInitializerTest {
    @Mock SeedAccountResolver accounts;
    @Mock LotteryTicketRepository tickets;
    @Mock LotteryTicketSerialRepository serials;
    @Mock LotteryResultRepository results;
    @Mock LotteryResultDetailRepository resultDetails;
    @Mock PrizeStructureRepository prizes;
    @Mock OrderRepository orders;
    @Mock LotterySerialSeedCleanup cleanup;
    @Mock LotteryResultServicePort resultService;
    @Mock PlatformTransactionManager transactionManager;
    @Mock Win50PayoutSeedSupport support;
    Win50PayoutSeedInitializer initializer;
    final LocalDate yesterday = LocalDate.of(2026, 10, 2);
    final Map<String, OrderEntity> storedOrders = new LinkedHashMap<>();

    @BeforeEach
    void setup() {
        var clock = new VietnamClock(Clock.fixed(Instant.parse("2026-10-03T05:00:00Z"), ZoneOffset.UTC));
        initializer = new Win50PayoutSeedInitializer(accounts, tickets, serials, results,
                resultDetails, prizes, orders, cleanup, resultService, transactionManager, clock, support);
        ReflectionTestUtils.setField(initializer, "officialDemoEnabled", true);
    }

    @Test
    void disabledFlagsDoNotTouchDatabase() {
        initializer.run(null);
        verifyNoInteractions(transactionManager, support, orders, tickets, serials, resultService);
    }

    @Test
    void orderFlagCreatesSixOrdersAndRestartPreservesThem() {
        enableOrderSeed();
        supplyOfficialInventory(50);
        initializer.run(null);
        assertThat(storedOrders).hasSize(6);
        assertThat(storedOrders.values().stream().mapToInt(o -> o.getOrderDetails().size()).sum()).isEqualTo(50);
        for (int i = 0; i < 3; i++) {
            final String username = "member" + i;
            var memberOrders = storedOrders.values().stream()
                    .filter(o -> username.equals(o.getUser().getUsername())).toList();
            assertThat(memberOrders).hasSize(2);
            assertThat(memberOrders.stream().flatMap(o -> o.getOrderDetails().stream())
                    .map(d -> d.getLotteryTicket().getDrawDate()).distinct()).hasSize(1);
        }
        List<LocalDate> memberDrawDates = storedOrders.values().stream()
                .collect(java.util.stream.Collectors.groupingBy(o -> o.getUser().getUsername()))
                .values().stream()
                .map(orders -> orders.stream().flatMap(o -> o.getOrderDetails().stream())
                        .map(d -> d.getLotteryTicket().getDrawDate()).findFirst().orElseThrow())
                .toList();
        assertThat(memberDrawDates).doesNotHaveDuplicates();
        assertThat(java.time.temporal.ChronoUnit.DAYS.between(
                memberDrawDates.stream().min(LocalDate::compareTo).orElseThrow(),
                memberDrawDates.stream().max(LocalDate::compareTo).orElseThrow())).isLessThanOrEqualTo(7);
        initializer.run(null);
        verify(orders, times(6)).save(any());
        verify(orders, never()).deleteAll(any(Iterable.class));
        verifyNoInteractions(cleanup);
        verify(results, never()).save(any());
    }

    @Test
    void partialDatasetOnlyAddsMissingOrderWithItsOriginalNumber() {
        enableOrderSeed();
        for (int i = 1; i <= 5; i++) {
            String code = Win50PayoutSeedCatalog.ORDER_CODE_PREFIX + String.format("%03d", i);
            storedOrders.put(code, OrderEntity.builder().orderCode(code).build());
        }
        OrderEntity existing = storedOrders.values().iterator().next();
        supplyOfficialInventory(7);
        initializer.run(null);
        assertThat(storedOrders).hasSize(6);
        assertThat(storedOrders.get(Win50PayoutSeedCatalog.ORDER_CODE_PREFIX + "001")).isSameAs(existing);
        var added = storedOrders.get(Win50PayoutSeedCatalog.ORDER_CODE_PREFIX + "006");
        assertThat(added.getOrderDetails()).hasSize(7);
        assertThat(added.getUser().getUsername()).isEqualTo("member2");
        verify(orders).save(any());
        verify(orders, never()).deleteAll(any(Iterable.class));
    }

    @Test
    void unavailableOfficialResultLeavesExistingOrdersAndStockUntouched() {
        enableOrderSeed();
        var pool = inventory(50);
        when(support.loadClaimableInventory(true, yesterday.minusDays(6), yesterday)).thenReturn(pool);
        when(resultService.ensureResultForBoard(1L, yesterday)).thenThrow(new IllegalStateException("unavailable"));
        initializer.run(null);
        verify(orders, never()).save(any());
        verify(orders, never()).deleteAll(any(Iterable.class));
        verify(tickets, never()).save(any());
        verify(serials, never()).save(any());
        assertThat(pool).allMatch(s -> s.getStatus() == LotteryTicketSerialStatus.EXPIRED);
    }

    private void enableOrderSeed() {
        ReflectionTestUtils.setField(initializer, "rebuildOrders", true);
        when(transactionManager.getTransaction(any())).thenAnswer(invocation -> new SimpleTransactionStatus());
        when(accounts.findOfficialDemoMember(0)).thenReturn(UserEntity.builder().username("member0").build());
        // Members 1 and 2 are resolved only when writing their missing orders.
        lenient().when(accounts.findOfficialDemoMember(1)).thenReturn(UserEntity.builder().username("member1").build());
        lenient().when(accounts.findOfficialDemoMember(2)).thenReturn(UserEntity.builder().username("member2").build());
        when(accounts.findOfficialDemoStaff(0)).thenReturn(UserEntity.builder().id(UUID.randomUUID()).build());
        when(prizes.findAll()).thenReturn(Win50PayoutSeedCatalog.PRIZES.stream()
                .<PrizeStructureEntity>map(p -> PrizeStructureEntity.builder().prizeCode(p).build()).toList());
        when(support.missingOrderPlans(true)).thenAnswer(invocation -> Win50PayoutSeedCatalog.OFFICIAL_ORDER_PLANS.stream()
                .filter(p -> !storedOrders.containsKey(Win50PayoutSeedCatalog.ORDER_CODE_PREFIX + String.format("%03d", p.orderN())))
                .toList());
    }

    private void supplyOfficialInventory(int count) {
        List<LotteryTicketSerialEntity> pool = new ArrayList<>();
        LocalDate[] dates = {yesterday, yesterday.minusDays(1), yesterday.minusDays(2)};
        if (count == 7) {
            pool.addAll(inventory(count, yesterday, 1));
        } else {
            for (int index = 0; index < count; index++) {
                int dayIndex = index < 18 ? 0 : index < 36 ? 1 : 2;
                pool.addAll(inventory(1, dates[dayIndex], index + 1));
            }
        }
        when(support.loadClaimableInventory(true, yesterday.minusDays(6), yesterday)).thenReturn(pool);
        for (var serial : pool) {
            when(serials.findByTicket_IdAndDeletedAtIsNull(serial.getTicket().getId())).thenReturn(List.of(serial));
            when(results.findByStation_IdAndDrawDateAndDeletedAtIsNull(1L, serial.getTicket().getDrawDate()))
                    .thenReturn(Optional.of(LotteryResultEntity.builder().id(1L).status(LotteryResultStatus.COMPLETED).build()));
        }
        when(resultDetails.findByLotteryResult_IdAndDeletedAtIsNullOrderByPrizeStructure_DisplayOrderAscWinningNumberAsc(1L))
                .thenReturn(Win50PayoutSeedCatalog.RESULT_DETAIL_CODES.stream().<LotteryResultDetailEntity>map(p -> LotteryResultDetailEntity.builder()
                        .prizeStructure(PrizeStructureEntity.builder().prizeCode(p).build())
                        .winningNumber(p.equals("G8") ? "89" : "111111").build()).toList());
        when(orders.findByOrderCode(anyString())).thenAnswer(invocation ->
                Optional.ofNullable(storedOrders.get(invocation.getArgument(0))));
        when(orders.save(any())).thenAnswer(invocation -> {
            OrderEntity order = invocation.getArgument(0);
            storedOrders.put(order.getOrderCode(), order);
            return order;
        });
    }

    private List<LotteryTicketSerialEntity> inventory(int count) {
        return inventory(count, yesterday, 1);
    }

    private List<LotteryTicketSerialEntity> inventory(int count, LocalDate drawDate, int firstId) {
        var station = LotteryStationEntity.builder().id(1L).name("Vĩnh Long").build();
        return IntStream.range(firstId, firstId + count).<LotteryTicketSerialEntity>mapToObj(i -> LotteryTicketSerialEntity.builder()
                .id((long) i).serialNumber("sample" + i).status(LotteryTicketSerialStatus.EXPIRED)
                .ticket(LotteryTicketEntity.builder().id((long) i).station(station).drawDate(drawDate).numbers("000001").build())
                .build()).toList();
    }
}
