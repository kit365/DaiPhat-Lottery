package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LotteryTicketSerialPayoutLockTest {

    @Test
    void sellOnline_blockedWhenPayoutPending() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .status(LotteryTicketSerialStatus.PROXY_HOLDING)
                .payoutState(SerialPayoutState.PAYOUT_PENDING)
                .build();

        DomainException ex = assertThrows(DomainException.class, serial::sellOnline);
        assertEquals(ErrorCode.PRIZE_PAYOUT_BLOCKS_PICKUP, ex.getErrorCode());
    }
}
