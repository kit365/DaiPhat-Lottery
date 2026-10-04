'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { websocketService } from '../../../../../services/websocket/websocket.service';
import type { WebSocketSubscription } from '../../../../../types/websocket.type';
import { closeOcrSession, createOcrSession, getOcrSession } from '../services/ocrSessionService';
import type { OcrSessionImage, OcrSessionSocketEvent, OcrSessionStatus } from '../types/ocrSession.type';

interface UseOcrScanSessionOptions {
    onImageUploaded?: (image: OcrSessionImage, signal: AbortSignal) => Promise<void>;
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
    const onImageUploadedRef = useRef(options?.onImageUploaded);
    onImageUploadedRef.current = options?.onImageUploaded;
    const receivedImages = useRef(new Set<string>());
    const receivingImages = useRef(new Set<string>());
    const receiveAbort = useRef(new AbortController());
    const receiveImage = useCallback(async (image: OcrSessionImage, code: string) => {
        if (sessionCodeRef.current !== code || receivedImages.current.has(image.id)
            || receivingImages.current.has(image.id) || !onImageUploadedRef.current) return;
        const controller = receiveAbort.current;
        receivingImages.current.add(image.id);
        try {
            await onImageUploadedRef.current(image, controller.signal);
            if (!controller.signal.aborted) receivedImages.current.add(image.id);
        } catch {
            if (!controller.signal.aborted) {
                toast.error('Chưa tải được ảnh từ điện thoại. Hệ thống sẽ thử nhận lại.', { toastId: `mobile-image-${image.id}` });
            }
        } finally {
            receivingImages.current.delete(image.id);
        }
    }, []);

    const cleanupSubscription = useCallback(() => {
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
        }
    }, []);

    const stopSession = useCallback(async () => {
        const code = sessionCodeRef.current;
        receiveAbort.current.abort();
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
                        if (sessionCodeRef.current !== code) return;
                        if (event.eventType === 'SESSION_CONNECTED') {
                            setStatus('CONNECTED');
                            setConnectedStaff(event.staffName || null);
                            setConnectedDevice(event.deviceName || 'Thiết bị di động');
                            toast.success(
                                `Mobile đã kết nối: ${event.deviceName || ''} (${event.staffName || 'Nhân viên'})`
                            );
                        } else if (event.eventType === 'IMAGE_UPLOADED' && event.image) {
                            setScannedCount(event.totalInSession ?? ((prev) => prev + 1));
                            void receiveImage(event.image, code);
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
        [cleanupSubscription, receiveImage]
    );

    const startSession = useCallback(
        async (params?: { importBatchId?: number | null; importBatchLineId?: number | null }) => {
            setIsCreating(true);
            setError(null);
            try {
                cleanupSubscription();
                receiveAbort.current.abort();
                receiveAbort.current = new AbortController();
                receivedImages.current.clear();
                receivingImages.current.clear();
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
                for (const image of data.images ?? []) {
                    void receiveImage(image, sessionCode);
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
    }, [sessionCode, status, subscribeToSession, receiveImage]);

    useEffect(() => {
        return () => {
            receiveAbort.current.abort();
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
