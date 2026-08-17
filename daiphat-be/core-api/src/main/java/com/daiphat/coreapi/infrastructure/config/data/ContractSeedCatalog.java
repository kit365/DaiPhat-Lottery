package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.contract.ContractArticle;
import com.daiphat.coreapi.domain.model.contract.ContractModel;
import com.daiphat.coreapi.domain.model.enums.contract.ContractArticleKind;
import com.daiphat.coreapi.domain.model.enums.contract.ContractType;

import java.util.List;

/**
 * Canonical legal copy for the two shared contract templates.
 * Sales text is the current street-agent PDF; prize text reuses that frame and adjusts clauses.
 */
public final class ContractSeedCatalog {

    public static final String SALES_CODE = "TPL-SALES-001";
    public static final String PAYOUT_CODE = "TPL-PAYOUT-001";

    private ContractSeedCatalog() {
    }

    public static ContractModel salesTemplate() {
        return ContractModel.builder()
                .code(SALES_CODE)
                .type(ContractType.STREET_AGENT_SALES)
                .title("Hợp đồng cộng tác bán vé số")
                .staffName("Hợp đồng cộng tác bán vé số")
                .subtitle("Về việc nhận, bán hộ và đối soát vé số kiến thiết")
                .partyARoleLabel("Bên A - Đại lý giao vé")
                .partyBRoleLabel("Bên B - Người bán vé số dạo")
                .partyASignatureLabel("ĐẠI DIỆN BÊN A")
                .partyBSignatureLabel("BÊN B - NGƯỜI BÁN VÉ SỐ DẠO")
                .footerNote("Bản PDF này là bản dự thảo/in từ hệ thống. Bản hợp đồng đã ký, nếu có, được lưu riêng trên hồ sơ đại lý.")
                .isDefault(true)
                .active(true)
                .articles(List.of(
                        article("SCOPE", 1, "Điều 1. Phạm vi hợp tác", ContractArticleKind.TEXT,
                                "<p>Bên A giao Bên B nhận và bán hộ vé số theo từng phiếu bàn giao. Bên B là người bán hộ, "
                                        + "không mặc nhiên mua toàn bộ vé được giao. Quyền sở hữu và quyền định đoạt vé chưa bán "
                                        + "vẫn thuộc Bên A cho đến khi hai bên hoàn tất đối soát theo phiếu bàn giao.</p>"),
                        article("LIMITS", 2, "Điều 2. Hạn mức và bàn giao vé", ContractArticleKind.TEXT,
                                "<p>Hợp đồng có hiệu lực từ <strong>{{contractStartDate}}</strong> đến "
                                        + "<strong>{{contractEndDate}}</strong>. Trần hạn mức theo hợp đồng là "
                                        + "<strong>{{contractMaxDailyCap}}</strong>. Hạn mức bàn giao thực tế do Bên A phê duyệt "
                                        + "theo tình hình kinh doanh và mức tín nhiệm, nhưng không vượt trần này. Danh sách serial, "
                                        + "đài xổ, ngày kinh doanh, số lượng và giá trị của từng lần giao được xác nhận trên từng "
                                        + "phiếu bàn giao; phiếu này là phụ lục không tách rời của hợp đồng.</p>"),
                        article("PRICING", 3, "Điều 3. Giá bán, hoa hồng và tiền cọc", ContractArticleKind.TEXT,
                                "<p>Giá vendor hiện hành: <strong>{{vendorUnitPrice}}</strong>. Mệnh giá bán lẻ được thể hiện "
                                        + "trên từng vé. Hoa hồng: <strong>{{commission}}</strong>. Tiền cọc: "
                                        + "<strong>{{depositRate}}</strong>.</p>"
                                        + "<p>{{depositFormula}}</p>"
                                        + "<p>Giá, tỷ lệ cọc, giờ chốt trả vé và chính sách trả trễ áp dụng cho từng phiếu được "
                                        + "hệ thống ghi nhận tại thời điểm xác nhận bàn giao; thay đổi cấu hình sau đó không làm "
                                        + "thay đổi phiếu đã xác nhận.</p>"),
                        article("RETURN", 4, "Điều 4. Trả vé và đối soát", ContractArticleKind.TEXT,
                                "<p>Bên B trả vé ế và thực hiện đối soát theo serial trước <strong>{{returnCutoff}}</strong> "
                                        + "vào ngày áp dụng. Số vé bán được được xác định bằng số vé đã giao trừ số serial hợp lệ "
                                        + "đã trả. Bên A hoàn cọc và ghi nhận hoa hồng theo kết quả quyết toán của phiếu bàn giao.</p>"
                                        + "<p>Vé mất, rách, hư hỏng hoặc không quét được phải được Bên B báo ngay khi đối soát và "
                                        + "lập ghi nhận với Bên A. Nếu không có xác nhận khác của Bên A, serial không trả được được "
                                        + "xử lý theo kết quả đối soát và chính sách áp dụng cho phiếu bàn giao.</p>"),
                        article("LATE_RETURN", 5, "Điều 5. Xử lý trả trễ", ContractArticleKind.TEXT,
                                "<p>{{lateReturnPolicy}}</p><p>{{lateReturnSettlement}}</p>"),
                        article("DUTIES", 6, "Điều 6. Quyền và trách nhiệm", ContractArticleKind.TEXT,
                                "<ol>"
                                        + "<li>Bên A cung cấp vé hợp lệ, ghi nhận phiếu bàn giao và đối soát minh bạch.</li>"
                                        + "<li>Bên B bảo quản vé, bán đúng phạm vi được giao, không tự ý chuyển vé cho bên thứ ba "
                                        + "và thực hiện đúng giờ trả vé.</li>"
                                        + "<li>Mọi thay đổi về số lượng, giá trị và kết quả đối soát phải được xác nhận trên hệ "
                                        + "thống hoặc chứng từ liên quan.</li>"
                                        + "<li>Bên B không được chuyển giao quyền, nghĩa vụ hoặc vé đã nhận cho bên thứ ba nếu "
                                        + "chưa có xác nhận của Bên A.</li>"
                                        + "</ol>"),
                        article("TERM", 7, "Điều 7. Hiệu lực và chấm dứt", ContractArticleKind.TEXT,
                                "<p>Hợp đồng hết hiệu lực vào ngày nêu trên, theo thỏa thuận bằng văn bản hoặc khi một bên vi "
                                        + "phạm nghiêm trọng nghĩa vụ. Việc chấm dứt không làm mất nghĩa vụ đối soát, thanh toán "
                                        + "và hoàn trả vé còn tồn theo các phiếu bàn giao chưa quyết toán.</p>"),
                        article("DISPUTE", 8, "Điều 8. Sửa đổi, thông báo và giải quyết tranh chấp", ContractArticleKind.TEXT,
                                "<p>Mọi sửa đổi, bổ sung hợp đồng chỉ có giá trị khi được hai bên xác nhận bằng văn bản hoặc "
                                        + "phương thức điện tử được Bên A chấp nhận. Các bên ưu tiên thương lượng thiện chí; nếu "
                                        + "không giải quyết được, tranh chấp được xử lý theo quy định pháp luật hiện hành.</p>")
                ))
                .build();
    }

