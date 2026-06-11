package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;

import java.util.UUID;

public interface LotteryTicketServicePort {

    LotteryTicketResponse create(CreateLotteryTicketRequest request, UUID importedById);

    LotteryTicketResponse getById(UUID id);

    PageResponse<LotteryTicketResponse> getAll(
            int page, int size, UUID productId, String status,
            String drawDate, String search, String sortBy, String direction);

    LotteryTicketResponse update(UUID id, UpdateLotteryTicketRequest request);

    void delete(UUID id);

    LotteryTicketResponse verify(UUID id, UUID verifierId);

    LotteryTicketResponse changeStatus(UUID id, String status);

    void restore(UUID id);

    PageResponse<LotteryTicketResponse> getAllDeleted(int page, int size);
}
