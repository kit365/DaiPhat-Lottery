package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import java.util.List;

/**
 * Mirrors ticket-vision's BoundingBox (dto/response/scan_response.py):
 * axis-aligned box for a simple overlay, plus the 4 ordered corner points
 * (top-left, top-right, bottom-right, bottom-left) of the ticket's actual
 * outline for a perspective-accurate overlay. Both are in the resized
 * image's coordinate space the mobile app uploaded.
 */
public record TicketBoundingBoxResponse(
        int x,
        int y,
        int width,
        int height,
        List<List<Integer>> corners
) {
}
