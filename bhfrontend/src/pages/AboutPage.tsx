import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About BeautyHub</h1>
          <p className="text-xl text-gray-600">
            Connecting beauty enthusiasts with premium salons and spas
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 mb-6">
              BeautyHub is the premier platform for discovering and booking appointments 
              at the finest beauty salons, spas, and wellness centers. We believe that 
              everyone deserves access to exceptional beauty services that make them 
              feel confident and beautiful.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-700 mb-6">
              To revolutionize the beauty industry by creating seamless connections 
              between customers and beauty professionals, while providing tools that 
              help businesses thrive in the digital age.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Choose BeautyHub?</h2>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Curated selection of premium beauty establishments</li>
              <li>Real-time booking with instant confirmation</li>
              <li>Secure payment processing</li>
              <li>Comprehensive business management tools for salon owners</li>
              <li>Exceptional customer support</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-700">
              Have questions or feedback? We'd love to hear from you. 
              Reach out to us at{' '}
              <a href="mailto:hello@beautyhub.com" className="text-gray-900 underline">
                hello@beautyhub.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
