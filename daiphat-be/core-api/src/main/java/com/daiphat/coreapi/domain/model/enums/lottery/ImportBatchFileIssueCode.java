package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Why a row or a draw-date group of an uploaded supplier file cannot be turned
 * into an import batch line - or can, but deserves a warning.
 *
 * <p>The message is shown verbatim in the preview table, so it is written for the
 * warehouse staff reading it, not for a developer.
 */
@Getter
@RequiredArgsConstructor
public enum ImportBatchFileIssueCode {

    // ---- group level -------------------------------------------------
    /**
     * Not an error: the file legitimately covers a whole week while a batch can
     * only be created for today or tomorrow.
     */
    DRAW_DATE_OUT_OF_WINDOW(
            ImportBatchFileIssueSeverity.SKIPPED,
            "Ngày quay nằm ngoài phạm vi cho phép (chỉ tạo được phiếu cho hôm nay hoặc ngày mai)."
    ),
    DRAFT_ALREADY_EXISTS(
            ImportBatchFileIssueSeverity.WARNING,
            "Đã có phiếu nhập đang mở cho ngày quay và nhà cung cấp này."
    ),
    SUPPLIER_IMPORT_NOT_ALLOWED(
            ImportBatchFileIssueSeverity.ERROR,
            "Chưa tới giờ cho phép nhập lô của nhà cung cấp này."
    ),
    SUPPLIER_RETURN_CUT_OFF_PASSED(
            ImportBatchFileIssueSeverity.ERROR,
            "Đã qua giờ chốt trả vé của nhà cung cấp cho ngày quay này."
    ),
    STATION_PRICING_MISMATCH(
            ImportBatchFileIssueSeverity.ERROR,
            "Giá trong tệp lệch với cấu hình đài. Hãy đối chiếu và cập nhật trước khi tạo phiếu."
    ),
    NO_VALID_ROW(
            ImportBatchFileIssueSeverity.ERROR,
            "Không có dòng hợp lệ nào cho ngày quay này."
    ),
    PARTIAL_IMPORT_DISABLED(
            ImportBatchFileIssueSeverity.ERROR,
            "Cấu hình đang không cho phép nhập dở dang. Vui lòng sửa hết dòng lỗi rồi tải lại tệp."
    ),

    // ---- row level ---------------------------------------------------
    MISSING_REQUIRED_COLUMN(
            ImportBatchFileIssueSeverity.ERROR,
            "Thiếu giá trị ở cột bắt buộc."
    ),
    DRAW_DATE_INVALID(
            ImportBatchFileIssueSeverity.ERROR,
            "Không đọc được ngày quay."
    ),
    STATION_NOT_FOUND(
            ImportBatchFileIssueSeverity.ERROR,
            "Không tìm thấy nhà đài khớp với tên trong tệp."
    ),
    STATION_CODE_NOT_FOUND(
            ImportBatchFileIssueSeverity.ERROR,
            "Mã nhà đài trong tệp không tồn tại trong hệ thống."
    ),
    STATION_NOT_ELIGIBLE(
            ImportBatchFileIssueSeverity.ERROR,
            "Nhà đài không có lịch quay vào ngày này."
    ),
    STATION_DRAFT_EXISTS(
            ImportBatchFileIssueSeverity.ERROR,
            "Nhà đài đã nằm trong một phiếu nhập nháp khác của ngày quay này."
    ),
    QUANTITY_INVALID(
            ImportBatchFileIssueSeverity.ERROR,
            "Không đọc được số lượng."
    ),
    QUANTITY_NOT_POSITIVE(
            ImportBatchFileIssueSeverity.ERROR,
            "Số lượng phải lớn hơn 0."
    ),
    STATION_AMBIGUOUS(
            ImportBatchFileIssueSeverity.WARNING,
            "Tên nhà đài khớp với nhiều đài. Vui lòng chọn đúng đài."
    ),
    DUPLICATE_STATION_IN_GROUP(
            ImportBatchFileIssueSeverity.WARNING,
            "Nhà đài xuất hiện nhiều lần trong cùng ngày quay. Số lượng đã được cộng gộp."
    ),
    IMPORT_COST_MISMATCH(
            ImportBatchFileIssueSeverity.WARNING,
            "Giá vốn trong tệp khác giá đang cấu hình của nhà đài. Hệ thống dùng giá của nhà đài."
    ),
    LATE_IMPORT_WARNING(
            ImportBatchFileIssueSeverity.WARNING,
            "Nhập lô trễ so với giờ quay của nhà đài."
    ),

    // ---- ticket level (only when the file carries the tickets) --------
    NUMBERS_REQUIRED(
            ImportBatchFileIssueSeverity.ERROR,
            "Thiếu dãy số."
    ),
    NUMBERS_INVALID(
            ImportBatchFileIssueSeverity.ERROR,
            "Dãy số chỉ được chứa chữ số."
    ),
    NUMBERS_LENGTH_INVALID(
            ImportBatchFileIssueSeverity.ERROR,
            "Độ dài dãy số không đúng quy định của miền."
    ),
    NUMBERS_DUPLICATED_IN_GROUP(
            ImportBatchFileIssueSeverity.WARNING,
            "Dãy số xuất hiện nhiều lần cho cùng nhà đài. Các sê-ri đã được gộp chung."
    ),
    SERIALS_REQUIRED(
            ImportBatchFileIssueSeverity.ERROR,
            "Thiếu số sê-ri."
    ),
    SERIAL_DUPLICATED_IN_FILE(
            ImportBatchFileIssueSeverity.ERROR,
            "Số sê-ri bị trùng trong tệp."
    ),
    SERIAL_ALREADY_IMPORTED(
            ImportBatchFileIssueSeverity.ERROR,
            "Số sê-ri đã tồn tại trong hệ thống cho dãy số này."
    ),
    QUANTITY_ABOVE_SERIAL_COUNT(
            ImportBatchFileIssueSeverity.WARNING,
            "Nhà cung cấp khai nhiều vé hơn số sê-ri có trong tệp. Phần thiếu để lại nhập sau."
    ),
    QUANTITY_BELOW_SERIAL_COUNT(
            ImportBatchFileIssueSeverity.ERROR,
            "Số sê-ri trong tệp nhiều hơn số lượng nhà cung cấp khai báo."
    ),
    TICKET_IMAGE_INVALID(
            ImportBatchFileIssueSeverity.WARNING,
            "Đường dẫn ảnh vé không hợp lệ, sẽ bỏ qua ảnh."
    ),
    TICKET_IMAGE_COUNT_MISMATCH(
            ImportBatchFileIssueSeverity.WARNING,
            "Số ảnh không khớp số sê-ri. Chỉ nhận khi có đúng 1 ảnh dùng chung hoặc đủ ảnh cho từng sê-ri."
    );

    private final ImportBatchFileIssueSeverity severity;
    private final String defaultMessage;
}
