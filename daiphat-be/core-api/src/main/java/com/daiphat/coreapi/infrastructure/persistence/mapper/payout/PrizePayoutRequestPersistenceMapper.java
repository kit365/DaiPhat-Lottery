package com.daiphat.coreapi.infrastructure.persistence.mapper.payout;

import com.daiphat.coreapi.domain.model.payout.PrizePayoutRequestModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.payout.PrizePayoutRequestEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.UserBankAccountEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface PrizePayoutRequestPersistenceMapper {

    @Mapping(target = "customerId", source = "customer.id")
    @Mapping(target = "orderId", source = "order.id")
    @Mapping(target = "orderDetailId", source = "orderDetail.id")
    @Mapping(target = "serialId", source = "serial.id")
    @Mapping(target = "bankAccountId", source = "bankAccount.id")
    @Mapping(target = "completedBy", source = "completedBy.id")
    PrizePayoutRequestModel toDomain(PrizePayoutRequestEntity entity);

    @Mapping(target = "customer", source = "customerId")
    @Mapping(target = "order", source = "orderId")
    @Mapping(target = "orderDetail", source = "orderDetailId")
    @Mapping(target = "serial", source = "serialId")
    @Mapping(target = "bankAccount", source = "bankAccountId")
    @Mapping(target = "completedBy", source = "completedBy")
    PrizePayoutRequestEntity toEntity(PrizePayoutRequestModel model);

    default UserEntity mapUserId(UUID userId) {
        if (userId == null) {
            return null;
        }
        UserEntity user = new UserEntity();
        user.setId(userId);
        return user;
    }

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

    default LotteryTicketSerialEntity mapSerialId(Long serialId) {
        if (serialId == null) {
            return null;
        }
        LotteryTicketSerialEntity serial = new LotteryTicketSerialEntity();
        serial.setId(serialId);
        return serial;
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
