package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeStructureEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
public interface PrizeStructureRepository extends JpaRepository<PrizeStructureEntity, Long> {
    List<PrizeStructureEntity> findByStation_IdAndDeletedAtIsNullOrderByDisplayOrderAsc(Long productId);
    void deleteByStation_Id(Long productId);
}
