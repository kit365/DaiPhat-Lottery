package com.daiphat.coreapi.infrastructure.persistence.mapper.refund;

import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.UserBankAccountEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserBankAccountPersistenceMapper {

    @Mapping(target = "userId", source = "user.id")
    UserBankAccountModel toDomain(UserBankAccountEntity entity);

    @Mapping(target = "user", source = "userId")
    UserBankAccountEntity toEntity(UserBankAccountModel domain);

    default UserEntity mapUserId(UUID userId) {
        if (userId == null) {
            return null;
        }
        UserEntity user = new UserEntity();
        user.setId(userId);
        return user;
    }
}
