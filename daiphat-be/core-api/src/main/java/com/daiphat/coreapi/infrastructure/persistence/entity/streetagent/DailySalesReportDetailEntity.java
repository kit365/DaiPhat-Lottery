package com.daiphat.coreapi.infrastructure.persistence.entity.streetagent;

import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Entity
@Table(name = "daily_sales_report_details")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DailySalesReportDetailEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private DailySalesReportEntity report;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "detail_id", nullable = false)
    private AllocationBatchDetailEntity allocationBatchDetail;

    @Column(name = "allocated_quantity", nullable = false)
    @Builder.Default
    private Integer allocatedQuantity = 0;

    @Column(name = "sold_quantity", nullable = false)
    @Builder.Default
    private Integer soldQuantity = 0;

    @Column(name = "remaining_quantity", nullable = false)
    @Builder.Default
    private Integer remainingQuantity = 0;

    @Column(name = "cash_collected", nullable = false, precision = 18, scale = 0)
    @Builder.Default
    private BigDecimal cashCollected = BigDecimal.ZERO;
}
