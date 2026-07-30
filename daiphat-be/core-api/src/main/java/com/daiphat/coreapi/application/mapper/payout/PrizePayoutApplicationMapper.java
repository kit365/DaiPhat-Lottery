package com.daiphat.coreapi.application.mapper.payout;

import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutRequestResponse;
import com.daiphat.coreapi.domain.model.payout.PrizePayoutRequestModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class PrizePayoutApplicationMapper {

    public PrizePayoutRequestResponse toResponse(
            PrizePayoutRequestModel model,
            OrderDetailEntity detail,
            UserEntity customer) {
        if (model == null) {
            return null;
        }

        OrderEntity order = detail != null ? detail.getOrder() : null;
        LotteryTicketSerialEntity serial = detail != null ? detail.getLotteryTicketSerial() : null;
        LotteryTicketEntity ticket = serial != null ? serial.getTicket() : null;

        return new PrizePayoutRequestResponse(
                model.getId(),
                model.getRequestCode(),
                model.getCustomerId(),
                resolveCustomerName(customer),
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
                model.getBankAccountId(),
                model.getBankName(),
                model.getBankAccountNumber(),
                model.getAccountHolderName(),
                model.getStatus(),
                model.getRejectReason(),
                model.getTransferEvidenceUrl(),
                model.getCompletedAt(),
                model.getCompletedBy(),
                model.getCreatedAt(),
                model.getUpdatedAt(),
                serial != null ? serial.getStatus() : null,
                serial != null ? serial.getPayoutState() : null
        );
    }

    private String resolveCustomerName(UserEntity customer) {
        if (customer == null) {
            return null;
        }
        String firstName = customer.getFirstName();
        String lastName = customer.getLastName();
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
        return customer.getUsername();
    }
}
