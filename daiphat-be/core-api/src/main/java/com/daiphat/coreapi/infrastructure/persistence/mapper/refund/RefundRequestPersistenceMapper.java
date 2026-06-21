package com.daiphat.coreapi.infrastructure.persistence.mapper.refund;

import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.RefundRequestEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.UserBankAccountEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RefundRequestPersistenceMapper {

    @Mapping(target = "orderId", source = "order.id")
    @Mapping(target = "orderDetailId", source = "orderDetail.id")
    @Mapping(target = "requestedBy", source = "requestedBy.id")
    @Mapping(target = "bankAccountId", source = "bankAccount.id")
    @Mapping(target = "reviewedBy", source = "reviewedBy.id")
    @Mapping(target = "transferredBy", source = "transferredBy.id")
    RefundRequestModel toDomain(RefundRequestEntity entity);

    @Mapping(target = "order", source = "orderId")
    @Mapping(target = "orderDetail", source = "orderDetailId")
    @Mapping(target = "requestedBy", source = "requestedBy")
    @Mapping(target = "bankAccount", source = "bankAccountId")
    @Mapping(target = "reviewedBy", source = "reviewedBy")
    @Mapping(target = "transferredBy", source = "transferredBy")
    RefundRequestEntity toEntity(RefundRequestModel domain);

    default OrderEntity mapOrderId(UUID orderId) {
        if (orderId == null) {
            return null;
        }
        OrderEntity order = new OrderEntity();
        order.setId(orderId);
        return order;
    }

    default OrderDetailEntity mapOrderDetailId(Long orderDetailId) {
        if (orderDetailId == null) {
            return null;
        }
        OrderDetailEntity detail = new OrderDetailEntity();
        detail.setId(orderDetailId);
        return detail;
    }

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
