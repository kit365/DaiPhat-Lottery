package com.daiphat.coreapi.adapter.in.web.controller.payout;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.service.payout.PrizePayoutPartialPayoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * Controller cho Partial Payout operations.
 * Bao gồm: payout, payoutPartial, payFinalInstallment, writeOffRemaining, fundPreview.
 */
@RestController
@RequestMapping(ApiConstants.API_V1 + "/prize-payout-requests")
@RequiredArgsConstructor
@Validated
public class PrizePayoutPartialController {

    private final PrizePayoutPartialPayoutService partialPayoutService;

    private static final String PAYOUT = "/{id}/payout";
    private static final String PAYOUT_PARTIAL = "/{id}/payout-partial";
    private static final String PAYOUT_FINAL = "/{id}/pay-final-installment";
    private static final String WRITE_OFF = "/{id}/write-off-remaining";
    private static final String FUND_PREVIEW = "/fund-preview";

    // ─── Partial Payout ────────────────────────────────────────────────

    /**
     * Trả đủ — tự lấy totalPrizeAmount từ request.
     * Nếu quỹ không đủ → chuyển tự động sang payoutPartial.
     */
    @PostMapping(PAYOUT)
    @PreAuthorize("hasAuthority('PRIZE_PAYOUT_PROCESS')")
    public ApiResponse<Void> payout(
            @PathVariable("id") Long requestId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        String method = (String) body.get("method");
        UUID paidBy = principal.getId();
        partialPayoutService.payout(requestId,
                com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutPaymentMethod.valueOf(method),
                paidBy);
        return ApiResponse.success("Đã trả thưởng thành công.", null);
    }

    /**
     * Trả 1 phần — khi quỹ không đủ trả hết.
     * Tạo phiếu cam kết chi trả.
     */
    @PostMapping(PAYOUT_PARTIAL)
    @PreAuthorize("hasAuthority('PRIZE_PAYOUT_PROCESS')")
    public ApiResponse<Void> payoutPartial(
            @PathVariable("id") Long requestId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        BigDecimal availableAmount = new BigDecimal(body.get("availableAmount").toString());
        String note = (String) body.get("note");
        String method = (String) body.get("method");
        UUID paidBy = principal.getId();

        partialPayoutService.payoutPartial(
                requestId, availableAmount, note, paidBy,
                com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutPaymentMethod.valueOf(method));
        return ApiResponse.success("Đã trả một phần. Phiếu cam kết chi trả đã được tạo.", null);
    }

    /**
     * Trả đợt cuối — khi có thêm quỹ về sau khi payoutPartial.
     */
    @PostMapping(PAYOUT_FINAL)
    @PreAuthorize("hasAuthority('PRIZE_PAYOUT_PROCESS')")
    public ApiResponse<Void> payFinalInstallment(
            @PathVariable("id") Long requestId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        String evidence = (String) body.get("evidence");
        String method = (String) body.get("method");
        UUID paidBy = principal.getId();

        partialPayoutService.payFinalInstallment(
                requestId, amount, evidence, paidBy,
                com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutPaymentMethod.valueOf(method));
        return ApiResponse.success("Đã trả đợt cuối.", null);
    }

    /**
     * Khách từ bỏ phần còn lại — write off nghĩa vụ.
     * Nếu remaining >= 10M → cần MANAGER role.
     */
    @PostMapping(WRITE_OFF)
    @PreAuthorize("hasAuthority('PRIZE_PAYOUT_PROCESS')")
    public ApiResponse<Void> writeOffRemaining(
            @PathVariable("id") Long requestId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        String reason = (String) body.get("reason");
        UUID approvedBy = principal.getId();
        partialPayoutService.writeOffRemaining(requestId, reason, approvedBy);
        return ApiResponse.success("Đã xóa bỏ nghĩa vụ còn lại.", null);
    }

    /**
     * Kiểm tra quỹ trước khi payout — không lock.
     * Dùng cho UI preview.
     */
    @GetMapping(FUND_PREVIEW)
    @PreAuthorize("hasAuthority('PRIZE_PAYOUT_PROCESS')")
    public ApiResponse<Map<String, Object>> fundPreview(
            @RequestParam String agencyId,
            @RequestParam BigDecimal amount) {
        // TODO: implement via AgencyFundService.hasAvailableFunds()
        return ApiResponse.success("Kiểm tra quỹ thành công.", Map.of(
                "agencyId", agencyId,
                "requestedAmount", amount,
                "sufficient", false,
                "availableBalance", BigDecimal.ZERO));
    }
}
