package com.daiphat.coreapi.application.mapper.payout;

import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutRequestResponse;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.payout.PrizePayoutRequestModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class PrizePayoutApplicationMapper {

    public PrizePayoutRequestResponse toResponse(
            PrizePayoutRequestModel model,
            OrderDetailEntity detail,
            UserEntity customer,
            UserEntity createdByUser,
            UserEntity completedByUser,
            Integer maxOnlineRejectRetry,
            boolean onlineClaimLocked,
            boolean requiresFourEyes,
            boolean canCurrentStaffApprove,
            boolean canCurrentStaffComplete) {
        if (model == null) {
            return null;
        }

        OrderEntity order = detail != null ? detail.getOrder() : null;
        LotteryTicketSerialEntity serial = detail != null ? detail.getLotteryTicketSerial() : null;
        LotteryTicketEntity ticket = serial != null ? serial.getTicket() : null;
        boolean locked = onlineClaimLocked || model.getStatus() == PrizePayoutRequestStatus.MANUAL_RESOLUTION;

        String customerName = resolveUserDisplayName(customer);
        if (customerName == null && order != null && order.getName() != null && !order.getName().isBlank()) {
            customerName = order.getName().trim();
        }

        return new PrizePayoutRequestResponse(
                model.getId(),
                model.getRequestCode(),
                model.getCustomerId(),
                customerName,
                model.getOrderId(),
                order != null ? order.getOrderCode() : null,
                model.getOrderDetailId(),
                model.getSerialId(),
                serial != null ? serial.getSerialNumber() : null,
                ticket != null ? ticket.getNumbers() : null,
                ticket != null && ticket.getStation() != null ? ticket.getStation().getName() : null,
                ticket != null ? ticket.getDrawDate() : null,
                model.getPrizeCode(),
                model.getPrizeDisplayName(),
                model.getGrossAmount(),
                model.getTaxAmount(),
                model.getCommissionAmount(),
                model.getNetAmount(),
                model.getCashAmount(),
                model.getTransferAmount(),
                model.getChannel(),
                model.getTicketOrigin(),
                model.getOwnershipVerificationLevel(),
                model.isManualOwnershipConfirmed(),
                order != null ? order.getOrderType() : null,
                order != null ? order.getName() : null,
                order != null ? order.getPhone() : null,
                model.getPaymentMethod(),
                model.getBankAccountId(),
                model.getBankName(),
                model.getBankAccountNumber(),
                model.getAccountHolderName(),
                model.getRecipientFullName(),
                maskIdNumber(model.getRecipientIdNumber()),
                model.getRecipientIdImageUrl(),
                model.getRecipientIdImageBackUrl(),
                model.getRecipientIdentityCapturedAt(),
                model.getStatus(),
                model.getRejectCount(),
                maxOnlineRejectRetry,
                locked,
                requiresFourEyes,
                canCurrentStaffApprove,
                canCurrentStaffComplete,
                model.getRejectReason(),
                model.getTransferEvidenceUrl(),
                model.getConfirmationContractUrl(),
                model.getCompletedAt(),
                resolveActorDisplayName(completedByUser, model.getCompletedBy()),
                resolveActorDisplayName(createdByUser, model.getCreatedBy()),
                model.getCreatedAt(),
                model.getUpdatedAt(),
                serial != null ? serial.getStatus() : null,
                serial != null ? serial.getPayoutState() : null
        );
    }

    static String maskIdNumber(String idNumber) {
        if (idNumber == null || idNumber.isBlank()) {
            return null;
        }
        String trimmed = idNumber.trim();
        if (trimmed.length() <= 4) {
            return "****";
        }
        return "*".repeat(trimmed.length() - 4) + trimmed.substring(trimmed.length() - 4);
    }

    private String resolveActorDisplayName(UserEntity user, UUID actorId) {
        return resolveActorDisplayName(user, actorId != null ? actorId.toString() : null);
    }

    private String resolveActorDisplayName(UserEntity user, String actorIdOrName) {
        String name = resolveUserDisplayName(user);
        if (name != null) {
            return name;
        }
        if (actorIdOrName == null || actorIdOrName.isBlank()) {
            return null;
        }
        // Prefer not to expose raw UUIDs in admin UI when user row is missing.
        try {
            UUID.fromString(actorIdOrName.trim());
            return null;
        } catch (IllegalArgumentException ignored) {
            return actorIdOrName.trim();
        }
    }

    private String resolveUserDisplayName(UserEntity user) {
        if (user == null) {
            return null;
        }
        String firstName = user.getFirstName();
        String lastName = user.getLastName();
        boolean hasFirst = firstName != null && !firstName.isBlank();
        boolean hasLast = lastName != null && !lastName.isBlank();
        if (hasFirst && hasLast) {
            return firstName.trim() + " " + lastName.trim();
        }
        if (hasFirst) {
            return firstName.trim();
        }
        if (hasLast) {
            return lastName.trim();
        }
        return user.getUsername();
    }
}
