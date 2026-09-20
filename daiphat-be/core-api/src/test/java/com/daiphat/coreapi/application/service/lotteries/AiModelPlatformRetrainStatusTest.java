package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrRetrainStatusResponse;
import com.daiphat.coreapi.application.port.out.lotteries.AiModelMetricRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.AiModelRegistryRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrScanResultFieldRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrScanResultRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.TrainingDatasetExportRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.AiModelMetricModel;
import com.daiphat.coreapi.domain.model.lotteries.AiModelRegistryModel;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiModelPlatformRetrainStatusTest {

    @Mock
    private AiModelRegistryRepositoryPort registryRepositoryPort;
    @Mock
    private AiModelMetricRepositoryPort metricRepositoryPort;
    @Mock
    private TrainingDatasetExportRepositoryPort exportRepositoryPort;
    @Mock
    private OcrScanResultRepositoryPort ocrScanResultRepositoryPort;
    @Mock
    private OcrScanResultFieldRepositoryPort fieldRepositoryPort;

    @InjectMocks
    private AiModelPlatformService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "objectMapper", new ObjectMapper());
        ReflectionTestUtils.setField(service, "trainingExportDir", "./data/ocr-training-exports");
        ReflectionTestUtils.setField(service, "retrainLookbackDays", 7);
        ReflectionTestUtils.setField(service, "retrainCorrectionRateThreshold", 0.15);
        ReflectionTestUtils.setField(service, "retrainMinCorrectedFields", 50L);
        ReflectionTestUtils.setField(service, "retrainAutoExportOnSuggest", false);
    }

    @Test
    void suggestsRetrainWhenRateAndVolumeExceedThresholds() {
        when(registryRepositoryPort.findAllActive()).thenReturn(List.of(
                AiModelRegistryModel.builder().id(1L).provider("GROQ").modelName("qwen").displayName("Qwen").active(true).build()
        ));
        when(metricRepositoryPort.findByModelAndDateRange(eq(1L), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(
                        AiModelMetricModel.builder()
                                .modelId(1L)
                                .metricDate(LocalDate.now().minusDays(1))
                                .fieldName("serialNumber")
                                .totalFields(100)
                                .correctedFields(20)
                                .build()
                ));

        OcrRetrainStatusResponse status = service.getRetrainStatus(
                LocalDate.now().minusDays(7),
                LocalDate.now().minusDays(1)
        );

        assertThat(status.retrainSuggested()).isFalse(); // 20 < min 50
        assertThat(status.correctionRate()).isEqualTo(0.2);
        assertThat(status.fieldHotspots()).isNotEmpty();
    }

    @Test
    void suggestsRetrainWhenBothThresholdsMet() {
        when(registryRepositoryPort.findAllActive()).thenReturn(List.of(
                AiModelRegistryModel.builder().id(1L).provider("GROQ").modelName("qwen").displayName("Qwen").active(true).build()
        ));
        when(metricRepositoryPort.findByModelAndDateRange(eq(1L), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(
                        AiModelMetricModel.builder()
                                .modelId(1L)
                                .metricDate(LocalDate.now().minusDays(1))
                                .fieldName("serialNumber")
                                .totalFields(400)
                                .correctedFields(80)
                                .build()
                ));

        OcrRetrainStatusResponse status = service.getRetrainStatus(
                LocalDate.now().minusDays(7),
                LocalDate.now().minusDays(1)
        );

        assertThat(status.retrainSuggested()).isTrue();
        assertThat(status.reason()).contains("retrain");
    }
}
