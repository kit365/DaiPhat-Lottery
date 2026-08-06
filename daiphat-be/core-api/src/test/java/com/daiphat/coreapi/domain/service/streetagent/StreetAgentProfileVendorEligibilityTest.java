package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StreetAgentProfileVendorEligibilityTest {

    private static final LocalDate BUSINESS_DATE = LocalDate.of(2026, 8, 4);

    @Test
    void valid_contract_and_zero_legacy_deposit_is_eligible() {
        var profile = eligibleBuilder().build();

        assertThat(profile.isVendorAllocationEligible(BUSINESS_DATE)).isTrue();
        assertThatCode(() -> profile.requireVendorAllocationEligible(BUSINESS_DATE))
                .doesNotThrowAnyException();
    }

    @Test
    void inactive_status_throws_profile_inactive() {
        var profile = eligibleBuilder().status(StreetAgentProfileStatus.INACTIVE).build();

        assertThatThrownBy(() -> profile.requireVendorAllocationEligible(BUSINESS_DATE))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_PROFILE_INACTIVE);
    }

    @Test
    void missing_or_expired_contract_throws_contract_inactive() {
        var expired = eligibleBuilder()
                .contractStartDate(LocalDate.of(2025, 1, 1))
                .contractEndDate(LocalDate.of(2025, 12, 31))
                .build();
        var missingCode = eligibleBuilder().contractCode("  ").build();
        var missingDates = eligibleBuilder().contractStartDate(null).contractEndDate(null).build();

        assertThat(expired.isVendorAllocationEligible(BUSINESS_DATE)).isFalse();
        assertThatThrownBy(() -> expired.requireVendorAllocationEligible(BUSINESS_DATE))
                .extracting(error -> ((DomainException) error).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_CONTRACT_INACTIVE);

        assertThatThrownBy(() -> missingCode.requireVendorAllocationEligible(BUSINESS_DATE))
                .extracting(error -> ((DomainException) error).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_CONTRACT_INACTIVE);

        assertThatThrownBy(() -> missingDates.requireVendorAllocationEligible(BUSINESS_DATE))
                .extracting(error -> ((DomainException) error).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_CONTRACT_INACTIVE);
    }

    @Test
    void missing_or_non_positive_daily_cap_throws_daily_cap_missing() {
        var missingCap = eligibleBuilder().dailyTicketCap(null).build();
        var zeroCap = eligibleBuilder().dailyTicketCap(0).build();

        assertThat(missingCap.hasContractInForce(BUSINESS_DATE)).isTrue();
        assertThat(missingCap.isVendorAllocationEligible(BUSINESS_DATE)).isFalse();
        assertThatThrownBy(() -> missingCap.requireVendorAllocationEligible(BUSINESS_DATE))
                .extracting(error -> ((DomainException) error).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_DAILY_CAP_MISSING);

        assertThatThrownBy(() -> zeroCap.requireVendorAllocationEligible(BUSINESS_DATE))
                .extracting(error -> ((DomainException) error).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_DAILY_CAP_MISSING);
    }

    @Test
    void missing_signed_contract_throws_signed_contract_missing() {
        var profile = eligibleBuilder().contractDocumentUrl(null).build();
        var blank = eligibleBuilder().contractDocumentUrl("  ").build();

        assertThat(profile.isVendorAllocationEligible(BUSINESS_DATE)).isFalse();
        assertThatThrownBy(() -> profile.requireVendorAllocationEligible(BUSINESS_DATE))
                .extracting(error -> ((DomainException) error).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_SIGNED_CONTRACT_MISSING);

        assertThatThrownBy(() -> blank.requireVendorAllocationEligible(BUSINESS_DATE))
                .extracting(error -> ((DomainException) error).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_SIGNED_CONTRACT_MISSING);
    }

    @Test
    void outstanding_deposit_throws_legacy_deposit() {
        var profile = eligibleBuilder().depositBalance(new BigDecimal("100000")).build();

        assertThat(profile.isVendorAllocationEligible(BUSINESS_DATE)).isFalse();
        assertThatThrownBy(() -> profile.requireVendorAllocationEligible(BUSINESS_DATE))
                .extracting(error -> ((DomainException) error).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_LEGACY_DEPOSIT)
                .satisfies(code -> assertThat(((ErrorCode) code).getMessage())
                        .isEqualTo("Còn dư đặt cọc chưa tất toán."));
    }

    @Test
    void inactive_status_takes_precedence_over_other_failures() {
        var profile = eligibleBuilder()
                .status(StreetAgentProfileStatus.INACTIVE)
                .dailyTicketCap(null)
                .depositBalance(new BigDecimal("1"))
                .build();

        assertThatThrownBy(() -> profile.requireVendorAllocationEligible(BUSINESS_DATE))
                .extracting(error -> ((DomainException) error).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_PROFILE_INACTIVE);
    }

    private StreetAgentProfileModel.StreetAgentProfileModelBuilder eligibleBuilder() {
        return StreetAgentProfileModel.builder()
                .status(StreetAgentProfileStatus.ACTIVE)
                .contractCode("HD-001")
                .contractDocumentUrl("https://cdn.example.com/contracts/signed.pdf")
                .contractStartDate(LocalDate.of(2026, 1, 1))
                .contractEndDate(LocalDate.of(2026, 12, 31))
                .dailyTicketCap(100)
                .depositBalance(BigDecimal.ZERO);
    }
}
