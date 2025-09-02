import React, { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  noIndex?: boolean;
  canonicalUrl?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'Lunara - Premium Beauty Services & Salon Booking',
  description = 'Discover and book appointments at the finest beauty salons, spas, and wellness centers. Experience luxury beauty services with real-time booking and instant confirmation.',
  keywords = 'beauty salon, spa booking, hair salon, nail salon, massage, beauty services, appointment booking, wellness center, beauty treatments',
  image = '/images/lunara-og.jpg',
  url = 'https://lunara.com',
  type = 'website',
  author = 'Lunara Team',
  publishedTime,
  modifiedTime,
  noIndex = false,
  canonicalUrl
}) => {
  const fullTitle = title.includes('Lunara') ? title : `${title} | Lunara`;
  const fullUrl = url.startsWith('http') ? url : `https://lunara.com${url}`;
  const fullImage = image.startsWith('http') ? image : `https://lunara.com${image}`;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper function to update or create meta tags
    const updateMetaTag = (name: string, content: string, property?: boolean) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;

      if (!meta) {
        meta = document.createElement('meta');
        if (property) {
          meta.setAttribute('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Update basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    updateMetaTag('author', author);

    // Update robots meta tag
    if (noIndex) {
      updateMetaTag('robots', 'noindex, nofollow');
    }

    // Update Open Graph tags
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:title', fullTitle, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', fullImage, true);
    updateMetaTag('og:url', fullUrl, true);
    updateMetaTag('og:site_name', 'Lunara', true);
    // Update Twitter tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', fullTitle);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', fullImage);
    updateMetaTag('twitter:site', '@lunara');
    updateMetaTag('twitter:creator', '@lunara');

    // Update article specific tags
    if (publishedTime) {
      updateMetaTag('article:published_time', publishedTime, true);
    }
    if (modifiedTime) {
      updateMetaTag('article:modified_time', modifiedTime, true);
    }
    if (author) {
      updateMetaTag('article:author', author, true);
    }

    // Update canonical URL
    if (canonicalUrl) {
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', canonicalUrl);
    }
    // Update additional SEO meta tags
    updateMetaTag('viewport', 'width=device-width, initial-scale=1.0');
    updateMetaTag('theme-color', '#BFA054'); // Lunara's warm gold color
    updateMetaTag('msapplication-TileColor', '#BFA054');

    // Update structured data
    let structuredData = document.querySelector('script[type="application/ld+json"]');
    if (!structuredData) {
      structuredData = document.createElement('script');
      structuredData.setAttribute('type', 'application/ld+json');
      document.head.appendChild(structuredData);
    }

    structuredData.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Lunara",
      "description": description,
      "url": "https://lunara.com",
      "logo": "https://lunara.com/images/logo.png",
      "sameAs": [
        "https://facebook.com/lunara",
        "https://instagram.com/lunara",
        "https://twitter.com/lunara"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+1-555-123-4567",
        "contactType": "customer service",
        "availableLanguage": "English"
      },
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "123 Beauty Street",
        "addressLocality": "New York",
        "addressRegion": "NY",
        "postalCode": "10001",
        "addressCountry": "US"
      }
    });
  }, [fullTitle, description, keywords, author, noIndex, type, fullImage, fullUrl, publishedTime, modifiedTime, canonicalUrl]);

  return null; // This component doesn't render anything visible
};

export default SEOHead;
