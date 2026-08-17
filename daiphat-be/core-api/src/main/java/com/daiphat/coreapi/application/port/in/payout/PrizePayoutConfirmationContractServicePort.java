package com.daiphat.coreapi.application.port.in.payout;

import com.daiphat.coreapi.application.dto.document.ContractPdfDocument;
import com.daiphat.coreapi.application.dto.request.payout.PreviewPrizePayoutConfirmationContractRequest;

public interface PrizePayoutConfirmationContractServicePort {

    ContractPdfDocument generatePreviewPdf(PreviewPrizePayoutConfirmationContractRequest request);

    ContractPdfDocument generatePdfForRequest(Long payoutRequestId);
}
