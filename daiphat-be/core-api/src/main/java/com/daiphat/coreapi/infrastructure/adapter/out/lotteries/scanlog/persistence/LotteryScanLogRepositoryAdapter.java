package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.scanlog.persistence;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryScanLogRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanEventType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryScanLogModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.LotteryScanLogPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryScanLogRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.LotteryScanLogSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class LotteryScanLogRepositoryAdapter implements LotteryScanLogRepositoryPort {

    private final LotteryScanLogRepository lotteryScanLogRepository;
    private final LotteryScanLogPersistenceMapper lotteryScanLogPersistenceMapper;

    @Override
    public LotteryScanLogModel save(LotteryScanLogModel model) {
        var entity = lotteryScanLogPersistenceMapper.toEntity(model);
        return lotteryScanLogPersistenceMapper.toDomain(lotteryScanLogRepository.save(entity));
    }

    @Override
    public Page<LotteryScanLogModel> findAll(
            Pageable pageable,
            ScanEventType eventType,
            Long lotteryTicketSerialId,
            UUID scannedBy,
            LocalDate scannedAtFrom,
            LocalDate scannedAtTo
    ) {
        return lotteryScanLogRepository.findAll(
                        LotteryScanLogSpecification.filter(
                                eventType,
                                lotteryTicketSerialId,
                                scannedBy,
                                scannedAtFrom,
                                scannedAtTo
                        ),
                        pageable
                )
                .map(lotteryScanLogPersistenceMapper::toDomain);
    }
}
