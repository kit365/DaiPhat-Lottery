"use client";

import { ImportBatchLineImportDialog } from './ImportBatchLineImportDialog';
import { useImportBatchLineImportForm } from '../../hooks/useImportBatchLineImportForm';

type ImportBatchLineImportHostProps = {
    batchId: number | null;
    lineId: string | null;
    onClose: () => void;
    onSuccess?: () => void;
};

export const ImportBatchLineImportHost = ({
    batchId,
    lineId,
    onClose,
    onSuccess,
}: ImportBatchLineImportHostProps) => {
    const {
        resolvedBatch,
        batchLines,
        dialogLine,
        isPending,
        resolveStationName,
        control,
        errors,
        sectionFields,
        numberLengthRules,
        handleSubmit,
        onSubmit,
        handleInvalidSubmit,
        handleAppendSection,
        handleRemoveSection,
        handleSerialFieldChange,
        handleRemoveSerial,
        handleNumbersFieldChange,
    } = useImportBatchLineImportForm({
        batchId: batchId ? String(batchId) : null,
        activeLineId: lineId,
        enabled: !!batchId && !!lineId,
        onSuccess,
    });

    return (
        <ImportBatchLineImportDialog
            open={!!lineId && !!dialogLine}
            line={dialogLine}
            lines={batchLines}
            batchStatus={resolvedBatch?.status ?? 'DRAFT'}
            drawDate={resolvedBatch?.drawDate}
            resolveStationName={resolveStationName}
            onClose={onClose}
            onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)}
            isSubmitting={isPending}
            control={control}
            errors={errors}
            sectionFields={sectionFields}
            onAppendSection={handleAppendSection}
            removeSection={handleRemoveSection}
            onSerialFieldChange={handleSerialFieldChange}
            onRemoveSerial={handleRemoveSerial}
            onNumbersFieldChange={handleNumbersFieldChange}
            numberLengthRules={numberLengthRules}
        />
    );
};
