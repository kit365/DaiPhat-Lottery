package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

public interface LotteryTicketRepositoryPort {

    LotteryTicketModel save(LotteryTicketModel model);

    Optional<LotteryTicketModel> findById(UUID id);

    Optional<LotteryTicketModel> findByIdIncludingDeleted(UUID id);

    Page<LotteryTicketModel> findAll(Pageable pageable, UUID productId, LotteryTicketStatus status,
                                     LocalDate drawDate, String search);

    void deleteById(UUID id);

    boolean existsByUniqueFields(UUID productId, String serialNumber, String numbers, LocalDate drawDate);

    boolean existsByUniqueFieldsAndIdNot(UUID productId, String serialNumber, String numbers, LocalDate drawDate, UUID id);

    long countByProductIdAndStatuses(UUID productId, Collection<LotteryTicketStatus> statuses);

    Page<LotteryTicketModel> findAllDeleted(Pageable pageable);
}
