package com.daiphat.coreapi.application.port.out.refund;

import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserBankAccountRepositoryPort {

    Optional<UserBankAccountModel> findById(Long id);

    Optional<UserBankAccountModel> findByIdAndUserId(Long id, UUID userId);

    List<UserBankAccountModel> findByUserId(UUID userId);

    UserBankAccountModel save(UserBankAccountModel account);

    void deleteById(Long id);

    void clearDefaultByUserId(UUID userId);

    boolean existsByUserIdAndBankBinAndAccountNo(UUID userId, String bankBin, String bankAccountNo);

    boolean existsByUserIdAndBankBinAndAccountNoAndIdNot(
            UUID userId, String bankBin, String bankAccountNo, Long id);

    long countByUserId(UUID userId);
}
