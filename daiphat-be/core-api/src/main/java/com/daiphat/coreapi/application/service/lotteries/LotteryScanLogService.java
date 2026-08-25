package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scanlog.LotteryScanLogResponse;
import com.daiphat.coreapi.application.mapper.lotteries.LotteryScanLogApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryScanLogServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryScanLogRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanEventType;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanMethod;
import com.daiphat.coreapi.domain.model.lotteries.LotteryScanLogModel;
import com.daiphat.coreapi.shared.util.SortUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Lottery_Scan_Log: audit trail of ticket scan/verify events (DP-269
 * follow-up). Deliberately kept separate from a general-purpose Audit_Log
 * -- faster reporting queries, scan-specific columns (scanMethod, isValid),
 * no extra weight on Audit_Log.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LotteryScanLogService implements LotteryScanLogServicePort {

    private final LotteryScanLogRepositoryPort lotteryScanLogRepositoryPort;
    private final LotteryScanLogApplicationMapper lotteryScanLogApplicationMapper;

    /**
     * REQUIRES_NEW so a scan-log write always commits (or fails) independently
     * of the caller's own transaction -- an audit-trail write must never roll
     * back, or be rolled back by, the business operation it's describing.
     * Any failure is caught and logged, never propagated: recording history
     * is a side effect, not a precondition, for the scan/import flow to succeed.
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public LotteryScanLogModel recordEvent(
            ScanEventType eventType,
            Long ocrScanResultId,
            Long lotteryTicketSerialId,
            UUID scannedBy,
            ScanMethod scanMethod,
            Boolean isValid,
            String note
    ) {
        try {
            LotteryScanLogModel model = LotteryScanLogModel.builder()
                    .eventType(eventType)
                    .ocrScanResultId(ocrScanResultId)
                    .lotteryTicketSerialId(lotteryTicketSerialId)
                    .scannedBy(scannedBy)
                    .scanMethod(scanMethod)
                    .isValid(isValid)
                    .note(note)
                    .scannedAt(LocalDateTime.now())
                    .build();
            return lotteryScanLogRepositoryPort.save(model);
        } catch (Exception e) {
            log.error(
                    "Failed to record scan log event {} (ocrScanResultId={}, lotteryTicketSerialId={}, scannedBy={})",
                    eventType, ocrScanResultId, lotteryTicketSerialId, scannedBy, e
            );
            return null;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<LotteryScanLogResponse> getAll(
            int page,
            int size,
            ScanEventType eventType,
            Long lotteryTicketSerialId,
            Long ocrScanResultId,
            UUID scannedBy,
            LocalDate scannedAtFrom,
            LocalDate scannedAtTo,
            String sortBy,
            String direction
    ) {
        PageRequest pageable = PageRequest.of(
                Math.max(0, page - 1),
                size,
                SortUtils.createSort(sortBy, direction)
        );

        var logPage = lotteryScanLogRepositoryPort.findAll(
                pageable, eventType, lotteryTicketSerialId, ocrScanResultId, scannedBy, scannedAtFrom, scannedAtTo
        ).map(lotteryScanLogApplicationMapper::toResponse);

        return PageResponse.from(logPage, page, size);
    }
}
