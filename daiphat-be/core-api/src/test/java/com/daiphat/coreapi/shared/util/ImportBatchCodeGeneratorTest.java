package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ImportBatchCodeGenerator Unit Tests")
class ImportBatchCodeGeneratorTest {

    @Mock
    private ImportBatchRepositoryPort importBatchRepositoryPort;

    @Mock
    private ImportBatchLineRepositoryPort importBatchLineRepositoryPort;

    @InjectMocks
    private ImportBatchCodeGenerator generator;

    @Test
    @DisplayName("generates PN-{drawDate}-{sequence} header format")
    void generateHeaderCode_success() {
        when(importBatchRepositoryPort.nextHeaderBatchCodeSequence()).thenReturn(4L);

        String code = generator.generateHeaderCode(LocalDate.of(2026, 7, 7));

        assertThat(code).isEqualTo("PN-20260707-0004");
    }

    @Test
    @DisplayName("generates LO-{drawDate}-{station}-{type}-{sequence} line format")
    void generateLineCode_success() {
        when(importBatchLineRepositoryPort.nextLineBatchCodeSequence()).thenReturn(1L);
        LotteryStationModel station = LotteryStationModel.builder().name("Hồ Chí Minh").build();

        String code = generator.generateLineCode(station, ImportBatchType.NEW, LocalDate.of(2026, 7, 20));

        assertThat(code).isEqualTo("LO-20260720-HOCHIMINH-NEW-0001");
    }

    @Test
    @DisplayName("maps batch types to compact type segment codes")
    void generateLineCode_typeSegments() {
        when(importBatchLineRepositoryPort.nextLineBatchCodeSequence()).thenReturn(3L);
        LotteryStationModel station = LotteryStationModel.builder().name("Đồng Nai").build();

        assertThat(generator.generateLineCode(station, ImportBatchType.ADJUSTMENT, LocalDate.of(2026, 7, 6)))
                .isEqualTo("LO-20260706-DONGNAI-ADJ-0003");
        when(importBatchLineRepositoryPort.nextLineBatchCodeSequence()).thenReturn(4L);
        assertThat(generator.generateLineCode(station, ImportBatchType.SUPPLEMENTARY, LocalDate.of(2026, 7, 6)))
                .isEqualTo("LO-20260706-DONGNAI-SUPP-0004");
        when(importBatchLineRepositoryPort.nextLineBatchCodeSequence()).thenReturn(5L);
        assertThat(generator.generateLineCode(station, ImportBatchType.LATE_IMPORT, LocalDate.of(2026, 7, 6)))
                .isEqualTo("LO-20260706-DONGNAI-LATE-0005");
    }

    @Test
    @DisplayName("normalizes Vietnamese station names without diacritics")
    void toStationCode_stripsDiacritics() {
        assertThat(ImportBatchCodeGenerator.toStationCode("Đồng Tháp")).isEqualTo("DONGTHAP");
        assertThat(ImportBatchCodeGenerator.toStationCode("  ")).isEqualTo("STATION");
    }
}
