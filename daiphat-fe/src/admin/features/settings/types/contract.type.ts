export type ContractType = "STREET_AGENT_SALES" | "PRIZE_PAYOUT";

export type ContractArticleKind = "TEXT" | "PRIZE_TICKET_TABLE" | "OPTIONAL_TEXT";

export type ContractArticle = {
    code?: string;
    ordinal?: number;
    title: string;
    kind: ContractArticleKind;
    body?: string | null;
};

export type ContractTemplate = {
    id: number;
    code: string;
    type: ContractType;
    typeLabel: string;
    title: string;
    staffName: string;
    subtitle?: string | null;
    partyARoleLabel: string;
    partyBRoleLabel: string;
    partyASignatureLabel: string;
    partyBSignatureLabel: string;
    articles: ContractArticle[];
    footerNote?: string | null;
    basedOnId?: number | null;
    basedOnCode?: string | null;
    basedOnTitle?: string | null;
    isDefault: boolean;
    active: boolean;
};

export type UpsertContractPayload = {
    type: ContractType;
    title: string;
    staffName: string;
    subtitle?: string | null;
    partyARoleLabel: string;
    partyBRoleLabel: string;
    partyASignatureLabel: string;
    partyBSignatureLabel: string;
    footerNote?: string | null;
    isDefault?: boolean;
    articles: ContractArticle[];
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
    STREET_AGENT_SALES: "Cộng tác bán vé số",
    PRIZE_PAYOUT: "Nhận thưởng",
};
