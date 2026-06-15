package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.shared.util.StorageUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/lottery-ticket-serials")
@RequiredArgsConstructor
@Slf4j
public class LotteryTicketSerialController {

    private final LotteryTicketSerialServicePort lotteryTicketSerialServicePort;
    private final LotteryTicketServicePort lotteryTicketServicePort;

    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<LotteryTicketResponse> uploadImage(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file) {
        log.info("REST request to upload image for lottery ticket serial: {}", id);
        LotteryTicketSerialModel serial = lotteryTicketSerialServicePort.uploadImage(id, StorageUtils.toUploadRequest(file));
        return ApiResponse.success("Tải ảnh sê-ri vé số thành công.",
                lotteryTicketServicePort.getById(serial.getTicketId()));
    }
}
