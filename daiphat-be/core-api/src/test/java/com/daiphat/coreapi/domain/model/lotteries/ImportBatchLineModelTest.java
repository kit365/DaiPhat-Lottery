package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ImportBatchLineModel Unit Tests")
class ImportBatchLineModelTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 7, 7, 10, 0);

    @Test
    @DisplayName("markCancelled sets status and reason")
    void markCancelled_setsFields() {
        ImportBatchLineModel line = ImportBatchLineModel.builder()
                .status(ImportBatchLineStatus.OPEN)
                .build();

        line.markCancelled(NOW, "Station cancelled");

        assertThat(line.getStatus()).isEqualTo(ImportBatchLineStatus.CANCELLED);
        assertThat(line.getCancelReason()).isEqualTo("Station cancelled");
        assertThat(line.getUpdatedAt()).isEqualTo(NOW);
        assertThat(line.isCancelled()).isTrue();
        assertThat(line.isTerminal()).isTrue();
        assertThat(line.isEditable()).isFalse();
    }
}
