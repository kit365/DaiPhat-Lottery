package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialFaultedBy;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LotteryTicketSerialFaultTest {

    @Test
    @DisplayName("markDamaged allows IN_STOCK serial — sets condition, keeps IN_STOCK")
    void markDamaged_allowsInStock() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(TicketCondition.GOOD)
                .build();

        serial.markDamaged(LotteryTicketSerialFaultedBy.INTERNAL_FAULT, "Vé rách");

        assertThat(serial.getStatus()).isEqualTo(LotteryTicketSerialStatus.IN_STOCK);
        assertThat(serial.getTicketCondition()).isEqualTo(TicketCondition.DAMAGED);
        assertThat(serial.isAvailableForSale()).isFalse();
    }

    @Test
    @DisplayName("markDamaged allows RESERVED serial — returns to IN_STOCK with DAMAGED condition")
    void markDamaged_allowsReserved() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.RESERVED)
                .ticketCondition(TicketCondition.GOOD)
                .build();

        serial.markDamaged(LotteryTicketSerialFaultedBy.INTERNAL_FAULT, "Vé rách");

        assertThat(serial.getStatus()).isEqualTo(LotteryTicketSerialStatus.IN_STOCK);
        assertThat(serial.getTicketCondition()).isEqualTo(TicketCondition.DAMAGED);
    }

    @Test
    @DisplayName("markLost allows RESERVED serial")
    void markLost_fromReserved() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.RESERVED)
                .ticketCondition(TicketCondition.GOOD)
                .damagedEvidenceUrl("https://example.com/old.jpg")
                .build();

        serial.markLost(LotteryTicketSerialFaultedBy.INTERNAL_FAULT, "Thất lạc");

        assertThat(serial.getStatus()).isEqualTo(LotteryTicketSerialStatus.IN_STOCK);
        assertThat(serial.getTicketCondition()).isEqualTo(TicketCondition.LOST);
        assertThat(serial.getFaultedBy()).isEqualTo(LotteryTicketSerialFaultedBy.INTERNAL_FAULT);
        assertThat(serial.getDamagedEvidenceUrl()).isNull();
    }

    @Test
    @DisplayName("markDamaged allows SOLD serial")
    void markDamaged_allowsSoldSerial() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.SOLD)
                .ticketCondition(TicketCondition.GOOD)
                .build();

        serial.markDamaged(LotteryTicketSerialFaultedBy.INTERNAL_FAULT, "Vé rách");

        assertThat(serial.getStatus()).isEqualTo(LotteryTicketSerialStatus.SOLD);
        assertThat(serial.getTicketCondition()).isEqualTo(TicketCondition.DAMAGED);
    }

    @Test
    @DisplayName("markDamaged allows legacy premature SOLD serial for order inspection")
    void markDamaged_allowsSoldForOrderInspectionBackCompat() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.SOLD)
                .ticketCondition(TicketCondition.GOOD)
                .build();

        serial.markDamaged(LotteryTicketSerialFaultedBy.INTERNAL_FAULT, "Vé rách khi kiểm tra đơn");

        assertThat(serial.getStatus()).isEqualTo(LotteryTicketSerialStatus.SOLD);
        assertThat(serial.getTicketCondition()).isEqualTo(TicketCondition.DAMAGED);
    }

    @Test
    @DisplayName("sellOnline moves RESERVED to SOLD and clears the reservation")
    void sellOnline_fromReserved() {
        UUID orderId = UUID.randomUUID();
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.RESERVED)
                .ticketCondition(TicketCondition.GOOD)
                .build();

        serial.setReservedByOrderId(orderId);
        serial.sellOnline();

        assertThat(serial.getStatus()).isEqualTo(LotteryTicketSerialStatus.SOLD);
        assertThat(serial.getReservedByOrderId()).isNull();
    }

    @Test
    @DisplayName("sellOnline accepts SOLD")
    void sellOnline_fromProxyHolding() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.SOLD)
                .ticketCondition(TicketCondition.GOOD)
                .reservedByOrderId(UUID.randomUUID())
                .build();

        serial.sellOnline();

        assertThat(serial.getStatus()).isEqualTo(LotteryTicketSerialStatus.SOLD);
        assertThat(serial.getReservedByOrderId()).isNull();
    }

    @Test
    @DisplayName("sellOnline is idempotent when already SOLD")
    void sellOnline_alreadySold_isNoOp() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.SOLD)
                .build();

        serial.sellOnline();

        assertThat(serial.getStatus()).isEqualTo(LotteryTicketSerialStatus.SOLD);
    }

    @Test
    @DisplayName("markDamaged requires faultedBy")
    void markDamaged_requiresFaultedBy() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.IN_STOCK)
                .build();

        assertThatThrownBy(() -> serial.markDamaged(null, "reason"))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("markDamaged rejects already expired serial")
    void markDamaged_rejectsExpired() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.EXPIRED)
                .build();

        assertThatThrownBy(() -> serial.markDamaged(LotteryTicketSerialFaultedBy.INTERNAL_FAULT, "x"))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }

    @Test
    @DisplayName("isAvailableForSale requires IN_STOCK + GOOD + unlinked")
    void isAvailableForSale_requiresAllGates() {
        LotteryTicketSerialModel ok = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(TicketCondition.GOOD)
                .build();
        assertThat(ok.isAvailableForSale()).isTrue();

        LotteryTicketSerialModel linked = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(TicketCondition.GOOD)
                .returnBatchLineId(9L)
                .build();
        assertThat(linked.isAvailableForSale()).isFalse();
    }

    @Test
    @DisplayName("markVoided sets ticketCondition VOIDED and keeps IN_STOCK")
    void markVoided_setsConditionNotStatus() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(TicketCondition.GOOD)
                .build();

        serial.markVoided(LotteryTicketSerialFaultedBy.DATA_ENTRY_FAULT, "Nhập sai số");

        assertThat(serial.getStatus()).isEqualTo(LotteryTicketSerialStatus.IN_STOCK);
        assertThat(serial.getTicketCondition()).isEqualTo(TicketCondition.VOIDED);
        assertThat(serial.isAvailableForSale()).isFalse();
        assertThat(serial.isVoided()).isTrue();
        assertThat(serial.isVisibleInventory()).isFalse();
        assertThat(serial.isTerminalIncidentStatus()).isTrue();
    }

    @Test
    @DisplayName("expire skips VOIDED serials so replaced tickets are not processed")
    void expire_skipsVoided() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(TicketCondition.VOIDED)
                .build();

        serial.expire();

        assertThat(serial.getStatus()).isEqualTo(LotteryTicketSerialStatus.IN_STOCK);
        assertThat(serial.getTicketCondition()).isEqualTo(TicketCondition.VOIDED);
    }

    @Test
    @DisplayName("expire leaves SOLD serials unchanged so prize claims keep ownership")
    void expire_skipsSold() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.SOLD)
                .ticketCondition(TicketCondition.GOOD)
                .build();

        serial.expire();

        assertThat(serial.getStatus()).isEqualTo(LotteryTicketSerialStatus.SOLD);
    }

    @Test
    @DisplayName("reassignToTicket updates ticketId and clears replacedForTicketId")
    void reassignToTicket_movesSerialWithoutClone() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .id(10L)
                .ticketId(1L)
                .stationId(5L)
                .serialNumber("SN-1")
                .status(LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(TicketCondition.GOOD)
                .replacedForTicketId(99L)
                .build();

        serial.reassignToTicket(2L, 5L, java.time.LocalDate.of(2026, 8, 17));

        assertThat(serial.getTicketId()).isEqualTo(2L);
        assertThat(serial.getSerialNumber()).isEqualTo("SN-1");
        assertThat(serial.getTicketCondition()).isEqualTo(TicketCondition.GOOD);
        assertThat(serial.getReplacedForTicketId()).isNull();
    }
}
