package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.Collection;
import java.util.Optional;
public interface LotteryTicketRepositoryPort {

    LotteryTicketModel save(LotteryTicketModel model);

    Optional<LotteryTicketModel> findById(Long id);

    Optional<LotteryTicketModel> findByIdIncludingDeleted(Long id);

    Page<LotteryTicketModel> findAll(Pageable pageable, Long productId, LotteryTicketStatus status,
                                     LocalDate drawDate, String search);

    Page<LotteryTicketModel> findAllDeleted(Pageable pageable);

    void deleteById(Long id);

    boolean existsByUniqueFields(Long productId, String serialNumber, String numbers, LocalDate drawDate);

    boolean existsByUniqueFieldsAndIdNot(Long productId, String serialNumber, String numbers, LocalDate drawDate, Long id);

    long countByProductIdAndStatuses(Long productId, Collection<LotteryTicketStatus> statuses);
}
