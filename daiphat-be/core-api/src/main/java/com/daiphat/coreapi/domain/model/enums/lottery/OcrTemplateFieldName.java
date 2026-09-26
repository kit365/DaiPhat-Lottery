package com.daiphat.coreapi.domain.model.enums.lottery;

/**
 * Field keys aligned with ticket-vision / OCR extracted field names.
 */
public enum OcrTemplateFieldName {
    stationName,
    numbers,
    serialNumber,
    drawDate,
    ticketType,
    batchCode,
    price,
    /**
     * Outline of the paper ticket on the template sample image. Not an OCR
     * value: ticket-vision maps the YOLO-detected ticket onto this frame and
     * locates every other field relative to it.
     */
    ticketFrame;

    public boolean isTicketFrame() {
        return this == ticketFrame;
    }
}
