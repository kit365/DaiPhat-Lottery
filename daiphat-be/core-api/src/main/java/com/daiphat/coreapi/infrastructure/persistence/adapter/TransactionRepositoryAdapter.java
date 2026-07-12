package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.order.TransactionRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.TransactionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TransactionRepositoryAdapter implements TransactionRepositoryPort {

    private final TransactionRepository transactionRepository;

    @Override
    public Optional<LocalDateTime> findLatestPaymentSuccessAt(UUID orderId) {
        if (orderId == null) {
            return Optional.empty();
        }
        return transactionRepository.findLatestPaymentSuccessAt(orderId);
    }

    @Override
    public Optional<TransactionModel> findLatestByOrderIdAndType(UUID orderId, TransactionType type) {
        if (orderId == null || type == null) {
            return Optional.empty();
        }
        return transactionRepository.findFirstByOrder_IdAndTypeOrderByPaidAtDescIdDesc(orderId, type)
                .map(this::toDomain);
    }

    @Override
    public TransactionModel save(TransactionModel transaction) {
        TransactionEntity entity = toEntity(transaction);
        TransactionEntity saved = transactionRepository.save(entity);
        return toDomain(saved);
    }

    private TransactionEntity toEntity(TransactionModel model) {
        TransactionEntity entity = new TransactionEntity();
        entity.setId(model.getId());
        if (model.getOrderId() != null) {
            OrderEntity order = new OrderEntity();
            order.setId(model.getOrderId());
            entity.setOrder(order);
        }
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
        entity.setPaymentEvidenceUrl(model.getPaymentEvidenceUrl());
        entity.setPaymentBy(userRef(model.getPaymentBy()));
        entity.setNote(model.getNote());
        entity.setType(model.getType());
        entity.setCreatedAt(model.getCreatedAt());
        entity.setUpdatedAt(model.getUpdatedAt());
        entity.setCreatedBy(model.getCreatedBy());
        entity.setLastModifiedBy(model.getLastModifiedBy());
        return entity;
    }

    private TransactionModel toDomain(TransactionEntity entity) {
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
                .paymentEvidenceUrl(entity.getPaymentEvidenceUrl())
                .paymentBy(userId(entity.getPaymentBy()))
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
        UserEntity user = new UserEntity();
        user.setId(userId);
        return user;
    }

    private UUID userId(UserEntity user) {
        return user != null ? user.getId() : null;
    }
}
