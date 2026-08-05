package com.daiphat.coreapi.application.port.in.order;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.PurchasedTicketResponse;
import com.daiphat.coreapi.domain.model.enums.order.TicketDrawResultStatus;

import java.time.LocalDate;
import java.util.UUID;

public interface PurchasedTicketQueryPort {

    PageResponse<PurchasedTicketResponse> getMyTickets(
            UUID userId,
            int page,
            int size,
            TicketDrawResultStatus status,
            Boolean redeemed,
            LocalDate fromDate,
            LocalDate toDate,
            String ticketNumber,
            String sortBy,
            String direction
    );
}
