package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;
import java.util.Collection;
import java.util.UUID;

public interface LotteryTicketRepository
        extends JpaRepository<LotteryTicketEntity, UUID>,
        JpaSpecificationExecutor<LotteryTicketEntity> {

    boolean existsByProduct_IdAndSerialNumberAndNumbersAndDrawDate(
            UUID productId,
            String serialNumber,
            String numbers,
            LocalDate drawDate);

    boolean existsByProduct_IdAndSerialNumberAndNumbersAndDrawDateAndIdNot(
            UUID productId,
            String serialNumber,
            String numbers,
            LocalDate drawDate,
            UUID id);

    long countByProduct_IdAndStatusIn(UUID productId, Collection<LotteryTicketStatus> statuses);
}
