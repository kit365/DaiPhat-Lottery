package com.daiphat.coreapi.application.port.in.refund;

import com.daiphat.coreapi.application.dto.request.refund.CreateUserBankAccountRequest;
import com.daiphat.coreapi.application.dto.request.refund.UpdateUserBankAccountRequest;
import com.daiphat.coreapi.application.dto.response.refund.UserBankAccountResponse;
import com.daiphat.coreapi.application.dto.response.refund.VietQrBankResponse;

import java.util.List;
import java.util.UUID;

public interface UserBankAccountServicePort {

    List<UserBankAccountResponse> getMyAccounts(UUID userId);

    UserBankAccountResponse create(UUID userId, CreateUserBankAccountRequest request);

    UserBankAccountResponse update(UUID userId, Long id, UpdateUserBankAccountRequest request);

    void delete(UUID userId, Long id);

    UserBankAccountResponse setDefault(UUID userId, Long id);

    List<VietQrBankResponse> getSupportedBanks();
}
