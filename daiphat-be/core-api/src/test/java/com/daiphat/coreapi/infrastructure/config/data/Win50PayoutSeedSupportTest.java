package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.lottery.*;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.*;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderDetailRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class Win50PayoutSeedSupportTest {
    @Mock OrderRepository orders;
    @Mock OrderDetailRepository details;
    @Mock ImportBatchRepository imports;
    @Mock LotteryTicketSerialRepository serials;
    @InjectMocks Win50PayoutSeedSupport support;

    @Test
    void checksExactOrderCodesToFillOnlyMissingSlots() {
        when(orders.findByOrderCode(anyString())).thenAnswer(invocation -> {
            String code = invocation.getArgument(0);
            return code.equals(Win50PayoutSeedCatalog.ORDER_CODE_PREFIX + "001")
                    || code.equals(Win50PayoutSeedCatalog.ORDER_CODE_PREFIX + "004")
                    ? Optional.of(OrderEntity.builder().build()) : Optional.empty();
        });
        assertThat(support.missingOrderPlans(true)).extracting(Win50PayoutSeedCatalog.OrderPlan::orderN)
                .containsExactly(2, 3, 5, 6);
    }

    @Test
    void excludesTicketsWithSoldReturnedPaidAllocatedSiblingsOrOrderHistory() {
        LocalDate drawDate = LocalDate.of(2026, 10, 2);
        var station = LotteryStationEntity.builder().id(1L).name("Vĩnh Long").build();
        Map<Long, List<LotteryTicketSerialEntity>> tickets = new LinkedHashMap<>();
        for (long i = 1; i <= 6; i++) {
            var ticket = LotteryTicketEntity.builder().id(i).station(station).drawDate(drawDate)
                    .status(LotteryTicketStatus.EXPIRED).build();
            tickets.put(i, List.of(
                    LotteryTicketSerialEntity.builder().id(i * 2).ticket(ticket).serialNumber("00000" + i + "A")
                            .status(LotteryTicketSerialStatus.EXPIRED).build(),
                    LotteryTicketSerialEntity.builder().id(i * 2 + 1).ticket(ticket).serialNumber("00000" + i + "B")
                            .status(LotteryTicketSerialStatus.EXPIRED).build()));
        }
        tickets.get(2L).get(1).setStatus(LotteryTicketSerialStatus.SOLD);
        tickets.get(3L).get(1).setReturnBatchLineId(123L);
        tickets.get(4L).get(1).setPayoutState(SerialPayoutState.PAID_OUT);
        tickets.get(6L).get(1).setReservedByAllocationBatchId(123L);
        when(details.existsByLotteryTicket_Id(anyLong())).thenAnswer(i -> i.<Long>getArgument(0) == 5L);
        when(imports.findByNoteStartingWithAndDeletedAtIsNull(anyString()))
                .thenReturn(List.of(ImportBatchEntity.builder().id(1L).drawDate(drawDate).build()));
        when(serials.findByImportBatch_Id(1L)).thenReturn(tickets.values().stream().flatMap(List::stream).toList());
        when(serials.findByTicket_IdAndDeletedAtIsNull(anyLong())).thenAnswer(i -> tickets.get(i.<Long>getArgument(0)));

        assertThat(support.loadClaimableInventory(true, drawDate, drawDate))
                .extracting(s -> s.getTicket().getId()).containsExactly(1L);
        assertThat(tickets.get(2L).get(1).getStatus()).isEqualTo(LotteryTicketSerialStatus.SOLD);
        assertThat(tickets.get(4L).get(1).getPayoutState()).isEqualTo(SerialPayoutState.PAID_OUT);
    }
}
