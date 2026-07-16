package com.daiphat.coreapi.application.port.out.order;

import java.util.List;

public interface OrderDetailSerialRepositoryPort {

    List<Long> findSerialIdsByOrderDetailId(Long orderDetailId);

    void replaceSerialAllocation(Long orderDetailId, Long oldSerialId, Long newSerialId);
}
