package com.daiphat.coreapi.domain.model.streetagent;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationSerialStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VendorAllocationSerialModelTest {

    @Test
    void requireTicketMatchesSerial_acceptsMatchingIds() {
        VendorAllocationSerialModel model = VendorAllocationSerialModel.builder()
                .serialId(10L)
                .lotteryTicketId(5L)
                .build();
        model.requireTicketMatchesSerial(5L);
    }

    @Test
    void requireTicketMatchesSerial_rejectsMismatch() {
        VendorAllocationSerialModel model = VendorAllocationSerialModel.builder()
                .serialId(10L)
                .lotteryTicketId(5L)
                .build();
        assertThatThrownBy(() -> model.requireTicketMatchesSerial(99L))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void requireTicketMatchesSerial_rejectsMissingSerial() {
        VendorAllocationSerialModel model = VendorAllocationSerialModel.builder()
                .lotteryTicketId(5L)
                .build();
        assertThatThrownBy(() -> model.requireTicketMatchesSerial(5L))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void reserveForDraft_setsReservedTimestamps() {
        VendorAllocationSerialModel model = VendorAllocationSerialModel.builder()
                .ticketStatus(LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(TicketCondition.GOOD)
                .build();
        LocalDateTime expires = LocalDateTime.now().plusMinutes(15);
        model.reserveForDraft(expires);

        assertThat(model.getStatus()).isEqualTo(AllocationSerialStatus.DRAFT_RESERVED);
        assertThat(model.getReservedAt()).isNotNull();
        assertThat(model.getReservedExpiresAt()).isEqualTo(expires);
        assertThat(model.getSoldAt()).isNull();
    }

    @Test
    void handOver_clearsReservationExpiry() {
        VendorAllocationSerialModel model = VendorAllocationSerialModel.builder()
                .ticketStatus(LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(TicketCondition.GOOD)
                .build();
        model.reserveForDraft(LocalDateTime.now().plusMinutes(10));
        model.handOver();

        assertThat(model.getStatus()).isEqualTo(AllocationSerialStatus.HANDED_OVER);
        assertThat(model.getReservedExpiresAt()).isNull();
        assertThat(model.getSoldAt()).isNull();
    }

    @Test
    void markSoldAtSettlement_setsSoldAt() {
        VendorAllocationSerialModel model = VendorAllocationSerialModel.builder()
                .ticketStatus(LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(TicketCondition.GOOD)
                .build();
        model.reserveForDraft(LocalDateTime.now().plusMinutes(10));
        model.handOver();
        model.markSoldAtSettlement();

        assertThat(model.getStatus()).isEqualTo(AllocationSerialStatus.SOLD);
        assertThat(model.getSoldAt()).isNotNull();
    }

    @Test
    void returnFromStreetAgent_setsReturnedAt() {
        VendorAllocationSerialModel model = VendorAllocationSerialModel.builder()
                .ticketStatus(LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(TicketCondition.GOOD)
                .build();
        model.reserveForDraft(LocalDateTime.now().plusMinutes(10));
        model.handOver();
        LocalDateTime returnedAt = LocalDateTime.now();
        model.returnFromStreetAgent(returnedAt);

        assertThat(model.getStatus()).isEqualTo(AllocationSerialStatus.RETURNED);
        assertThat(model.getTicketStatus()).isEqualTo(LotteryTicketSerialStatus.IN_STOCK);
        assertThat(model.getReturnedAt()).isEqualTo(returnedAt);
        assertThat(model.getReservedExpiresAt()).isNull();
    }
}
