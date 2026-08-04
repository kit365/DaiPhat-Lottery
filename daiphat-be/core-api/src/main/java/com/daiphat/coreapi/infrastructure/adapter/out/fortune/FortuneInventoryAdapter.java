package com.daiphat.coreapi.infrastructure.adapter.out.fortune;

import com.daiphat.coreapi.application.port.out.fortune.FortuneInventoryPort;
import com.daiphat.coreapi.shared.util.TicketNumberSearchUtils;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
public class FortuneInventoryAdapter implements FortuneInventoryPort {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @SuppressWarnings("unchecked")
    public List<String> findAvailableTails(LocalDate sellableDrawDate) {
        List<String> numbers = entityManager.createQuery("""
                        select distinct t.numbers
                        from LotteryTicketEntity t
                        join t.serials s
                        where t.drawDate = :drawDate
                          and t.status = com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus.IN_STOCK
                          and t.active = true
                          and t.deletedAt is null
                          and s.status = com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK
                          and s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD
                          and s.returnBatchLineId is null
                          and s.deletedAt is null
                          and t.station.isActive = true
                          and t.station.deletedAt is null
                        """)
                .setParameter("drawDate", sellableDrawDate)
                .getResultList();

        Set<String> tails = new LinkedHashSet<>();
        for (String number : numbers) {
            String tail = TicketNumberSearchUtils.tailTwoDigits(number);
            if (tail != null) {
                tails.add(tail);
            }
        }
        return List.copyOf(tails);
    }
}
