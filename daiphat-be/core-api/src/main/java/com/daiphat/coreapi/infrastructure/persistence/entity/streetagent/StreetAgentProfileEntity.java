package com.daiphat.coreapi.infrastructure.persistence.entity.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import com.daiphat.coreapi.domain.model.enums.streetagent.VendorConfidenceTier;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "street_agent_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class StreetAgentProfileEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Target business: required 1:1 with {@link UserEntity} ({@code unique + not null}).
     * Phase 1 keeps the column optional so legacy rows / create-before-link still work;
     * after backfill and create-flow wires {@code user_id}, tighten to {@code optional = false}.
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private UserEntity user;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(nullable = false, unique = true, length = 20)
    private String phone;

    @Column(length = 20)
    private String cccd;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "cccd_front_image_url", length = 500)
    private String cccdFrontImageUrl;

    @Column(name = "cccd_back_image_url", length = 500)
    private String cccdBackImageUrl;

    @Column(name = "cccd_selfie_image_url", length = 500)
    private String cccdSelfieImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "ekyc_status", length = 32)
    private com.daiphat.coreapi.domain.model.enums.ekyc.EkycStatus ekycStatus;

    @Column(name = "ekyc_face_distance")
    private Double ekycFaceDistance;

    @Column(name = "ekyc_liveness_score")
    private Double ekycLivenessScore;

    @Column(name = "ekyc_failure_reason", length = 500)
    private String ekycFailureReason;

    @Column(name = "ekyc_ocr_name", length = 255)
    private String ekycOcrName;

    @Column(name = "ekyc_ocr_id_number", length = 64)
    private String ekycOcrIdNumber;

    @Column(name = "ekyc_ocr_dob", length = 32)
    private String ekycOcrDob;

    @Column(name = "ekyc_ocr_gender", length = 32)
    private String ekycOcrGender;

    @Column(name = "ekyc_ocr_nationality", length = 100)
    private String ekycOcrNationality;

    @Column(name = "ekyc_ocr_place_of_birth", length = 500)
    private String ekycOcrPlaceOfBirth;

    @Column(name = "ekyc_ocr_place_of_residence", length = 500)
    private String ekycOcrPlaceOfResidence;

    @Column(name = "ekyc_ocr_issue_date", length = 64)
    private String ekycOcrIssueDate;

    @Column(name = "ekyc_ocr_expiry_date", length = 64)
    private String ekycOcrExpiryDate;

    @Column(name = "ekyc_verified_at")
    private java.time.LocalDateTime ekycVerifiedAt;

    @Column(name = "contact_address", length = 255)
    private String contactAddress;

    @Column(name = "contact_province", length = 100)
    private String contactProvince;

    @Column(name = "contact_ward", length = 100)
    private String contactWard;

    @Column(name = "coverage_area", length = 255)
    private String coverageArea;

    @Column(name = "commission_rate", precision = 5, scale = 4)
    private BigDecimal commissionRate;

    @Column(name = "contract_start_date")
    private LocalDate contractStartDate;

    @Column(name = "contract_end_date")
    private LocalDate contractEndDate;

    @Column(name = "contract_code", length = 100)
    private String contractCode;

    @Column(name = "contract_document_url", length = 500)
    private String contractDocumentUrl;

    @Column(name = "contract_max_daily_cap")
    private Integer contractMaxDailyCap;

    @Column(name = "confidence_score", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal confidenceScore = new BigDecimal("25");

    @Enumerated(EnumType.STRING)
    @Column(name = "confidence_tier", nullable = false, length = 20)
    @Builder.Default
    private VendorConfidenceTier confidenceTier = VendorConfidenceTier.NEW;

    @Column(name = "confidence_calculated_at")
    private java.time.LocalDateTime confidenceCalculatedAt;

    @Column(name = "deposit_balance", nullable = false, precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal depositBalance = BigDecimal.ZERO;

    @Column(name = "deposit_adjustment_reason", columnDefinition = "TEXT")
    private String depositAdjustmentReason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StreetAgentProfileStatus status = StreetAgentProfileStatus.ACTIVE;

    public boolean hasContractInForce(LocalDate businessDate) {
        return businessDate != null && contractCode != null && !contractCode.isBlank()
                && contractStartDate != null && contractEndDate != null
                && !businessDate.isBefore(contractStartDate) && !businessDate.isAfter(contractEndDate);
    }

    public boolean hasEffectiveContract(LocalDate businessDate) {
        return hasContractInForce(businessDate) && contractMaxDailyCap != null && contractMaxDailyCap > 0;
    }
}
