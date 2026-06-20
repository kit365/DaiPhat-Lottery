export interface PublicBlogCategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface PublicCategory {
  id: number;
  name: string;
  slug: string;
  avatar: string;
  postCount: number;
}

export interface PublicPost {
  id: number;
  title: string;
  slug: string;
  summary: string;
  thumbnail: string;
  category: PublicBlogCategoryRef | null;
  viewCount: number;
  publishedAt: string;
}

export interface PublicPostDetail extends PublicPost {
  content: string;
  tags: PublicBlogCategoryRef[];
}
