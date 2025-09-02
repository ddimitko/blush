import React from 'react';
import { FileText, Users, CreditCard, AlertTriangle, Scale, Shield } from 'lucide-react';
import SEOHead from '../components/seo/SEOHead';

const TermsOfServicePage: React.FC = () => {
  const lastUpdated = 'December 15, 2024';

  return (
    <>
      <SEOHead
        title="Terms of Service | Lunara"
        description="Read Lunara's terms of service to understand your rights and responsibilities when using our beauty booking platform."
        keywords="terms of service, user agreement, legal terms, platform rules, booking terms"
        url="/terms"
      />
      <div className="min-h-screen bg-neutral-50">
        {/* Header */}
        <section className="bg-white border-b border-neutral-200">
          <div className="container-elegant py-16">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <FileText className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="heading-1 text-neutral-900">
                Terms of Service
              </h1>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                These terms govern your use of BeautyHub and outline the rights and responsibilities of all users.
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
              
              {/* Acceptance of Terms */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Scale className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Acceptance of Terms</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <p>
                    By accessing or using Lunara, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this service.
                  </p>
                  <p>
                    These terms apply to all users of the service, including customers, beauty service providers, and shop owners.
                  </p>
                </div>
              </div>

              {/* User Accounts */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Users className="h-6 w-6 text-purple-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">User Accounts</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <h3 className="text-lg font-medium text-neutral-900">Account Registration</h3>
                  <ul className="space-y-2">
                    <li>• You must provide accurate and complete information</li>
                    <li>• You are responsible for maintaining account security</li>
                    <li>• One person may not maintain multiple accounts</li>
                    <li>• You must be at least 18 years old to create an account</li>
                  </ul>
                  
                  <h3 className="text-lg font-medium text-neutral-900 mt-6">Account Responsibilities</h3>
                  <ul className="space-y-2">
                    <li>• Keep your login credentials secure</li>
                    <li>• Notify us immediately of unauthorized access</li>
                    <li>• You are liable for all activities under your account</li>
                    <li>• Provide accurate contact and payment information</li>
                  </ul>
                </div>
              </div>

              {/* Booking and Payments */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <CreditCard className="h-6 w-6 text-green-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Booking and Payments</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <h3 className="text-lg font-medium text-neutral-900">Booking Terms</h3>
                  <ul className="space-y-2">
                    <li>• All bookings are subject to service provider availability</li>
                    <li>• Booking confirmations are sent via email</li>
                    <li>• You may cancel or reschedule with 24+ hours notice</li>
                    <li>• Late cancellations may incur fees</li>
                  </ul>
                  
                  <h3 className="text-lg font-medium text-neutral-900 mt-6">Payment Terms</h3>
                  <ul className="space-y-2">
                    <li>• Payments are processed securely through Stripe</li>
                    <li>• Prices are set by individual service providers</li>
                    <li>• Payment is due at time of booking unless otherwise specified</li>
                    <li>• Refunds are subject to service provider policies</li>
                  </ul>
                </div>
              </div>

              {/* Service Provider Terms */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Shield className="h-6 w-6 text-orange-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Service Provider Terms</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <h3 className="text-lg font-medium text-neutral-900">Listing Requirements</h3>
                  <ul className="space-y-2">
                    <li>• Must have valid business licenses and certifications</li>
                    <li>• Provide accurate service descriptions and pricing</li>
                    <li>• Maintain professional standards and quality</li>
                    <li>• Respond to bookings and inquiries promptly</li>
                  </ul>
                  
                  <h3 className="text-lg font-medium text-neutral-900 mt-6">Platform Fees</h3>
                  <ul className="space-y-2">
                    <li>• Lunara charges a commission on completed bookings</li>
                    <li>• Payment processing fees apply</li>
                    <li>• Subscription fees for premium features</li>
                    <li>• All fees are clearly disclosed before signup</li>
                  </ul>
                </div>
              </div>

              {/* Prohibited Uses */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Prohibited Uses</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <p>You may not use BeautyHub to:</p>
                  <ul className="space-y-2">
                    <li>• Violate any laws or regulations</li>
                    <li>• Infringe on intellectual property rights</li>
                    <li>• Transmit harmful or malicious content</li>
                    <li>• Engage in fraudulent activities</li>
                    <li>• Harass or discriminate against other users</li>
                    <li>• Attempt to gain unauthorized access to our systems</li>
                    <li>• Use automated tools to access the service</li>
                    <li>• Compete directly with our business</li>
                  </ul>
                </div>
              </div>

              {/* Limitation of Liability */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Scale className="h-6 w-6 text-indigo-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Limitation of Liability</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <p>
                    Lunara acts as a platform connecting customers with service providers. We are not responsible for:
                  </p>
                  <ul className="space-y-2">
                    <li>• Quality of services provided by third parties</li>
                    <li>• Disputes between customers and service providers</li>
                    <li>• Injuries or damages occurring during services</li>
                    <li>• Loss of data or service interruptions</li>
                  </ul>
                  <p className="mt-4">
                    Our liability is limited to the amount paid for services through our platform.
                  </p>
                </div>
              </div>

              {/* Termination */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Termination</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <p>
                    We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
                  </p>
                  <p>
                    You may terminate your account at any time by contacting customer support. Upon termination, your right to use the service will cease immediately.
                  </p>
                </div>
              </div>

              {/* Changes to Terms */}
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <FileText className="h-6 w-6 text-gray-600" />
                  <h2 className="text-2xl font-semibold text-neutral-900">Changes to Terms</h2>
                </div>
                <div className="space-y-4 text-neutral-600">
                  <p>
                    We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the platform.
                  </p>
                  <p>
                    Your continued use of the service after changes constitutes acceptance of the new terms.
                  </p>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-accent-50 rounded-lg border border-accent-200 p-8">
                <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Questions About These Terms?</h2>
                <p className="text-neutral-600 mb-4">
                  If you have questions about these terms of service, please contact us:
                </p>
                <div className="space-y-2 text-neutral-600">
                  <p>Email: <a href="mailto:legal@lunara.com" className="text-accent-600 hover:text-accent-700">legal@lunara.com</a></p>
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

export default TermsOfServicePage;
