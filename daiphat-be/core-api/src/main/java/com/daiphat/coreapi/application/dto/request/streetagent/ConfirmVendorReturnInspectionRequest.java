package com.daiphat.coreapi.application.dto.request.streetagent;

import java.util.List;

/** Staged serials not listed here are accepted; listed serials are charged to the vendor. */
public record ConfirmVendorReturnInspectionRequest(
        List<RejectedVendorReturnSerialRequest> rejectedSerials,
        String note
) {
}
