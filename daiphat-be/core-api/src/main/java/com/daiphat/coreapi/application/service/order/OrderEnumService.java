package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.port.in.order.OrderEnumServicePort;
import com.daiphat.coreapi.domain.model.enums.order.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderRefundStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.order.TransactionType;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
public class OrderEnumService implements OrderEnumServicePort {

    @Override
    public List<EnumOptionResponse> getOrderTypes() {
        return Arrays.stream(OrderType.values())
                .map(type -> new EnumOptionResponse(type.name(), switch (type) {
                    case DIRECT -> "Đặt tại quầy";
                    case ONLINE -> "Đặt online";
                }))
                .toList();
    }

    @Override
    public List<EnumOptionResponse> getOrderStatuses() {
        return Arrays.stream(OrderStatus.values())
                .map(status -> new EnumOptionResponse(status.name(), switch (status) {
                    case PENDING_PAYMENT -> "Chờ thanh toán";
                    case PAID -> "Đã thanh toán";
                    case PREPARING -> "Đang chuẩn bị vé";
                    case PENDING_PICKUP -> "Chờ khách đến lấy";
                    case COMPLETED -> "Hoàn tất";
                    case CANCELLED -> "Đã hủy";
                }))
                .toList();
    }

    @Override
    public List<EnumOptionResponse> getOrderReceiveTypes() {
        return Arrays.stream(OrderReceiveType.values())
                .map(type -> new EnumOptionResponse(type.name(), switch (type) {
                    case COUNTER_PICKUP -> "Nhận vé tại quầy";
                }))
                .toList();
    }

    @Override
    public List<EnumOptionResponse> getOrderDetailStatuses() {
        return Arrays.stream(OrderDetailStatus.values())
                .map(status -> new EnumOptionResponse(status.name(), switch (status) {
                    case ACTIVE -> "Đang hiệu lực";
                    case REFUND_PENDING -> "Chờ hoàn tiền";
                    case REFUNDED -> "Đã hoàn tiền";
                }))
                .toList();
    }

    @Override
    public List<EnumOptionResponse> getOrderRefundStatuses() {
        return Arrays.stream(OrderRefundStatus.values())
                .map(status -> new EnumOptionResponse(status.name(), switch (status) {
                    case PENDING -> "Chờ duyệt";
                    case APPROVED -> "Đã duyệt";
                    case REJECTED -> "Từ chối";
                }))
                .toList();
    }

    @Override
    public List<EnumOptionResponse> getTransactionTypes() {
        return Arrays.stream(TransactionType.values())
                .map(type -> new EnumOptionResponse(type.name(), switch (type) {
                    case OFFLINE -> "Tiền mặt";
                    case ONLINE -> "Chuyển khoản / thanh toán online";
                }))
                .toList();
    }

    @Override
    public List<EnumOptionResponse> getTransactionStatuses() {
        return Arrays.stream(TransactionStatus.values())
                .map(status -> new EnumOptionResponse(status.name(), switch (status) {
                    case PENDING -> "Đang chờ";
                    case COMPLETED -> "Hoàn tất";
                    case FAILED -> "Thất bại";
                    case CANCELLED -> "Đã hủy";
                    case REFUNDED -> "Đã hoàn tiền";
                }))
                .toList();
    }
}
