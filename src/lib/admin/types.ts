export type MediaKind = "photo" | "video";

export interface AdminMedia {
  id: string;
  kind: MediaKind;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  createdAt: number;
}

export interface AdminReview {
  id: string;
  author: string;
  subtitle: string;
  text: string;
  rating: number;
  createdAt: number;
}

export interface AdminData {
  media: AdminMedia[];
  reviews: AdminReview[];
}
