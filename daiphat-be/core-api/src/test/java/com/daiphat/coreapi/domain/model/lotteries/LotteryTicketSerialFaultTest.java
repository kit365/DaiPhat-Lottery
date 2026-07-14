package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialFaultedBy;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LotteryTicketSerialFaultTest {

    @Test
    @DisplayName("markDamaged sets DAMAGED + faultedBy and clears reservation")
    void markDamaged_fromSold() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.SOLD)
                .build();

        serial.markDamaged(LotteryTicketSerialFaultedBy.INTERNAL_FAULT, "Vé rách", "https://example.com/evidence.jpg");

        assertThat(serial.getStatus()).isEqualTo(LotteryTicketSerialStatus.DAMAGED);
        assertThat(serial.getFaultedBy()).isEqualTo(LotteryTicketSerialFaultedBy.INTERNAL_FAULT);
        assertThat(serial.getDamagedReason()).isEqualTo("Vé rách");
        assertThat(serial.getDamagedEvidenceUrl()).isEqualTo("https://example.com/evidence.jpg");
        assertThat(serial.isSoftDeletableStatus()).isTrue();
    }

    @Test
    @DisplayName("markLost sets LOST + faultedBy and clears evidence")
    void markLost_fromSold() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.SOLD)
                .damagedEvidenceUrl("https://example.com/old.jpg")
                .build();

        serial.markLost(LotteryTicketSerialFaultedBy.INTERNAL_FAULT, "Thất lạc");

        assertThat(serial.getStatus()).isEqualTo(LotteryTicketSerialStatus.LOST);
        assertThat(serial.getFaultedBy()).isEqualTo(LotteryTicketSerialFaultedBy.INTERNAL_FAULT);
        assertThat(serial.getDamagedEvidenceUrl()).isNull();
    }

    @Test
    @DisplayName("markDamaged requires faultedBy")
    void markDamaged_requiresFaultedBy() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.SOLD)
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
}
