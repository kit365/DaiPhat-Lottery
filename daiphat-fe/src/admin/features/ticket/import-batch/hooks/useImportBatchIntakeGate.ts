import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatSupplierTime } from '../../../supplier/utils/supplierTimeFields';
import {
    buildImportIntakeBlockedTooltip,
    buildImportIntakeClosedMessage,
    DEFAULT_RETURN_CUTOFF_TIME,
    isBeforeSupplierImportAllowFrom,
    isDrawDateToday,
    isImportIntakeClosed,
    isInReturnCutOffWarningWindow,
    resolveInspectionStartTime,
} from '../utils/importBatchDrawDate';
import { useImportBatchTimePolicy } from './useImportBatch';
import { useActiveSuppliers } from '../../../supplier';

export type ImportBatchIntakeSupplier = {
    name?: string | null;
    importAllowFrom?: string | null;
    returnCutOffTime?: string | null;
};

export type ImportBatchIntakeEvaluation = {
    blocked: boolean;
    notYetAllowed: boolean;
    warning: boolean;
    message: string | null;
    tooltipTitle: string | null;
    inspectionStartLabel: string | null;
    returnCutOffLabel: string | null;
};

const IDLE_EVALUATION: ImportBatchIntakeEvaluation = {
    blocked: false,
    notYetAllowed: false,
    warning: false,
    message: null,
    tooltipTitle: null,
    inspectionStartLabel: null,
    returnCutOffLabel: null,
};

export const evaluateImportBatchIntake = (
    supplier: ImportBatchIntakeSupplier | null | undefined,
    drawDate: string | undefined,
    returnBufferMinutes: number,
    now: Dayjs = dayjs()
): ImportBatchIntakeEvaluation => {
    if (!supplier || !drawDate) {
        return IDLE_EVALUATION;
    }

    const returnCutOffTime = supplier.returnCutOffTime?.trim() || DEFAULT_RETURN_CUTOFF_TIME;
    const notYetAllowed = isBeforeSupplierImportAllowFrom(supplier.importAllowFrom ?? undefined, now);
    const blocked =
        isDrawDateToday(drawDate) &&
        isImportIntakeClosed(returnCutOffTime, drawDate, returnBufferMinutes, now);
    const warning =
        isDrawDateToday(drawDate) &&
        !blocked &&
        !notYetAllowed &&
        isInReturnCutOffWarningWindow(returnCutOffTime, returnBufferMinutes, now);

    const inspectionStart = resolveInspectionStartTime(returnCutOffTime, returnBufferMinutes, now);
    const inspectionStartLabel = inspectionStart?.format('HH:mm') ?? null;
    const returnCutOffLabel = formatSupplierTime(returnCutOffTime);

    const blockedMessage = blocked
        ? buildImportIntakeClosedMessage({
              supplierName: supplier.name,
              returnCutOffTime,
              returnBufferMinutes,
              drawDate,
              now,
          })
        : null;

    return {
        blocked,
        notYetAllowed,
        warning,
        message: blockedMessage ?? (notYetAllowed ? `Chưa đến giờ cho phép nhập vé của nhà cung cấp này (${formatSupplierTime(supplier.importAllowFrom)}).` : null),
        tooltipTitle: blocked
            ? buildImportIntakeBlockedTooltip({
                  inspectionStartLabel,
                  returnCutOffLabel,
                  drawDate,
              })
            : notYetAllowed
              ? `Chưa đến giờ cho phép nhập vé (${formatSupplierTime(supplier.importAllowFrom)}).`
              : null,
        inspectionStartLabel,
        returnCutOffLabel,
    };
};

export const useImportBatchIntakeGate = () => {
    const { data: timePolicy } = useImportBatchTimePolicy();
    const returnBufferMinutes = timePolicy?.returnBufferMinutes ?? 45;
    const [nowTick, setNowTick] = useState(() => dayjs());

    const evaluate = useCallback(
        (supplier: ImportBatchIntakeSupplier | null | undefined, drawDate?: string) =>
            evaluateImportBatchIntake(supplier, drawDate, returnBufferMinutes, nowTick),
        [nowTick, returnBufferMinutes]
    );

    const refreshNow = useCallback(() => setNowTick(dayjs()), []);

    useEffect(() => {
        const timer = window.setInterval(() => setNowTick(dayjs()), 15_000);
        return () => window.clearInterval(timer);
    }, []);

    return useMemo(
        () => ({
            evaluate,
            refreshNow,
            nowTick,
            returnBufferMinutes,
        }),
        [evaluate, refreshNow, nowTick, returnBufferMinutes]
    );
};

export type TodayImportIntakeSupplierStatus = {
    id: number;
    name: string;
    message: string;
    inspectionStartLabel: string | null;
    returnCutOffLabel: string | null;
};

export type TodayImportIntakeSummary = {
    today: string;
    blockedSuppliers: TodayImportIntakeSupplierStatus[];
    warningSuppliers: TodayImportIntakeSupplierStatus[];
    allBlockedForToday: boolean;
    anyBlockedForToday: boolean;
    anyWarningForToday: boolean;
};

export const useTodayImportIntakeSummary = (): TodayImportIntakeSummary => {
    const { data: suppliers = [], isLoading } = useActiveSuppliers();
    const { evaluate, nowTick } = useImportBatchIntakeGate();
    const today = nowTick.format('YYYY-MM-DD');

    return useMemo(() => {
        const blockedSuppliers: TodayImportIntakeSupplierStatus[] = [];
        const warningSuppliers: TodayImportIntakeSupplierStatus[] = [];

        const suppliersToCheck =
            suppliers.length > 0
                ? suppliers
                : isLoading
                  ? []
                  : [{ id: 0, name: 'Nhà cung cấp', returnCutOffTime: DEFAULT_RETURN_CUTOFF_TIME, importAllowFrom: null }];

        suppliersToCheck.forEach((supplier) => {
            const evaluation = evaluate(supplier, today);
            if (evaluation.blocked && evaluation.message) {
                blockedSuppliers.push({
                    id: supplier.id,
                    name: supplier.name,
                    message: evaluation.message,
                    inspectionStartLabel: evaluation.inspectionStartLabel,
                    returnCutOffLabel: evaluation.returnCutOffLabel,
                });
                return;
            }
            if (evaluation.warning) {
                warningSuppliers.push({
                    id: supplier.id,
                    name: supplier.name,
                    message: `Sắp đến giờ kiểm vé chuẩn bị trả (${evaluation.inspectionStartLabel ?? '—'}). Giờ chốt trả vé: ${evaluation.returnCutOffLabel ?? '—'}.`,
                    inspectionStartLabel: evaluation.inspectionStartLabel,
                    returnCutOffLabel: evaluation.returnCutOffLabel,
                });
            }
        });

        return {
            today,
            blockedSuppliers,
            warningSuppliers,
            allBlockedForToday:
                suppliersToCheck.length > 0 && blockedSuppliers.length === suppliersToCheck.length,
            anyBlockedForToday: blockedSuppliers.length > 0,
            anyWarningForToday: warningSuppliers.length > 0,
        };
    }, [evaluate, isLoading, suppliers, today]);
};
