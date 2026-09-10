package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.contract.ContractModel;
import com.daiphat.coreapi.domain.model.enums.contract.ContractType;
import com.daiphat.coreapi.infrastructure.persistence.entity.contract.ContractEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.contract.ContractPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.contract.ContractRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ContractSeedInitializer")
class ContractSeedInitializerTest {

    @Mock
    private ContractRepository contractRepository;
    @Mock
    private ContractPersistenceMapper contractPersistenceMapper;

    @InjectMocks
    private ContractSeedInitializer initializer;

    @Test
    @DisplayName("seed chỉ insert khi thiếu và gắn payout vào sales")
    void seed_insertsWhenMissing() {
        AtomicLong ids = new AtomicLong(1);
        when(contractPersistenceMapper.toEntity(any(ContractModel.class))).thenAnswer(invocation ->
                toEntity(invocation.getArgument(0)));
        when(contractRepository.findByCodeAndDeletedAtIsNull(any())).thenReturn(Optional.empty());
        when(contractRepository.save(any(ContractEntity.class))).thenAnswer(invocation -> {
            ContractEntity entity = invocation.getArgument(0);
            if (entity.getId() == null) {
                entity.setId(ids.getAndIncrement());
            }
            return entity;
        });

        initializer.seed();

        ArgumentCaptor<ContractEntity> captor = ArgumentCaptor.forClass(ContractEntity.class);
        verify(contractRepository, times(2)).save(captor.capture());

        ContractEntity sales = captor.getAllValues().get(0);
        ContractEntity payout = captor.getAllValues().get(1);
        assertThat(sales.getCode()).isEqualTo(ContractSeedCatalog.SALES_CODE);
        assertThat(sales.getStaffName()).isEqualTo("Hợp đồng cộng tác bán vé số");
        assertThat(sales.getIsDefault()).isTrue();
        assertThat(payout.getCode()).isEqualTo(ContractSeedCatalog.PAYOUT_CODE);
        assertThat(payout.getBasedOnId()).isEqualTo(sales.getId());
        assertThat(payout.getType()).isEqualTo(ContractType.PRIZE_PAYOUT);
    }

    @Test
    @DisplayName("seed không ghi đè mẫu đã có")
    void seed_skipsExisting() {
        ContractEntity existingSales = ContractEntity.builder()
                .id(10L)
                .code(ContractSeedCatalog.SALES_CODE)
                .title("Custom sales")
                .build();
        ContractEntity existingPayout = ContractEntity.builder()
                .id(20L)
                .code(ContractSeedCatalog.PAYOUT_CODE)
                .basedOnId(10L)
                .build();
        when(contractRepository.findByCodeAndDeletedAtIsNull(ContractSeedCatalog.SALES_CODE))
                .thenReturn(Optional.of(existingSales));
        when(contractRepository.findByCodeAndDeletedAtIsNull(ContractSeedCatalog.PAYOUT_CODE))
                .thenReturn(Optional.of(existingPayout));

        initializer.seed();

        verify(contractRepository, never()).save(any());
        verify(contractPersistenceMapper, never()).toEntity(any());
    }

    private static ContractEntity toEntity(ContractModel model) {
        return ContractEntity.builder()
                .code(model.getCode())
                .type(model.getType())
                .title(model.getTitle())
                .staffName(model.getStaffName())
                .subtitle(model.getSubtitle())
                .partyARoleLabel(model.getPartyARoleLabel())
                .partyBRoleLabel(model.getPartyBRoleLabel())
                .partyASignatureLabel(model.getPartyASignatureLabel())
                .partyBSignatureLabel(model.getPartyBSignatureLabel())
                .articles(model.getArticles())
                .footerNote(model.getFooterNote())
                .basedOnId(model.getBasedOnId())
                .isDefault(model.getIsDefault())
                .active(model.getActive())
                .build();
    }
}
