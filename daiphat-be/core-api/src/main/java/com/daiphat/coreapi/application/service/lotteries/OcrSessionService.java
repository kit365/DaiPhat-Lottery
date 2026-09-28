package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.scan.CreateOcrSessionRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.JoinOcrSessionRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrSessionResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrSessionSocketEvent;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.TicketScanResponse;
import com.daiphat.coreapi.application.port.in.lotteries.OcrSessionServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.TicketScanImportServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrSessionEventPublisherPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrSessionStatus;
import com.daiphat.coreapi.domain.model.lotteries.OcrSessionModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class OcrSessionService implements OcrSessionServicePort {

    private final TicketScanImportServicePort ticketScanImportServicePort;
    private final OcrSessionEventPublisherPort ocrSessionEventPublisherPort;

    private final Map<String, OcrSessionModel> activeSessions = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    private static final int SESSION_TTL_MINUTES = 15;

    @Override
    public OcrSessionResponse createSession(CreateOcrSessionRequest request, UUID adminUserId, String adminUsername) {
        String sessionCode = generateUniqueSessionCode();
        Instant now = Instant.now();
        Instant expiresAt = now.plus(SESSION_TTL_MINUTES, ChronoUnit.MINUTES);

        OcrSessionModel session = OcrSessionModel.builder()
                .sessionCode(sessionCode)
                .adminUserId(adminUserId)
                .adminUsername(adminUsername)
                .importBatchId(request != null ? request.importBatchId() : null)
                .importBatchLineId(request != null ? request.importBatchLineId() : null)
                .status(OcrSessionStatus.WAITING_FOR_MOBILE)
                .connectedStaffName(null)
                .connectedDevice(null)
                .createdAt(now)
                .expiresAt(expiresAt)
                .scannedTicketCount(0)
                .build();

        activeSessions.put(sessionCode, session);
        log.info("Created OCR scan session code={} for user={}", sessionCode, adminUsername);

        return toResponse(session);
    }

    @Override
    public OcrSessionResponse getSession(String sessionCode) {
        OcrSessionModel session = requireActiveSession(sessionCode);
        return toResponse(session);
    }

    @Override
    public OcrSessionResponse joinSession(String sessionCode, JoinOcrSessionRequest request, UUID staffUserId, String staffUsername) {
        OcrSessionModel session = requireActiveSession(sessionCode);
        if (session.getStatus() == OcrSessionStatus.CLOSED) {
            throw new DomainException(ErrorCode.OCR_SESSION_CLOSED);
        }

        String device = (request != null && request.deviceName() != null && !request.deviceName().isBlank())
                ? request.deviceName()
                : "Thiết bị di động";

        session.setStatus(OcrSessionStatus.CONNECTED);
        session.setConnectedStaffName(staffUsername);
        session.setConnectedDevice(device);

        log.info("Mobile staff user={} ({}) joined OCR scan session code={}", staffUsername, device, sessionCode);

        ocrSessionEventPublisherPort.publishToSession(
                sessionCode,
                OcrSessionSocketEvent.connected(sessionCode, staffUsername, device)
        );

        return toResponse(session);
    }

    @Override
    public TicketScanResponse uploadAndScan(String sessionCode, MultipartFile file, UUID staffUserId) {
        OcrSessionModel session = requireActiveSession(sessionCode);
        if (session.getStatus() == OcrSessionStatus.CLOSED) {
            throw new DomainException(ErrorCode.OCR_SESSION_CLOSED);
        }

        log.info("Processing uploaded ticket image for OCR session code={} from user={}", sessionCode, staffUserId);

        TicketScanResponse response = ticketScanImportServicePort.scan(
                session.getImportBatchLineId(),
                session.getImportBatchId(),
                file,
                staffUserId
        );

        int addedCount = (response.tickets() != null) ? response.tickets().size() : 1;
        session.setScannedTicketCount(session.getScannedTicketCount() + addedCount);

        ocrSessionEventPublisherPort.publishToSession(
                sessionCode,
                OcrSessionSocketEvent.ticketScanned(
                        sessionCode,
                        response.scanId(),
                        response.tickets(),
                        session.getScannedTicketCount()
                )
        );

        return response;
    }

    @Override
    public void closeSession(String sessionCode, UUID userId) {
        OcrSessionModel session = activeSessions.get(sessionCode);
        if (session != null) {
            session.setStatus(OcrSessionStatus.CLOSED);
            activeSessions.remove(sessionCode);
            log.info("Closed OCR scan session code={} by user={}", sessionCode, userId);

            ocrSessionEventPublisherPort.publishToSession(
                    sessionCode,
                    OcrSessionSocketEvent.closed(sessionCode, "Phiên quét đã kết thúc.")
            );
        }
    }

    @Scheduled(fixedDelay = 60000)
    public void cleanupExpiredSessions() {
        activeSessions.entrySet().removeIf(entry -> {
            boolean expired = entry.getValue().isExpired();
            if (expired) {
                log.info("Evicting expired OCR session code={}", entry.getKey());
            }
            return expired;
        });
    }

    private OcrSessionModel requireActiveSession(String sessionCode) {
        OcrSessionModel session = activeSessions.get(sessionCode);
        if (session == null || session.isExpired()) {
            if (session != null) activeSessions.remove(sessionCode);
            throw new DomainException(ErrorCode.OCR_SESSION_NOT_FOUND);
        }
        return session;
    }

    private String generateUniqueSessionCode() {
        for (int i = 0; i < 20; i++) {
            String code = String.format("%06d", 100000 + random.nextInt(900000));
            if (!activeSessions.containsKey(code)) {
                return code;
            }
        }
        return String.valueOf(System.currentTimeMillis()).substring(7);
    }

    private OcrSessionResponse toResponse(OcrSessionModel session) {
        String qrToken = "daiphat://ocr-session?code=" + session.getSessionCode();
        return new OcrSessionResponse(
                session.getSessionCode(),
                session.getStatus(),
                session.getImportBatchId(),
                session.getImportBatchLineId(),
                session.getConnectedStaffName(),
                session.getConnectedDevice(),
                session.getScannedTicketCount(),
                session.getCreatedAt(),
                session.getExpiresAt(),
                qrToken
        );
    }
}
