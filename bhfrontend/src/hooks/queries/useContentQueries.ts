import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

// FAQ queries
export const useFAQsQuery = () => {
  return useQuery({
    queryKey: queryKeys.content.faqs,
    queryFn: () => apiClient.getFAQs(),
    staleTime: 10 * 60 * 1000, // 10 minutes - FAQs don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes cache time
    retry: 2,
  });
};

// News queries
export const useNewsQuery = (params?: {
  category?: string;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: queryKeys.content.news(params),
    queryFn: () => apiClient.getNews(params),
    staleTime: 5 * 60 * 1000, // 5 minutes for news
    gcTime: 15 * 60 * 1000, // 15 minutes cache time
    retry: 2,
  });
};

// Single news item query
export const useNewsItemQuery = (newsId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.content.newsItem(newsId!),
    queryFn: () => apiClient.getNewsItem(newsId!),
    enabled: !!newsId,
    staleTime: 10 * 60 * 1000, // 10 minutes for individual news items
    retry: 2,
  });
};

// Featured news query
export const useFeaturedNewsQuery = (limit: number = 3) => {
  return useQuery({
    queryKey: queryKeys.content.featuredNews(limit),
    queryFn: () => apiClient.getFeaturedNews(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes for featured news
    retry: 2,
  });
};
