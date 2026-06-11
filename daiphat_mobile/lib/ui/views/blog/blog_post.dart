class BlogPost {
  final int? id;
  final String? slug;
  final String title;
  final String excerpt;
  final String author;
  final String authorDate;
  final String date;
  final String imageUrl;
  final String category;
  final int viewCount;
  final List<String> bodyParagraphs;
  final String htmlContent;
  final List<String> tags;

  const BlogPost({
    this.id,
    this.slug,
    required this.title,
    required this.excerpt,
    required this.author,
    required this.authorDate,
    required this.date,
    required this.imageUrl,
    required this.category,
    this.viewCount = 0,
    required this.bodyParagraphs,
    this.htmlContent = '',
    this.tags = const [],
  });
}
