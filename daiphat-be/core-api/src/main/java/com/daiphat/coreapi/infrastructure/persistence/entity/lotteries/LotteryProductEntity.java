package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryProductStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryProductType;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "lottery_products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LotteryProductEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 100)
    private String province;

    @Column(length = 20)
    private String region;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LotteryProductType type;

    // Quy tắc số
    @Column(name = "number_length")
    private Integer numberLength;

    @Column(name = "min_number")
    private Integer minNumber;

    @Column(name = "max_number")
    private Integer maxNumber;

    // Giá & Tồn kho
    @Column(nullable = false, precision = 15, scale = 0)
    private BigDecimal price;

    @Column(name = "inventory_count")
    @Builder.Default
    private Integer inventoryCount = 0;

    // Lịch quay
    @Column(name = "draw_schedule", length = 100)
    private String drawSchedule;

    @Column(name = "draw_time", length = 10)
    private String drawTime;

    @Column(name = "next_draw_date")
    private LocalDate nextDrawDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private LotteryProductStatus status = LotteryProductStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private UserEntity approvedBy;

    @Column(name = "approved_at")
    private java.time.LocalDateTime approvedAt;

    // Hiển thị
    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(name = "thumbnail_public_id", length = 255)
    private String thumbnailPublicId;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;
}