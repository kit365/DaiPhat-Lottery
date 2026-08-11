package com.daiphat.coreapi.domain.model.streetagent;

import lombok.*;
import java.time.LocalDate;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class VendorAllocationBatchDetailModel {
    private Long id;
    private Long stationId;
    private LocalDate drawDate;
    private int allocatedQuantity;
    private int returnedQuantity;
    private int soldQuantity;
    private Integer eligibleQuantitySnapshot;
    private Integer agencyReserveQuantitySnapshot;
    private Integer vendorCapacitySnapshot;
}
