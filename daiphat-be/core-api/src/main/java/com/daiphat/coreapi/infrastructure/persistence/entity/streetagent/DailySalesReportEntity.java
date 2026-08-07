package com.daiphat.coreapi.infrastructure.persistence.entity.streetagent;

import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Draw.io {@code Daily_Sales_Report} skeleton — Phase 1 no service. */
@Entity
@Table(name = "daily_sales_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DailySalesReportEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private StreetAgentProfileEntity agent;

    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

    @Column(name = "total_sold_quantity", nullable = false)
    @Builder.Default
    private Integer totalSoldQuantity = 0;

    @Column(name = "total_remaining_quantity", nullable = false)
    @Builder.Default
    private Integer totalRemainingQuantity = 0;

    @Column(name = "total_cash_collected", nullable = false, precision = 18, scale = 0)
    @Builder.Default
    private BigDecimal totalCashCollected = BigDecimal.ZERO;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "pending";

    @Column(name = "confirmed_by")
    private UUID confirmedBy;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DailySalesReportDetailEntity> details = new ArrayList<>();
}
