package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Corrects a supplier's identifying details and nothing else.
 *
 * <p>Deliberately not {@link UpdateLotterySupplierRequest}: that one demands the
 * intake hours, payment cut-off, type and active flag, and the file-import screen
 * never loads them. Sending it from there would either fail validation or, worse,
 * overwrite the supplier's timing rules with whatever the screen happened to hold.
 *
 * <p>Reached when the letterhead of an uploaded file disagrees with the supplier
 * record - usually because the supplier changed a phone number or moved office
 * and nobody updated the system.
 */
public record UpdateLotterySupplierProfileRequest(
        @NotNull Long supplierId,

        @NotBlank(message = "Tên nhà cung cấp không được để trống")
        @Size(max = 200)
        String name,

        @NotBlank(message = "Mã nhà cung cấp không được để trống")
        @Size(max = 50)
        String code,

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
        String taxCode
) {
}
