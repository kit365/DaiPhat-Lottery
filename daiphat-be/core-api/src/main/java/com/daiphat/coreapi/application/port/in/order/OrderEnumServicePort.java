package com.daiphat.coreapi.application.port.in.order;

import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;

import java.util.List;

public interface OrderEnumServicePort {

    List<EnumOptionResponse> getOrderTypes();

    List<EnumOptionResponse> getOrderStatuses();

    List<EnumOptionResponse> getOrderReceiveTypes();

    List<EnumOptionResponse> getOrderDetailStatuses();

    List<EnumOptionResponse> getOrderRefundStatuses();

    List<EnumOptionResponse> getTransactionTypes();

    List<EnumOptionResponse> getTransactionStatuses();
}
