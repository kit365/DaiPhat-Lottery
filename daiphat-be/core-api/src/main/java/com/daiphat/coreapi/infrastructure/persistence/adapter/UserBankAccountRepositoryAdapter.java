package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.refund.UserBankAccountPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.refund.UserBankAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class UserBankAccountRepositoryAdapter implements UserBankAccountRepositoryPort {

    private final UserBankAccountRepository userBankAccountRepository;
    private final UserBankAccountPersistenceMapper userBankAccountPersistenceMapper;

    @Override
    public Optional<UserBankAccountModel> findById(Long id) {
        return userBankAccountRepository.findById(id)
                .map(userBankAccountPersistenceMapper::toDomain);
    }

    @Override
    public Optional<UserBankAccountModel> findByIdAndUserId(Long id, UUID userId) {
        return userBankAccountRepository.findByIdAndUser_Id(id, userId)
                .map(userBankAccountPersistenceMapper::toDomain);
    }

    @Override
    public List<UserBankAccountModel> findByUserId(UUID userId) {
        return userBankAccountRepository.findByUser_IdOrderByIsDefaultDescCreatedAtAsc(userId).stream()
                .map(userBankAccountPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public UserBankAccountModel save(UserBankAccountModel account) {
        var entity = userBankAccountPersistenceMapper.toEntity(account);
        return userBankAccountPersistenceMapper.toDomain(userBankAccountRepository.save(entity));
    }

    @Override
    public void deleteById(Long id) {
        userBankAccountRepository.deleteById(id);
    }

    @Override
    public void clearDefaultByUserId(UUID userId) {
        userBankAccountRepository.clearDefaultByUserId(userId);
    }

    @Override
    public boolean existsByUserIdAndBankBinAndAccountNo(UUID userId, String bankBin, String bankAccountNo) {
        return userBankAccountRepository.existsByUser_IdAndBankBinAndBankAccountNo(userId, bankBin, bankAccountNo);
    }

    @Override
    public boolean existsByUserIdAndBankBinAndAccountNoAndIdNot(
            UUID userId, String bankBin, String bankAccountNo, Long id) {
        return userBankAccountRepository.existsByUser_IdAndBankBinAndBankAccountNoAndIdNot(
                userId, bankBin, bankAccountNo, id);
    }

    @Override
    public long countByUserId(UUID userId) {
        return userBankAccountRepository.countByUser_Id(userId);
    }
}
