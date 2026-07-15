package com.daiphat.coreapi.application.mapper.order;

import com.daiphat.coreapi.application.dto.order.OrderTicketSnapshot;
import com.daiphat.coreapi.application.dto.request.order.CreateDirectOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.CreateOnlineOrderRequest;
import com.daiphat.coreapi.application.dto.response.order.OrderDetailResponse;
import com.daiphat.coreapi.application.dto.response.order.OrderResponse;
import com.daiphat.coreapi.application.dto.response.order.TransactionResponse;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.math.BigDecimal;
import java.util.List;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        imports = {OrderType.class, OrderReceiveType.class, TransactionType.class, OrderDetailStatus.class}
)
public interface OrderApplicationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "email", source = "email")
    @Mapping(target = "orderCode", ignore = true)
    @Mapping(target = "orderType", expression = "java(OrderType.ONLINE)")
    @Mapping(target = "receiveType", source = "receiveType")
    @Mapping(target = "totalAmount", ignore = true)
    @Mapping(target = "orderDetails", ignore = true)
    @Mapping(target = "transactions", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "expectedPickupAt", source = "expectedPickupAt")
    @Mapping(target = "cancelledAt", ignore = true)
    @Mapping(target = "cancelReason", ignore = true)
    @Mapping(target = "cancelType", ignore = true)
    @Mapping(target = "actualPickedUpAt", ignore = true)
    @Mapping(target = "pickedUpBy", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    OrderModel toOnlineOrderModel(CreateOnlineOrderRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "userId", source = "customerId")
    @Mapping(target = "email", source = "email")
    @Mapping(target = "orderCode", ignore = true)
    @Mapping(target = "orderType", expression = "java(OrderType.DIRECT)")
    @Mapping(target = "receiveType", source = "receiveType")
    @Mapping(target = "totalAmount", ignore = true)
    @Mapping(target = "orderDetails", ignore = true)
    @Mapping(target = "transactions", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "expectedPickupAt", ignore = true)
    @Mapping(target = "cancelledAt", ignore = true)
    @Mapping(target = "cancelReason", ignore = true)
    @Mapping(target = "cancelType", ignore = true)
    @Mapping(target = "actualPickedUpAt", ignore = true)
    @Mapping(target = "pickedUpBy", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    OrderModel toDirectOrderModel(CreateDirectOrderRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "orderId", ignore = true)
    @Mapping(target = "lotteryTicketId", source = "lotteryTicketId")
    @Mapping(target = "lotteryTicketSerialId", source = "lotteryTicketSerialId")
    @Mapping(target = "replacedByTicketId", ignore = true)
    @Mapping(target = "replacedByTicketSerialId", ignore = true)
    @Mapping(target = "price", source = "price")
    @Mapping(target = "status", expression = "java(OrderDetailStatus.ACTIVE)")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    OrderDetailModel toOrderDetailModel(OrderTicketSnapshot snapshot);

    OrderResponse toResponse(OrderModel model);

    OrderDetailResponse toDetailResponse(OrderDetailModel model);

    TransactionResponse toTransactionResponse(TransactionModel model);

    List<OrderDetailResponse> toDetailResponses(List<OrderDetailModel> models);

    List<TransactionResponse> toTransactionResponses(List<TransactionModel> models);

    default TransactionModel toOnlineTransactionModel(BigDecimal amount, String note) {
        return TransactionModel.builder()
                .type(TransactionType.ONLINE)
                .amount(amount)
                .note(note)
                .build();
    }

    default TransactionModel toDirectTransactionModel(TransactionType type, BigDecimal amount, String note) {
        return TransactionModel.builder()
                .type(type)
                .amount(amount)
                .note(note)
                .build();
    }
}
