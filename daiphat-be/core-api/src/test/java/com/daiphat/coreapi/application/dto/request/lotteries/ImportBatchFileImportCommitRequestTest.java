package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchFileCommitMode;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ImportBatchFileImportCommitRequestTest {

    @Test
    void resolvedCommitModeDefaultsToAuto() {
        ImportBatchFileImportCommitRequest request = ImportBatchFileImportCommitRequest.builder()
                .supplierId(1L)
                .fileHash("abc")
                .mapping(ImportBatchFileMappingRequest.builder().stationColumn("station").build())
                .drawDates(List.of(LocalDate.of(2026, 8, 24)))
                .build();

        assertThat(request.resolvedCommitMode()).isEqualTo(ImportBatchFileCommitMode.AUTO);
    }

    @Test
    void manualBatchIdForReturnsBindingByDrawDate() {
        LocalDate today = LocalDate.of(2026, 8, 24);
        LocalDate tomorrow = LocalDate.of(2026, 8, 25);
        ImportBatchFileImportCommitRequest request = ImportBatchFileImportCommitRequest.builder()
                .supplierId(1L)
                .fileHash("abc")
                .mapping(ImportBatchFileMappingRequest.builder().stationColumn("station").build())
                .drawDates(List.of(today, tomorrow))
                .commitMode(ImportBatchFileCommitMode.MANUAL)
                .manualBatchBindings(List.of(
                        ImportBatchFileManualBatchBinding.builder()
                                .drawDate(today)
                                .importBatchId(10L)
                                .build(),
                        ImportBatchFileManualBatchBinding.builder()
                                .drawDate(tomorrow)
                                .importBatchId(11L)
                                .build()
                ))
                .build();

        assertThat(request.resolvedCommitMode()).isEqualTo(ImportBatchFileCommitMode.MANUAL);
        assertThat(request.manualBatchIdFor(today)).isEqualTo(10L);
        assertThat(request.manualBatchIdFor(tomorrow)).isEqualTo(11L);
        assertThat(request.manualBatchIdFor(LocalDate.of(2026, 8, 26))).isNull();
    }
}
