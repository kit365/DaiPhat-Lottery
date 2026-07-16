package com.daiphat.coreapi.adapter.in.web.controller.refund;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.response.refund.UserBankAccountResponse;
import com.daiphat.coreapi.application.port.in.refund.UserBankAccountServicePort;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/staff/users")
@RequiredArgsConstructor
@Validated
public class StaffUserBankAccountController {

    private final UserBankAccountServicePort userBankAccountServicePort;

    @GetMapping("/{userId}/bank-accounts")
    @PreAuthorize("hasAuthority('refund:view') or hasAuthority('refund:process')")
    public ApiResponse<List<UserBankAccountResponse>> getUserBankAccounts(@PathVariable UUID userId) {
        return ApiResponse.success(
                "Lấy danh sách tài khoản ngân hàng của khách hàng thành công.",
                userBankAccountServicePort.getMyAccounts(userId));
    }
}
