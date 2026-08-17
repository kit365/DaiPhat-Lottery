export { ContractDocumentViewerDialog } from "./ContractDocumentViewerDialog";
export { SignedContractSaveDialog } from "./SignedContractSaveDialog";
export { SignedContractUploadDialog } from "./SignedContractUploadDialog";

export const CONTRACT_TEMPLATE_MISSING_HINT =
    "Chưa có mẫu hợp đồng mặc định. Vào Cài đặt → Hợp đồng để tạo hoặc đặt mặc định.";

export const mapContractPdfErrorMessage = (
    raw: string | undefined | null,
    fallback = "Không mở được hợp đồng PDF",
): string => {
    const message = (raw || "").trim();
    if (!message) return fallback;
    const lower = message.toLowerCase();
    if (
        lower.includes("sys_010")
        || lower.includes("contract_template")
        || lower.includes("mẫu hợp đồng")
        || lower.includes("mau hop dong")
        || lower.includes("chưa cấu hình mẫu hợp đồng")
    ) {
        return CONTRACT_TEMPLATE_MISSING_HINT;
    }
    return message;
};
