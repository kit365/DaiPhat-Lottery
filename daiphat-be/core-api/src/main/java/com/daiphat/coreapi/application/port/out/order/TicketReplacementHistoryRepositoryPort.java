package com.daiphat.coreapi.application.port.out.order;

import com.daiphat.coreapi.domain.model.orders.TicketReplacementHistoryModel;

public interface TicketReplacementHistoryRepositoryPort {
    TicketReplacementHistoryModel save(TicketReplacementHistoryModel model);
}
