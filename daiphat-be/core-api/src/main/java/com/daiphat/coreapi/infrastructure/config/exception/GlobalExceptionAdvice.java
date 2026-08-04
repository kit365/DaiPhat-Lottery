package com.daiphat.coreapi.infrastructure.config.exception;

import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import jakarta.validation.ConstraintViolationException;
import java.util.List;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionAdvice {

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ApiResponse<?>> handleDomainException(DomainException exception) {
        ErrorCode errorCode = exception.getErrorCode();
        String responseMessage = resolveDomainMessage(exception);
        log.error("Domain exception: [{} - {}] - Detail: {}",
                errorCode.getCode(),
                responseMessage,
                exception.getInternalMessage() != null ? exception.getInternalMessage() : "No additional detail");

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ApiResponse.error(responseMessage, exception.getData()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<?>> handleValidationException(MethodArgumentNotValidException exception) {
        String message = resolveValidationMessage(exception);
        return ResponseEntity.badRequest().body(ApiResponse.error(message));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<?>> handleConstraintViolationException(ConstraintViolationException exception) {
        boolean refreshTokenMissing = exception.getConstraintViolations().stream()
                .anyMatch(v -> String.valueOf(v.getPropertyPath()).contains("refreshToken"));
        if (refreshTokenMissing) {
            ErrorCode errorCode = ErrorCode.REFRESH_TOKEN_EXPIRED;
            return ResponseEntity.status(errorCode.getStatus()).body(ApiResponse.error(errorCode.getMessage()));
        }
        String message = exception.getConstraintViolations().stream()
                .findFirst()
                .map(v -> v.getMessage())
                .orElse(ErrorCode.INVALID_INPUT.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.error(message));
    }

    @ExceptionHandler({AccessDeniedException.class, AuthorizationDeniedException.class})
    public ResponseEntity<ApiResponse<?>> handleAccessDeniedException(Exception exception) {
        log.error("Access denied: {}", exception.getMessage());
        ErrorCode errorCode = ErrorCode.ACCESS_DENIED;

        return ResponseEntity.status(errorCode.getStatus()).body(ApiResponse.error(errorCode.getMessage()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<?>> handleAuthenticationException(AuthenticationException exception) {
        log.error("Authentication exception: {}", exception.getMessage());
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;

        return ResponseEntity.status(errorCode.getStatus()).body(ApiResponse.error(errorCode.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<?>> handleDataIntegrityViolationException(
            DataIntegrityViolationException exception
    ) {
        log.error("Data integrity violation: {}", exception.getMessage());
        ErrorCode errorCode = ErrorCode.INVALID_INPUT;
        String message = resolveDataIntegrityMessage(exception);

        return ResponseEntity.status(errorCode.getStatus()).body(ApiResponse.error(message));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<?>> handleMethodArgumentTypeMismatch(MethodArgumentTypeMismatchException exception) {
        log.warn("Invalid request parameter: {}", exception.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.error("Tham số yêu cầu không hợp lệ."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<?>> handleAllExceptions(Exception exception) {
        log.error("Unexpected error occurred: ", exception);
        ErrorCode errorCode = ErrorCode.INTERNAL_SERVER_ERROR;

        return ResponseEntity.status(errorCode.getStatus()).body(ApiResponse.error(errorCode.getMessage()));
    }

    private String resolveDataIntegrityMessage(DataIntegrityViolationException exception) {
        exception.getMostSpecificCause();
        String rawMessage = exception.getMostSpecificCause().getMessage();
        if (rawMessage == null) {
            return ErrorCode.INVALID_INPUT.getMessage();
        }

        if (rawMessage.contains("uq_lottery_tickets_serial_number")
                || rawMessage.contains("uk_lottery_tickets_serial_number")) {
            return "Hệ thống vẫn đang áp dụng ràng buộc serial_number cũ trong cơ sở dữ liệu. Hãy chạy migration mới để chuyển sang ràng buộc tổ hợp 4 trường.";
        }

        if (rawMessage.contains("uk_lottery_ticket_station_numbers_draw_date")) {
            return "Vé số với stationId, numbers và drawDate này đã tồn tại trong hệ thống.";
        }

        if (rawMessage.contains("uk_lottery_ticket_serials_ticket_serial")) {
            return "Sê-ri vé đã tồn tại trong cùng một vé số.";
        }

        if (rawMessage.contains("uq_import_batch_lines_batch_station")) {
            return "Nhà đài này đã có trong phiếu nhập lô.";
        }

        if (rawMessage.contains("default_draw_time")
                || rawMessage.contains("lottery_regions")) {
            return "Không thể cập nhật miền vì thiếu giờ quay mặc định. Vui lòng kiểm tra cấu hình miền.";
        }

        if (rawMessage.contains("uk_order_details_order_ticket_serial")
                || rawMessage.contains("uk_order_detail_serials_serial")) {
            return "Một hoặc nhiều vé đã được phân bổ cho đơn hàng khác.";
        }

        return ErrorCode.INVALID_INPUT.getMessage();
    }

    private String resolveValidationMessage(MethodArgumentNotValidException exception) {
        if (!exception.getBindingResult().hasErrors()) {
            return "Dữ liệu nhập vào không hợp lệ.";
        }
        var fieldError = exception.getBindingResult().getFieldError();
        if (fieldError != null && fieldError.getDefaultMessage() != null && !fieldError.getDefaultMessage().isBlank()) {
            return fieldError.getDefaultMessage();
        }
        if (fieldError != null) {
            return switch (fieldError.getField()) {
                case "refundReason" -> "Vui lòng nhập lý do hoàn tiền.";
                case "bankAccountId" -> "Vui lòng chọn tài khoản nhận hoàn tiền.";
                default -> "Dữ liệu nhập vào không hợp lệ.";
            };
        }
        return "Dữ liệu nhập vào không hợp lệ.";
    }

    private String resolveDomainMessage(DomainException exception) {
        ErrorCode errorCode = exception.getErrorCode();

        if (errorCode == ErrorCode.LOTTERY_STATION_ACTIVATION_INCOMPLETE
                && exception.getData() instanceof Map<?, ?> dataMap) {
            Object missing = dataMap.get("missingFields");
            if (missing instanceof List<?> missingList && !missingList.isEmpty()) {
                @SuppressWarnings("unchecked")
                List<String> fields = (List<String>) missingList;
                return LotteryStationModel.buildActivationIncompleteMessage(fields);
            }
        }

        if (exception.getInternalMessage() == null || exception.getInternalMessage().isBlank()) {
            return exception.getMessage();
        }

        if (errorCode == ErrorCode.INVALID_INPUT
                || errorCode == ErrorCode.ORDER_DETAIL_NOT_FOUND
                || errorCode == ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE
                || errorCode == ErrorCode.PRIZE_PAYOUT_ALREADY_REQUESTED
                || errorCode == ErrorCode.PRIZE_PAYOUT_REQUIRES_IN_PERSON
                || errorCode == ErrorCode.PRIZE_PAYOUT_INVALID_STATUS
                || errorCode == ErrorCode.LOTTERY_TICKET_INVALID_STATUS
                || errorCode == ErrorCode.LOTTERY_TICKET_EXPIRED
                || errorCode == ErrorCode.LOTTERY_TICKET_BOOKING_CLOSED
                || errorCode == ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE
                || errorCode == ErrorCode.LOTTERY_STATION_SYNC_SOURCE_UNSUPPORTED
                || errorCode == ErrorCode.LOTTERY_STATION_SYNC_REGION_UNSUPPORTED
                || errorCode == ErrorCode.LOTTERY_STATION_SYNC_SOURCE_EMPTY
                || errorCode == ErrorCode.LOTTERY_STATION_SYNC_SOURCE_COUNT_MISMATCH
                || errorCode == ErrorCode.LOTTERY_STATION_SYNC_SOURCE_INVALID
                || errorCode == ErrorCode.LOTTERY_STATION_SYNC_SOURCE_DUPLICATE
                || errorCode == ErrorCode.LOTTERY_STATION_SYNC_DEFAULT_PRICE_REQUIRED
                || errorCode == ErrorCode.LOTTERY_STATION_SYNC_CANONICAL_NAME_REQUIRED
                || errorCode == ErrorCode.REFUND_WINDOW_EXPIRED
                || errorCode == ErrorCode.REFUND_REQUEST_INVALID_AMOUNT
                || errorCode == ErrorCode.REFUND_REQUEST_BANK_ACCOUNT_MISMATCH
                || errorCode == ErrorCode.REFUND_ORDER_ALREADY_REQUESTED
                || errorCode == ErrorCode.REFUND_DAILY_LIMIT_EXCEEDED
                || errorCode == ErrorCode.ORDER_INVALID_STATUS
                || errorCode == ErrorCode.ORDER_NOT_FOUND
                || errorCode == ErrorCode.LOTTERY_TICKET_SERIALS_INCIDENT_INCOMPLETE) {
            return exception.getInternalMessage();
        }

        return exception.getMessage();
    }
}
