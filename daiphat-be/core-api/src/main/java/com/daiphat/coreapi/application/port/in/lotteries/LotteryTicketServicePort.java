package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;

import java.util.UUID;

public interface LotteryTicketServicePort {

    LotteryTicketResponse create(CreateLotteryTicketRequest request, UUID importedById);

    LotteryTicketResponse getById(Long id);

    PageResponse<LotteryTicketResponse> getAll(
            int page, int size, Long productId, String status,
            String drawDate, String search, String sortBy, String direction);

    LotteryTicketResponse update(Long id, UpdateLotteryTicketRequest request);

    void delete(Long id);

    LotteryTicketResponse verify(Long id, UUID verifierId);

    LotteryTicketResponse changeStatus(Long id, String status);

    void restore(Long id);

    PageResponse<LotteryTicketResponse> getAllDeleted(int page, int size);
}
