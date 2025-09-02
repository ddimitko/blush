import React from 'react';
import { Shield, Eye, Lock, UserCheck, Database, Globe } from 'lucide-react';
import SEOHead from '../components/seo/SEOHead';

const PrivacyPolicyPage: React.FC = () => {
  const lastUpdated = 'December 15, 2024';

  return (
    <>
      <SEOHead
        title="Privacy Policy | Lunara"
        description="Learn how Lunara protects your privacy and handles your personal information. Our comprehensive privacy policy explains data collection, usage, and your rights."
        keywords="privacy policy, data protection, personal information, GDPR, privacy rights, data security"
        url="/privacy"
      />
      <div className="min-h-screen bg-neutral-50">
        {/* Header */}
        <section className="bg-white border-b border-neutral-200">
          <div className="container-elegant py-16">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="heading-1 text-neutral-900">
                Privacy Policy
              </h1>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                Your privacy is important to us. This policy explains how we collect, use, and protect your information.
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
              
              {/* Information We Collect */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Database className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Information We Collect</h2>
                </div>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-neutral-900 mb-3">Personal Information</h3>
                    <ul className="space-y-2 text-neutral-600">
                      <li>• Name, email address, and phone number</li>
                      <li>• Profile information and preferences</li>
                      <li>• Payment information (processed securely through Stripe)</li>
                      <li>• Appointment history and booking details</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-neutral-900 mb-3">Usage Information</h3>
                    <ul className="space-y-2 text-neutral-600">
                      <li>• Device information and browser type</li>
                      <li>• IP address and location data</li>
                      <li>• Pages visited and features used</li>
                      <li>• Search queries and preferences</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* How We Use Information */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Eye className="h-6 w-6 text-green-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">How We Use Your Information</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <p>We use your information to:</p>
                  <ul className="space-y-2">
                    <li>• Provide and improve our booking services</li>
                    <li>• Process appointments and payments</li>
                    <li>• Send booking confirmations and reminders</li>
                    <li>• Personalize your experience</li>
                    <li>• Communicate important updates</li>
                    <li>• Ensure platform security and prevent fraud</li>
                    <li>• Comply with legal obligations</li>
                  </ul>
                </div>
              </div>

              {/* Information Sharing */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Globe className="h-6 w-6 text-purple-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Information Sharing</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <p>We may share your information with:</p>
                  <ul className="space-y-2">
                    <li>• <strong>Beauty service providers</strong> - To facilitate your bookings</li>
                    <li>• <strong>Payment processors</strong> - To process transactions securely</li>
                    <li>• <strong>Service providers</strong> - Who help us operate our platform</li>
                    <li>• <strong>Legal authorities</strong> - When required by law</li>
                  </ul>
                  <p className="mt-4">
                    <strong>We never sell your personal information to third parties.</strong>
                  </p>
                </div>
              </div>

              {/* Data Security */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Lock className="h-6 w-6 text-red-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Data Security</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <p>We implement industry-standard security measures:</p>
                  <ul className="space-y-2">
                    <li>• SSL encryption for data transmission</li>
                    <li>• Secure data storage and access controls</li>
                    <li>• Regular security audits and updates</li>
                    <li>• PCI DSS compliance for payment processing</li>
                    <li>• Employee training on data protection</li>
                  </ul>
                </div>
              </div>

              {/* Your Rights */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <UserCheck className="h-6 w-6 text-orange-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Your Rights</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <p>You have the right to:</p>
                  <ul className="space-y-2">
                    <li>• Access your personal information</li>
                    <li>• Correct inaccurate data</li>
                    <li>• Delete your account and data</li>
                    <li>• Export your data</li>
                    <li>• Opt out of marketing communications</li>
                    <li>• Restrict data processing</li>
                  </ul>
                  <p className="mt-4">
                    To exercise these rights, contact us at <a href="mailto:privacy@beautyhub.com" className="text-accent-600 hover:text-accent-700">privacy@beautyhub.com</a>
                  </p>
                </div>
              </div>

              {/* Cookies */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Globe className="h-6 w-6 text-indigo-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Cookies and Tracking</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <p>We use cookies and similar technologies to:</p>
                  <ul className="space-y-2">
                    <li>• Remember your preferences</li>
                    <li>• Analyze site usage</li>
                    <li>• Improve our services</li>
                    <li>• Provide personalized content</li>
                  </ul>
                  <p className="mt-4">
                    You can control cookies through your browser settings. See our <a href="/cookies" className="text-accent-600 hover:text-accent-700">Cookie Policy</a> for more details.
                  </p>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-accent-50 rounded-lg border border-accent-200 p-8">
                <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Questions About Privacy?</h2>
                <p className="text-neutral-600 mb-4">
                  If you have questions about this privacy policy or how we handle your data, please contact us:
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

export default PrivacyPolicyPage;
