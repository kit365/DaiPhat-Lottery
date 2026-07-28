package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("[DP-325] LotteryTicketModel aggregate status")
class LotteryTicketModelTest {

    @Test
    @DisplayName("[DP-325] syncAggregateState: Giữ IMPORTING khi chưa qua cutoff")
    void syncAggregateState_keepsImportingWhenNotPastCutoff() {
        LotteryTicketModel ticket = LotteryTicketModel.builder()
                .status(LotteryTicketStatus.IMPORTING)
                .drawDate(LocalDate.now().plusDays(1))
                .quantity(0)
                .build();

        ticket.syncAggregateState(0, 5, 5, LocalTime.of(16, 15));

        assertThat(ticket.getQuantity()).isEqualTo(5);
        assertThat(ticket.getStatus()).isEqualTo(LotteryTicketStatus.IMPORTING);
    }

    @Test
    @DisplayName("[DP-325] syncAggregateState: Thoát IMPORTING sang EXPIRED khi đã qua cutoff")
    void syncAggregateState_exitsImportingWhenExpired() {
        LotteryTicketModel ticket = LotteryTicketModel.builder()
                .status(LotteryTicketStatus.IMPORTING)
                .drawDate(LocalDate.now().minusDays(1))
                .quantity(0)
                .build();

        ticket.syncAggregateState(0, 3, 1, LocalTime.of(16, 15));

        assertThat(ticket.getQuantity()).isEqualTo(3);
        assertThat(ticket.getStatus()).isEqualTo(LotteryTicketStatus.EXPIRED);
    }

    @Test
    @DisplayName("[DP-325] syncAggregateState: Tính lại trạng thái khi không phải IMPORTING")
    void syncAggregateState_recomputesWhenNotImporting() {
        LotteryTicketModel ticket = LotteryTicketModel.builder()
                .status(LotteryTicketStatus.IN_STOCK)
                .drawDate(LocalDate.now().plusDays(1))
                .build();

        ticket.syncAggregateState(0, 2, 2, LocalTime.of(16, 15));

        assertThat(ticket.getStatus()).isEqualTo(LotteryTicketStatus.SOLD_OUT);
        assertThat(ticket.getQuantity()).isEqualTo(2);
    }

    @Test
    @DisplayName("[DP-325] isEditableStatus: Chỉ IMPORTING và IN_STOCK")
    void isEditableStatus_onlyImportingAndInStock() {
        assertThat(ticketWith(LotteryTicketStatus.IN_STOCK).isEditableStatus()).isTrue();
        assertThat(ticketWith(LotteryTicketStatus.IMPORTING).isEditableStatus()).isTrue();
        assertThat(ticketWith(LotteryTicketStatus.SOLD_OUT).isEditableStatus()).isFalse();
        assertThat(ticketWith(LotteryTicketStatus.EXPIRED).isEditableStatus()).isFalse();
    }

    @Test
    @DisplayName("[DP-325] isSoftDeletableStatus: IN_STOCK, IMPORTING, EXPIRED")
    void isSoftDeletableStatus_allowedStatuses() {
        assertThat(ticketWith(LotteryTicketStatus.IN_STOCK).isSoftDeletableStatus()).isTrue();
        assertThat(ticketWith(LotteryTicketStatus.IMPORTING).isSoftDeletableStatus()).isTrue();
        assertThat(ticketWith(LotteryTicketStatus.EXPIRED).isSoftDeletableStatus()).isTrue();
        assertThat(ticketWith(LotteryTicketStatus.SOLD_OUT).isSoftDeletableStatus()).isFalse();
    }

    private static LotteryTicketModel ticketWith(LotteryTicketStatus status) {
        return LotteryTicketModel.builder().status(status).build();
    }
}
