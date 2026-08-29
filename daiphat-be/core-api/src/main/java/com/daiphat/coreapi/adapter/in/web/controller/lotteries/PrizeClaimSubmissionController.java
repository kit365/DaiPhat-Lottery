package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeClaimEligibleTicketResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeClaimSubmissionLineResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeClaimSubmissionResponse;
import com.daiphat.coreapi.application.service.lotteries.PrizeClaimSubmissionService;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimRejectionReason;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
 * Quyền: prizePayout:view (xem) / prizePayout:process (tạo, submit, complete)
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

    // ─── Draft ─────────────────────────────────────────────────────────

    @PostMapping("/drafts")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<PrizeClaimSubmissionResponse> createDraft(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        Long supplierId = ((Number) body.get("supplierId")).longValue();
        var draft = pcsService.createDraft(supplierId);
        return ApiResponse.success("Đã tạo phiếu nộp mới.", pcsService.toResponse(draft));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('prizePayout:view')")
    public ApiResponse<List<PrizeClaimSubmissionResponse>> list(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) String status) {
        return ApiResponse.success("Lấy danh sách phiếu nộp thành công.", pcsService.list(supplierId, status));
    }

    /**
     * Vé đã trả thưởng, đúng nhà đài, chưa nằm trong phiếu nộp active.
     */
    @GetMapping("/eligible-tickets")
    @PreAuthorize("hasAuthority('prizePayout:view')")
    public ApiResponse<List<PrizeClaimEligibleTicketResponse>> listEligibleTickets(
            @RequestParam Long supplierId,
            @RequestParam(required = false) LocalDate periodFrom,
            @RequestParam(required = false) LocalDate periodTo) {
        return ApiResponse.success(
                "Lấy danh sách vé đủ điều kiện nộp thành công.",
                pcsService.listEligibleTickets(supplierId, periodFrom, periodTo));
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAuthority('prizePayout:view')")
    public ApiResponse<PrizeClaimSubmissionResponse> getById(@PathVariable Long id) {
        return ApiResponse.success("Lấy chi tiết phiếu nộp thành công.", pcsService.getById(id));
    }

    // ─── Lines ────────────────────────────────────────────────────────

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

    // ─── Status Transitions ────────────────────────────────────────────

    /**
     * Từ chối vé — nhà đài không chấp nhận.
     * Body: { lineId, rejectionType: "RETRYABLE" | "FINAL", reason, note }
     */
    @PostMapping("/{id}/reject-line")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<Void> rejectLine(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> body) {
        Long lineId = ((Number) body.get("lineId")).longValue();
        String rejectionType = (String) body.get("rejectionType");
        String reason = (String) body.get("reason");
        String note = (String) body.get("note");

        var rejectionReason = PrizeClaimRejectionReason.valueOf(reason);
        pcsService.rejectLine(lineId, rejectionType, rejectionReason, note);
        return ApiResponse.success("Đã từ chối vé.", null);
    }

    @PostMapping(ID_PATH + "/submit")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<Void> submit(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        UUID submittedBy = principal.getId();
        pcsService.submit(id, submittedBy);
        return ApiResponse.success("Đã gửi phiếu nộp.", null);
    }

    /**
     * Xác nhận từ nhà đài — maker-checker bắt buộc.
     * Body: { confirmedBy, confirmationReference, confirmationEvidenceUrl }
     */
    @PostMapping(ID_PATH + "/confirm")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<Void> confirm(
            @PathVariable Long id,
            @RequestBody @Valid Map<String, Object> body,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        UUID confirmedBy = principal.getId();
        String confRef = (String) body.get("confirmationReference");
        String confEvidence = (String) body.get("confirmationEvidenceUrl");
        pcsService.confirm(id, confRef, confEvidence, confirmedBy);
        return ApiResponse.success("Đã xác nhận từ nhà đài.", null);
    }

    @PostMapping(ID_PATH + "/mark-payment-pending")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<Void> markPaymentPending(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        pcsService.markPaymentPending(id);
        return ApiResponse.success("Đã chuyển sang chờ thanh toán.", null);
    }

    /**
     * Hoàn thành — maker-checker bắt buộc.
     * Body: { completedBy, paidAmount, paymentEvidenceUrls[], paymentNote }
     */
    @PostMapping(ID_PATH + "/complete")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<Void> complete(
            @PathVariable Long id,
            @RequestBody @Valid Map<String, Object> body,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        UUID completedBy = principal.getId();
        java.math.BigDecimal paidAmount = new java.math.BigDecimal(body.get("paidAmount").toString());
        var evidenceUrls = (java.util.List<String>) body.get("paymentEvidenceUrls");
        String paymentNote = (String) body.get("paymentNote");
        pcsService.complete(id, paidAmount, evidenceUrls, paymentNote, completedBy);
        return ApiResponse.success("Đã hoàn thành phiếu nộp.", null);
    }

    /**
     * Hủy phiếu — SUBMITTED+ cần maker-checker.
     * Body: { cancelReason?, cancelledBy, approvedBy }
     */
    @PostMapping(ID_PATH + "/cancel")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<Void> cancel(
            @PathVariable Long id,
            @RequestBody @Valid Map<String, Object> body,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        UUID cancelledBy = principal.getId();
        UUID approvedBy = parseOptionalUuid(body.get("approvedBy"), "Mã người duyệt hủy không hợp lệ.");
        String cancelReason = (String) body.get("cancelReason");
        pcsService.cancel(id, cancelReason, cancelledBy, approvedBy);
        return ApiResponse.success("Đã hủy phiếu nộp.", null);
    }

    /**
     * Đóng khoản nợ nhà đài — gọi khi nhà đài trả bù cho submission bị UNDERPAID.
     */
    @PostMapping(ID_PATH + "/settle-outstanding")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<Void> settleOutstanding(
            @PathVariable Long id,
            @RequestBody @Valid Map<String, Object> body,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        UUID settledBy = principal.getId();
        java.math.BigDecimal amount = new java.math.BigDecimal(body.get("additionalAmount").toString());
        String evidence = (String) body.get("evidence");
        pcsService.settleOutstandingReceivable(id, amount, evidence, settledBy);
        return ApiResponse.success("Đã ghi nhận thanh toán công nợ.", null);
    }

    private static UUID parseOptionalUuid(Object raw, String invalidMessage) {
        if (raw == null) {
            return null;
        }
        String value = raw.toString().trim();
        if (value.isEmpty()) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            throw new DomainException(ErrorCode.INVALID_INPUT, invalidMessage);
        }
    }
}
