import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Search, Calendar, CreditCard, Shield, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import SEOHead from '../components/seo/SEOHead';
import { useFAQsQuery } from '../hooks/queries';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorState from '../components/ui/ErrorState';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  order?: number;
  isActive?: boolean;
}

const FAQPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<string[]>([]);

  // Fetch FAQs from API
  const { data: faqData = [], isLoading, error, refetch } = useFAQsQuery();

  // Get unique categories from FAQ data
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(faqData.map(faq => faq.category)));
    return ['All', ...uniqueCategories];
  }, [faqData]);

  // Filter FAQs based on search and category
  const filteredFAQs = useMemo(() => {
    return faqData
      .filter(faq => faq.isActive !== false) // Only show active FAQs
      .filter(faq => {
        const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
        const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0)); // Sort by order if available
  }, [faqData, selectedCategory, searchQuery]);

  const toggleItem = (id: string) => {
    setOpenItems(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading FAQs..." />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <ErrorState
          variant="server"
          error={error}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Frequently Asked Questions | Lunara"
        description="Find answers to common questions about booking beauty appointments, payments, and using Lunara. Get help with your beauty service bookings."
        keywords="beauty booking FAQ, salon appointment help, beauty services questions, booking support, payment help"
        url="/faq"
      />
      <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <section className="bg-white border-b border-neutral-200">
        <div className="container-elegant py-16">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto">
              <HelpCircle className="h-8 w-8 text-accent-600" />
            </div>
            <h1 className="heading-1 text-neutral-900">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Find answers to common questions about booking, payments, and using Lunara
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="bg-white border-b border-neutral-200">
        <div className="container-elegant py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search frequently asked questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
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
        </div>
      </section>

      {/* FAQ Content */}
      <section className="section-padding">
        <div className="container-elegant">
          <div className="max-w-4xl mx-auto">
            {filteredFAQs.length > 0 ? (
              <div className="space-y-4">
                {filteredFAQs.map((faq) => (
                  <div
                    key={faq.id}
                    className="bg-white rounded-lg border border-neutral-200 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleItem(faq.id)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-medium text-accent-600 bg-accent-100 px-2 py-1 rounded">
                            {faq.category}
                          </span>
                        </div>
                        <h3 className="text-lg font-medium text-neutral-900 mt-2">
                          {faq.question}
                        </h3>
                      </div>
                      {openItems.includes(faq.id) ? (
                        <ChevronUp className="h-5 w-5 text-neutral-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-neutral-500" />
                      )}
                    </button>
                    
                    {openItems.includes(faq.id) && (
                      <div className="px-6 pb-4">
                        <p className="text-neutral-600 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <HelpCircle className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">
                  No questions found
                </h3>
                <p className="text-neutral-600">
                  Try adjusting your search or category filter
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-white border-t border-neutral-200">
        <div className="container-elegant py-16">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="heading-3 text-neutral-900">
              Still have questions?
            </h2>
            <p className="text-neutral-600">
              Can't find the answer you're looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
              >
                Contact Support
              </a>
              <a
                href="mailto:support@lunara.com"
                className="inline-flex items-center justify-center px-6 py-3 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Email Us
              </a>
            </div>
          </div>
        </div>
      </section>
      </div>
    </>
  );
};

export default FAQPage;
