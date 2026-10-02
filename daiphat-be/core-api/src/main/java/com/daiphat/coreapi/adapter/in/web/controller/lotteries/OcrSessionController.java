package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.CreateOcrSessionRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.JoinOcrSessionRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrSessionResponse;
import com.daiphat.coreapi.domain.model.lotteries.OcrSessionImage;
import com.daiphat.coreapi.application.port.in.lotteries.OcrSessionServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/lottery-tickets/ocr-sessions")
@RequiredArgsConstructor
@Validated
@Slf4j
public class OcrSessionController {

    private final OcrSessionServicePort ocrSessionServicePort;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_STAFF', 'importBatch:create', 'ticket:create')")
    public ApiResponse<OcrSessionResponse> createSession(
            @Valid @RequestBody(required = false) CreateOcrSessionRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        log.info("REST request to create OCR scan session by user: {}", principal.getUsername());
        OcrSessionResponse response = ocrSessionServicePort.createSession(
                request,
                principal.getId(),
                principal.getUsername()
        );
        return ApiResponse.success("Tạo phiên quét vé thành công.", response);
    }

    @GetMapping("/{sessionCode}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_STAFF', 'importBatch:create', 'ticket:create', 'ticket:view')")
    public ApiResponse<OcrSessionResponse> getSession(@PathVariable String sessionCode) {
        return ApiResponse.success(
                "Lấy thông tin phiên quét vé thành công.",
                ocrSessionServicePort.getSession(sessionCode)
        );
    }

    @PostMapping("/{sessionCode}/join")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_STAFF', 'importBatch:create', 'ticket:create')")
    public ApiResponse<OcrSessionResponse> joinSession(
            @PathVariable String sessionCode,
            @Valid @RequestBody(required = false) JoinOcrSessionRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        log.info("REST request by user: {} to join OCR session: {}", principal.getUsername(), sessionCode);
        OcrSessionResponse response = ocrSessionServicePort.joinSession(
                sessionCode,
                request,
                principal.getId(),
                principal.getUsername()
        );
        return ApiResponse.success("Tham gia phiên quét vé thành công.", response);
    }

    @PostMapping(value = "/{sessionCode}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_STAFF', 'importBatch:create', 'ticket:create')")
    public ApiResponse<OcrSessionImage> uploadImage(
            @PathVariable String sessionCode,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        log.info("REST request by user: {} to upload ticket image to session: {}", principal.getUsername(), sessionCode);
        OcrSessionImage response = ocrSessionServicePort.uploadImage(sessionCode, file, principal.getId());
        return ApiResponse.success("Đã gửi ảnh sang Web. Bấm Bắt đầu quét trên Web để nhận diện vé.", response);
    }

    @PostMapping("/{sessionCode}/close")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_STAFF', 'importBatch:create', 'ticket:create')")
    public ApiResponse<Void> closeSession(
            @PathVariable String sessionCode,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        log.info("REST request by user: {} to close OCR session: {}", principal.getUsername(), sessionCode);
        ocrSessionServicePort.closeSession(sessionCode, principal.getId());
        return ApiResponse.success("Đóng phiên quét vé thành công.", null);
    }
}
