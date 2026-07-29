package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.PurchasedTicketResponse;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultDetailRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureRepositoryPort;
import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.PurchasedTicketQueryRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.TicketDrawResultStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultDetailModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PurchasedTicketQueryService")
class PurchasedTicketQueryServiceTest {

    private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Mock
    private PurchasedTicketQueryRepositoryPort purchasedTicketQueryRepositoryPort;
    @Mock
    private LotteryResultRepositoryPort lotteryResultRepositoryPort;
    @Mock
    private LotteryResultDetailRepositoryPort lotteryResultDetailRepositoryPort;
    @Mock
    private PrizeStructureRepositoryPort prizeStructureRepositoryPort;
    @Mock
    private PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort;

    private PurchasedTicketQueryService service;

    @BeforeEach
    void setUp() {
        service = new PurchasedTicketQueryService(
                purchasedTicketQueryRepositoryPort,
                lotteryResultRepositoryPort,
                lotteryResultDetailRepositoryPort,
                prizeStructureRepositoryPort,
                prizePayoutRequestRepositoryPort
        );
    }

    @Test
    @DisplayName("getMyTickets: trả PENDING_DRAW khi chưa có kết quả")
    void getMyTickets_pendingDraw_whenNoResult() {
        OrderDetailEntity detail = buildDetail("123456", LocalDate.now().minusDays(1));
        when(purchasedTicketQueryRepositoryPort.findPurchasedTickets(any(Specification.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(detail)));
        when(lotteryResultRepositoryPort.findByStationIdAndDrawDate(1L, detail.getLotteryTicketSerial().getTicket().getDrawDate()))
                .thenReturn(Optional.empty());

        PageResponse<PurchasedTicketResponse> response = service.getMyTickets(
                USER_ID, 1, 10, null, null, null, null, "createdAt", "desc");

        assertThat(response.getRecordList()).hasSize(1);
        assertThat(response.getRecordList().getFirst().drawResultStatus()).isEqualTo(TicketDrawResultStatus.PENDING_DRAW);
    }

    @Test
    @DisplayName("getMyTickets: trả WON khi khớp giải")
    void getMyTickets_won_whenMatched() {
        LocalDate drawDate = LocalDate.now().minusDays(2);
        OrderDetailEntity detail = buildDetail("123456", drawDate);
        LotteryResultModel result = LotteryResultModel.builder()
                .id(99L)
                .stationId(1L)
                .drawDate(drawDate)
                .status(LotteryResultStatus.COMPLETED)
                .build();
        LotteryResultDetailModel resultDetail = LotteryResultDetailModel.builder()
                .prizeCode("G8")
                .prizeDisplayName("Giải tám")
                .winningNumber("56")
                .matchFrom(com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom.LAST)
                .matchDigits(2)
                .build();

        when(purchasedTicketQueryRepositoryPort.findPurchasedTickets(any(Specification.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(detail)));
        when(lotteryResultRepositoryPort.findByStationIdAndDrawDate(1L, drawDate)).thenReturn(Optional.of(result));
        when(lotteryResultDetailRepositoryPort.findByLotteryResultId(99L)).thenReturn(List.of(resultDetail));

        PageResponse<PurchasedTicketResponse> response = service.getMyTickets(
                USER_ID, 1, 10, null, null, null, null, "createdAt", "desc");

        assertThat(response.getRecordList().getFirst().drawResultStatus()).isEqualTo(TicketDrawResultStatus.WON);
        assertThat(response.getRecordList().getFirst().matchedPrizeCode()).isEqualTo("G8");
    }

    private OrderDetailEntity buildDetail(String numbers, LocalDate drawDate) {
        LotteryStationEntity station = LotteryStationEntity.builder().id(1L).name("TP.HCM").build();
        LotteryTicketEntity ticket = LotteryTicketEntity.builder()
                .id(10L)
                .numbers(numbers)
                .drawDate(drawDate)
                .station(station)
                .status(LotteryTicketStatus.SOLD_OUT)
                .build();
        LotteryTicketSerialEntity serial = LotteryTicketSerialEntity.builder()
                .id(20L)
                .serialNumber("SN001")
                .ticket(ticket)
                .status(LotteryTicketSerialStatus.SOLD)
                .build();
        OrderEntity order = OrderEntity.builder()
                .id(UUID.randomUUID())
                .orderCode("ORD-001")
                .user(null)
                .createdAt(LocalDateTime.now().minusDays(3))
                .status(OrderStatus.COMPLETED)
                .orderType(OrderType.ONLINE)
                .receiveType(OrderReceiveType.COUNTER_PICKUP)
                .build();
        return OrderDetailEntity.builder()
                .id(30L)
                .order(order)
                .lotteryTicketSerial(serial)
                .price(BigDecimal.valueOf(10000))
                .status(OrderDetailStatus.ACTIVE)
                .build();
    }
}
