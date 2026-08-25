package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrScanResultResponse;
import com.daiphat.coreapi.application.mapper.lotteries.OcrScanResultApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.OcrScanResultServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrScanResultRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OcrScanResultService implements OcrScanResultServicePort {

    private final OcrScanResultRepositoryPort ocrScanResultRepositoryPort;
    private final OcrScanResultApplicationMapper ocrScanResultApplicationMapper;

    @Override
    @Transactional(readOnly = true)
    public List<OcrScanResultResponse> list(String scanId, Long importBatchLineId) {
        boolean hasScanId = StringUtils.hasText(scanId);
        if (!hasScanId && importBatchLineId == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Cần cung cấp scanId hoặc importBatchLineId.");
        }

        return ocrScanResultRepositoryPort.findAll(hasScanId ? scanId.trim() : null, importBatchLineId).stream()
                .map(ocrScanResultApplicationMapper::toResponse)
                .toList();
    }
}
