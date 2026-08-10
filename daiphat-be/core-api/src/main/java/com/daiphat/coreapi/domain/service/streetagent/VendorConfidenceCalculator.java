package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus;
import com.daiphat.coreapi.domain.model.enums.streetagent.VendorConfidenceTier;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Fixed confidence formula with configurable weights, thresholds and experience window.
 * score = (onTimeRate × onTimeWeight + sellThroughRate × sellThroughWeight + experienceRate × experienceWeight) × 100
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VendorConfidenceCalculator {

    public record BatchSample(
            AllocationBatchStatus status,
            int allocatedQuantity,
            int soldQuantity
    ) {}

    public record Policy(
            BigDecimal developingMinScore,
            BigDecimal establishedMinScore,
            BigDecimal trustedMinScore,
            int developingMinBatches,
            int establishedMinBatches,
            int trustedMinBatches,
            BigDecimal onTimeWeight,
            BigDecimal sellThroughWeight,
            BigDecimal experienceWeight,
            int experienceWindow
    ) {}

    public record Result(
            BigDecimal score,
            VendorConfidenceTier tier,
            int sampleSize,
            BigDecimal onTimeRate,
            BigDecimal sellThroughRate,
            BigDecimal experienceRate
    ) {}

    public static Result noHistory() {
        return new Result(
                new BigDecimal("25.00"),
                VendorConfidenceTier.NEW,
                0,
                BigDecimal.ZERO.setScale(4),
                BigDecimal.ZERO.setScale(4),
                BigDecimal.ZERO.setScale(4)
        );
    }

    public static Result calculate(List<BatchSample> samplesNewestFirst, Policy policy) {
        if (samplesNewestFirst == null || samplesNewestFirst.isEmpty()) {
            return noHistory();
        }
        int window = Math.max(1, policy.experienceWindow());
        List<BatchSample> sample = samplesNewestFirst.stream()
                .filter(s -> s.status() != null && s.status().isTerminalForConfidence())
                .limit(window)
                .toList();
        if (sample.isEmpty()) {
            return noHistory();
        }

        int sampleSize = sample.size();
        long onTime = sample.stream().filter(s -> s.status() == AllocationBatchStatus.SETTLED).count();
        int allocated = sample.stream().mapToInt(BatchSample::allocatedQuantity).sum();
        int sold = sample.stream().mapToInt(BatchSample::soldQuantity).sum();

        BigDecimal onTimeRate = rate(onTime, sampleSize);
        BigDecimal sellThroughRate = allocated == 0 ? BigDecimal.ZERO.setScale(4) : rate(sold, allocated);
        BigDecimal experienceRate = BigDecimal.valueOf(sampleSize)
                .divide(BigDecimal.valueOf(window), 4, RoundingMode.HALF_UP)
                .min(BigDecimal.ONE);

        BigDecimal scoreFraction = onTimeRate.multiply(policy.onTimeWeight())
                .add(sellThroughRate.multiply(policy.sellThroughWeight()))
                .add(experienceRate.multiply(policy.experienceWeight()));
        BigDecimal score = scoreFraction.multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);

        VendorConfidenceTier byScore = tierByScore(score, policy);
        VendorConfidenceTier tier = clampByExperience(byScore, sampleSize, policy);
        return new Result(score, tier, sampleSize, onTimeRate, sellThroughRate, experienceRate);
    }

    private static VendorConfidenceTier tierByScore(BigDecimal score, Policy policy) {
        if (score.compareTo(policy.trustedMinScore()) >= 0) {
            return VendorConfidenceTier.TRUSTED;
        }
        if (score.compareTo(policy.establishedMinScore()) >= 0) {
            return VendorConfidenceTier.ESTABLISHED;
        }
        if (score.compareTo(policy.developingMinScore()) >= 0) {
            return VendorConfidenceTier.DEVELOPING;
        }
        return VendorConfidenceTier.NEW;
    }

    private static VendorConfidenceTier clampByExperience(VendorConfidenceTier tier, int sampleSize, Policy policy) {
        VendorConfidenceTier max = maxTierByBatches(sampleSize, policy);
        return ordinalMin(tier, max);
    }

    private static VendorConfidenceTier maxTierByBatches(int sampleSize, Policy policy) {
        if (sampleSize >= policy.trustedMinBatches()) {
            return VendorConfidenceTier.TRUSTED;
        }
        if (sampleSize >= policy.establishedMinBatches()) {
            return VendorConfidenceTier.ESTABLISHED;
        }
        if (sampleSize >= policy.developingMinBatches()) {
            return VendorConfidenceTier.DEVELOPING;
        }
        return VendorConfidenceTier.NEW;
    }

    private static VendorConfidenceTier ordinalMin(VendorConfidenceTier a, VendorConfidenceTier b) {
        return a.ordinal() <= b.ordinal() ? a : b;
    }

    private static BigDecimal rate(long numerator, long denominator) {
        if (denominator <= 0) {
            return BigDecimal.ZERO.setScale(4);
        }
        return BigDecimal.valueOf(numerator)
                .divide(BigDecimal.valueOf(denominator), 4, RoundingMode.HALF_UP);
    }
}
