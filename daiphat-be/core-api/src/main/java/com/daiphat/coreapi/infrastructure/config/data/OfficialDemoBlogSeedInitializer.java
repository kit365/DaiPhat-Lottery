package com.daiphat.coreapi.infrastructure.config.data;

import org.springframework.beans.factory.annotation.Value;
import com.daiphat.coreapi.application.dto.request.blog.CreateBlogCategoryRequest;
import com.daiphat.coreapi.application.dto.request.blog.CreateBlogTagRequest;
import com.daiphat.coreapi.application.port.in.blog.BlogCategoryServicePort;
import com.daiphat.coreapi.application.port.in.blog.BlogTagServicePort;
import com.daiphat.coreapi.domain.model.enums.blog.PostStatus;
import com.daiphat.coreapi.domain.model.enums.blog.PostType;
import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogCategoryEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogPostEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogTagEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.blogs.BlogCategoryRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.blogs.BlogPostRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.blogs.BlogTagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/** Publishes a replaceable, topic-linked editorial catalog without sending 60 startup notifications. */
@Component
@Order(130)
@RequiredArgsConstructor
@ConditionalOnProperty(value = "daiphat.official-demo.seed.enabled", havingValue = "true")
public class OfficialDemoBlogSeedInitializer implements ApplicationRunner {

    @Value("${daiphat.lottery.seed.rebuild-demo:false}")
    private boolean rebuildDemo;

    private static final String ACTOR = "official-demo-seed";
    private static final String SLUG_PREFIX = "official-demo-xo-so-";
    private static final List<String> COVER_COLORS = List.of(
            "0f4c81", "0e7490", "1d4ed8", "7c3aed", "047857", "9a3412"
    );
    private static final List<String> ANGLES = List.of(
            "Kiến thức cơ bản", "Hướng dẫn thực hành", "Những điều cần kiểm tra",
            "Câu hỏi thường gặp", "Lưu ý cho người mới"
    );
    private static final List<Topic> TOPICS = List.of(
            new Topic("Lịch quay xổ số miền Nam", "tin-tuc", "lich-quay", PostType.NEWS,
                    "Lịch quay phụ thuộc từng nhà đài và ngày trong tuần; hãy kiểm tra ngày quay in trên vé trước khi đối chiếu."),
            new Topic("Cách đọc thông tin trên vé số", "kinh-nghiem-choi-so", "ve-so", PostType.BLOG,
                    "Một vé hợp lệ cần có dãy số, ký hiệu, ngày quay và nhà đài rõ ràng; giữ vé nguyên vẹn đến khi kiểm tra kết quả."),
            new Topic("Chọn vé số phù hợp ngân sách", "kinh-nghiem-choi-so", "choi-co-trach-nhiem", PostType.TIP,
                    "Đặt ngân sách giải trí trước khi mua và không dùng tiền sinh hoạt hay vay mượn để mua vé."),
            new Topic("Kiểm tra kết quả trúng thưởng", "tin-tuc", "ket-qua", PostType.BLOG,
                    "Đối chiếu đúng nhà đài, ngày quay và toàn bộ dãy số theo thể lệ giải thưởng đang áp dụng."),
            new Topic("Bảo quản vé số giấy", "kinh-nghiem-choi-so", "bao-quan-ve", PostType.TIP,
                    "Cất vé nơi khô ráo, tránh tẩy xóa và chụp ảnh để ghi nhớ thông tin; bản ảnh không thay thế vé gốc."),
            new Topic("Nhận thưởng xổ số an toàn", "tin-tuc", "nhan-thuong", PostType.BLOG,
                    "Xác minh đơn vị trả thưởng, chuẩn bị giấy tờ cần thiết và chỉ cung cấp thông tin thanh toán qua kênh chính thức."),
            new Topic("Phong thủy và con số may mắn", "bai-viet-noi-bat", "phong-thuy", PostType.BLOG,
                    "Phong thủy có thể là một góc nhìn văn hóa thú vị nhưng không làm thay đổi xác suất trúng thưởng."),
            new Topic("Quản lý tồn kho vé số đại lý", "kinh-nghiem-choi-so", "dai-ly", PostType.BLOG,
                    "Đại lý nên đối chiếu số lượng nhập, bán, trả và tồn theo nhà đài, ngày quay và dãy số để tránh thất lạc."),
            new Topic("Quy trình trả vé cho nhà cung cấp", "tin-tuc", "tra-ve", PostType.BLOG,
                    "Kiểm tra tình trạng vé và lập danh sách trả trước giờ chốt; lưu chứng từ bàn giao để đối soát."),
            new Topic("Đối soát công nợ nhà cung cấp", "tin-tuc", "doi-soat", PostType.BLOG,
                    "Tổng hợp vé nhập thực tế, vé trả được xác nhận, giá sau hoa hồng và chi phí phát sinh trước thanh toán."),
            new Topic("Tránh nhầm ngày quay và nhà đài", "kinh-nghiem-choi-so", "ngay-quay", PostType.TIP,
                    "Hai vé có cùng dãy số vẫn khác nhau nếu nhà đài hoặc ngày quay khác; luôn kiểm tra đủ các thông tin này."),
            new Topic("Giải đáp khi cần hỗ trợ vé số", "bai-viet-noi-bat", "ho-tro", PostType.BLOG,
                    "Giữ mã đơn hàng và hình ảnh vé, mô tả vấn đề rõ ràng để bộ phận hỗ trợ có thể kiểm tra nhanh hơn.")
    );

