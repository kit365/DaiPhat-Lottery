package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.LotteryStationPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.LotteryStationSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
@Component
@RequiredArgsConstructor
public class LotteryStationRepositoryAdapter implements LotteryStationRepositoryPort {

    private final LotteryStationRepository lotteryStationRepository;
    private final LotteryStationPersistenceMapper lotteryStationPersistenceMapper;

    @Override
    public LotteryStationModel save(LotteryStationModel model) {
        return lotteryStationPersistenceMapper.toDomain(
                lotteryStationRepository.save(
                        lotteryStationPersistenceMapper.toEntity(model)));
    }

    @Override
    public Optional<LotteryStationModel> findById(Long id) {
        return lotteryStationRepository.findById(id)
                .filter(entity -> entity.getDeletedAt() == null)
                .map(lotteryStationPersistenceMapper::toDomain);
    }

    @Override
    public Page<LotteryStationModel> findAll(Pageable pageable, String search,
                                             LotteryStationStatus status, String type) {
        return lotteryStationRepository.findAll(
                        LotteryStationSpecification.filter(search, status, type),
                        pageable
                )
                .map(lotteryStationPersistenceMapper::toDomain);
    }

    @Override
    public List<LotteryStationModel> findAll() {
        return lotteryStationRepository.findAll().stream()
                .filter(entity -> entity.getDeletedAt() == null)
                .map(lotteryStationPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public List<LotteryStationModel> findByNextDrawDate(LocalDate drawDate) {
        return lotteryStationRepository.findByNextDrawDateAndDeletedAtIsNull(drawDate).stream()
                .map(lotteryStationPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public void deleteById(Long id) {
        lotteryStationRepository.findById(id).ifPresent(entity -> {
            entity.setDeletedAt(LocalDateTime.now());
            lotteryStationRepository.save(entity);
        });
    }

    @Override
    public boolean existsByName(String name) {
        return lotteryStationRepository.existsByNameAndDeletedAtIsNull(name);
    }

    @Override
    public int updateNextDrawDate(Long id, LocalDate nextDrawDate) {
        return lotteryStationRepository.updateNextDrawDate(id, nextDrawDate);
    }


}
