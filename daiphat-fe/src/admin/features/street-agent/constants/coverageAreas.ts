export type CoverageAreaOption = {
    code: string;
    label: string;
};

/** Standard coverage codes sent to BE. Labels are FE-only. */
export const COVERAGE_AREA_OPTIONS: CoverageAreaOption[] = [
    { code: "HCM-D1", label: "Quận 1" },
    { code: "HCM-D3", label: "Quận 3" },
    { code: "HCM-D4", label: "Quận 4" },
    { code: "HCM-D5", label: "Quận 5" },
    { code: "HCM-D6", label: "Quận 6" },
    { code: "HCM-D7", label: "Quận 7" },
    { code: "HCM-D8", label: "Quận 8" },
    { code: "HCM-D10", label: "Quận 10" },
    { code: "HCM-D11", label: "Quận 11" },
    { code: "HCM-D12", label: "Quận 12" },
    { code: "HCM-BT", label: "Bình Thạnh" },
    { code: "HCM-GV", label: "Gò Vấp" },
    { code: "HCM-PN", label: "Phú Nhuận" },
    { code: "HCM-TB", label: "Tân Bình" },
    { code: "HCM-TP", label: "Tân Phú" },
    { code: "HCM-TD", label: "Thủ Đức" },
    { code: "HCM-BC", label: "Bình Chánh" },
    { code: "HCM-HM", label: "Hóc Môn" },
    { code: "HCM-CC", label: "Củ Chi" },
    { code: "HCM-NB", label: "Nhà Bè" },
    { code: "HCM-CG", label: "Cần Giờ" },
];

const byCode = new Map(COVERAGE_AREA_OPTIONS.map((item) => [item.code, item]));
const byLabel = new Map(COVERAGE_AREA_OPTIONS.map((item) => [item.label.toLowerCase(), item]));

export const getCoverageAreaLabel = (code: string): string => byCode.get(code)?.label || code;

export const parseCoverageAreaCodes = (raw?: string | null): string[] => {
    if (!raw?.trim()) return [];

    const trimmed = raw.trim();
    if (trimmed.startsWith("[")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed
                    .map((item) => String(item).trim())
                    .filter(Boolean);
            }
        } catch {
            // fall through to legacy formats
        }
    }

    return trimmed
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => byCode.get(part)?.code || byLabel.get(part.toLowerCase())?.code || part);
};

export const serializeCoverageAreaCodes = (codes: string[]): string | undefined => {
    const unique = Array.from(new Set(codes.map((code) => code.trim()).filter(Boolean)));
    if (unique.length === 0) return undefined;
    return JSON.stringify(unique);
};

export const formatCoverageAreaDisplay = (raw?: string | null): string => {
    const codes = parseCoverageAreaCodes(raw);
    if (codes.length === 0) return "—";
    return codes.map(getCoverageAreaLabel).join(", ");
};
