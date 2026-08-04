package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotterySupplierType;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalTime;

@Builder
public record UpdateLotterySupplierRequest(
        @NotBlank(message = "Tên nhà cung cấp không được để trống")
        @Size(max = 200)
        String name,

        @NotBlank(message = "Mã nhà cung cấp không được để trống")
        @Size(max = 50)
        String code,

        @NotNull(message = "Loại nhà cung cấp không được để trống")
        LotterySupplierType type,

        @Size(max = 150)
        String contactName,

        @NotBlank(message = "Số điện thoại không được để trống")
        @Size(max = 30)
        String contactPhone,

        @Size(max = 150)
        String contactEmail,

        @Size(max = 500)
        String address,

        @Size(max = 50)
        String taxCode,

        @Min(value = 0, message = "Số ngày thanh toán không được âm")
        Integer paymentTermDays,

        @DecimalMin(value = "0", inclusive = true, message = "Giá vốn mặc định không được âm")
        BigDecimal defaultImportCost,

        @NotNull(message = "Giờ cho phép nhập vé không được để trống")
        @JsonFormat(pattern = "HH:mm")
        LocalTime importAllowFrom,

        @NotNull(message = "Hạn trả vé không được để trống")
        @JsonFormat(pattern = "HH:mm")
        LocalTime returnCutOffTime,

        @NotNull(message = "Trạng thái không được để trống")
        Boolean isActive
) {
}
