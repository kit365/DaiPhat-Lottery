package com.daiphat.coreapi.application.dto.request.streetagent;

import com.daiphat.coreapi.application.dto.request.user.UserRegistrationRequest;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateStreetAgentProfileRequest(
        @NotBlank(message = "Họ không được để trống")
        @Size(max = 100, message = "Họ không vượt quá 100 ký tự")
        String firstName,

        @NotBlank(message = "Tên không được để trống")
        @Size(max = 100, message = "Tên không vượt quá 100 ký tự")
        String lastName,

        @NotBlank(message = "Số điện thoại không được để trống")
        @Pattern(regexp = "^0(3[2-9]|7[06-9]|8[1-9]|9[0-46-9]|5[2689])[0-9]{7}$",
                message = UserRegistrationRequest.MSG_PHONE_PATTERN)
        String phone,

        @NotBlank(message = "Số CCCD không được để trống")
        @Pattern(regexp = "^[0-9]{9,12}$", message = "Số CCCD không hợp lệ")
        String cccd,

        @Size(max = 500, message = "URL ảnh không vượt quá 500 ký tự")
        String imageUrl,

        @Size(max = 255, message = "Địa chỉ hoạt động không vượt quá 255 ký tự")
        String contactAddress,

        @Size(max = 100, message = "Tỉnh/thành không vượt quá 100 ký tự")
        String contactProvince,

        @Size(max = 255, message = "Địa bàn bán không vượt quá 255 ký tự")
        String coverageArea,

        @DecimalMin(value = "0", message = "Tỷ lệ hoa hồng phải từ 0 trở lên")
        @DecimalMax(value = "1", message = "Tỷ lệ hoa hồng không vượt quá 100%")
        BigDecimal commissionRate,

        @JsonFormat(pattern = "yyyy-MM-dd")
        LocalDate contractStartDate,

        @JsonFormat(pattern = "yyyy-MM-dd")
        LocalDate contractEndDate,

        @DecimalMin(value = "0", message = "Số dư ký quỹ phải từ 0 trở lên")
        BigDecimal depositBalance,

        String status
) {}