    /**
     * Prize-payout confirmation reuses the sales legal frame (party A, signatures, dispute style)
     * and replaces operational clauses with payout-specific ones.
     */
    public static ContractModel payoutTemplate(Long basedOnId) {
        return ContractModel.builder()
                .code(PAYOUT_CODE)
                .type(ContractType.PRIZE_PAYOUT)
                .title("Hợp đồng xác nhận trả thưởng vé số")
                .staffName("Hợp đồng xác nhận trả thưởng vé số")
                .subtitle("Về việc chi trả giải thưởng cho vé số kiến thiết đã mua")
                .partyARoleLabel("Bên A - Đại lý trả thưởng")
                .partyBRoleLabel("Bên B - Người nhận thưởng")
                .partyASignatureLabel("ĐẠI DIỆN BÊN A")
                .partyBSignatureLabel("BÊN B - NGƯỜI NHẬN THƯỞNG")
                .footerNote(null)
                .basedOnId(basedOnId)
                .isDefault(true)
                .active(true)
                .articles(List.of(
                        article("SCOPE", 1, "Điều 1. Phạm vi", ContractArticleKind.TEXT,
                                "<p>Bên A chi trả giải thưởng cho vé số kiến thiết mà Bên B đã mua / được ủy quyền nhận "
                                        + "thưởng, theo kết quả đối chiếu trên hệ thống tại thời điểm lập hợp đồng. Hợp đồng này "
                                        + "là chứng từ xác nhận việc nhận thưởng, không thay thế vé gốc và giấy tờ tùy thân đã "
                                        + "đối chiếu.</p>"),
                        article("TICKETS", 2, "Điều 2. Vé trúng thưởng", ContractArticleKind.PRIZE_TICKET_TABLE,
                                "<p>Danh sách vé, giải và số tiền dưới đây là phụ lục không tách rời của hợp đồng:</p>"),
                        article("PAYOUT", 3, "Điều 3. Thuế, hoa hồng và số tiền chi trả", ContractArticleKind.TEXT,
                                "{{taxPolicy}}{{commissionPolicy}}"
                                        + "<p><strong>Số tiền thực nhận</strong> = giá trị giải − thuế TNCN (nếu có) − hoa hồng "
                                        + "đại lý theo cấu hình tại thời điểm lập hợp đồng. Thay đổi cấu hình sau đó không làm "
                                        + "thay đổi số liệu đã in trên hợp đồng này.</p>"),
                        article("COMMITMENT", 4, "Điều 4. Cam kết của người nhận thưởng", ContractArticleKind.TEXT,
                                "<ol>"
                                        + "<li>Bên B xác nhận đã đối chiếu vé gốc / thông tin đơn hàng và giấy tờ tùy thân với "
                                        + "nhân viên Bên A.</li>"
                                        + "<li>Bên B chịu trách nhiệm nếu thông tin CCCD/CMND, họ tên hoặc tư cách nhận thưởng "
                                        + "không đúng.</li>"
                                        + "<li>Sau khi nhận tiền, Bên B không yêu cầu chi trả lại cùng vé, trừ trường hợp sai sót "
                                        + "do Bên A.</li>"
                                        + "</ol>"),
                        article("COMPLAINT", 5, "Điều 5. Khiếu nại", ContractArticleKind.TEXT,
                                "<p>{{complaintPolicy}}</p>"),
                        article("ADDITIONAL", 6, "Điều 6. Điều khoản bổ sung", ContractArticleKind.OPTIONAL_TEXT,
                                "<p class=\"prewrap\">{{additionalTerms}}</p>"),
                        article("TERM", 7, "Điều 7. Hiệu lực", ContractArticleKind.TEXT,
                                "<p>Hợp đồng có hiệu lực kể từ ngày lập. Mọi sửa đổi chỉ có giá trị khi được hai bên xác nhận "
                                        + "bằng văn bản hoặc phương thức điện tử được Bên A chấp nhận. Tranh chấp được ưu tiên "
                                        + "thương lượng; nếu không giải quyết được thì xử lý theo pháp luật hiện hành.</p>")
                ))
                .build();
    }

    private static ContractArticle article(
            String code, int ordinal, String title, ContractArticleKind kind, String body) {
        return ContractArticle.builder()
                .code(code)
                .ordinal(ordinal)
                .title(title)
                .kind(kind)
                .body(body)
                .build();
    }
}
