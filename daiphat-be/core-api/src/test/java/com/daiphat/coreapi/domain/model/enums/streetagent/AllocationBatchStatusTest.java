package com.daiphat.coreapi.domain.model.enums.streetagent;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AllocationBatchStatusTest {

    @Test
    void releases_handover_allowance_after_settlement_but_keeps_it_for_open_batches() {
        assertThat(AllocationBatchStatus.DRAFT.isCapConsuming()).isTrue();
        assertThat(AllocationBatchStatus.CONFIRMED.isCapConsuming()).isTrue();
        assertThat(AllocationBatchStatus.RETURN_OPEN.isCapConsuming()).isTrue();

        assertThat(AllocationBatchStatus.SETTLED.isCapConsuming()).isFalse();
        assertThat(AllocationBatchStatus.LATE_SETTLED.isCapConsuming()).isFalse();
        assertThat(AllocationBatchStatus.CANCELLED.isCapConsuming()).isFalse();
        assertThat(AllocationBatchStatus.EXPIRED.isCapConsuming()).isFalse();
    }
}
