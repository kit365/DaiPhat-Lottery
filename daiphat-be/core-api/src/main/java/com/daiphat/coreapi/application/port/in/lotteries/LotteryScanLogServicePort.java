package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scanlog.LotteryScanLogResponse;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanEventType;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanMethod;
import com.daiphat.coreapi.domain.model.lotteries.LotteryScanLogModel;

import java.time.LocalDate;
import java.util.UUID;

public interface LotteryScanLogServicePort {

    /**
     * Appends one Lottery_Scan_Log row. Called by other services as a side
     * effect of a scan/verify step -- never fails the caller's own
     * transaction; logging failures are swallowed and reported, not thrown
     * (see {@link com.daiphat.coreapi.application.service.lotteries.LotteryScanLogService}).
     *
     * @param ocrScanResultId       nullable -- only set for OCR-sourced events
     * @param lotteryTicketSerialId nullable -- not every event resolves to a known physical ticket yet
     * @param scanMethod            nullable
     * @param isValid               nullable
     * @param note                  nullable
     */
    LotteryScanLogModel recordEvent(
            ScanEventType eventType,
            Long ocrScanResultId,
            Long lotteryTicketSerialId,
            UUID scannedBy,
            ScanMethod scanMethod,
            Boolean isValid,
            String note
    );

    PageResponse<LotteryScanLogResponse> getAll(
            int page,
            int size,
            ScanEventType eventType,
            Long lotteryTicketSerialId,
            UUID scannedBy,
            LocalDate scannedAtFrom,
            LocalDate scannedAtTo,
            String sortBy,
            String direction
    );
}
