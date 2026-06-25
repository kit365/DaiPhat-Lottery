package com.daiphat.coreapi.infrastructure.persistence.mapper.order;

import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.OrderRefundModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderRefundEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.TransactionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
public class OrderPersistenceMapper {

    public OrderEntity toEntity(OrderModel model) {
        OrderEntity entity = new OrderEntity();
        entity.setId(model.getId());
        entity.setUser(userRef(model.getUserId()));
        entity.setName(model.getName());
        entity.setPhone(model.getPhone());
        entity.setEmail(model.getEmail());
        entity.setOrderCode(model.getOrderCode());
        entity.setOrderType(model.getOrderType());
        entity.setReceiveType(model.getReceiveType());
        entity.setTotalAmount(model.getTotalAmount());
        entity.setStatus(model.getStatus());
        entity.setExpectedPickupAt(model.getExpectedPickupAt());
        entity.setCancelledAt(model.getCancelledAt());
        entity.setCancelReason(model.getCancelReason());
        entity.setActualPickedUpAt(model.getActualPickedUpAt());
        entity.setPickedUpBy(userRef(model.getPickedUpBy()));
        entity.setCreatedAt(model.getCreatedAt());
        entity.setUpdatedAt(model.getUpdatedAt());
        entity.setCreatedBy(model.getCreatedBy());
        entity.setLastModifiedBy(model.getLastModifiedBy());

        List<OrderDetailEntity> detailEntities = new ArrayList<>();
        if (model.getOrderDetails() != null) {
            for (OrderDetailModel detailModel : model.getOrderDetails()) {
                detailEntities.add(toDetailEntity(detailModel, entity));
            }
        }
        entity.setOrderDetails(detailEntities);

        List<TransactionEntity> transactionEntities = new ArrayList<>();
        if (model.getTransactions() != null) {
            for (TransactionModel transactionModel : model.getTransactions()) {
                transactionEntities.add(toTransactionEntity(transactionModel, entity));
            }
        }
        entity.setTransactions(transactionEntities);
        return entity;
    }

    public OrderModel toDomain(OrderEntity entity) {
        List<OrderDetailModel> orderDetails = new ArrayList<>();
        if (entity.getOrderDetails() != null) {
            for (OrderDetailEntity detailEntity : entity.getOrderDetails()) {
                orderDetails.add(toDetailDomain(detailEntity));
            }
        }

        List<TransactionModel> transactions = new ArrayList<>();
        if (entity.getTransactions() != null) {
            for (TransactionEntity transactionEntity : entity.getTransactions()) {
                transactions.add(toTransactionDomain(transactionEntity));
            }
        }

        return OrderModel.builder()
                .id(entity.getId())
                .userId(userId(entity.getUser()))
                .name(entity.getName())
                .phone(entity.getPhone())
                .email(entity.getEmail())
                .orderCode(entity.getOrderCode())
                .orderType(entity.getOrderType())
                .receiveType(entity.getReceiveType())
                .totalAmount(entity.getTotalAmount())
                .orderDetails(orderDetails)
                .transactions(transactions)
                .status(entity.getStatus())
                .expectedPickupAt(entity.getExpectedPickupAt())
                .cancelledAt(entity.getCancelledAt())
                .cancelReason(entity.getCancelReason())
                .actualPickedUpAt(entity.getActualPickedUpAt())
                .pickedUpBy(userId(entity.getPickedUpBy()))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .lastModifiedBy(entity.getLastModifiedBy())
                .build();
    }

