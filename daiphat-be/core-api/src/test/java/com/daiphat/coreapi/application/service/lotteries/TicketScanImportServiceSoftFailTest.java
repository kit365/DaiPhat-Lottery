package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.scan.TicketScanResponse;
import com.daiphat.coreapi.application.mapper.lotteries.OcrScanResultApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryScanLogServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrScanResultRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrTicketTemplateRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrFieldLayoutRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.AiModelRegistryRepositoryPort;
import com.daiphat.coreapi.application.port.out.vision.TicketVisionPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ScannedTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldLayoutModel;
import com.daiphat.coreapi.domain.model.lotteries.OcrNormalizedBoundingBox;
import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultModel;
import com.daiphat.coreapi.domain.model.lotteries.OcrTicketTemplateModel;
import com.daiphat.coreapi.infrastructure.dto.request.vision.RemoteScanMetadata;
import com.daiphat.coreapi.infrastructure.dto.request.vision.RemoteStationTemplateMetadata;
import com.daiphat.coreapi.infrastructure.dto.response.vision.RemoteTicketScanResult;
import com.daiphat.coreapi.shared.util.ImportBatchDraftExpiryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TicketScanImportServiceSoftFailTest {

    @Mock
    private TicketVisionPort ticketVisionPort;
    @Mock
    private ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    @Mock
    private ImportBatchRepositoryPort importBatchRepositoryPort;
    @Mock
    private ImportBatchDraftExpiryService importBatchDraftExpiryService;
    @Mock
    private LotteryStationServicePort lotteryStationServicePort;
    @Mock
    private LotteryStationRepositoryPort lotteryStationRepositoryPort;
    @Mock
    private LotteryTicketServicePort lotteryTicketServicePort;
    @Mock
    private OcrScanResultRepositoryPort ocrScanResultRepositoryPort;
    @Mock
    private LotteryScanLogServicePort lotteryScanLogServicePort;
    @Mock
    private OcrScanValidationService ocrScanValidationService;
    @Mock
    private OcrScanResultApplicationMapper ocrScanResultApplicationMapper;
    @Mock
    private OcrTicketTemplateRepositoryPort ocrTicketTemplateRepositoryPort;
    @Mock
    private OcrFieldLayoutRepositoryPort ocrFieldLayoutRepositoryPort;
    @Mock
    private AiModelRegistryRepositoryPort aiModelRegistryRepositoryPort;
    @Mock
    private OcrScanResultFieldService ocrScanResultFieldService;

    @InjectMocks
    private TicketScanImportService service;

    private UUID operatorId;

    @BeforeEach
    void setUp() {
        operatorId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        ReflectionTestUtils.setField(service, "ticketVisionRecognitionEngine", "groq");
        when(ocrTicketTemplateRepositoryPort.existsActiveDefault()).thenReturn(true);
        when(ocrTicketTemplateRepositoryPort.findActiveDefault()).thenReturn(java.util.Optional.empty());
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(
                LotteryStationModel.builder().id(1L).name("HCM").code("HCM").build()
        ));
        when(ocrScanResultRepositoryPort.save(any(OcrScanResultModel.class))).thenAnswer(inv -> {
            OcrScanResultModel model = inv.getArgument(0);
            model.setId(99L);
            return model;
        });
    }

    @Test
    void emptyVisionTicketsYieldsHttp200StyleFailedPlaceholder() {
        when(ticketVisionPort.scan(any(), any(), any())).thenReturn(
                new RemoteTicketScanResult(
                        "scan-empty",
                        0,
                        List.of(),
                        List.of("OCR không trả về kết quả cho ảnh này."),
                        800,
                        600
                )
        );

        MockMultipartFile file = new MockMultipartFile(
                "file", "blurry.jpg", "image/jpeg", new byte[]{1, 2, 3}
        );

        TicketScanResponse response = service.scan(null, null, file, operatorId);

        assertThat(response.scanId()).isEqualTo("scan-empty");
        assertThat(response.ticketCount()).isEqualTo(1);
        assertThat(response.tickets()).hasSize(1);
        assertThat(response.tickets().getFirst().status()).isEqualTo(ScannedTicketStatus.FAILED);
        assertThat(response.tickets().getFirst().businessValidationErrors())
                .anyMatch(msg -> msg.contains("Không thể đọc rõ"));
        assertThat(response.tickets().getFirst().bbox()).isNotNull();
        assertThat(response.tickets().getFirst().bbox().width()).isEqualTo(800);
        assertThat(response.tickets().getFirst().fieldValidations())
                .containsKey("serialNumber");
        assertThat(response.tickets().getFirst().ocrScanResultId()).isEqualTo(99L);
    }

    @Test
    void scanMetadataCarriesTemplatesForEveryStationThatHasOne() {
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(
                LotteryStationModel.builder().id(1L).name("HCM").code("HCM").isActive(true).build(),
                LotteryStationModel.builder().id(2L).name("Cần Thơ").code("CTH").isActive(true).build()
        ));
        when(ocrTicketTemplateRepositoryPort.resolveForStation(any(), any())).thenAnswer(inv ->
                Long.valueOf(1L).equals(inv.getArgument(0))
                        ? Optional.of(OcrTicketTemplateModel.builder()
                                .id(11L)
                                .stationId(1L)
                                .sampleImageUrl("https://cdn.test/kg-sample.jpg")
                                .build())
                        : Optional.empty());
        when(ocrFieldLayoutRepositoryPort.findByTemplateId(11L)).thenReturn(List.of(
                OcrFieldLayoutModel.builder()
                        .id(5L)
                        .templateId(11L)
                        .fieldName(OcrTemplateFieldName.numbers)
                        .boundingBox(new OcrNormalizedBoundingBox(0.1, 0.4, 0.8, 0.2))
                        .priority(1)
                        .required(true)
                        .build()
        ));
        when(ticketVisionPort.scan(any(), any(), any())).thenReturn(
                new RemoteTicketScanResult("scan-meta", 0, List.of(), List.of(), 800, 600)
        );

        MockMultipartFile file = new MockMultipartFile(
                "file", "ticket.jpg", "image/jpeg", new byte[]{1, 2, 3}
        );
        service.scan(null, null, file, operatorId);

        ArgumentCaptor<RemoteScanMetadata> captor = ArgumentCaptor.forClass(RemoteScanMetadata.class);
        verify(ticketVisionPort).scan(any(), any(), captor.capture());
        List<RemoteStationTemplateMetadata> templates = captor.getValue().stationTemplates();
        assertThat(templates).hasSize(1);
        assertThat(templates.getFirst().stationId()).isEqualTo(1L);
        assertThat(templates.getFirst().templateId()).isEqualTo(11L);
        assertThat(templates.getFirst().sampleImageUrl()).isEqualTo("https://cdn.test/kg-sample.jpg");
        assertThat(templates.getFirst().fieldLayouts())
                .singleElement()
                .satisfies(layout -> {
                    assertThat(layout.fieldName()).isEqualTo("numbers");
                    assertThat(layout.y()).isEqualTo(0.4);
                });
    }
}
