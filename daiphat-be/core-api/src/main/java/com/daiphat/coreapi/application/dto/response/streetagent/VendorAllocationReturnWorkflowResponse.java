package com.daiphat.coreapi.application.dto.response.streetagent;

/** Read model for the physical return workflow; clients must not infer it from batch status. */
public record VendorAllocationReturnWorkflowResponse(
        Long returnBatchId,
        String returnBatchStatus,
        String stage,
        int handedOverQuantity,
        int pendingInspectionQuantity,
        int acceptedReturnQuantity,
        int rejectedReturnQuantity,
        int unreturnedQuantity,
        boolean canEditReturns,
        boolean canConfirmInspection,
        boolean canConfirmNoReturn,
        boolean canPreviewSettlement,
        boolean canSettle,
        boolean canReopenInspection
) {
}
