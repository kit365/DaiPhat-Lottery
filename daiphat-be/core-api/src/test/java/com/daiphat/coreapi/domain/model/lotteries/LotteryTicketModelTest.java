package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

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

        ticket.syncAggregateState(0, 5, 5, 0, LocalTime.of(16, 15));

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

        ticket.syncAggregateState(0, 3, 1, 0, LocalTime.of(16, 15));

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

        ticket.syncAggregateState(0, 2, 2, 0, LocalTime.of(16, 15));

        assertThat(ticket.getStatus()).isEqualTo(LotteryTicketStatus.SOLD_OUT);
        assertThat(ticket.getQuantity()).isEqualTo(2);
    }

    @Test
    @DisplayName("syncAggregateState: SOLD_OUT khi tất cả sê-ri đã báo hỏng hoặc mất")
    void syncAggregateState_allSerialsFaulty_becomesSoldOutWithReason() {
        LotteryTicketModel ticket = LotteryTicketModel.builder()
                .status(LotteryTicketStatus.IN_STOCK)
                .drawDate(LocalDate.now().plusDays(1))
                .build();

        ticket.syncAggregateState(0, 10, 0, 10, LocalTime.of(16, 15));

        assertThat(ticket.getStatus()).isEqualTo(LotteryTicketStatus.SOLD_OUT);
        assertThat(ticket.getQuantity()).isEqualTo(10);
        assertThat(ticket.getStatusReason()).isEqualTo(LotteryTicketModel.ALL_SERIALS_FAULTY_STATUS_REASON);
    }

    @Test
    @DisplayName("syncAggregateState: Giữ IN_STOCK khi còn sê-ri chưa báo hỏng/mất")
    void syncAggregateState_partialFaulty_staysInStock() {
        LotteryTicketModel ticket = LotteryTicketModel.builder()
                .status(LotteryTicketStatus.IN_STOCK)
                .drawDate(LocalDate.now().plusDays(1))
                .build();

        ticket.syncAggregateState(0, 10, 0, 9, LocalTime.of(16, 15));

        assertThat(ticket.getStatus()).isEqualTo(LotteryTicketStatus.IN_STOCK);
        assertThat(ticket.getStatusReason()).isNull();
    }

    @Test
    @DisplayName("syncAggregateState: Ghi lý do hủy dãy từ lý do của các sê-ri khi tất cả đã báo sự cố")
    void syncAggregateState_allSerialsFaulty_storesProvidedReason() {
        LotteryTicketModel ticket = LotteryTicketModel.builder()
                .status(LotteryTicketStatus.IN_STOCK)
                .drawDate(LocalDate.now().plusDays(1))
                .build();
        String reason = LotteryTicketModel.buildAllSerialsFaultyReason(List.of(
                faultySerial(TicketCondition.DAMAGED, "Rách góc"),
                faultySerial(TicketCondition.DAMAGED, "Rách góc")));

        ticket.syncAggregateState(0, 2, 0, 2, LocalTime.of(16, 15), reason);

        assertThat(ticket.getStatus()).isEqualTo(LotteryTicketStatus.SOLD_OUT);
        assertThat(ticket.getStatusReason()).isEqualTo(reason);
    }

    @Test
    @DisplayName("syncAggregateState: Xóa lý do hủy do hệ thống ghi khi dãy không còn toàn bộ sê-ri lỗi")
    void syncAggregateState_notAllFaulty_clearsSystemReasonOnly() {
        LotteryTicketModel systemReasonTicket = LotteryTicketModel.builder()
                .status(LotteryTicketStatus.SOLD_OUT)
                .drawDate(LocalDate.now().plusDays(1))
                .statusReason(LotteryTicketModel.ALL_SERIALS_FAULTY_REASON_PREFIX + "toàn bộ 2 sê-ri được báo Vé thất lạc.")
                .build();
        LotteryTicketModel manualReasonTicket = LotteryTicketModel.builder()
                .status(LotteryTicketStatus.IN_STOCK)
                .drawDate(LocalDate.now().plusDays(1))
                .statusReason("Ghi chú thủ công")
                .build();

        systemReasonTicket.syncAggregateState(1, 2, 0, 1, LocalTime.of(16, 15), null);
        manualReasonTicket.syncAggregateState(1, 2, 0, 1, LocalTime.of(16, 15), null);

        assertThat(systemReasonTicket.getStatusReason()).isNull();
        assertThat(manualReasonTicket.getStatusReason()).isEqualTo("Ghi chú thủ công");
    }

    @Test
    @DisplayName("buildAllSerialsFaultyReason: Một nhóm lý do dùng chung cho toàn bộ sê-ri")
    void buildAllSerialsFaultyReason_singleGroup() {
        String reason = LotteryTicketModel.buildAllSerialsFaultyReason(List.of(
                faultySerial(TicketCondition.DAMAGED, "Rách góc"),
                faultySerial(TicketCondition.DAMAGED, " Rách góc ")));

        assertThat(reason).isEqualTo("Dãy vé đã hủy: toàn bộ 2 sê-ri được báo Vé hỏng / rách: Rách góc.");
    }

    @Test
    @DisplayName("buildAllSerialsFaultyReason: Nhiều nhóm lý do được liệt kê kèm số sê-ri")
    void buildAllSerialsFaultyReason_mixedGroups() {
        String reason = LotteryTicketModel.buildAllSerialsFaultyReason(List.of(
                faultySerial(TicketCondition.DAMAGED, "Rách góc"),
                faultySerial(TicketCondition.DAMAGED, "Rách góc"),
                faultySerial(TicketCondition.LOST, null)));

        assertThat(reason).isEqualTo(
                "Dãy vé đã hủy: toàn bộ 3 sê-ri được báo sự cố - Vé hỏng / rách: Rách góc (2 sê-ri); Vé thất lạc (1 sê-ri).");
    }

    @Test
    @DisplayName("buildAllSerialsFaultyReason: Cắt ngắn trong giới hạn 500 ký tự")
    void buildAllSerialsFaultyReason_truncatesToColumnLength() {
        String reason = LotteryTicketModel.buildAllSerialsFaultyReason(List.of(
                faultySerial(TicketCondition.DAMAGED, "a".repeat(400)),
                faultySerial(TicketCondition.LOST, "b".repeat(400))));

        assertThat(reason).hasSize(500).endsWith("...");
        assertThat(LotteryTicketModel.buildAllSerialsFaultyReason(List.of())).isNull();
    }

    private static LotteryTicketSerialModel faultySerial(TicketCondition condition, String reason) {
        return LotteryTicketSerialModel.builder()
                .ticketCondition(condition)
                .damagedReason(reason)
                .build();
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
