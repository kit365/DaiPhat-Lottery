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
            "Thời gian ân hạn hủy đơn (phút)",
            "Thời gian ân hạn hủy đơn",
            "phút",
            "{\"min\":1,\"max\":1440}",
            true
    ),
    CUSTOMER_CANCEL_CUTOFF(
            ConfigType.ORDER_SETTING,
            DataType.TIME,
            "14:30",
            "Giờ chốt hủy đơn của khách hàng",
            "Giờ chốt hủy đơn khách hàng",
            "HH:mm",
            "{\"min\":\"00:00\",\"max\":\"23:59\"}",
            true
    ),
    ORDER_PREPARE_SLA_MIN(
            ConfigType.ORDER_SETTING,
            DataType.INT,
            "30",
            "SLA chuẩn bị đơn (phút)",
            "SLA chuẩn bị đơn",
            "phút",
            "{\"min\":1,\"max\":1440}",
            true
    ),
    PAYMENT_TIMEOUT_MINUTES(
            ConfigType.PAYMENT_SETTING,
            DataType.INT,
            "3",
            "Thời gian chờ thanh toán trước khi hệ thống tự động hủy đơn (phút)",
            "Thời gian chờ thanh toán",
            "phút",
            "{}",
            false
    ),
    VENDOR_RETURN_CUTOFF(
            ConfigType.ORDER_SETTING,
            DataType.TIME,
            "15:00",
            "Giờ chốt trả vé cho đại lý",
            "Giờ chốt trả vé đại lý",
            "HH:mm",
            "{\"min\":\"00:00\",\"max\":\"23:59\"}",
            true
    ),
    RETURN_BUFFER_TIME(
            ConfigType.TICKET_IMPORT,
            DataType.INT,
            "45",
            "Thời gian đệm (phút) trước hạn trả vé của nhà cung cấp",
            "Thời gian đệm trả vé",
            "phút",
            "{\"min\":0,\"max\":1440}",
            true
    ),
    RETURN_REMINDER_TIME(
            ConfigType.TICKET_RETURN,
            DataType.INT,
            "15",
            "Thời gian (phút) trước hạn trả vé NCC để nhắc khẩn kiểm tra phiếu trả",
            "Nhắc kiểm tra trả vé",
            "phút",
            "{\"min\":1,\"max\":1440}",
            true
    ),
    TICKET_AUTO_IMPORT_THRESHOLD(
            ConfigType.TICKET_IMPORT,
            DataType.INT,
            "50",
            "Số lượng vé lưu nháp tối đa trước khi hệ thống tự động lưu vào cơ sở dữ liệu.",
            "Ngưỡng số lượng vé tự động nhập",
            "vé",
            "{\"min\":1,\"max\":10000}",
            true
    ),
    STAFF_INCIDENT_CUTOFF(
            ConfigType.REFUND_SETTING,
            DataType.TIME,
            "16:00",
            "Giờ chốt xử lý sự cố của nhân viên",
            "Giờ chốt xử lý sự cố",
            "HH:mm",
            "{\"min\":\"00:00\",\"max\":\"23:59\"}",
            true
    ),
    INVALID_INFO_EXPIRED_DAYS(
            ConfigType.REFUND_SETTING,
            DataType.INT,
            "7",
            "Số ngày hết hạn thông tin không hợp lệ",
            "Số ngày hết hạn thông tin không hợp lệ",
            "ngày",
            "{\"min\":1,\"max\":365}",
            true
    ),
    MAX_REFUND_REQUESTS_PER_DAY(
            ConfigType.REFUND_SETTING,
            DataType.INT,
            "3",
            "Số lượng yêu cầu hoàn tiền tối đa mỗi khách hàng được gửi trong một ngày",
            "Số yêu cầu hoàn tối đa mỗi ngày",
            "lần/ngày",
            "{\"min\":1,\"max\":100}",
            true
    ),
    MAX_REFUND_BANK_INFO_RETRY(
            ConfigType.REFUND_SETTING,
            DataType.INT,
            "3",
            "Số lần tối đa khách hàng được phép cập nhật thông tin tài khoản ngân hàng sau khi chuyển khoản hoàn tiền thất bại",
            "Số lần cập nhật TT ngân hàng tối đa",
            "lần",
            "{\"min\":1,\"max\":20}",
            true
    ),
    REFUND_COMPLAINT_PROCESSING_WAIT_HOURS(
            ConfigType.COMPLAINT_SETTING,
            DataType.INT,
            "48",
            "Số giờ tối thiểu yêu cầu hoàn tiền phải ở WAITING_FOR_INFO/READY_TO_PAY trước khi khiếu nại xử lý chậm",
            "Thời gian chờ khiếu nại xử lý hoàn tiền chậm",
            "giờ",
            "{}",
            false
    ),
    REFUND_COMPLAINT_GRACE_DAYS(
            ConfigType.COMPLAINT_SETTING,
            DataType.INT,
            "7",
            "Số ngày khiếu nại còn hiệu lực sau khi yêu cầu hoàn tiền ở trạng thái cuối (PAID/MANUAL_RESOLUTION), tối đa 15",
            "Thời hạn khiếu nại hoàn tiền",
            "ngày",
            "{}",
            false
    ),
    SUPPORT_TICKET_AUTO_CLOSE_HOURS(
            ConfigType.COMPLAINT_SETTING,
            DataType.INT,
            "48",
            "Số giờ tự động đóng ticket sau khi được đánh dấu đã giải quyết nếu khách hàng không phản hồi",
            "Thời gian tự đóng ticket",
            "giờ",
            "{}",
            false
    ),
    ORDER_COMPLAINT_DRAW_CUTOFF_TIME(
            ConfigType.COMPLAINT_SETTING,
            DataType.TIME,
            "15:00",
            "Giờ gần mở thưởng sau đó khách có thể khiếu nại đơn còn ở PAID/PREPARING",
            "Giờ chốt khiếu nại đơn trước quay số",
            "HH:mm",
            "{}",
            false
    ),
    ORDER_SERVICE_COMPLAINT_WINDOW_HOURS(
            ConfigType.COMPLAINT_SETTING,
            DataType.INT,
            "24",
            "Số giờ khách được khiếu nại chất lượng dịch vụ sau khi đơn hoàn thành",
            "Thời hạn khiếu nại chất lượng dịch vụ",
            "giờ",
            "{}",
            false
    ),
    ORDER_STATUS_DELAY_COMPLAINT_MINUTES(
            ConfigType.COMPLAINT_SETTING,
            DataType.INT,
            "15",
            "Số phút đơn ở PAID/PREPARING không đổi trạng thái trước khi khách được khiếu nại xử lý chậm",
            "Thời gian chờ khiếu nại xử lý đơn chậm",
            "phút",
            "{}",
            false
    ),
    ORDER_CANCELLED_COMPLAINT_WINDOW_HOURS(
            ConfigType.COMPLAINT_SETTING,
            DataType.INT,
            "24",
            "Số giờ khách được khiếu nại sau khi đơn bị hủy do sự cố hết vé",
            "Thời hạn khiếu nại đơn hủy hết vé",
            "giờ",
            "{}",
            false
    ),
    PRIZE_PAYOUT_ONLINE_MAX_AMOUNT(
            ConfigType.PAYOUT_SETTING,
            DataType.INT,
            "10000000",
            "Giá trị giải tối đa khách được gửi yêu cầu trả thưởng online (VND)",
            "Hạn mức trả thưởng online",
            "VND",
            "{\"min\":0}",
            true
    ),
    MAX_PRIZE_PAYOUT_ONLINE_REJECT(
            ConfigType.PAYOUT_SETTING,
            DataType.INT,
            "3",
            "Số lần tối đa yêu cầu trả thưởng online bị từ chối trước khi bắt buộc đổi thưởng tại đại lý",
            "Số lần từ chối trả thưởng online tối đa",
            "lần",
            "{\"min\":1,\"max\":20}",
            true
    ),
    PRIZE_PAYOUT_TAX_THRESHOLD(
            ConfigType.PAYOUT_SETTING,
            DataType.INT,
            "10000000",
            "Ngưỡng miễn thuế TNCN trên giá trị giải (VND)",
            "Ngưỡng thuế TNCN",
            "VND",
            "{\"min\":0}",
            true
    ),
    PRIZE_PAYOUT_TAX_RATE(
            ConfigType.PAYOUT_SETTING,
            DataType.DECIMAL,
            "0.10",
            "Thuế suất TNCN áp dụng phần vượt ngưỡng",
            "Thuế suất TNCN",
            "%",
            "{\"min\":0,\"max\":1}",
            true
    ),
    PRIZE_PAYOUT_COMMISSION_TIERS(
            ConfigType.PAYOUT_SETTING,
            DataType.JSON,
            "[{\"upTo\":10000000,\"rate\":0.01},{\"upTo\":100000000,\"rate\":0.007},{\"upTo\":1000000000,\"rate\":0.004},{\"upTo\":null,\"rate\":0.002}]",
            "Bậc thang hoa hồng đại lý trên giá trị giải gốc (trước thuế)",
            "Hoa hồng trả thưởng",
            "%",
            "{}",
            true
    );

    private final ConfigType configType;
    private final DataType dataType;
    private final String defaultValue;
    private final String description;
    private final String configName;
    private final String unit;
    private final String validationRules;
    private final boolean editable;
}
