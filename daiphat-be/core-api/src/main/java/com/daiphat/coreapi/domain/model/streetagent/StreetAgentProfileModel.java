package com.daiphat.coreapi.domain.model.streetagent;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import com.daiphat.coreapi.domain.model.enums.streetagent.VendorConfidenceTier;
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
    private String contractCode;
    private String contractDocumentUrl;
    private Integer dailyTicketCap;
    @Builder.Default
    private BigDecimal confidenceScore = new BigDecimal("25");
    @Builder.Default
    private VendorConfidenceTier confidenceTier = VendorConfidenceTier.NEW;
    private LocalDateTime confidenceCalculatedAt;
    private BigDecimal depositBalance;
    private String depositAdjustmentReason;
    private StreetAgentProfileStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    public boolean isDeleted() {
        return this.deletedAt != null;
    }

    /**
     * Operational readiness for vendor allocation (excludes explicit INACTIVE status,
     * which is enforced separately in {@link #requireVendorAllocationEligible}).
     * Legacy deposit is checked separately in the allocation service after open-batch gate.
     */
    public boolean isVendorAllocationEligible(LocalDate businessDate) {
        return hasContractInForce(businessDate)
                && hasSignedContractDocument()
                && hasValidDailyTicketCap()
                && hasClearedLegacyDeposit();
    }

    /** Contract number + date window covers {@code businessDate}. Does not include dailyTicketCap. */
    public boolean hasContractInForce(LocalDate businessDate) {
        return businessDate != null
                && contractCode != null && !contractCode.isBlank()
                && contractStartDate != null && contractEndDate != null
                && !businessDate.isBefore(contractStartDate)
                && !businessDate.isAfter(contractEndDate);
    }

    /** Signed contract scan/PDF must be stored before the vendor can receive tickets. */
    public boolean hasSignedContractDocument() {
        return contractDocumentUrl != null && !contractDocumentUrl.isBlank();
    }

    public boolean hasValidDailyTicketCap() {
        return dailyTicketCap != null && dailyTicketCap > 0;
    }

    /**
     * True when profile has no leftover deposit. Call this only after confirming there is
     * no open allocation batch — held deposit from CONFIRMED/RETURN_OPEN is expected.
     */
    public boolean hasClearedLegacyDeposit() {
        return depositBalance == null || depositBalance.compareTo(BigDecimal.ZERO) == 0;
    }

    /** @deprecated Prefer {@link #hasContractInForce} + {@link #hasValidDailyTicketCap}. */
    public boolean hasEffectiveContract(LocalDate businessDate) {
        return hasContractInForce(businessDate) && hasValidDailyTicketCap();
    }

    /**
     * Prerequisites for starting vendor allocation, excluding legacy-deposit check.
     * Order: inactive → contract → signed document → dailyTicketCap.
     */
    public void requireVendorAllocationPrerequisites(LocalDate businessDate) {
        if (status == StreetAgentProfileStatus.INACTIVE) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_PROFILE_INACTIVE);
        }
        if (!hasContractInForce(businessDate)) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_CONTRACT_INACTIVE);
        }
        if (!hasSignedContractDocument()) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SIGNED_CONTRACT_MISSING);
        }
        if (!hasValidDailyTicketCap()) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_DAILY_CAP_MISSING);
        }
    }

    /**
     * Throws the specific eligibility ErrorCode for the first failed check.
     * Order: prerequisites → outstanding legacy deposit (no open batch assumed by caller).
     */
    public void requireVendorAllocationEligible(LocalDate businessDate) {
        requireVendorAllocationPrerequisites(businessDate);
        if (!hasClearedLegacyDeposit()) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_LEGACY_DEPOSIT);
        }
    }
}
