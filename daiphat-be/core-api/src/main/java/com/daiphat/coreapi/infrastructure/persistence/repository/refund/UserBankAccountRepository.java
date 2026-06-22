package com.daiphat.coreapi.infrastructure.persistence.repository.refund;

import com.daiphat.coreapi.infrastructure.persistence.entity.refund.UserBankAccountEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserBankAccountRepository extends JpaRepository<UserBankAccountEntity, Long> {

    List<UserBankAccountEntity> findByUser_IdOrderByIsDefaultDescCreatedAtAsc(UUID userId);

    Optional<UserBankAccountEntity> findByIdAndUser_Id(Long id, UUID userId);

    boolean existsByUser_IdAndBankBinAndBankAccountNo(UUID userId, String bankBin, String bankAccountNo);

    boolean existsByUser_IdAndBankBinAndBankAccountNoAndIdNot(
            UUID userId, String bankBin, String bankAccountNo, Long id);

    long countByUser_Id(UUID userId);

    @Modifying(clearAutomatically = true)
    @Query("""
            update UserBankAccountEntity a
            set a.isDefault = false
            where a.user.id = :userId
              and a.isDefault = true
            """)
    void clearDefaultByUserId(@Param("userId") UUID userId);
}
