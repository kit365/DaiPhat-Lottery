"use client";

import { Box, Typography } from '@mui/material';
import { useState } from 'react';
import { SCAN_STATUS_META } from '../../constants/scan-status.config';
import { ScannedTicket } from '../../types/ticketScan.type';

interface TicketScanBoundingBoxOverviewProps {
    imageUrl: string;
    tickets: ScannedTicket[];
}

/**
 * Best-effort overlay: bbox coordinates are in ticket-vision's (possibly
 * resized-to-<=1920px) working image, while this renders against the
 * originally uploaded file. For images already under that size (the
 * common case for a laptop test upload) the two coincide exactly; for
 * larger originals the boxes may drift slightly. Exact per-ticket crops
 * (croppedImageBase64, rendered in the ticket cards below) are always
 * accurate regardless of source resolution — use those for the fields
 * that actually get imported.
 */
export const TicketScanBoundingBoxOverview = ({ imageUrl, tickets }: TicketScanBoundingBoxOverviewProps) => {
    const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

    return (
        <Box>
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    lineHeight: 0,
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'grey.100',
                }}
            >
                <img
                    src={imageUrl}
                    alt="Ảnh vé đã tải lên"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                    onLoad={(e) => {
                        const img = e.currentTarget;
                        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                    }}
                />
                {naturalSize &&
                    naturalSize.width > 0 &&
                    tickets.map((ticket) => {
                        const bbox = ticket.bbox || (ticket as any).boundingBox || { x: 0, y: 0, width: naturalSize.width, height: naturalSize.height };
                        const meta = (SCAN_STATUS_META as any)[ticket.status] ?? SCAN_STATUS_META.COMPLETE;
                        const leftPct = (bbox.x / naturalSize.width) * 100;
                        const topPct = (bbox.y / naturalSize.height) * 100;
                        const widthPct = (bbox.width / naturalSize.width) * 100;
                        const heightPct = (bbox.height / naturalSize.height) * 100;
                        return (
                            <Box
                                key={ticket.ticketIndex ?? (ticket as any).id ?? Math.random()}
                                sx={{
                                    position: 'absolute',
                                    left: `${leftPct}%`,
                                    top: `${topPct}%`,
                                    width: `${widthPct}%`,
                                    height: `${heightPct}%`,
                                    border: `2px solid ${meta.hex}`,
                                    backgroundColor: `${meta.hex}22`,
                                    borderRadius: 0.5,
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'flex-start',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        bgcolor: meta.hex,
                                        color: '#fff',
                                        px: 0.5,
                                        fontWeight: 700,
                                        lineHeight: 1.6,
                                    }}
                                >
                                    #{ticket.ticketIndex + 1}
                                </Typography>
                            </Box>
                        );
                    })}
            </Box>
        </Box>
    );
};
