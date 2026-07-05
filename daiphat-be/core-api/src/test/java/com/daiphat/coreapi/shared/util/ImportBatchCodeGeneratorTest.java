package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
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
    private ImportBatchLineRepositoryPort importBatchLineRepositoryPort;

    @InjectMocks
    private ImportBatchCodeGenerator generator;

    @Test
    @DisplayName("generates unique readable batch code")
    void generate_success() {
        when(importBatchLineRepositoryPort.nextBatchCodeSequence()).thenReturn(1L);
        LotteryStationModel station = LotteryStationModel.builder().name("Hồ Chí Minh").build();

        String code = generator.generate(station, ImportBatchType.NEW, LocalDate.of(2026, 7, 20));

        assertThat(code).isEqualTo("0001_HOCHIMINH_NEW_20260720");
    }

    @Test
    @DisplayName("maps adjustment type to ADDITIONAL")
    void generate_adjustmentType() {
        when(importBatchLineRepositoryPort.nextBatchCodeSequence()).thenReturn(3L);
        LotteryStationModel station = LotteryStationModel.builder().name("Đồng Nai").build();

        String code = generator.generate(station, ImportBatchType.ADJUSTMENT, LocalDate.of(2026, 7, 20));

        assertThat(code).isEqualTo("0003_DONGNAI_ADDITIONAL_20260720");
    }
}
