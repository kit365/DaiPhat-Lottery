package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PrizePayoutSerialLockService {

    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;

    @Transactional
    public void lockSerial(Long serialId) {
        LotteryTicketSerialModel serial = lotteryTicketSerialRepositoryPort.findById(serialId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
        serial.lockForPayout();
        lotteryTicketSerialRepositoryPort.save(serial);
    }

    @Transactional
    public void unlockSerial(Long serialId) {
        if (serialId == null) {
            return;
        }
        lotteryTicketSerialRepositoryPort.findById(serialId).ifPresent(serial -> {
            serial.unlockPayout();
            lotteryTicketSerialRepositoryPort.save(serial);
        });
    }

    @Transactional
    public void markPaidOut(Long serialId) {
        LotteryTicketSerialModel serial = lotteryTicketSerialRepositoryPort.findById(serialId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
        serial.markPaidOut();
        lotteryTicketSerialRepositoryPort.save(serial);
    }
}
