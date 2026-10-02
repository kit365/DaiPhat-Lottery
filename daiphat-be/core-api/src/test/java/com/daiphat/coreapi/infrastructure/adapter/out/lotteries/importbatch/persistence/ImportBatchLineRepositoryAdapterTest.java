package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.importbatch.persistence;

import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.ImportBatchLinePersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImportBatchLineRepositoryAdapterTest {

    @Mock
    private ImportBatchLineRepository importBatchLineRepository;
    @Mock
    private ImportBatchRepository importBatchRepository;
    @Mock
    private LotteryStationRepository lotteryStationRepository;
    @Mock
    private ImportBatchLinePersistenceMapper importBatchLinePersistenceMapper;

    @InjectMocks
    private ImportBatchLineRepositoryAdapter adapter;

    @Test
    void save_existingLinePatchesManagedEntitySoSoftDeleteIsPersisted() {
        LocalDateTime deletedAt = LocalDateTime.of(2026, 10, 1, 15, 30);
        ImportBatchLineModel model = ImportBatchLineModel.builder()
                .id(82L)
                .importBatchId(31L)
                .lotteryStationId(7L)
                .deletedAt(deletedAt)
                .build();
        ImportBatchLineEntity managed = ImportBatchLineEntity.builder().id(82L).build();
        ImportBatchEntity batch = ImportBatchEntity.builder().id(31L).build();
        LotteryStationEntity station = LotteryStationEntity.builder().id(7L).build();

        when(importBatchLineRepository.findById(82L)).thenReturn(Optional.of(managed));
        when(importBatchRepository.getReferenceById(31L)).thenReturn(batch);
        when(lotteryStationRepository.getReferenceById(7L)).thenReturn(station);
        when(importBatchLineRepository.save(managed)).thenReturn(managed);
        when(importBatchLinePersistenceMapper.toDomain(managed)).thenReturn(model);

        ImportBatchLineModel saved = adapter.save(model);

        assertThat(saved).isSameAs(model);
        verify(importBatchLinePersistenceMapper).updateEntityFromModel(model, managed);
        verify(importBatchLinePersistenceMapper, never()).toEntity(model);
        verify(importBatchLineRepository).save(managed);
    }
}
