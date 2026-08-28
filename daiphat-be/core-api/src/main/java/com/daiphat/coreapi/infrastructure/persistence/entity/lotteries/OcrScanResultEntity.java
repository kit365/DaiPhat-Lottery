package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrOverallValidationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ScannedTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.OcrBoundingBox;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldValidation;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "ocr_scan_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OcrScanResultEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "scan_id", nullable = false, length = 100)
    private String scanId;

    @Column(name = "ticket_index", nullable = false)
    private int ticketIndex;

    @Column(name = "import_batch_line_id")
    private Long importBatchLineId;

    @Column(name = "station_id")
    private Long stationId;

    @Column(name = "template_id")
    private Long templateId;

    @Column(name = "ai_model_id")
    private Long aiModelId;

    @Column(name = "source_image_name", length = 255)
    private String sourceImageName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "bbox", columnDefinition = "jsonb")
    private OcrBoundingBox bbox;

    @Column(name = "image_width")
    private Integer imageWidth;

    @Column(name = "image_height")
    private Integer imageHeight;

    @Column(name = "extracted_station_name", length = 255)
    private String extractedStationName;

    @Column(name = "extracted_serial_number", length = 100)
    private String extractedSerialNumber;

    @Column(name = "extracted_numbers", length = 50)
    private String extractedNumbers;

    @Column(name = "extracted_draw_date")
    private LocalDate extractedDrawDate;

    @Column(name = "extracted_batch_code", length = 100)
    private String extractedBatchCode;

    @Column(name = "extracted_price", length = 50)
    private String extractedPrice;

    @Column(name = "confidence")
    private double confidence;

    @Column(name = "adjusted_confidence")
    private Double adjustedConfidence;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "field_confidences", columnDefinition = "jsonb")
    private Map<String, Double> fieldConfidences;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "field_boxes", columnDefinition = "jsonb")
    private Map<String, OcrBoundingBox> fieldBoxes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "used_field_layouts", columnDefinition = "jsonb")
    private Map<String, Long> usedFieldLayouts;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "field_validations", columnDefinition = "jsonb")
    private Map<String, OcrFieldValidation> fieldValidations;

    @Enumerated(EnumType.STRING)
    @Column(name = "overall_validation_status", length = 20)
    private OcrOverallValidationStatus overallValidationStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private ScannedTicketStatus status;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "missing_fields", columnDefinition = "jsonb")
    private List<String> missingFields;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "validation_errors", columnDefinition = "jsonb")
    private List<String> validationErrors;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "business_validation_errors", columnDefinition = "jsonb")
    private List<String> businessValidationErrors;

    @Column(name = "cropped_image_url", length = 500)
    private String croppedImageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scanned_by", nullable = false)
    private UserEntity scannedBy;

    @Column(name = "scanned_at", nullable = false)
    private LocalDateTime scannedAt;
}
