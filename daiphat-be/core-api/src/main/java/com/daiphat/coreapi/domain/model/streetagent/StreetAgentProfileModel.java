package com.daiphat.coreapi.domain.model.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class StreetAgentProfileModel {
    private Long id;
    private String firstName;
    private String lastName;
    private String phone;
    private String cccd;
    private String imageUrl;
    private String contactAddress;
    private String contactProvince;
    private String coverageArea;
    private BigDecimal commissionRate;
    private LocalDate contractStartDate;
    private LocalDate contractEndDate;
    private BigDecimal depositBalance;
    private String depositAdjustmentReason;
    private StreetAgentProfileStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
}
