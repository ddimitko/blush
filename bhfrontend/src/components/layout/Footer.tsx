import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Newspaper, Mail, MapPin, Phone, Heart } from 'lucide-react';
import { smoothScrollToTop } from '../../lib/smoothNavigation';
import LunaraLogo from '../ui/LunaraLogo';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  // Enhanced navigation with smooth scrolling
  const handleNavigation = (path: string) => {
    smoothScrollToTop();
    setTimeout(() => {
      navigate(path);
    }, 100);
  };

  return (
    <footer className="bg-neutral-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <LunaraLogo size="md" variant="full" className="text-white" />
            <p className="text-neutral-400 text-sm leading-relaxed">
              Your premier destination for discovering and booking luxury beauty services.
              Connect with top-rated salons and professionals in your area.
            </p>
            <div className="flex items-center space-x-2 text-sm text-neutral-400">
              <Heart className="h-4 w-4 text-accent-600" />
              <span>Made with love for beauty enthusiasts</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleNavigation('/search')}
                  className="text-neutral-400 hover:text-white transition-colors text-sm text-left"
                >
                  Find Salons
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('/shop/create')}
                  className="text-neutral-400 hover:text-white transition-colors text-sm text-left"
                >
                  List Your Business
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('/about')}
                  className="text-neutral-400 hover:text-white transition-colors text-sm text-left"
                >
                  About Us
                </button>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Support</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleNavigation('/faq')}
                  className="flex items-center space-x-2 text-neutral-400 hover:text-white transition-colors text-sm text-left"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>FAQ</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('/news')}
                  className="flex items-center space-x-2 text-neutral-400 hover:text-white transition-colors text-sm text-left"
                >
                  <Newspaper className="h-4 w-4" />
                  <span>News & Updates</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('/contact')}
                  className="flex items-center space-x-2 text-neutral-400 hover:text-white transition-colors text-sm text-left"
                >
                  <Mail className="h-4 w-4" />
                  <span>Contact Us</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Get in Touch</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-2 text-sm text-neutral-400">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p>Han Tervel 11</p>
                  <p>Plovdiv, Bulgaria 4000</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm text-neutral-400">
                <Phone className="h-4 w-4" />
                <span>+359 896823818</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-neutral-400">
                <Mail className="h-4 w-4" />
                <span>support@beautyhub.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neutral-800 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-neutral-400">
              © {currentYear} Lunara. All rights reserved.
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <button
                onClick={() => handleNavigation('/privacy')}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => handleNavigation('/terms')}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                Terms of Service
              </button>
              <button
                onClick={() => handleNavigation('/cookies')}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                Cookie Policy
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
