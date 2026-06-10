class BlogPost {
  final String title;
  final String excerpt;
  final String author;
  final String authorDate;
  final String date;
  final String imageUrl;
  final String category;
  final List<String> bodyParagraphs;
  final List<String> tags;

  const BlogPost({
    required this.title,
    required this.excerpt,
    required this.author,
    required this.authorDate,
    required this.date,
    required this.imageUrl,
    required this.category,
    required this.bodyParagraphs,
    this.tags = const [],
  });
}
