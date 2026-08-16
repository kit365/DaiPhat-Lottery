package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LotteryTicketSerialReturnToStockTest {

    @Test
    @DisplayName("returnSoldToStock: PROXY_HOLDING after PayOS can return to IN_STOCK")
    void returnSoldToStock_proxyHolding() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.PROXY_HOLDING)
                .build();

        serial.returnSoldToStock();

        assertThat(serial.getStatus()).isEqualTo(LotteryTicketSerialStatus.IN_STOCK);
        assertThat(serial.getReservedByOrderId()).isNull();
    }

    @Test
    @DisplayName("returnSoldToStock: SOLD still returns to IN_STOCK")
    void returnSoldToStock_sold() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.SOLD)
                .build();

        serial.returnSoldToStock();

        assertThat(serial.getStatus()).isEqualTo(LotteryTicketSerialStatus.IN_STOCK);
    }

    @Test
    @DisplayName("returnSoldToStock: EXPIRED is rejected")
    void returnSoldToStock_expiredRejected() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.EXPIRED)
                .build();

        assertThatThrownBy(serial::returnSoldToStock)
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }
}
