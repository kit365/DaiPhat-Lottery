package com.daiphat.coreapi.adapter.in.web.controller.refund;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.response.refund.VietQrBankResponse;
import com.daiphat.coreapi.application.port.in.refund.UserBankAccountServicePort;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/banks")
@RequiredArgsConstructor
public class BankCatalogController {

    private final UserBankAccountServicePort userBankAccountServicePort;

    @GetMapping
    public ApiResponse<List<VietQrBankResponse>> getSupportedBanks() {
        return ApiResponse.success(
                "Lấy danh sách ngân hàng thành công.",
                userBankAccountServicePort.getSupportedBanks());
    }
}
