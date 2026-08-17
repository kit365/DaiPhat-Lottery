import { z } from 'zod';
import {
    DUPLICATE_NUMBERS_MESSAGE,
    SERIAL_DUPLICATE_MESSAGE,
    SERIAL_WITHOUT_TICKET_MESSAGE,
    TICKET_WITHOUT_SERIAL_MESSAGE,
    findDuplicateNumberSectionIndices,
    findDuplicateSerialPaths,
    findSectionRelationshipIssues,
} from '../utils/ticketSerialValidation';
import { SECTION_QUANTITY_MIN_MESSAGE } from '../utils/ticketSectionQuantity';
import {
    TicketNumberLengthRules,
    getTicketNumberLengthMessage,
} from '../utils/ticketNumberValidation';

const serialItemSchema = z.object({
    id: z.union([z.string(), z.number()]).optional(),
    serialNumber: z.string(),
    ticketImg: z.any().optional(),
});

const buildNumbersFieldSchema = (lengthRules: TicketNumberLengthRules) => {
    const lengthMessage = getTicketNumberLengthMessage(lengthRules);

    return z
        .string()
        .min(1, 'Dãy số không được để trống')
        .refine((value) => /^\d+$/.test(value.trim()), 'Dãy số chỉ được chứa chữ số.')
        .refine((value) => {
            const length = value.trim().length;
            return length >= lengthRules.minLength && length <= lengthRules.maxLength;
        }, lengthMessage);
};

const buildTicketSectionSchema = (lengthRules: TicketNumberLengthRules) =>
    z.object({
        ticketId: z.number().optional(),
        numbers: buildNumbersFieldSchema(lengthRules),
        quantity: z.number().int().min(1, SECTION_QUANTITY_MIN_MESSAGE).optional(),
        serials: z.array(serialItemSchema).min(1, 'Phải có ít nhất 1 số sê-ri'),
    });

const withTicketSectionRefinements = <T extends z.ZodTypeAny>(schema: T) =>
    schema.superRefine(
        (data: any, ctx) => {
            const sections = data.ticketSections ?? [];

            findDuplicateNumberSectionIndices(sections).forEach((sectionIndex) => {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: DUPLICATE_NUMBERS_MESSAGE,
                    path: ['ticketSections', sectionIndex, 'numbers'],
                });
            });

            findDuplicateSerialPaths(sections).forEach(({ sectionIndex, serialIndex }) => {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: SERIAL_DUPLICATE_MESSAGE,
                    path: ['ticketSections', sectionIndex, 'serials', serialIndex, 'serialNumber'],
                });
            });

            sections.forEach((section: any, sectionIndex: number) => {
                if (section.quantity != null) {
                    const filledSerials = (section.serials ?? []).filter(
                        (s: any) => (s?.id != null && String(s.id).trim() !== '') || !!s?.serialNumber?.trim()
                    ).length;
                    if (section.quantity < filledSerials) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: `Số lượng vé (${section.quantity}) không được nhỏ hơn số dòng sê-ri đã nhập (${filledSerials}). Vui lòng xóa bớt dòng sê-ri thừa.`,
                            path: ['ticketSections', sectionIndex, 'quantity'],
                        });
                    }
                }
            });

            const relationshipIssues = findSectionRelationshipIssues(sections);
            const numbersErrorApplied = new Set<number>();

            relationshipIssues.forEach((issue) => {
                if (issue.type === 'empty_ticket') {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: 'Dãy số không được để trống',
                        path: ['ticketSections', issue.sectionIndex, 'numbers'],
                    });
                } else if (issue.type === 'ticket_without_serial') {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: TICKET_WITHOUT_SERIAL_MESSAGE,
                        path: ['ticketSections', issue.sectionIndex, 'serials', 0, 'serialNumber'],
                    });
                } else if (issue.type === 'serial_without_ticket') {
                    if (!numbersErrorApplied.has(issue.sectionIndex)) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: SERIAL_WITHOUT_TICKET_MESSAGE,
                            path: ['ticketSections', issue.sectionIndex, 'numbers'],
                        });
                        numbersErrorApplied.add(issue.sectionIndex);
                    }
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: SERIAL_WITHOUT_TICKET_MESSAGE,
                        path: [
                            'ticketSections',
                            issue.sectionIndex,
                            'serials',
                            issue.serialIndex,
                            'serialNumber',
                        ],
                    });
                }
            });
        }
    );

export const buildCreateTicketSchema = (lengthRules: TicketNumberLengthRules) =>
    withTicketSectionRefinements(
        z.object({
            importBatchId: z.string().or(z.number()).refine((val) => !!val, {
                message: 'Phiếu nhập lô không được để trống',
            }),
            importBatchLineId: z.string().or(z.number()).refine((val) => !!val, {
                message: 'Dòng phiếu nhập lô không được để trống',
            }),
            stationId: z.string().or(z.number()).refine((val) => !!val, { message: 'Nhà đài không được để trống' }),
            ticketSections: z.array(buildTicketSectionSchema(lengthRules)).min(1, 'Phải có ít nhất 1 dãy số'),
            drawDate: z.string().optional(),
        })
    );

export type CreateTicketFormValues = z.infer<ReturnType<typeof buildCreateTicketSchema>>;

/** Legacy flat shape used by ticket edit page */
const legacyWithDuplicateSerialRefinement = <T extends z.ZodTypeAny>(schema: T) =>
    schema.superRefine((data: any, ctx) => {
        const serials = data.serials ?? [];
        const groups = new Map<string, number[]>();
        serials.forEach((serial, index) => {
            const key = serial.serialNumber?.trim().toLowerCase() ?? '';
            if (!key) return;
            const bucket = groups.get(key) ?? [];
            bucket.push(index);
            groups.set(key, bucket);
        });
        groups.forEach((indices) => {
            if (indices.length > 1) {
                indices.forEach((index) => {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: SERIAL_DUPLICATE_MESSAGE,
                        path: ['serials', index, 'serialNumber'],
                    });
                });
            }
        });
    });

export const buildLegacyUpdateTicketSchema = (lengthRules: TicketNumberLengthRules) =>
    legacyWithDuplicateSerialRefinement(
        z.object({
            stationId: z.string().or(z.number()).refine((val) => !!val, { message: 'Nhà đài không được để trống' }),
            serials: z.array(serialItemSchema).min(1, 'Phải có ít nhất 1 số sê-ri'),
            numbers: buildNumbersFieldSchema(lengthRules),
            drawDate: z.string().optional(),
        })
    );

export type LegacyUpdateTicketFormValues = z.infer<ReturnType<typeof buildLegacyUpdateTicketSchema>>;
