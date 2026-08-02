package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PrizePayoutCalculationService {

    private static final int MONEY_SCALE = 2;
    private static final RoundingMode MONEY_ROUNDING = RoundingMode.HALF_UP;

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final ObjectMapper objectMapper;

    public record CommissionTier(BigDecimal upTo, BigDecimal rate) {
    }

    public record PrizePayoutCalcSettings(
            BigDecimal onlineMaxAmount,
            BigDecimal taxThreshold,
            BigDecimal taxRate,
            List<CommissionTier> commissionTiers
    ) {
    }

    public record PrizePayoutBreakdown(
            BigDecimal grossAmount,
            BigDecimal taxAmount,
            BigDecimal commissionAmount,
            BigDecimal netAmount
    ) {
    }

    public PrizePayoutCalcSettings loadSettings() {
        BigDecimal onlineMax = readDecimal(
                SystemConfigEnum.PRIZE_PAYOUT_ONLINE_MAX_AMOUNT);
        BigDecimal taxThreshold = readDecimal(
                SystemConfigEnum.PRIZE_PAYOUT_TAX_THRESHOLD);
        BigDecimal taxRate = readDecimal(
                SystemConfigEnum.PRIZE_PAYOUT_TAX_RATE);
        List<CommissionTier> tiers = readCommissionTiers();
        return new PrizePayoutCalcSettings(onlineMax, taxThreshold, taxRate, tiers);
    }

    public PrizePayoutBreakdown calculate(BigDecimal grossAmount) {
        return calculate(grossAmount, loadSettings());
    }

    public PrizePayoutBreakdown calculate(BigDecimal grossAmount, PrizePayoutCalcSettings settings) {
        if (grossAmount == null || grossAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE, "Không xác định được số tiền trúng.");
        }
        if (settings == null
                || settings.taxThreshold() == null
                || settings.taxRate() == null
                || settings.commissionTiers() == null
                || settings.commissionTiers().isEmpty()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Cấu hình trả thưởng không hợp lệ.");
        }

        BigDecimal gross = grossAmount.setScale(MONEY_SCALE, MONEY_ROUNDING);
        BigDecimal tax = BigDecimal.ZERO.setScale(MONEY_SCALE, MONEY_ROUNDING);
        if (gross.compareTo(settings.taxThreshold()) > 0) {
            tax = gross.subtract(settings.taxThreshold())
                    .multiply(settings.taxRate())
                    .setScale(MONEY_SCALE, MONEY_ROUNDING);
        }

        BigDecimal rate = resolveCommissionRate(gross, settings.commissionTiers());
        BigDecimal commission = gross.multiply(rate).setScale(MONEY_SCALE, MONEY_ROUNDING);
        BigDecimal net = gross.subtract(tax).subtract(commission).setScale(MONEY_SCALE, MONEY_ROUNDING);
        if (net.compareTo(BigDecimal.ZERO) < 0) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Số tiền thực nhận không hợp lệ sau khi trừ thuế và hoa hồng.");
        }
        return new PrizePayoutBreakdown(gross, tax, commission, net);
    }

    public BigDecimal resolveOnlineMaxAmount() {
        return loadSettings().onlineMaxAmount();
    }

    public BigDecimal resolveTaxThreshold() {
        return loadSettings().taxThreshold();
    }

    static BigDecimal resolveCommissionRate(BigDecimal gross, List<CommissionTier> tiers) {
        List<CommissionTier> sorted = tiers.stream()
                .sorted(Comparator.comparing(
                        tier -> tier.upTo() == null ? BigDecimal.valueOf(Long.MAX_VALUE) : tier.upTo()))
                .toList();
        for (CommissionTier tier : sorted) {
            if (tier.upTo() == null || gross.compareTo(tier.upTo()) <= 0) {
                return tier.rate() != null ? tier.rate() : BigDecimal.ZERO;
            }
        }
        CommissionTier last = sorted.get(sorted.size() - 1);
        return last.rate() != null ? last.rate() : BigDecimal.ZERO;
    }

    private BigDecimal readDecimal(SystemConfigEnum configEnum) {
        String raw = systemConfigRepositoryPort.findActiveByConfigKey(configEnum.name())
                .map(SystemConfigModel::getConfigValue)
                .filter(value -> value != null && !value.isBlank())
                .orElse(configEnum.getDefaultValue());
        try {
            return new BigDecimal(raw.trim());
        } catch (NumberFormatException ex) {
            return new BigDecimal(configEnum.getDefaultValue());
        }
    }

    private List<CommissionTier> readCommissionTiers() {
        String raw = systemConfigRepositoryPort
                .findActiveByConfigKey(SystemConfigEnum.PRIZE_PAYOUT_COMMISSION_TIERS.name())
                .map(SystemConfigModel::getConfigValue)
                .filter(value -> value != null && !value.isBlank())
                .orElse(SystemConfigEnum.PRIZE_PAYOUT_COMMISSION_TIERS.getDefaultValue());
        try {
            List<CommissionTier> tiers = objectMapper.readValue(raw, new TypeReference<>() {
            });
            if (tiers == null || tiers.isEmpty()) {
                throw new IllegalArgumentException("empty tiers");
            }
            return tiers;
        } catch (Exception ex) {
            try {
                return objectMapper.readValue(
                        SystemConfigEnum.PRIZE_PAYOUT_COMMISSION_TIERS.getDefaultValue(),
                        new TypeReference<>() {
                        });
            } catch (Exception fallbackEx) {
                throw new DomainException(ErrorCode.INVALID_INPUT, "Cấu hình bậc thang hoa hồng không hợp lệ.");
            }
        }
    }
}
