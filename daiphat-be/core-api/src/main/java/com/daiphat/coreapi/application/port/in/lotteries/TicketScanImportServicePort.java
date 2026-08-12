package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.scan.BatchImportScannedTicketsRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.ScanBatchImportResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.TicketScanResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface TicketScanImportServicePort {

    /**
     * Calls ticket-vision, then runs Layer-2 business validation against
     * the given import batch line's station/draw date. Nothing is
     * persisted -- doc section 4: "Returns scan results (without saving)".
     */
    TicketScanResponse scan(Long importBatchLineId, MultipartFile file, UUID operatorId);

    /**
     * Persists the mobile user's confirmed/corrected tickets against the
     * given import batch line. Each ticket is imported independently, so
     * one duplicate or invalid ticket doesn't block the rest of the batch.
     */
    ScanBatchImportResponse batchImport(BatchImportScannedTicketsRequest request, UUID importedById);
}
