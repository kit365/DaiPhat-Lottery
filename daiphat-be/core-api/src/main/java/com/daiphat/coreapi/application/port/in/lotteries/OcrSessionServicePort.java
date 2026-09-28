package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.scan.CreateOcrSessionRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.JoinOcrSessionRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrSessionResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.TicketScanResponse;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

public interface OcrSessionServicePort {
    OcrSessionResponse createSession(CreateOcrSessionRequest request, UUID adminUserId, String adminUsername);
    OcrSessionResponse getSession(String sessionCode);
    OcrSessionResponse joinSession(String sessionCode, JoinOcrSessionRequest request, UUID staffUserId, String staffUsername);
    TicketScanResponse uploadAndScan(String sessionCode, MultipartFile file, UUID staffUserId);
    void closeSession(String sessionCode, UUID userId);
}