    private OrderDetailEntity toDetailEntity(OrderDetailModel model, OrderEntity order) {
        OrderDetailEntity entity = new OrderDetailEntity();
        entity.setId(model.getId());
        entity.setOrder(order);
        entity.setLotteryTicket(lotteryTicketRef(model.getLotteryTicketId()));
        entity.setLotteryTicketSerial(lotteryTicketSerialRef(model.getLotteryTicketSerialId()));
        entity.setReplacedByTicketSerial(lotteryTicketSerialRef(model.getReplacedByTicketSerialId()));
        entity.setQuantity(model.getQuantity() != null ? model.getQuantity() : 1);
        entity.setPrice(model.getPrice());
        entity.setStatus(model.getStatus());
        entity.setCreatedAt(model.getCreatedAt());
        entity.setUpdatedAt(model.getUpdatedAt());
        entity.setCreatedBy(model.getCreatedBy());
        entity.setLastModifiedBy(model.getLastModifiedBy());

        List<OrderRefundEntity> refundEntities = new ArrayList<>();
        if (model.getRefunds() != null) {
            for (OrderRefundModel refundModel : model.getRefunds()) {
                refundEntities.add(toRefundEntity(refundModel, entity));
            }
        }
        entity.setRefunds(refundEntities);

        List<OrderDetailSerialEntity> allocationEntities = new ArrayList<>();
        if (model.getId() == null
                && model.getAllocatedSerialIds() != null
                && !model.getAllocatedSerialIds().isEmpty()) {
            for (Long serialId : model.getAllocatedSerialIds()) {
                allocationEntities.add(
                        OrderDetailSerialEntity.builder()
                                .orderDetail(entity)
                                .lotteryTicketSerial(lotteryTicketSerialRef(serialId))
                                .build()
                );
            }
            entity.setAllocatedSerials(allocationEntities);
        }
        return entity;
    }

    private OrderDetailModel toDetailDomain(OrderDetailEntity entity) {
        List<OrderRefundModel> refunds = new ArrayList<>();
        if (entity.getRefunds() != null) {
            for (OrderRefundEntity refundEntity : entity.getRefunds()) {
                refunds.add(toRefundDomain(refundEntity));
            }
        }

        return OrderDetailModel.builder()
                .id(entity.getId())
                .orderId(entity.getOrder() != null ? entity.getOrder().getId() : null)
                .lotteryTicketId(resolveLotteryTicketId(entity))
                .lotteryTicketSerialId(entity.getLotteryTicketSerial() != null ? entity.getLotteryTicketSerial().getId() : null)
                .replacedByTicketId(
                        entity.getReplacedByTicketSerial() != null
                                && entity.getReplacedByTicketSerial().getTicket() != null
                                ? entity.getReplacedByTicketSerial().getTicket().getId()
                                : null
                )
                .replacedByTicketSerialId(entity.getReplacedByTicketSerial() != null ? entity.getReplacedByTicketSerial().getId() : null)
                .quantity(entity.getQuantity() != null ? entity.getQuantity() : 1)
                .allocatedSerialIds(resolveAllocatedSerialIds(entity))
                .price(entity.getPrice())
                .status(entity.getStatus())
                .refunds(refunds)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .lastModifiedBy(entity.getLastModifiedBy())
                .build();
    }

    private OrderRefundEntity toRefundEntity(OrderRefundModel model, OrderDetailEntity detail) {
        OrderRefundEntity entity = new OrderRefundEntity();
        entity.setId(model.getId());
        entity.setOrderDetail(detail);
        entity.setStatus(model.getStatus());
        entity.setRefundAmount(model.getRefundAmount());
        entity.setRefundReason(model.getRefundReason());
        entity.setBankBin(model.getBankBin());
        entity.setBankName(model.getBankName());
        entity.setBankAccountNo(model.getBankAccountNo());
        entity.setBankAccountName(model.getBankAccountName());
        entity.setRefundAt(model.getRefundAt());
        entity.setRefundApprovedBy(userRef(model.getRefundApprovedBy()));
        entity.setCreatedAt(model.getCreatedAt());
        entity.setUpdatedAt(model.getUpdatedAt());
        entity.setCreatedBy(model.getCreatedBy());
        entity.setLastModifiedBy(model.getLastModifiedBy());
        return entity;
    }

    private OrderRefundModel toRefundDomain(OrderRefundEntity entity) {
        return OrderRefundModel.builder()
                .id(entity.getId())
                .orderDetailId(entity.getOrderDetail() != null ? entity.getOrderDetail().getId() : null)
                .status(entity.getStatus())
                .refundAmount(entity.getRefundAmount())
                .refundReason(entity.getRefundReason())
                .bankBin(entity.getBankBin())
                .bankName(entity.getBankName())
                .bankAccountNo(entity.getBankAccountNo())
                .bankAccountName(entity.getBankAccountName())
                .refundAt(entity.getRefundAt())
                .refundApprovedBy(userId(entity.getRefundApprovedBy()))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .lastModifiedBy(entity.getLastModifiedBy())
                .build();
    }

