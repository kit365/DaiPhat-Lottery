package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrScanResultResponse;

import java.util.List;

public interface OcrScanResultServicePort {

    /**
     * Lists staging OCR rows. At least one of {@code scanId} or {@code importBatchLineId}
     * must be provided.
     */
    List<OcrScanResultResponse> list(String scanId, Long importBatchLineId);
}
