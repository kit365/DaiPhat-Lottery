package com.daiphat.coreapi.infrastructure.persistence.entity.payout;

import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutPaymentMethod;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Ghi nhận từng đợt trả tiền cho 1 payout request.
 * Kể cả trả đủ 1 lần cũng ghi 1 dòng.
 * Tổng sum theo prize_payout_request_id = paidAmountToDate trên PrizePayoutRequestEntity.
 */
@Entity
@Table(name = "prize_payout_installments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PrizePayoutInstallmentEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prize_payout_request_id", nullable = false)
    private PrizePayoutRequestEntity prizePayoutRequest;

    @Column(name = "installment_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal installmentAmount;

    @Column(name = "paid_at", nullable = false)
    @Builder.Default
    private LocalDateTime paidAt = LocalDateTime.now();

    @Column(name = "paid_by", nullable = false)
    private UUID paidBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 30)
    private PrizePayoutPaymentMethod paymentMethod;

    @Column(columnDefinition = "TEXT")
    private String note;
}
