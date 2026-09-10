package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.AgencyFundEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.AgencyFundRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Quản lý quỹ đại lý — credit/debit với pessimistic lock.
 *
 * <p>Luồng tiền:
 * <ul>
 *   <li>Credit: khi PrizeClaimSubmission COMPLETED (nhà đài trả đại lý)
 *   <li>Debit: khi PrizePayout payout/payoutPartial/payFinalInstallment (đại lý trả khách)
 * </ul>
 *
 * <p>Pessimistic lock (SELECT FOR UPDATE) đảm bảo atomic check-and-debit,
 * ngăn double-spend khi nhiều payout request chạy đồng thời.
 */
@Service
@RequiredArgsConstructor
public class AgencyFundService {

    private final AgencyFundRepository agencyFundRepository;

    /**
     * Kiểm tra quỹ (chỉ đọc, không lock).
     * Dùng cho UI preview — không giữ lock.
     */
    @Transactional(readOnly = true)
    public boolean hasAvailableFunds(UUID agencyId, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return true;
        }
        return agencyFundRepository.findByAgencyId(agencyId)
                .map(f -> f.getAvailableBalance().compareTo(amount) >= 0)
                .orElse(false);
    }

    /**
     * Cộng tiền vào quỹ (credit).
     * Không cần lock vì không có rủi ro race condition về trừ tiền.
     */
    @Transactional
    public void credit(UUID agencyId, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        AgencyFundEntity fund = agencyFundRepository.findByAgencyId(agencyId)
                .orElseGet(() -> AgencyFundEntity.builder()
                        .agencyId(agencyId)
                        .availableBalance(BigDecimal.ZERO)
                        .build());

        fund.setAvailableBalance(fund.getAvailableBalance().add(amount));
        fund.setUpdatedAt(LocalDateTime.now());
        agencyFundRepository.save(fund);
    }

    /**
     * Trừ tiền khỏi quỹ (debit) với pessimistic lock.
     *
     * <p>Lock giữ đến hết transaction — request khác phải chờ.
     * Nếu số dư không đủ → ném InsufficientFundException.
     *
     * @throws DomainException(PRIZE_PAYOUT_INSUFFICIENT_FUND) nếu quỹ không đủ
     */
    @Transactional
    public void debitWithLock(UUID agencyId, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        AgencyFundEntity fund = agencyFundRepository.findByAgencyIdWithLock(agencyId)
                .orElseThrow(() -> new DomainException(
                        ErrorCode.PRIZE_PAYOUT_INSUFFICIENT_FUND,
                        "Không tìm thấy quỹ cho đại lý."));

        if (fund.getAvailableBalance().compareTo(amount) < 0) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_INSUFFICIENT_FUND,
                    "Quỹ đại lý không đủ. Cần: " + amount + " VND, Có: " + fund.getAvailableBalance() + " VND");
        }

        fund.setAvailableBalance(fund.getAvailableBalance().subtract(amount));
        fund.setUpdatedAt(LocalDateTime.now());
        agencyFundRepository.save(fund);
    }

    /**
     * Lấy số dư hiện tại (chỉ đọc).
     */
    @Transactional(readOnly = true)
    public BigDecimal getBalance(UUID agencyId) {
        return agencyFundRepository.findByAgencyId(agencyId)
                .map(AgencyFundEntity::getAvailableBalance)
                .orElse(BigDecimal.ZERO);
    }
}
