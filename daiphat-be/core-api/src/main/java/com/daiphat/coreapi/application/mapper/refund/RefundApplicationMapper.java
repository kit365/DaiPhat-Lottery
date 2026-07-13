package com.daiphat.coreapi.application.mapper.refund;

import com.daiphat.coreapi.application.dto.response.order.TransactionResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;
import com.daiphat.coreapi.application.dto.response.refund.UserBankAccountResponse;
import com.daiphat.coreapi.application.dto.response.refund.VietQrBankResponse;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;
import com.daiphat.coreapi.domain.model.refund.VietQrBankModel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RefundApplicationMapper {

    UserBankAccountResponse toBankAccountResponse(UserBankAccountModel model);

    List<UserBankAccountResponse> toBankAccountResponses(List<UserBankAccountModel> models);

    VietQrBankResponse toBankResponse(VietQrBankModel model);

    List<VietQrBankResponse> toBankResponses(List<VietQrBankModel> models);

    @Mapping(target = "bankAccount", ignore = true)
    @Mapping(target = "payoutTransaction", ignore = true)
    @Mapping(target = "maxRefundBankInfoRetry", ignore = true)
    @Mapping(target = "orderCode", ignore = true)
    @Mapping(target = "processingDeadlineAt", ignore = true)
    @Mapping(target = "remainingProcessingSeconds", ignore = true)
    @Mapping(target = "processingUrgency", ignore = true)
    RefundRequestResponse toRefundResponse(RefundRequestModel model);

    default RefundRequestResponse toRefundResponse(
            RefundRequestModel model,
            UserBankAccountModel bankAccount) {
        return toRefundResponse(model, bankAccount, null, null);
    }

    default RefundRequestResponse toRefundResponse(
            RefundRequestModel model,
            UserBankAccountModel bankAccount,
            TransactionResponse payoutTransaction) {
        return toRefundResponse(model, bankAccount, payoutTransaction, null);
    }

    default RefundRequestResponse toRefundResponse(
            RefundRequestModel model,
            UserBankAccountModel bankAccount,
            TransactionResponse payoutTransaction,
            Integer maxRefundBankInfoRetry) {
        RefundRequestResponse base = toRefundResponse(model);
        if (base == null) {
            return null;
        }
        return new RefundRequestResponse(
                base.id(),
                base.refundType(),
                base.orderId(),
                base.orderDetailIds(),
                base.requestedBy(),
                base.requestRole(),
                base.status(),
                base.refundAmount(),
                base.refundReason(),
                base.bankAccountId(),
                bankAccount != null ? toBankAccountResponse(bankAccount) : null,
                base.fundSource(),
                base.reimburseStatus(),
                base.attemptNumber(),
                base.retryCount(),
                base.operatorNote(),
                maxRefundBankInfoRetry,
                base.reviewedBy(),
                base.reviewedAt(),
                payoutTransaction,
                base.createdAt(),
                base.updatedAt(),
                null,
                null,
                null,
                null
        );
    }

    default RefundRequestResponse enrichResponse(
            RefundRequestModel model,
            UserBankAccountModel bankAccount,
            String orderCode,
            java.time.LocalDateTime processingDeadlineAt,
            Long remainingProcessingSeconds,
            com.daiphat.coreapi.domain.model.enums.order.refund.RefundProcessingUrgency processingUrgency
    ) {
        return enrichResponse(
                model, bankAccount, orderCode, processingDeadlineAt, remainingProcessingSeconds, processingUrgency, null, null);
    }

    default RefundRequestResponse enrichResponse(
            RefundRequestModel model,
            UserBankAccountModel bankAccount,
            String orderCode,
            java.time.LocalDateTime processingDeadlineAt,
            Long remainingProcessingSeconds,
            com.daiphat.coreapi.domain.model.enums.order.refund.RefundProcessingUrgency processingUrgency,
            TransactionResponse payoutTransaction
    ) {
        return enrichResponse(
                model,
                bankAccount,
                orderCode,
                processingDeadlineAt,
                remainingProcessingSeconds,
                processingUrgency,
                payoutTransaction,
                null);
    }

    default RefundRequestResponse enrichResponse(
            RefundRequestModel model,
            UserBankAccountModel bankAccount,
            String orderCode,
            java.time.LocalDateTime processingDeadlineAt,
            Long remainingProcessingSeconds,
            com.daiphat.coreapi.domain.model.enums.order.refund.RefundProcessingUrgency processingUrgency,
            TransactionResponse payoutTransaction,
            Integer maxRefundBankInfoRetry
    ) {
        RefundRequestResponse base = toRefundResponse(model, bankAccount, payoutTransaction, maxRefundBankInfoRetry);
        if (base == null) {
            return null;
        }
        return new RefundRequestResponse(
                base.id(),
                base.refundType(),
                base.orderId(),
                base.orderDetailIds(),
                base.requestedBy(),
                base.requestRole(),
                base.status(),
                base.refundAmount(),
                base.refundReason(),
                base.bankAccountId(),
                base.bankAccount(),
                base.fundSource(),
                base.reimburseStatus(),
                base.attemptNumber(),
                base.retryCount(),
                base.operatorNote(),
                maxRefundBankInfoRetry != null ? maxRefundBankInfoRetry : base.maxRefundBankInfoRetry(),
                base.reviewedBy(),
                base.reviewedAt(),
                base.payoutTransaction(),
                base.createdAt(),
                base.updatedAt(),
                orderCode,
                processingDeadlineAt,
                remainingProcessingSeconds,
                processingUrgency
        );
    }
}
