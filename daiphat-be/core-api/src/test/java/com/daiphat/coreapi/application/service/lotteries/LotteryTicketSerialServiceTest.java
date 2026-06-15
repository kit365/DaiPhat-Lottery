package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class LotteryTicketSerialServiceTest {

    @Mock
    private LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;

    @Mock
    private StoragePort storagePort;

    private LotteryTicketSerialService lotteryTicketSerialService;

    @BeforeEach
    void setUp() {
        lotteryTicketSerialService = new LotteryTicketSerialService(
                lotteryTicketSerialRepositoryPort,
                storagePort
        );
    }

    @Test
    void getStatuses_returnsAllSerialStatusesForFe() {
        List<EnumOptionResponse> statuses = lotteryTicketSerialService.getStatuses();

        assertThat(statuses).hasSize(LotteryTicketSerialStatus.values().length);
        assertThat(statuses)
                .extracting(EnumOptionResponse::value)
                .contains(
                        LotteryTicketSerialStatus.IN_STOCK.name(),
                        LotteryTicketSerialStatus.RESERVED.name(),
                        LotteryTicketSerialStatus.SOLD.name()
                );
        assertThat(statuses)
                .filteredOn(option -> LotteryTicketSerialStatus.IN_STOCK.name().equals(option.value()))
                .extracting(EnumOptionResponse::label)
                .containsExactly(LotteryTicketSerialStatus.IN_STOCK.getDisplayName());
    }
}
