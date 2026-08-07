package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ScannedTicketStatus;
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

    @Column(name = "extracted_station_name", length = 255)
    private String extractedStationName;

    @Column(name = "extracted_serial_number", length = 100)
    private String extractedSerialNumber;

    @Column(name = "extracted_numbers", length = 50)
    private String extractedNumbers;

    @Column(name = "extracted_draw_date")
    private LocalDate extractedDrawDate;

    @Column(name = "confidence")
    private double confidence;

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
