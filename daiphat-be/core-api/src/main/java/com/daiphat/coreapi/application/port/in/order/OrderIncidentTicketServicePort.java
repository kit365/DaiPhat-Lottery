package com.daiphat.coreapi.application.port.in.order;

import com.daiphat.coreapi.application.dto.request.order.HandleOrderTicketIncidentRequest;
import com.daiphat.coreapi.application.dto.response.order.HandleOrderTicketIncidentResponse;

import java.util.UUID;

public interface OrderIncidentTicketServicePort {

    HandleOrderTicketIncidentResponse handleIncidents(
            UUID orderId,
            UUID staffId,
            HandleOrderTicketIncidentRequest request
    );
}
