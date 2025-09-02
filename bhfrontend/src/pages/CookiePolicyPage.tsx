import React from 'react';
import { Cookie, Settings, BarChart3, Shield, Globe, Eye } from 'lucide-react';
import SEOHead from '../components/seo/SEOHead';

const CookiePolicyPage: React.FC = () => {
  const lastUpdated = 'December 15, 2024';

  return (
    <>
      <SEOHead
        title="Cookie Policy | Lunara"
        description="Learn about how Lunara uses cookies and similar technologies to improve your browsing experience and provide personalized services."
        keywords="cookie policy, cookies, tracking, web analytics, personalization, browser settings"
        url="/cookies"
      />
      <div className="min-h-screen bg-neutral-50">
        {/* Header */}
        <section className="bg-white border-b border-neutral-200">
          <div className="container-elegant py-16">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Cookie className="h-8 w-8 text-orange-600" />
              </div>
              <h1 className="heading-1 text-neutral-900">
                Cookie Policy
              </h1>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                This policy explains how Lunara uses cookies and similar technologies to enhance your experience.
              </p>
              <p className="text-sm text-neutral-500">
                Last updated: {lastUpdated}
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="section-padding">
          <div className="container-elegant">
            <div className="max-w-4xl mx-auto space-y-12">
              
              {/* What Are Cookies */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Cookie className="h-6 w-6 text-orange-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">What Are Cookies?</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <p>
                    Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our service.
                  </p>
                  <p>
                    We also use similar technologies like web beacons, pixels, and local storage to collect information about your interactions with our platform.
                  </p>
                </div>
              </div>

              {/* Types of Cookies */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Settings className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Types of Cookies We Use</h2>
                </div>
                <div className="space-y-6">
                  
                  {/* Essential Cookies */}
                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">Essential Cookies</h3>
                    <p className="text-neutral-600 mb-2">
                      These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and accessibility.
                    </p>
                    <ul className="space-y-1 text-sm text-neutral-600">
                      <li>• Authentication and login status</li>
                      <li>• Shopping cart and booking information</li>
                      <li>• Security and fraud prevention</li>
                      <li>• Load balancing and performance</li>
                    </ul>
                  </div>

                  {/* Functional Cookies */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">Functional Cookies</h3>
                    <p className="text-neutral-600 mb-2">
                      These cookies enable enhanced functionality and personalization, such as remembering your preferences and settings.
                    </p>
                    <ul className="space-y-1 text-sm text-neutral-600">
                      <li>• Language and region preferences</li>
                      <li>• Search filters and sorting preferences</li>
                      <li>• Recently viewed shops and services</li>
                      <li>• Accessibility settings</li>
                    </ul>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">Analytics Cookies</h3>
                    <p className="text-neutral-600 mb-2">
                      These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
                    </p>
                    <ul className="space-y-1 text-sm text-neutral-600">
                      <li>• Page views and user journeys</li>
                      <li>• Popular features and content</li>
                      <li>• Error tracking and performance monitoring</li>
                      <li>• A/B testing and optimization</li>
                    </ul>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="border-l-4 border-red-500 pl-4">
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">Marketing Cookies</h3>
                    <p className="text-neutral-600 mb-2">
                      These cookies are used to deliver personalized advertisements and measure the effectiveness of our marketing campaigns.
                    </p>
                    <ul className="space-y-1 text-sm text-neutral-600">
                      <li>• Personalized advertisements</li>
                      <li>• Social media integration</li>
                      <li>• Campaign performance tracking</li>
                      <li>• Retargeting and remarketing</li>
                    </ul>
                  </div>

                </div>
              </div>

              {/* Third-Party Cookies */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Globe className="h-6 w-6 text-indigo-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Third-Party Cookies</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <p>
                    We work with trusted third-party services that may set their own cookies on your device:
                  </p>
                  <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <h3 className="font-medium text-neutral-900 mb-2">Analytics Services</h3>
                      <ul className="space-y-1 text-sm">
                        <li>• Google Analytics</li>
                        <li>• Hotjar</li>
                        <li>• Mixpanel</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium text-neutral-900 mb-2">Payment Processing</h3>
                      <ul className="space-y-1 text-sm">
                        <li>• Stripe</li>
                        <li>• PayPal</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium text-neutral-900 mb-2">Social Media</h3>
                      <ul className="space-y-1 text-sm">
                        <li>• Facebook</li>
                        <li>• Instagram</li>
                        <li>• Google</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium text-neutral-900 mb-2">Customer Support</h3>
                      <ul className="space-y-1 text-sm">
                        <li>• Intercom</li>
                        <li>• Zendesk</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Managing Cookies */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Settings className="h-6 w-6 text-green-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Managing Your Cookie Preferences</h2>
                </div>
                <div className="space-y-6 text-neutral-600">
                  
                  <div>
                    <h3 className="text-lg font-medium text-neutral-900 mb-3">Browser Settings</h3>
                    <p className="mb-3">
                      You can control cookies through your browser settings. Here's how to manage cookies in popular browsers:
                    </p>
                    <ul className="space-y-2">
                      <li>• <strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
                      <li>• <strong>Firefox:</strong> Preferences → Privacy & Security → Cookies and Site Data</li>
                      <li>• <strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                      <li>• <strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-neutral-900 mb-3">Cookie Consent</h3>
                    <p>
                      When you first visit our website, you'll see a cookie banner where you can choose which types of cookies to accept. You can change your preferences at any time by clicking the "Cookie Settings" link in our footer.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-neutral-900 mb-3">Opt-Out Links</h3>
                    <p className="mb-3">
                      You can opt out of certain third-party cookies:
                    </p>
                    <ul className="space-y-2">
                      <li>• <a href="https://tools.google.com/dlpage/gaoptout" className="text-accent-600 hover:text-accent-700" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out</a></li>
                      <li>• <a href="https://www.facebook.com/settings?tab=ads" className="text-accent-600 hover:text-accent-700" target="_blank" rel="noopener noreferrer">Facebook Ad Preferences</a></li>
                      <li>• <a href="http://optout.networkadvertising.org/" className="text-accent-600 hover:text-accent-700" target="_blank" rel="noopener noreferrer">Network Advertising Initiative</a></li>
                    </ul>
                  </div>

                </div>
              </div>

              {/* Impact of Disabling Cookies */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Eye className="h-6 w-6 text-yellow-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Impact of Disabling Cookies</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <p>
                    While you can disable cookies, please note that this may affect your experience on our website:
                  </p>
                  <ul className="space-y-2">
                    <li>• You may need to re-enter information more frequently</li>
                    <li>• Some features may not work properly</li>
                    <li>• Personalized content and recommendations may not be available</li>
                    <li>• You may see less relevant advertisements</li>
                  </ul>
                  <p className="mt-4">
                    Essential cookies cannot be disabled as they are necessary for the website to function.
                  </p>
                </div>
              </div>

              {/* Updates to Policy */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Shield className="h-6 w-6 text-gray-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Updates to This Policy</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <p>
                    We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons.
                  </p>
                  <p>
                    We will notify you of any significant changes by posting the updated policy on our website and updating the "Last updated" date.
                  </p>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-accent-50 rounded-lg border border-accent-200 p-8">
                <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Questions About Cookies?</h2>
                <p className="text-neutral-600 mb-4">
                  If you have questions about our use of cookies or this policy, please contact us:
                </p>
                <div className="space-y-2 text-neutral-600">
                  <p>Email: <a href="mailto:privacy@lunara.com" className="text-accent-600 hover:text-accent-700">privacy@lunara.com</a></p>
                  <p>Phone: +1 (555) 123-4567</p>
                  <p>Address: 123 Beauty Street, New York, NY 10001</p>
                </div>
              </div>

            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default CookiePolicyPage;
