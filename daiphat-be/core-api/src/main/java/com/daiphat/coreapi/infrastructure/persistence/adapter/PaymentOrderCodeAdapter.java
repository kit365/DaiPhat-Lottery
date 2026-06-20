package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.order.PaymentOrderCodePort;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class PaymentOrderCodeAdapter implements PaymentOrderCodePort {

    private final TransactionRepository transactionRepository;

    @Override
    @Transactional
    public long getNext() {
        long nextSequenceValue = transactionRepository.getNextGatewayOrderCode();
        long minimumFreshOrderCode = System.currentTimeMillis();

        if (nextSequenceValue >= minimumFreshOrderCode) {
            return nextSequenceValue;
        }

        transactionRepository.resetGatewayOrderCodeSequence(minimumFreshOrderCode);
        return minimumFreshOrderCode;
    }
}
