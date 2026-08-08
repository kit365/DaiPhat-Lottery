package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ScanEventType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryScanLogModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.UUID;

public interface LotteryScanLogRepositoryPort {

    LotteryScanLogModel save(LotteryScanLogModel model);

    Page<LotteryScanLogModel> findAll(
            Pageable pageable,
            ScanEventType eventType,
            Long lotteryTicketSerialId,
            UUID scannedBy,
            LocalDate scannedAtFrom,
            LocalDate scannedAtTo
    );
}
