package com.daiphat.coreapi.application.port.in.lotteries;

/** Boundary used by non-lottery workflows after changing serial availability. */
public interface LotteryTicketAggregateSyncUseCase {
    void syncTicketAggregate(Long ticketId);
}
