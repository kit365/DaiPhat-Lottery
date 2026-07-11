package com.daiphat.coreapi.infrastructure.persistence.mapper.refund;

import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.RefundRequestEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.UserBankAccountEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RefundRequestPersistenceMapper {

    @Mapping(target = "orderId", ignore = true)
    @Mapping(target = "orderDetailIds", ignore = true)
    @Mapping(target = "requestedBy", source = "requestedBy.id")
    @Mapping(target = "bankAccountId", source = "bankAccount.id")
    @Mapping(target = "reviewedBy", source = "reviewedBy.id")
    @Mapping(target = "transferredBy", source = "transferredBy.id")
    RefundRequestModel toDomain(RefundRequestEntity entity);

    @Mapping(target = "orderDetails", ignore = true)
    @Mapping(target = "requestedBy", source = "requestedBy")
    @Mapping(target = "bankAccount", source = "bankAccountId")
    @Mapping(target = "reviewedBy", source = "reviewedBy")
    @Mapping(target = "transferredBy", source = "transferredBy")
    RefundRequestEntity toEntity(RefundRequestModel domain);

    default UserEntity mapUserId(UUID userId) {
        if (userId == null) {
            return null;
        }
        UserEntity user = new UserEntity();
        user.setId(userId);
        return user;
    }

    default UserBankAccountEntity mapBankAccountId(Long bankAccountId) {
        if (bankAccountId == null) {
            return null;
        }
        UserBankAccountEntity account = new UserBankAccountEntity();
        account.setId(bankAccountId);
        return account;
    }
}
