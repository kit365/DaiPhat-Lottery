package com.daiphat.coreapi.infrastructure.persistence.entity.streetagent;

import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "allocation_batch_details")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class AllocationBatchDetailEntity extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "allocation_batch_id", nullable = false)
    private AllocationBatchEntity allocationBatch;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "lottery_station_id", nullable = false)
    private LotteryStationEntity lotteryStation;
    @Column(name = "draw_date", nullable = false) private LocalDate drawDate;
    @Column(name = "allocated_quantity", nullable = false) @Builder.Default private Integer allocatedQuantity = 0;
    @Column(name = "returned_quantity", nullable = false) @Builder.Default private Integer returnedQuantity = 0;
    @Column(name = "sold_quantity", nullable = false) @Builder.Default private Integer soldQuantity = 0;
    @Column(name = "eligible_quantity_snapshot") private Integer eligibleQuantitySnapshot;
    @Column(name = "agency_reserve_quantity_snapshot") private Integer agencyReserveQuantitySnapshot;
    @Column(name = "vendor_capacity_snapshot") private Integer vendorCapacitySnapshot;

    @OneToMany(mappedBy = "allocationBatchDetail", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AgentTicketStockEntity> agentTicketStocks = new ArrayList<>();
}