    private TransactionEntity toTransactionEntity(TransactionModel model, OrderEntity order) {
        TransactionEntity entity = new TransactionEntity();
        entity.setId(model.getId());
        entity.setOrder(order);
        entity.setAmount(model.getAmount());
        entity.setGateway(model.getGateway());
        entity.setGatewayOrderCode(model.getGatewayOrderCode());
        entity.setPaymentRef(model.getPaymentRef());
        entity.setStatus(model.getStatus());
        entity.setPaidAt(model.getPaidAt());
        entity.setCancelledAt(model.getCancelledAt());
        entity.setFailureReason(model.getFailureReason());
        entity.setCodCollectedAt(model.getCodCollectedAt());
        entity.setCodCollectedBy(userRef(model.getCodCollectedBy()));
        entity.setNote(model.getNote());
        entity.setType(model.getType());
        entity.setCreatedAt(model.getCreatedAt());
        entity.setUpdatedAt(model.getUpdatedAt());
        entity.setCreatedBy(model.getCreatedBy());
        entity.setLastModifiedBy(model.getLastModifiedBy());
        return entity;
    }

    private TransactionModel toTransactionDomain(TransactionEntity entity) {
        return TransactionModel.builder()
                .id(entity.getId())
                .orderId(entity.getOrder() != null ? entity.getOrder().getId() : null)
                .amount(entity.getAmount())
                .gateway(entity.getGateway())
                .gatewayOrderCode(entity.getGatewayOrderCode())
                .paymentRef(entity.getPaymentRef())
                .status(entity.getStatus())
                .paidAt(entity.getPaidAt())
                .cancelledAt(entity.getCancelledAt())
                .failureReason(entity.getFailureReason())
                .codCollectedAt(entity.getCodCollectedAt())
                .codCollectedBy(userId(entity.getCodCollectedBy()))
                .note(entity.getNote())
                .type(entity.getType())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .lastModifiedBy(entity.getLastModifiedBy())
                .build();
    }

    private UserEntity userRef(UUID userId) {
        if (userId == null) {
            return null;
        }
        UserEntity entity = new UserEntity();
        entity.setId(userId);
        return entity;
    }

    private UUID userId(UserEntity user) {
        return user != null ? user.getId() : null;
    }

    private LotteryTicketSerialEntity lotteryTicketSerialRef(Long ticketId) {
        if (ticketId == null) {
            return null;
        }
        LotteryTicketSerialEntity entity = new LotteryTicketSerialEntity();
        entity.setId(ticketId);
        return entity;
    }

    private LotteryTicketEntity lotteryTicketRef(Long ticketId) {
        if (ticketId == null) {
            return null;
        }
        LotteryTicketEntity entity = new LotteryTicketEntity();
        entity.setId(ticketId);
        return entity;
    }

    private Long resolveLotteryTicketId(OrderDetailEntity entity) {
        if (entity.getLotteryTicket() != null) {
            return entity.getLotteryTicket().getId();
        }
        if (entity.getLotteryTicketSerial() != null && entity.getLotteryTicketSerial().getTicket() != null) {
            return entity.getLotteryTicketSerial().getTicket().getId();
        }
        return null;
    }

    private List<Long> resolveAllocatedSerialIds(OrderDetailEntity entity) {
        if (entity.getAllocatedSerials() == null || entity.getAllocatedSerials().isEmpty()) {
            return List.of();
        }
        List<Long> serialIds = new ArrayList<>();
        for (OrderDetailSerialEntity allocation : entity.getAllocatedSerials()) {
            if (allocation.getLotteryTicketSerial() != null && allocation.getLotteryTicketSerial().getId() != null) {
                serialIds.add(allocation.getLotteryTicketSerial().getId());
            }
        }
        return serialIds;
    }
}
