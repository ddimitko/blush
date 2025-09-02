import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, MessageCircle, HelpCircle, Building } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import SEOHead from '../components/seo/SEOHead';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
}

const ContactPage: React.FC = () => {
  const { success, error } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      success('Message Sent!', 'We\'ll get back to you within 24 hours.');
      setFormData({
        name: '',
        email: '',
        subject: '',
        category: 'general',
        message: ''
      });
    } catch (err) {
      error('Failed to Send', 'Please try again or contact us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Contact Us | Lunara Support"
        description="Get in touch with Lunara support team. We're here to help with your beauty service bookings, technical issues, and business partnerships."
        keywords="Lunara contact, beauty booking support, customer service, technical support, business partnerships"
        url="/contact"
      />
      <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <section className="bg-white border-b border-neutral-200">
        <div className="container-elegant py-16">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto">
              <Mail className="h-8 w-8 text-accent-600" />
            </div>
            <h1 className="heading-1 text-neutral-900">
              Contact Us
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Have questions or need support? We're here to help you with anything related to Lunara
            </p>
          </div>
        </div>
      </section>

      <div className="section-padding">
        <div className="container-elegant">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Information */}
            <div className="lg:col-span-1 space-y-8">
              <div>
                <h2 className="text-2xl font-semibold text-neutral-900 mb-6">
                  Get in Touch
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                  We're committed to providing exceptional support. Reach out to us through any of the channels below.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-accent-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-neutral-900 mb-1">Email</h3>
                    <p className="text-neutral-600">support@lunara.com</p>
                    <p className="text-sm text-neutral-500">We'll respond within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-accent-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-neutral-900 mb-1">Phone</h3>
                    <p className="text-neutral-600">+359 896823818</p>
                    <p className="text-sm text-neutral-500">Mon-Fri, 9AM-6PM EST</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-accent-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-neutral-900 mb-1">Address</h3>
                    <p className="text-neutral-600">
                      Han Tervel 11<br />
                      Plovdiv, Bulgaria<br />
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-accent-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-neutral-900 mb-1">Business Hours</h3>
                    <div className="text-neutral-600 text-sm space-y-1">
                      <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                      <p>Saturday: 10:00 AM - 4:00 PM</p>
                      <p>Sunday: Closed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-white rounded-lg border border-neutral-200 p-6">
                <h3 className="font-medium text-neutral-900 mb-4">Quick Help</h3>
                <div className="space-y-3">
                  <a
                    href="/faq"
                    className="flex items-center space-x-3 text-neutral-600 hover:text-accent-600 transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span>Frequently Asked Questions</span>
                  </a>
                  <a
                    href="/search"
                    className="flex items-center space-x-3 text-neutral-600 hover:text-accent-600 transition-colors"
                  >
                    <Building className="h-4 w-4" />
                    <span>Find a Salon</span>
                  </a>
                  <a
                    href="/shop/create"
                    className="flex items-center space-x-3 text-neutral-600 hover:text-accent-600 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>List Your Business</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-neutral-200 p-8">
                <h2 className="text-2xl font-semibold text-neutral-900 mb-6">
                  Send us a Message
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
                        Full Name *
                      </label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                        Email Address *
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-neutral-700 mb-2">
                        Category
                      </label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                      >
                        <option value="general">General Inquiry</option>
                        <option value="support">Technical Support</option>
                        <option value="booking">Booking Issues</option>
                        <option value="business">Business Partnership</option>
                        <option value="feedback">Feedback</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-neutral-700 mb-2">
                        Subject *
                      </label>
                      <Input
                        id="subject"
                        name="subject"
                        type="text"
                        required
                        value={formData.subject}
                        onChange={handleInputChange}
                        placeholder="Brief description of your inquiry"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-neutral-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      required
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Please provide details about your inquiry..."
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-vertical"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-500">
                      * Required fields
                    </p>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={isSubmitting}
                      icon={<Send className="h-4 w-4" />}
                      iconPosition="right"
                    >
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default ContactPage;
