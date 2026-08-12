package com.daiphat.coreapi.application.dto.response.streetagent;

import java.time.LocalDate;

public record VendorAllocationBatchDetailResponse(
        Long stationId,
        LocalDate drawDate,
        int allocatedQuantity,
        int returnedQuantity,
        int soldQuantity
) {
}
