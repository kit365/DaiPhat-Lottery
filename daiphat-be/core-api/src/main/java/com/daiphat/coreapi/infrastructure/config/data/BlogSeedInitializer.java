package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.blog.PostStatus;
import com.daiphat.coreapi.domain.model.enums.blog.PostType;
import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogCategoryEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogPostEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.blogs.BlogCategoryRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.blogs.BlogPostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@ConditionalOnProperty(value = "daiphat.blog.seed.enabled", havingValue = "true")
@Component
@RequiredArgsConstructor
@Slf4j
public class BlogSeedInitializer implements ApplicationRunner {

    private final BlogPostRepository blogPostRepository;
    private final BlogCategoryRepository blogCategoryRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<BlogCategoryEntity> categories = blogCategoryRepository.findAllByIsDeletedFalse();
        if (categories.isEmpty()) {
            log.warn("No categories found for seeding blog posts.");
            return;
        }

        log.info("Checking and seeding test blog posts...");
        Random random = new Random();

        for (BlogCategoryEntity category : categories) {
            long count = blogPostRepository.countByCategoryIdAndStatusAndIsDeletedFalse(category.getId(), PostStatus.PUBLISHED);
            if (count > 0) {
                log.info("Category [{}] already has {} posts, skipping seed.", category.getName(), count);
                continue;
            }

            log.info("Seeding 3 posts for category [{}]...", category.getName());
            for (int i = 1; i <= 3; i++) {
                String title = category.getName() + " - Bài viết mẫu số " + i;
                String slug = category.getSlug() + "-bai-viet-mau-so-" + i;
                String summary = "Đây là tóm tắt của bài viết mẫu số " + i + " thuộc danh mục " + category.getName() + ". Bài viết cung cấp các thông tin hữu ích và kinh nghiệm thực tiễn.";
                String content = "<h3>Nội dung bài viết mẫu " + i + "</h3>" +
                        "<p>Trong phong thủy và đời sống, việc tìm hiểu về " + category.getName() + " luôn mang lại nhiều bài học và góc nhìn thú vị. Bài viết này sẽ phân tích chi tiết các khía cạnh liên quan.</p>" +
                        "<p>Hy vọng nội dung hữu ích đối với bạn đọc trên hành trình tìm kiếm vận may và tri thức.</p>";
                
                PostType type = PostType.BLOG;
                if ("tin-tuc".equalsIgnoreCase(category.getSlug())) {
                    type = PostType.NEWS;
                } else if ("kinh-nghiem-choi-so".equalsIgnoreCase(category.getSlug())) {
                    type = PostType.TIP;
                }

                BlogPostEntity post = BlogPostEntity.builder()
                        .category(category)
                        .type(type)
                        .title(title)
                        .slug(slug)
                        .summary(summary)
                        .content(content)
                        .thumbnail("https://picsum.photos/seed/" + slug + "/800/500")
                        .status(PostStatus.PUBLISHED)
                        .viewCount(5000 + random.nextInt(20000)) // Buff viewcount từ 5K đến 25K
                        .publishedAt(LocalDateTime.now().minusDays(random.nextInt(30)))
                        .isDeleted(false)
                        .build();

                blogPostRepository.save(post);
            }
        }
        log.info("Successfully seeded blog posts for testing.");
    }
}
