package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.shared.time.VietnamClock;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TicketSalesCutoffPolicyTest {

    @Mock private LotteryTicketSerialRepositoryPort serialRepository;
    @Mock private ImportBatchRepositoryPort importBatchRepository;
    @Mock private LotterySupplierRepositoryPort supplierRepository;
    @Mock private LotteryStationServicePort stationService;

    private TicketSalesCutoffPolicy policy;

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(Instant.parse("2026-09-29T08:00:00Z"), ZoneOffset.UTC);
        policy = new TicketSalesCutoffPolicy(
                serialRepository,
                importBatchRepository,
                supplierRepository,
                stationService,
                new VietnamClock(fixedClock));
    }

    @Test
    void supplierCutoffIsAuthoritativeAndExactBoundaryIsClosed() {
        LotteryTicketSerialModel serial = serial(1L, 10L, 100L, LocalDate.of(2026, 9, 29));
        when(importBatchRepository.findById(100L))
                .thenReturn(Optional.of(ImportBatchModel.builder().supplierId(200L).build()));
        when(supplierRepository.findById(200L))
                .thenReturn(Optional.of(LotterySupplierModel.builder()
                        .returnCutOffTime(LocalTime.of(15, 0))
                        .build()));

        assertThat(policy.resolveCutoffAt(serial))
                .contains(LocalDateTime.of(2026, 9, 29, 15, 0));
        assertThat(policy.isClosed(serial)).isTrue();
    }

    @Test
    void legacySerialFallsBackToStationDrawTime() {
        LotteryTicketSerialModel serial = serial(2L, 20L, null, LocalDate.of(2026, 9, 30));
        when(stationService.findModelById(20L)).thenReturn(Optional.of(
                LotteryStationModel.builder().drawTime(LocalTime.of(16, 15)).build()));

        assertThat(policy.resolveCutoffAt(serial))
                .contains(LocalDateTime.of(2026, 9, 30, 16, 15));
        assertThat(policy.isClosed(serial)).isFalse();
    }

    @Test
    void orderUsesReplacementSerialAndEarliestMixedSupplierCutoff() {
        LotteryTicketSerialModel original = serial(3L, 10L, 101L, LocalDate.of(2026, 9, 29));
        LotteryTicketSerialModel replacement = serial(4L, 10L, 102L, LocalDate.of(2026, 9, 30));
        LotteryTicketSerialModel secondSupplier = serial(5L, 10L, 103L, LocalDate.of(2026, 9, 29));
        when(serialRepository.findById(4L)).thenReturn(Optional.of(replacement));
        when(serialRepository.findById(5L)).thenReturn(Optional.of(secondSupplier));
        stubSupplier(102L, 202L, LocalTime.of(14, 0));
        stubSupplier(103L, 203L, LocalTime.of(13, 30));

        OrderModel order = OrderModel.builder().orderDetails(List.of(
                OrderDetailModel.builder()
                        .lotteryTicketSerialId(original.getId())
                        .replacedByTicketSerialId(replacement.getId())
                        .allocatedSerialIds(List.of(original.getId()))
                        .build(),
                OrderDetailModel.builder().allocatedSerialIds(List.of(secondSupplier.getId())).build()
        )).build();

        assertThat(policy.resolveEarliestCutoff(order))
                .contains(LocalDateTime.of(2026, 9, 29, 13, 30));
    }

    private void stubSupplier(Long importBatchId, Long supplierId, LocalTime cutoff) {
        when(importBatchRepository.findById(importBatchId))
                .thenReturn(Optional.of(ImportBatchModel.builder().supplierId(supplierId).build()));
        when(supplierRepository.findById(supplierId))
                .thenReturn(Optional.of(LotterySupplierModel.builder().returnCutOffTime(cutoff).build()));
    }

    private LotteryTicketSerialModel serial(Long id, Long stationId, Long importBatchId, LocalDate drawDate) {
        return LotteryTicketSerialModel.builder()
                .id(id)
                .stationId(stationId)
                .importBatchId(importBatchId)
                .drawDate(drawDate)
                .build();
    }
}
