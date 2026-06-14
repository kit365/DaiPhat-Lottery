package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.order.PaymentOrderCodePort;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PaymentOrderCodeAdapter implements PaymentOrderCodePort {

    private final TransactionRepository transactionRepository;

    @Override
    public long getNext() {
        return transactionRepository.getNextGatewayOrderCode();
    }
}
