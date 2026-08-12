package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus;
import com.daiphat.coreapi.domain.model.enums.streetagent.VendorConfidenceTier;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class VendorConfidenceCalculatorTest {

    private static final VendorConfidenceCalculator.Policy DEFAULT = new VendorConfidenceCalculator.Policy(
            new BigDecimal("40"),
            new BigDecimal("60"),
            new BigDecimal("80"),
            5, 10, 20,
            new BigDecimal("0.50"),
            new BigDecimal("0.40"),
            new BigDecimal("0.10"),
            30
    );

    @Test
    void no_history_defaults_to_new_25() {
        var result = VendorConfidenceCalculator.calculate(List.of(), DEFAULT);
        assertThat(result.score()).isEqualByComparingTo("25.00");
        assertThat(result.tier()).isEqualTo(VendorConfidenceTier.NEW);
        assertThat(result.sampleSize()).isZero();
    }

    @Test
    void score_boundaries_map_to_tiers_when_experience_allows() {
        // 20 on-time full sell-through batches → score 100, TRUSTED
        List<VendorConfidenceCalculator.BatchSample> trusted = samples(20, AllocationBatchStatus.SETTLED, 10, 10);
        assertThat(VendorConfidenceCalculator.calculate(trusted, DEFAULT).tier())
                .isEqualTo(VendorConfidenceTier.TRUSTED);

        // Force score just under 40 with low on-time and sell-through, enough batches for DEVELOPING max
        List<VendorConfidenceCalculator.BatchSample> below40 = samples(5, AllocationBatchStatus.LATE_SETTLED, 10, 0);
        var low = VendorConfidenceCalculator.calculate(below40, DEFAULT);
        assertThat(low.score()).isLessThan(new BigDecimal("40"));
        assertThat(low.tier()).isEqualTo(VendorConfidenceTier.NEW);
    }

    @Test
    void experience_caps_tier_below_thresholds() {
        // Perfect metrics but only 4 batches → max NEW
        List<VendorConfidenceCalculator.BatchSample> four = samples(4, AllocationBatchStatus.SETTLED, 10, 10);
        assertThat(VendorConfidenceCalculator.calculate(four, DEFAULT).tier())
                .isEqualTo(VendorConfidenceTier.NEW);

        List<VendorConfidenceCalculator.BatchSample> nine = samples(9, AllocationBatchStatus.SETTLED, 10, 10);
        assertThat(VendorConfidenceCalculator.calculate(nine, DEFAULT).tier())
                .isEqualTo(VendorConfidenceTier.DEVELOPING);

        List<VendorConfidenceCalculator.BatchSample> nineteen = samples(19, AllocationBatchStatus.SETTLED, 10, 10);
        assertThat(VendorConfidenceCalculator.calculate(nineteen, DEFAULT).tier())
                .isEqualTo(VendorConfidenceTier.ESTABLISHED);
    }

    @Test
    void late_settled_reduces_on_time_but_keeps_actual_sold() {
        List<VendorConfidenceCalculator.BatchSample> samples = List.of(
                new VendorConfidenceCalculator.BatchSample(AllocationBatchStatus.SETTLED, 10, 10),
                new VendorConfidenceCalculator.BatchSample(AllocationBatchStatus.LATE_SETTLED, 10, 8)
        );
        var result = VendorConfidenceCalculator.calculate(samples, DEFAULT);
        assertThat(result.onTimeRate()).isEqualByComparingTo("0.5000");
        assertThat(result.sellThroughRate()).isEqualByComparingTo("0.9000");
        assertThat(result.sampleSize()).isEqualTo(2);
    }

    @Test
    void custom_weights_change_score() {
        VendorConfidenceCalculator.Policy sellHeavy = new VendorConfidenceCalculator.Policy(
                new BigDecimal("40"), new BigDecimal("60"), new BigDecimal("80"),
                5, 10, 20,
                new BigDecimal("0.10"), new BigDecimal("0.80"), new BigDecimal("0.10"),
                30
        );
        List<VendorConfidenceCalculator.BatchSample> samples = List.of(
                new VendorConfidenceCalculator.BatchSample(AllocationBatchStatus.LATE_SETTLED, 10, 10)
        );
        var defaultScore = VendorConfidenceCalculator.calculate(samples, DEFAULT).score();
        var heavyScore = VendorConfidenceCalculator.calculate(samples, sellHeavy).score();
        assertThat(heavyScore).isGreaterThan(defaultScore);
    }

    private static List<VendorConfidenceCalculator.BatchSample> samples(
            int count, AllocationBatchStatus status, int allocated, int sold) {
        List<VendorConfidenceCalculator.BatchSample> list = new ArrayList<>();
        IntStream.range(0, count).forEach(i -> list.add(
                new VendorConfidenceCalculator.BatchSample(status, allocated, sold)));
        return list;
    }
}
