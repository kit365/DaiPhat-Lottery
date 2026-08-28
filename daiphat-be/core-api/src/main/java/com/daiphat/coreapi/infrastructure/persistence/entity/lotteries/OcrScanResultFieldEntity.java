package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrFieldValidationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.lotteries.OcrBoundingBox;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "ocr_scan_result_fields")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OcrScanResultFieldEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ocr_scan_result_id", nullable = false)
    private Long ocrScanResultId;

    @Enumerated(EnumType.STRING)
    @Column(name = "field_name", nullable = false, length = 50)
    private OcrTemplateFieldName fieldName;

    @Column(name = "ai_value", columnDefinition = "TEXT")
    private String aiValue;

    @Column(name = "ai_confidence")
    private Double aiConfidence;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "detected_bounding_box", columnDefinition = "jsonb")
    private OcrBoundingBox detectedBoundingBox;

    @Column(name = "corrected_value", columnDefinition = "TEXT")
    private String correctedValue;

    @Column(name = "is_corrected", nullable = false)
    private boolean corrected;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "corrected_by")
    private UserEntity correctedBy;

    @Column(name = "corrected_at")
    private LocalDateTime correctedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", length = 20)
    private OcrFieldValidationStatus validationStatus;

    @Column(name = "validation_message", length = 500)
    private String validationMessage;

    @Column(name = "expected_value", columnDefinition = "TEXT")
    private String expectedValue;

    /** Which ocr_field_layouts row produced the recognized ai_value (nullable). */
    @Column(name = "field_layout_id")
    private Long fieldLayoutId;
}
