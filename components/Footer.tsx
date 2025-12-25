'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, MessageCircle, Send } from 'lucide-react';
import { COMPANY_INFO } from '@/constants/categories';
import { useTranslations } from '@/lib/i18n';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const t = useTranslations();

  return (
    <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white" style={{ paddingTop: '80px', paddingBottom: '40px', marginTop: '0', paddingLeft: '32px', paddingRight: '32px' }}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* О компании */}
          <div>
            <h3 className="text-2xl font-bold mb-4 gradient-text">
              {COMPANY_INFO.name}
            </h3>
            <p className="text-gray-400 mb-4">{COMPANY_INFO.slogan}</p>
            <p className="text-sm text-gray-500">
              {t('footer.aboutCompany')}
            </p>
          </div>

          {/* Навигация */}
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.navigation')}</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-gray-400 hover:text-[#FF6B35] transition-colors"
                >
                  {t('common.home')}
                </Link>
              </li>
              <li>
                <Link
                  href="/catalog"
                  className="text-gray-400 hover:text-[#FF6B35] transition-colors"
                >
                  {t('common.catalog')}
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-gray-400 hover:text-[#FF6B35] transition-colors"
                >
                  {t('common.about')}
                </Link>
              </li>
              <li>
                <Link
                  href="/contacts"
                  className="text-gray-400 hover:text-[#FF6B35] transition-colors"
                >
                  {t('common.contacts')}
                </Link>
              </li>
              <li>
                <Link
                  href="/cart"
                  className="text-gray-400 hover:text-[#FF6B35] transition-colors"
                >
                  {t('common.cart')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Контакты */}
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.contacts')}</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <Phone className="w-5 h-5 text-[#FF6B35] mt-1 flex-shrink-0" />
                <div>
                  <a
                    href={`tel:${COMPANY_INFO.defaultWhatsApp}`}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {COMPANY_INFO.defaultWhatsApp}
                  </a>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-[#FF6B35] mt-1 flex-shrink-0" />
                <div>
                  <a
                    href={`mailto:${COMPANY_INFO.email}`}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {COMPANY_INFO.email}
                  </a>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-[#FF6B35] mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-400">{COMPANY_INFO.address}</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Социальные сети */}
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.socialMedia')}</h4>
            <div className="flex space-x-4">
              <a
                href={`https://wa.me/${COMPANY_INFO.defaultWhatsApp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-[#25D366] transition-all hover:scale-110 group"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </a>
              <a
                href={`https://t.me/${COMPANY_INFO.telegram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-[#0088CC] transition-all hover:scale-110 group"
                aria-label="Telegram"
              >
                <Send className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </a>
            </div>
            <div className="mt-6">
              <p className="text-sm text-gray-400 mb-2">
                {t('footer.subscribe')}
              </p>
              <form className="flex">
                <input
                  type="email"
                  placeholder="Email"
                  className="flex-1 px-4 py-2 bg-gray-800 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FF6B35] hover:bg-[#E85A28] rounded-r-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-700 pt-8 mt-8 text-center">
          <p className="text-gray-400 text-sm">
            © {currentYear} {COMPANY_INFO.name}. {t('footer.rightsReserved')}.
          </p>
        </div>
      </div>
    </footer>
  );
}

