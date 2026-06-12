package com.daiphat.coreapi.infrastructure.persistence.repository.lottery;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;
import java.util.Collection;
public interface LotteryTicketRepository
        extends JpaRepository<LotteryTicketEntity, Long>,
        JpaSpecificationExecutor<LotteryTicketEntity> {

    boolean existsByProduct_IdAndSerialNumberAndNumbersAndDrawDateAndDeletedAtIsNull(
            Long productId,
            String serialNumber,
            String numbers,
            LocalDate drawDate);

    boolean existsByProduct_IdAndSerialNumberAndNumbersAndDrawDateAndIdNotAndDeletedAtIsNull(
            Long productId,
            String serialNumber,
            String numbers,
            LocalDate drawDate,
            Long id);

    long countByProduct_IdAndStatusInAndDeletedAtIsNull(Long productId, Collection<LotteryTicketStatus> statuses);
}
