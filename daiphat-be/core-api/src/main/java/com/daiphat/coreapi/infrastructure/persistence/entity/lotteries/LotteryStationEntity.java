package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
@Entity
@Table(name = "lottery_stations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LotteryStationEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 100)
    private String province;

    @Column(length = 20)
    private String region;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LotteryStationType type;

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
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "draw_days", columnDefinition = "jsonb")
    private List<DayOfWeek> drawDays;

    @Column(name = "draw_time")
    private LocalTime drawTime;

    @Column(name = "next_draw_date")
    private LocalDate nextDrawDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private LotteryStationStatus status = LotteryStationStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private UserEntity approvedBy;

    @Column(name = "approved_at")
    private java.time.LocalDateTime approvedAt;

    // Hiển thị
    @Column(name = "image", length = 500)
    private String image;

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
