package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ScanEventType;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanMethod;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "lottery_scan_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LotteryScanLogEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 30)
    private ScanEventType eventType;

    @Column(name = "ocr_scan_result_id")
    private Long ocrScanResultId;

    @Column(name = "lottery_ticket_serial_id")
    private Long lotteryTicketSerialId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scanned_by", nullable = false)
    private UserEntity scannedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "scan_method", length = 20)
    private ScanMethod scanMethod;

    @Column(name = "is_valid")
    private Boolean isValid;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "scanned_at", nullable = false)
    private LocalDateTime scannedAt;
}
