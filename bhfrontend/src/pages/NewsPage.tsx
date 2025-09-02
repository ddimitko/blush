import React, { useState } from 'react';
import { Calendar, Clock, ArrowRight, Newspaper, Tag, User } from 'lucide-react';
import { cn } from '../lib/utils';
import SEOHead from '../components/seo/SEOHead';

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  publishedAt: string;
  readTime: number;
  image?: string;
  featured?: boolean;
}

const newsData: NewsArticle[] = [
  {
    id: '1',
    title: 'BeautyHub Launches Real-Time Booking System',
    excerpt: 'Experience instant appointment confirmations with our new real-time booking technology.',
    content: 'We\'re excited to announce the launch of our revolutionary real-time booking system...',
    category: 'Product Updates',
    author: 'BeautyHub Team',
    publishedAt: '2024-01-15',
    readTime: 3,
    featured: true
  },
  {
    id: '2',
    title: 'Top 10 Beauty Trends for 2024',
    excerpt: 'Discover the latest beauty trends that are taking the industry by storm this year.',
    content: 'From sustainable beauty practices to innovative treatments...',
    category: 'Beauty Trends',
    author: 'Sarah Johnson',
    publishedAt: '2024-01-12',
    readTime: 5
  },
  {
    id: '3',
    title: 'How to Choose the Perfect Salon for Your Needs',
    excerpt: 'A comprehensive guide to finding the right beauty salon that matches your style and budget.',
    content: 'Choosing the right salon can make all the difference in your beauty experience...',
    category: 'Tips & Guides',
    author: 'Maria Rodriguez',
    publishedAt: '2024-01-10',
    readTime: 4
  },
  {
    id: '4',
    title: 'BeautyHub Partners with Leading Salons Nationwide',
    excerpt: 'We\'re expanding our network to bring you more premium beauty services across the country.',
    content: 'We\'re thrilled to announce new partnerships with over 500 premium salons...',
    category: 'Company News',
    author: 'BeautyHub Team',
    publishedAt: '2024-01-08',
    readTime: 2
  },
  {
    id: '5',
    title: 'The Rise of Sustainable Beauty Practices',
    excerpt: 'Learn how the beauty industry is embracing eco-friendly practices and what it means for you.',
    content: 'Sustainability is becoming increasingly important in the beauty industry...',
    category: 'Industry News',
    author: 'Emma Thompson',
    publishedAt: '2024-01-05',
    readTime: 6
  },
  {
    id: '6',
    title: 'New Payment Options Now Available',
    excerpt: 'We\'ve added more convenient payment methods to make booking even easier.',
    content: 'Based on your feedback, we\'ve expanded our payment options...',
    category: 'Product Updates',
    author: 'BeautyHub Team',
    publishedAt: '2024-01-03',
    readTime: 2
  }
];

const categories = ['All', 'Product Updates', 'Beauty Trends', 'Tips & Guides', 'Company News', 'Industry News'];

const NewsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredNews = newsData.filter(article => 
    selectedCategory === 'All' || article.category === selectedCategory
  );

  const featuredArticle = newsData.find(article => article.featured);
  const regularArticles = filteredNews.filter(article => !article.featured);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <SEOHead
        title="Beauty News & Updates | Lunara"
        description="Stay updated with the latest beauty industry news, trends, and Lunara platform updates. Discover new beauty treatments and salon innovations."
        keywords="beauty news, beauty trends, salon updates, beauty industry, beauty innovations, Lunara news"
        url="/news"
      />
      <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <section className="bg-white border-b border-neutral-200">
        <div className="container-elegant py-16">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto">
              <Newspaper className="h-8 w-8 text-accent-600" />
            </div>
            <h1 className="heading-1 text-neutral-900">
              BeautyHub News
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Stay updated with the latest news, trends, and updates from the beauty industry
            </p>
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="bg-white border-b border-neutral-200">
        <div className="container-elegant py-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  selectedCategory === category
                    ? 'bg-accent-600 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Article */}
      {featuredArticle && selectedCategory === 'All' && (
        <section className="section-padding bg-white">
          <div className="container-elegant">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-accent-50 to-accent-100 rounded-lg p-8 md:p-12">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <span className="bg-accent-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Featured
                    </span>
                    <span className="text-accent-700 text-sm font-medium">
                      {featuredArticle.category}
                    </span>
                  </div>
                  
                  <h2 className="text-3xl md:text-4xl font-bold text-neutral-900">
                    {featuredArticle.title}
                  </h2>
                  
                  <p className="text-lg text-neutral-600 leading-relaxed">
                    {featuredArticle.excerpt}
                  </p>
                  
                  <div className="flex items-center space-x-6 text-sm text-neutral-500">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{featuredArticle.author}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(featuredArticle.publishedAt)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{featuredArticle.readTime} min read</span>
                    </div>
                  </div>
                  
                  <button className="inline-flex items-center space-x-2 bg-accent-600 text-white px-6 py-3 rounded-lg hover:bg-accent-700 transition-colors">
                    <span>Read More</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Articles Grid */}
      <section className="section-padding">
        <div className="container-elegant">
          <div className="max-w-6xl mx-auto">
            {regularArticles.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {regularArticles.map((article) => (
                  <article
                    key={article.id}
                    className="bg-white rounded-lg border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center space-x-1 text-accent-600 text-sm font-medium">
                          <Tag className="h-3 w-3" />
                          <span>{article.category}</span>
                        </span>
                        <div className="flex items-center space-x-1 text-neutral-500 text-sm">
                          <Clock className="h-3 w-3" />
                          <span>{article.readTime} min</span>
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-semibold text-neutral-900 leading-tight">
                        {article.title}
                      </h3>
                      
                      <p className="text-neutral-600 leading-relaxed">
                        {article.excerpt}
                      </p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                        <div className="flex items-center space-x-2 text-sm text-neutral-500">
                          <User className="h-4 w-4" />
                          <span>{article.author}</span>
                        </div>
                        <span className="text-sm text-neutral-500">
                          {formatDate(article.publishedAt)}
                        </span>
                      </div>
                      
                      <button className="w-full mt-4 inline-flex items-center justify-center space-x-2 text-accent-600 hover:text-accent-700 font-medium transition-colors">
                        <span>Read Article</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Newspaper className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">
                  No articles found
                </h3>
                <p className="text-neutral-600">
                  Try selecting a different category
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="bg-white border-t border-neutral-200">
        <div className="container-elegant py-16">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="heading-3 text-neutral-900">
              Stay in the Loop
            </h2>
            <p className="text-neutral-600">
              Subscribe to our newsletter for the latest beauty news, trends, and BeautyHub updates
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
              <button className="px-6 py-3 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>
      </div>
    </>
  );
};

export default NewsPage;
