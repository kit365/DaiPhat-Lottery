package com.daiphat.coreapi.application.port.out.order;

import java.util.Optional;
import java.util.UUID;

public interface OrderDetailQueryRepositoryPort {

    record ActiveSerialOrderContext(UUID orderId, Long orderDetailId) {}

    Optional<ActiveSerialOrderContext> findActiveContextBySerialId(Long serialId);
}
