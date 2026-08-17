package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.util.List;

/**
 * Whether the party named in the letterhead of an uploaded file is the supplier
 * the operator picked in the dialog.
 *
 * <p>Uploading Minh Chính's delivery note against Thành Đạt's supplier record
 * produces a batch whose settlement, payment terms and intake window all belong
 * to the wrong company, and nothing later in the flow would notice. So the
 * letterhead is read back and compared before the rows are.
 *
 * @param declared   true when the file names the supplier at all. Files exported
 *                   by older templates carry no letterhead; those are reported
 *                   rather than rejected, since there is nothing to contradict
 * @param mismatched true when a strong identifier disagrees, which blocks import
 * @param fields     every identifying field the file declared, in reading order
 */
@Builder
public record ImportBatchFileSupplierIdentityResponse(
        boolean declared,
        boolean mismatched,
        List<Field> fields
) {

    /**
     * One identifying field read out of the letterhead.
     *
     * @param field     stable key, e.g. {@code taxCode}
     * @param label     Vietnamese label for display, e.g. "Mã số thuế"
     * @param valueInFile   what the file said, as written
     * @param valueInSystem what the supplier record holds
     * @param matched   true when the two agree after normalization
     * @param blocking  true when a disagreement on this field stops the import.
     *                  Reserved for identifiers that pin down a legal entity;
     *                  a contact person changes without the company changing
     */
    @Builder
    public record Field(
            String field,
            String label,
            String valueInFile,
            String valueInSystem,
            boolean matched,
            boolean blocking
    ) {
    }

    public static ImportBatchFileSupplierIdentityResponse notDeclared() {
        return ImportBatchFileSupplierIdentityResponse.builder()
                .declared(false)
                .mismatched(false)
                .fields(List.of())
                .build();
    }
}
