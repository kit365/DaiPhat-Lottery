package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutOwnershipVerificationLevel;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutTicketOrigin;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@ExtendWith(MockitoExtension.class)
class PrizePayoutTicketOriginResolverTest {

    @InjectMocks
    private PrizePayoutEligibilityService eligibilityService;

    private OrderDetailEntity detail;
    private LotteryTicketSerialEntity serial;

    @BeforeEach
    void setUp() {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());

        OrderEntity order = new OrderEntity();
        order.setOrderType(OrderType.ONLINE);
        order.setUser(user);

        LotteryStationEntity station = new LotteryStationEntity();
        station.setId(1L);
        station.setName("TP.HCM");

        LotteryTicketEntity ticket = new LotteryTicketEntity();
        ticket.setStation(station);
        ticket.setDrawDate(LocalDate.of(2026, 8, 1));

        serial = new LotteryTicketSerialEntity();
        serial.setId(10L);
        serial.setSerialNumber("SN-001");
        serial.setTicket(ticket);

        detail = new OrderDetailEntity();
        detail.setOrder(order);
        detail.setLotteryTicketSerial(serial);
    }

    @Test
    void resolveTicketOrigin_onlineAndDirect() {
        OrderEntity online = new OrderEntity();
        online.setOrderType(OrderType.ONLINE);
        assertEquals(PrizePayoutTicketOrigin.INTERNAL_ONLINE, eligibilityService.resolveTicketOrigin(online));

        OrderEntity direct = new OrderEntity();
        direct.setOrderType(OrderType.DIRECT);
        assertEquals(PrizePayoutTicketOrigin.INTERNAL_OFFLINE, eligibilityService.resolveTicketOrigin(direct));
    }

    @Test
    void ownership_internalOnline_requiresCustomer_autoMatched() {
        var ownership = eligibilityService.resolveOwnershipVerification(detail, serial);
        assertEquals(PrizePayoutTicketOrigin.INTERNAL_ONLINE, ownership.ticketOrigin());
        assertEquals(PrizePayoutOwnershipVerificationLevel.AUTO_MATCHED, ownership.level());
        assertFalse(ownership.requiresManualOwnershipConfirm());
    }

    @Test
    void ownership_internalOnline_withoutCustomer_fails() {
        detail.getOrder().setUser(null);
        DomainException ex = assertThrows(
                DomainException.class,
                () -> eligibilityService.resolveOwnershipVerification(detail, serial));
        assertEquals(ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE, ex.getErrorCode());
    }

    @Test
    void ownership_internalOffline_withCustomer_customerLinked() {
        detail.getOrder().setOrderType(OrderType.DIRECT);
        var ownership = eligibilityService.resolveOwnershipVerification(detail, serial);
        assertEquals(PrizePayoutTicketOrigin.INTERNAL_OFFLINE, ownership.ticketOrigin());
        assertEquals(PrizePayoutOwnershipVerificationLevel.CUSTOMER_LINKED, ownership.level());
        assertFalse(ownership.requiresManualOwnershipConfirm());
    }

    @Test
    void ownership_internalOffline_withoutCustomer_manualOnly() {
        detail.getOrder().setOrderType(OrderType.DIRECT);
        detail.getOrder().setUser(null);
        var ownership = eligibilityService.resolveOwnershipVerification(detail, serial);
        assertEquals(PrizePayoutTicketOrigin.INTERNAL_OFFLINE, ownership.ticketOrigin());
        assertEquals(PrizePayoutOwnershipVerificationLevel.MANUAL_ONLY, ownership.level());
        assertTrue(ownership.requiresManualOwnershipConfirm());
    }
}
