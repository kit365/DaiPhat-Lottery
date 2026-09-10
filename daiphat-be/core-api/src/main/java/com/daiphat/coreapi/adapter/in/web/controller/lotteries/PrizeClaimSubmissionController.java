package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmPrizeClaimHandoverRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmPrizeClaimInspectionRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.RecordLineOutcomeRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdatePrizeClaimActualReceivedRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeClaimEligibleTicketResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeClaimSubmissionExportResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeClaimSubmissionLineResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeClaimSubmissionResponse;
import com.daiphat.coreapi.application.service.lotteries.PrizeClaimSubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Staff controller cho PrizeClaimSubmission.
 * Quyền: prizePayout:view (xem) / prizePayout:process (tạo, kiểm, bàn giao, ghi nhận kết quả)
 */
@RestController
@RequestMapping(ApiConstants.API_V1 + "/prize-claim-submissions")
@RequiredArgsConstructor
@Validated
public class PrizeClaimSubmissionController {

    private final PrizeClaimSubmissionService pcsService;

    private static final String ID_PATH = "/{id}";
    private static final String LINES = "/lines";
    private static final String LINE_ID = "/{lineId}";

    @GetMapping(ID_PATH + "/export")
    @PreAuthorize("hasAuthority('prizePayout:view')")
    public ResponseEntity<byte[]> export(@PathVariable Long id) {
        PrizeClaimSubmissionExportResponse export = pcsService.export(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(export.fileName()).build().toString())
                .body(export.content());
    }

    @PostMapping("/drafts")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<PrizeClaimSubmissionResponse> createDraft(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        var draft = pcsService.createDraft();
        return ApiResponse.success("Đã tạo phiếu nộp mới.", pcsService.toResponse(draft));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('prizePayout:view')")
    public ApiResponse<List<PrizeClaimSubmissionResponse>> list(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        return ApiResponse.success(
                "Lấy danh sách phiếu nộp thành công.",
                pcsService.list(supplierId, status, search));
    }

    @GetMapping("/eligible-tickets")
    @PreAuthorize("hasAuthority('prizePayout:view')")
    public ApiResponse<List<PrizeClaimEligibleTicketResponse>> listEligibleTickets(
            @RequestParam(required = false) LocalDate periodFrom,
            @RequestParam(required = false) LocalDate periodTo) {
        return ApiResponse.success(
                "Lấy danh sách vé đủ điều kiện nộp thành công.",
                pcsService.listEligibleTickets(periodFrom, periodTo));
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAuthority('prizePayout:view')")
    public ApiResponse<PrizeClaimSubmissionResponse> getById(@PathVariable Long id) {
        return ApiResponse.success("Lấy chi tiết phiếu nộp thành công.", pcsService.getById(id));
    }

    @GetMapping(ID_PATH + LINES)
    @PreAuthorize("hasAuthority('prizePayout:view')")
    public ApiResponse<List<PrizeClaimSubmissionLineResponse>> getLines(@PathVariable Long id) {
        return ApiResponse.success("Lấy danh sách vé thành công.", pcsService.getLines(id));
    }

    @PostMapping(ID_PATH + LINES)
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<PrizeClaimSubmissionLineResponse> addLine(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        Long serialId = ((Number) body.get("serialId")).longValue();
        var line = pcsService.addLine(id, serialId);
        return ApiResponse.success("Đã thêm vé vào phiếu nộp.", pcsService.toLineResponse(line));
    }

    @PostMapping(ID_PATH + LINES + "/bulk")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<List<PrizeClaimSubmissionLineResponse>> addLines(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        @SuppressWarnings("unchecked")
        List<Number> rawIds = (List<Number>) body.get("serialIds");
        List<Long> serialIds = rawIds.stream().map(Number::longValue).toList();
        return ApiResponse.success("Đã thêm vé vào phiếu nộp.", pcsService.addLines(id, serialIds));
    }

    @DeleteMapping(ID_PATH + LINES + LINE_ID)
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<Void> removeLine(
            @PathVariable Long id,
            @PathVariable Long lineId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        pcsService.removeLine(id, lineId);
        return ApiResponse.success("Đã xóa vé khỏi phiếu nộp.", null);
    }

    @PostMapping(ID_PATH + "/start-inspection")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<PrizeClaimSubmissionResponse> startInspection(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success("Đã bắt đầu kiểm tra.", pcsService.startInspection(id));
    }

    @PostMapping(ID_PATH + "/confirm-inspection")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<PrizeClaimSubmissionResponse> confirmInspection(
            @PathVariable Long id,
            @RequestBody @Valid ConfirmPrizeClaimInspectionRequest body,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Đã xác nhận kiểm tra xong.",
                pcsService.confirmInspection(id, body, principal.getId()));
    }

    @PostMapping(ID_PATH + "/confirm-handover")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<PrizeClaimSubmissionResponse> confirmHandover(
            @PathVariable Long id,
            @RequestBody @Valid ConfirmPrizeClaimHandoverRequest body,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Đã xác nhận bàn giao.",
                pcsService.confirmHandover(id, body, principal.getId()));
    }

    @PatchMapping(ID_PATH + "/actual-received")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<PrizeClaimSubmissionResponse> updateActualReceivedAmount(
            @PathVariable Long id,
            @RequestBody @Valid UpdatePrizeClaimActualReceivedRequest body) {
        return ApiResponse.success(
                "Đã cập nhật số tiền thực nhận.",
                pcsService.updateActualReceivedAmount(id, body));
    }

    @PostMapping(ID_PATH + LINES + LINE_ID + "/record-outcome")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<Void> recordLineOutcome(
            @PathVariable Long id,
            @PathVariable Long lineId,
            @RequestBody @Valid RecordLineOutcomeRequest body) {
        pcsService.recordOutcome(
                id,
                lineId,
                body.getOutcome(),
                body.getReason(),
                body.getNote(),
                body.getOutcomeEvidenceUrl());
        return ApiResponse.success("Đã ghi nhận kết quả vé.", null);
    }

    @PostMapping(ID_PATH + "/cancel")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<Void> cancel(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        UUID cancelledBy = principal.getId();
        String cancelReason = body != null ? (String) body.get("cancelReason") : null;
        pcsService.cancel(id, cancelReason, cancelledBy);
        return ApiResponse.success("Đã hủy phiếu nộp.", null);
    }
}
