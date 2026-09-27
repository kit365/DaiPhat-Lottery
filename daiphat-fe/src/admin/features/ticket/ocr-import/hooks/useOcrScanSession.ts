'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { websocketService } from '../../../../../services/websocket/websocket.service';
import type { WebSocketSubscription } from '../../../../../types/websocket.type';
import { closeOcrSession, createOcrSession, getOcrSession } from '../services/ocrSessionService';
import type { OcrSessionSocketEvent, OcrSessionStatus } from '../types/ocrSession.type';
import type { ScannedTicket } from '../types/ticketOcr.type';

interface UseOcrScanSessionOptions {
    onTicketsScanned?: (tickets: ScannedTicket[], scanId?: string) => void;
}

export const useOcrScanSession = (options?: UseOcrScanSessionOptions) => {
    const [sessionCode, setSessionCode] = useState<string | null>(null);
    const [status, setStatus] = useState<OcrSessionStatus>('WAITING_FOR_MOBILE');
    const [connectedStaff, setConnectedStaff] = useState<string | null>(null);
    const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
    const [scannedCount, setScannedCount] = useState<number>(0);
    const [qrToken, setQrToken] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const subscriptionRef = useRef<WebSocketSubscription | null>(null);
    const sessionCodeRef = useRef<string | null>(null);
    const onTicketsScannedRef = useRef(options?.onTicketsScanned);
    onTicketsScannedRef.current = options?.onTicketsScanned;

    const cleanupSubscription = useCallback(() => {
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
        }
    }, []);

    const stopSession = useCallback(async () => {
        const code = sessionCodeRef.current;
        cleanupSubscription();
        if (code) {
            try {
                await closeOcrSession(code);
            } catch (_) {
                /* Ignore close error */
            }
        }
        setSessionCode(null);
        sessionCodeRef.current = null;
        setStatus('CLOSED');
        setConnectedStaff(null);
        setConnectedDevice(null);
        setScannedCount(0);
        setQrToken(null);
    }, [cleanupSubscription]);

    const subscribeToSession = useCallback(
        async (code: string) => {
            cleanupSubscription();
            try {
                const sub = await websocketService.subscribeOcrSession(
                    code,
                    (event: OcrSessionSocketEvent) => {
                        if (event.eventType === 'SESSION_CONNECTED') {
                            setStatus('CONNECTED');
                            setConnectedStaff(event.staffName || null);
                            setConnectedDevice(event.deviceName || 'Thiết bị di động');
                            toast.success(
                                `Mobile đã kết nối: ${event.deviceName || ''} (${event.staffName || 'Nhân viên'})`
                            );
                        } else if (event.eventType === 'TICKET_SCANNED') {
                            setScannedCount(event.totalInSession ?? ((prev) => prev + (event.tickets?.length || 1)));
                            if (event.tickets && event.tickets.length > 0) {
                                onTicketsScannedRef.current?.(event.tickets, event.scanId || undefined);
                                toast.info(`Đã nhận ${event.tickets.length} vé từ Mobile!`);
                            }
                        } else if (event.eventType === 'SESSION_CLOSED') {
                            setStatus('CLOSED');
                            cleanupSubscription();
                            toast.warning('Phiên quét vé từ Mobile đã kết thúc.');
                        }
                    }
                );
                subscriptionRef.current = sub;
                return sub;
            } catch (err) {
                console.warn('Failed to subscribe to OCR session topic:', err);
                return null;
            }
        },
        [cleanupSubscription]
    );

    const startSession = useCallback(
        async (params?: { importBatchId?: number | null; importBatchLineId?: number | null }) => {
            setIsCreating(true);
            setError(null);
            try {
                cleanupSubscription();
                const res = await createOcrSession(params);
                const data = res.data;
                if (!data?.sessionCode) {
                    throw new Error('Không nhận được mã phiên từ máy chủ.');
                }

                setSessionCode(data.sessionCode);
                sessionCodeRef.current = data.sessionCode;
                setStatus(data.status || 'WAITING_FOR_MOBILE');
                setQrToken(data.qrToken || `daiphat://ocr-session?code=${data.sessionCode}`);
                setScannedCount(0);
                setConnectedStaff(null);
                setConnectedDevice(null);

                await subscribeToSession(data.sessionCode);
                return data;
            } catch (err: any) {
                const msg = err?.response?.data?.message || err?.message || 'Lỗi khi khởi tạo phiên quét vé.';
                setError(msg);
                toast.error(msg);
                return null;
            } finally {
                setIsCreating(false);
            }
        },
        [cleanupSubscription, subscribeToSession]
    );

    // Periodic synchronization to prevent count desync and keep connection fresh
    useEffect(() => {
        if (!sessionCode || status === 'CLOSED') {
            return;
        }

        let isMounted = true;
        if (!subscriptionRef.current) {
            subscribeToSession(sessionCode);
        }

        const syncSession = async () => {
            try {
                const res = await getOcrSession(sessionCode);
                const data = res.data;
                if (!isMounted || !data) return;

                if (data.status && data.status !== 'CLOSED') {
                    setStatus(data.status);
                }
                if (data.connectedStaffName) {
                    setConnectedStaff(data.connectedStaffName);
                }
                if (data.connectedDevice) {
                    setConnectedDevice(data.connectedDevice);
                }
                if (typeof data.scannedTicketCount === 'number') {
                    setScannedCount(data.scannedTicketCount);
                }
            } catch (_) {
                /* Ignore background poll errors */
            }
        };

        syncSession();
        const intervalId = setInterval(syncSession, 2000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [sessionCode, status, subscribeToSession]);

    useEffect(() => {
        return () => {
            cleanupSubscription();
        };
    }, [cleanupSubscription]);

    return {
        sessionCode,
        status,
        connectedStaff,
        connectedDevice,
        scannedCount,
        qrToken,
        isCreating,
        error,
        startSession,
        stopSession,
    };
};