    private final BlogPostRepository postRepository;
    private final BlogCategoryRepository categoryRepository;
    private final BlogTagRepository tagRepository;
    private final BlogCategoryServicePort categoryService;
    private final BlogTagServicePort tagService;
    private final Clock clock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!rebuildDemo) return;
        List<BlogPostEntity> oldPosts = postRepository.findAll().stream()
                .filter(post -> post.getSlug() != null && post.getSlug().startsWith(SLUG_PREFIX))
                .toList();
        postRepository.deleteAll(oldPosts);
        postRepository.flush();

        LocalDateTime now = LocalDateTime.now(clock);
        for (int topicIndex = 0; topicIndex < TOPICS.size(); topicIndex++) {
            Topic topic = TOPICS.get(topicIndex);
            BlogCategoryEntity category = ensureCategory(topic.categorySlug());
            BlogTagEntity tag = ensureTag(topic.tagSlug());
            for (int angleIndex = 0; angleIndex < ANGLES.size(); angleIndex++) {
                String angle = ANGLES.get(angleIndex);
                String title = topic.title() + ": " + angle.toLowerCase();
                int ordinal = topicIndex * ANGLES.size() + angleIndex + 1;
                String summary = topic.lead();
                String content = contentFor(topic, angleIndex);
                postRepository.save(BlogPostEntity.builder()
                        .category(category)
                        .type(topic.type())
                        .title(title)
                        .slug(SLUG_PREFIX + String.format("%02d", ordinal))
                        .summary(summary)
                        .content(content)
                        .thumbnail(coverFor(topic, topicIndex))
                        .status(PostStatus.PUBLISHED)
                        .publishedAt(now.minusDays(60L - ordinal))
                        .tags(Set.of(tag))
                        .viewCount(0)
                        .createdAt(now.minusDays(60L - ordinal))
                        .updatedAt(now)
                        .createdBy(ACTOR)
                        .lastModifiedBy(ACTOR)
                        .build());
            }
        }
    }

    private static String contentFor(Topic topic, int angleIndex) {
        String focus = switch (angleIndex) {
            case 0 -> "Bắt đầu bằng việc hiểu đúng phạm vi của chủ đề và các thông tin được in trên vé. "
                    + "Nhà đài, ngày quay và dãy số là ba dữ kiện cần đối chiếu cùng nhau.";
            case 1 -> "Khi thực hiện, hãy ghi lại mã vé hoặc mã đơn, kiểm tra vé còn nguyên vẹn, "
                    + "đối chiếu lịch quay rồi lưu chứng từ giao dịch. Nếu là đại lý, hãy đối chiếu số lượng "
                    + "theo từng nhà đài trước khi chốt sổ.";
            case 2 -> "Kiểm tra thời hạn áp dụng, tình trạng vé và thông tin người nhận trước khi xác nhận. "
                    + "Một ảnh chụp có thể giúp tra cứu, nhưng không thay thế chứng từ hoặc vé giấy khi quy trình yêu cầu bản gốc.";
            case 3 -> "Nếu hai vé trùng số nhưng khác nhà đài hoặc ngày quay, kết quả có thể khác nhau. "
                    + "Khi dữ liệu trên hệ thống và trên vé không khớp, hãy giữ nguyên chứng từ và liên hệ bộ phận hỗ trợ để đối soát.";
            default -> "Người mới nên đặt giới hạn chi tiêu rõ ràng, hỏi nhân viên về hạn trả vé và hạn nhận thưởng, "
                    + "đồng thời tránh tin vào lời hứa về dãy số chắc chắn trúng.";
        };
        return "<h2>" + topic.title() + "</h2><p>" + topic.lead() + "</p>"
                + "<h3>" + ANGLES.get(angleIndex) + "</h3><p>" + focus + "</p>"
                + "<p>Đối với " + topic.title().toLowerCase()
                + ", thông tin chính xác phải gắn với kỳ quay, nhà đài và quy trình của đại lý tại thời điểm giao dịch. "
                + "Hãy lưu lại bằng chứng và yêu cầu hỗ trợ nếu có chênh lệch.</p>"
                + "<p>Nội dung nhằm cung cấp kiến thức cho khách hàng và đại lý, không dự đoán hay bảo đảm kết quả xổ số.</p>";
    }

    private static String coverFor(Topic topic, int topicIndex) {
        String label = URLEncoder.encode(topic.title(), StandardCharsets.UTF_8);
        return "https://placehold.co/1200x630/" + COVER_COLORS.get(topicIndex % COVER_COLORS.size())
                + "/ffffff/png?text=" + label;
    }

    private BlogCategoryEntity ensureCategory(String slug) {
        return categoryRepository.findAllByIsDeletedFalse().stream()
                .filter(category -> slug.equals(category.getSlug()))
                .findFirst()
                .orElseGet(() -> {
                    String name = switch (slug) {
                        case "tin-tuc" -> "Tin tức";
                        case "bai-viet-noi-bat" -> "Bài viết nổi bật";
                        default -> "Kinh nghiệm chơi số";
                    };
                    Long id = categoryService.createCategory(new CreateBlogCategoryRequest(
                            name, slug, null, "Kiến thức xổ số và đại lý vé số", null, "ACTIVE", null)).id();
                    return categoryRepository.findById(id).orElseThrow();
                });
    }

    private BlogTagEntity ensureTag(String slug) {
        return tagRepository.findAllByIsDeletedFalse().stream()
                .filter(tag -> slug.equals(tag.getSlug()))
                .findFirst()
                .orElseGet(() -> {
                    String name = Arrays.stream(slug.split("-"))
                            .map(word -> word.substring(0, 1).toUpperCase() + word.substring(1))
                            .collect(Collectors.joining(" "));
                    Long id = tagService.createTag(new CreateBlogTagRequest(name, slug)).id();
                    return tagRepository.findById(id).orElseThrow();
                });
    }

    private record Topic(String title, String categorySlug, String tagSlug, PostType type, String lead) {
    }
}
