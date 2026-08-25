package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrScanResultResponse;
import com.daiphat.coreapi.application.mapper.lotteries.OcrScanResultApplicationMapper;
import com.daiphat.coreapi.application.port.out.lotteries.OcrScanResultRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ScannedTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultModel;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OcrScanResultServiceTest {

    @Mock
    private OcrScanResultRepositoryPort ocrScanResultRepositoryPort;

    @Mock
    private OcrScanResultApplicationMapper ocrScanResultApplicationMapper;

    @InjectMocks
    private OcrScanResultService ocrScanResultService;

    @Test
    void listRequiresScanIdOrImportBatchLineId() {
        assertThatThrownBy(() -> ocrScanResultService.list(null, null))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void listByScanIdReturnsMappedRows() {
        OcrScanResultModel model = OcrScanResultModel.builder()
                .id(11L)
                .scanId("scan-1")
                .ticketIndex(0)
                .status(ScannedTicketStatus.COMPLETE)
                .build();
        OcrScanResultResponse response = OcrScanResultResponse.builder()
                .id(11L)
                .scanId("scan-1")
                .ticketIndex(0)
                .confidence(0.9)
                .status(ScannedTicketStatus.COMPLETE)
                .build();

        when(ocrScanResultRepositoryPort.findAll("scan-1", null)).thenReturn(List.of(model));
        when(ocrScanResultApplicationMapper.toResponse(model)).thenReturn(response);

        List<OcrScanResultResponse> results = ocrScanResultService.list("scan-1", null);

        assertThat(results).containsExactly(response);
        verify(ocrScanResultRepositoryPort).findAll("scan-1", null);
    }

    @Test
    void listByImportBatchLineIdReturnsMappedRows() {
        OcrScanResultModel model = OcrScanResultModel.builder()
                .id(22L)
                .scanId("scan-2")
                .ticketIndex(1)
                .importBatchLineId(99L)
                .build();
        OcrScanResultResponse response = OcrScanResultResponse.builder()
                .id(22L)
                .scanId("scan-2")
                .ticketIndex(1)
                .importBatchLineId(99L)
                .confidence(0.5)
                .build();

        when(ocrScanResultRepositoryPort.findAll(null, 99L)).thenReturn(List.of(model));
        when(ocrScanResultApplicationMapper.toResponse(model)).thenReturn(response);

        List<OcrScanResultResponse> results = ocrScanResultService.list("  ", 99L);

        assertThat(results).containsExactly(response);
        verify(ocrScanResultRepositoryPort).findAll(null, 99L);
    }
}
