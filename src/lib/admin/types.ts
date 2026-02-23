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

export interface AdminSettings {
  city: string;
  socialLabel: string;
  socialUrl: string;
  socialText: string;
}

export interface AdminPricingItem {
  title: string;
  price: string;
  points: string[];
}

export interface AdminData {
  media: AdminMedia[];
  reviews: AdminReview[];
  settings: AdminSettings | null;
  pricing: AdminPricingItem[];
}
