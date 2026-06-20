package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.dto.request.refund.CreateUserBankAccountRequest;
import com.daiphat.coreapi.application.dto.request.refund.UpdateUserBankAccountRequest;
import com.daiphat.coreapi.application.dto.response.refund.UserBankAccountResponse;
import com.daiphat.coreapi.application.dto.response.refund.VietQrBankResponse;
import com.daiphat.coreapi.application.mapper.refund.RefundApplicationMapper;
import com.daiphat.coreapi.application.port.in.refund.UserBankAccountServicePort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.VietQrGatewayPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;
import com.daiphat.coreapi.domain.model.refund.VietQrBankModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserBankAccountService implements UserBankAccountServicePort {

    private final UserBankAccountRepositoryPort userBankAccountRepositoryPort;
    private final RefundRequestRepositoryPort refundRequestRepositoryPort;
    private final VietQrGatewayPort vietQrGatewayPort;
    private final RefundApplicationMapper refundApplicationMapper;

    @Override
    @Transactional(readOnly = true)
    public List<UserBankAccountResponse> getMyAccounts(UUID userId) {
        return refundApplicationMapper.toBankAccountResponses(
                userBankAccountRepositoryPort.findByUserId(userId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<VietQrBankResponse> getSupportedBanks() {
        return refundApplicationMapper.toBankResponses(vietQrGatewayPort.getBanks());
    }

    @Override
    @Transactional
    public UserBankAccountResponse create(UUID userId, CreateUserBankAccountRequest request) {
        log.info("Creating bank account for user {}", userId);

        VietQrBankModel bank = resolveBank(request.bankBin());
        validateDuplicate(userId, bank.getBin(), request.bankAccountNo(), null);

        boolean shouldDefault = resolveDefaultFlag(userId, request.isDefault());
        if (shouldDefault) {
            userBankAccountRepositoryPort.clearDefaultByUserId(userId);
        }

        UserBankAccountModel account = UserBankAccountModel.builder()
                .userId(userId)
                .bankAccountNo(request.bankAccountNo().trim())
                .bankAccountName(request.bankAccountName().trim())
                .isDefault(shouldDefault)
                .build();
        account.applyBankMetadata(bank.getName(), bank.getLogo(), bank.getBin());

        return refundApplicationMapper.toBankAccountResponse(
                userBankAccountRepositoryPort.save(account));
    }

    @Override
    @Transactional
    public UserBankAccountResponse update(UUID userId, Long id, UpdateUserBankAccountRequest request) {
        UserBankAccountModel account = getOwnedAccount(userId, id);

        VietQrBankModel bank = resolveBank(request.bankBin());
        validateDuplicate(userId, bank.getBin(), request.bankAccountNo(), id);

        boolean shouldDefault = Boolean.TRUE.equals(request.isDefault());
        if (shouldDefault && !account.isDefault()) {
            userBankAccountRepositoryPort.clearDefaultByUserId(userId);
        }

        account.setBankAccountNo(request.bankAccountNo().trim());
        account.setBankAccountName(request.bankAccountName().trim());
        account.applyBankMetadata(bank.getName(), bank.getLogo(), bank.getBin());
        account.setDefault(shouldDefault);

        return refundApplicationMapper.toBankAccountResponse(
                userBankAccountRepositoryPort.save(account));
    }

    @Override
    @Transactional
    public void delete(UUID userId, Long id) {
        UserBankAccountModel account = getOwnedAccount(userId, id);
        boolean wasDefault = account.isDefault();

        if (refundRequestRepositoryPort.existsPendingByBankAccountId(id)) {
            throw new DomainException(ErrorCode.USER_BANK_ACCOUNT_IN_USE);
        }

        userBankAccountRepositoryPort.deleteById(id);

        if (wasDefault) {
            userBankAccountRepositoryPort.findByUserId(userId).stream()
                    .findFirst()
                    .ifPresent(remaining -> {
                        remaining.markAsDefault();
                        userBankAccountRepositoryPort.save(remaining);
                    });
        }
    }

    @Override
    @Transactional
    public UserBankAccountResponse setDefault(UUID userId, Long id) {
        UserBankAccountModel account = getOwnedAccount(userId, id);

        if (!account.isDefault()) {
            userBankAccountRepositoryPort.clearDefaultByUserId(userId);
            account.markAsDefault();
            account = userBankAccountRepositoryPort.save(account);
        }

        return refundApplicationMapper.toBankAccountResponse(account);
    }

    private UserBankAccountModel getOwnedAccount(UUID userId, Long id) {
        return userBankAccountRepositoryPort.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_BANK_ACCOUNT_NOT_FOUND));
    }

    private VietQrBankModel resolveBank(String bankBin) {
        return vietQrGatewayPort.findByBin(bankBin)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_BANK_ACCOUNT_INVALID_BIN));
    }

    private void validateDuplicate(UUID userId, String bankBin, String bankAccountNo, Long excludeId) {
        boolean exists = excludeId == null
                ? userBankAccountRepositoryPort.existsByUserIdAndBankBinAndAccountNo(
                        userId, bankBin, bankAccountNo.trim())
                : userBankAccountRepositoryPort.existsByUserIdAndBankBinAndAccountNoAndIdNot(
                        userId, bankBin, bankAccountNo.trim(), excludeId);
        if (exists) {
            throw new DomainException(ErrorCode.USER_BANK_ACCOUNT_DUPLICATE);
        }
    }

    private boolean resolveDefaultFlag(UUID userId, Boolean requestedDefault) {
        long existingCount = userBankAccountRepositoryPort.countByUserId(userId);
        if (existingCount == 0) {
            return true;
        }
        return Boolean.TRUE.equals(requestedDefault);
    }
}
