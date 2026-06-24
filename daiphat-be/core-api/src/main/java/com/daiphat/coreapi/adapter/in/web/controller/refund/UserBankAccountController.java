package com.daiphat.coreapi.adapter.in.web.controller.refund;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.refund.CreateUserBankAccountRequest;
import com.daiphat.coreapi.application.dto.request.refund.UpdateUserBankAccountRequest;
import com.daiphat.coreapi.application.dto.response.refund.UserBankAccountResponse;
import com.daiphat.coreapi.application.port.in.refund.UserBankAccountServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/users/me/bank-accounts")
@RequiredArgsConstructor
@Validated
public class UserBankAccountController {

    private static final String ID_PATH = "/{id}";

    private final UserBankAccountServicePort userBankAccountServicePort;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<UserBankAccountResponse>> getMyAccounts(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Lấy danh sách tài khoản ngân hàng thành công.",
                userBankAccountServicePort.getMyAccounts(principal.getId()));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<UserBankAccountResponse> create(
            @Valid @RequestBody CreateUserBankAccountRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Thêm tài khoản ngân hàng thành công.",
                userBankAccountServicePort.create(principal.getId(), request));
    }

    @PutMapping(ID_PATH)
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<UserBankAccountResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserBankAccountRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Cập nhật tài khoản ngân hàng thành công.",
                userBankAccountServicePort.update(principal.getId(), id, request));
    }

    @DeleteMapping(ID_PATH)
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        userBankAccountServicePort.delete(principal.getId(), id);
        return ApiResponse.success("Xóa tài khoản ngân hàng thành công.", null);
    }

    @PatchMapping(ID_PATH + "/default")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<UserBankAccountResponse> setDefault(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Đặt tài khoản mặc định thành công.",
                userBankAccountServicePort.setDefault(principal.getId(), id));
    }
}
