package com.daiphat.coreapi.domain.model.enums.settings;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SystemConfigEnum {
    ORDER_CANCEL_GRACE_MIN(
            ConfigType.ORDER_SETTING,
            DataType.INT,
            "30",
            "Thời gian ân hạn hủy đơn (phút)"
    ),
    CUSTOMER_CANCEL_CUTOFF(
            ConfigType.ORDER_SETTING,
            DataType.TIME,
            "14:30",
            "Giờ chốt hủy đơn của khách hàng"
    ),
    ORDER_PREPARE_SLA_MIN(
            ConfigType.ORDER_SETTING,
            DataType.INT,
            "30",
            "SLA chuẩn bị đơn (phút)"
    ),
    VENDOR_RETURN_CUTOFF(
            ConfigType.ORDER_SETTING,
            DataType.TIME,
            "15:00",
            "Giờ chốt trả vé cho đại lý"
    ),
    LATE_IMPORT_TIME(
            ConfigType.TICKET_IMPORT,
            DataType.TIME,
            "14:30",
            "Giờ chốt sau đó lô nhập trong ngày được phân loại LATE_IMPORT"
    ),
    IMPORT_BATCH_CUTOFF_TIME(
            ConfigType.TICKET_IMPORT,
            DataType.TIME,
            "15:00",
            "Giờ chốt sau đó không cho phép tạo lô nhập trong ngày (trừ lô nhập bổ sung)"
    ),
    STAFF_INCIDENT_CUTOFF(
            ConfigType.REFUND_SETTING,
            DataType.TIME,
            "16:00",
            "Giờ chốt xử lý sự cố của nhân viên"
    ),
    INVALID_INFO_EXPIRED_DAYS(
            ConfigType.REFUND_SETTING,
            DataType.INT,
            "7",
            "Số ngày hết hạn thông tin không hợp lệ"
    ),
    MAX_REFUND_REQUESTS_PER_DAY(
            ConfigType.REFUND_SETTING,
            DataType.INT,
            "3",
            "Số lượng yêu cầu hoàn tiền tối đa mỗi khách hàng được gửi trong một ngày"
    );

    private final ConfigType configType;
    private final DataType dataType;
    private final String defaultValue;
    private final String description;
}
