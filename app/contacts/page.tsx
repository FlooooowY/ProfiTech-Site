'use client';

import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Clock, Send, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { COMPANY_INFO } from '@/constants/categories';
import { useTranslations } from '@/lib/i18n';

export default function ContactsPage() {
  const t = useTranslations();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [phoneError, setPhoneError] = useState('');

  const validatePhone = (phone: string): boolean => {
    // Убираем все нецифровые символы для проверки
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Проверяем, что номер содержит от 10 до 15 цифр
    if (digitsOnly.length === 0) {
      setPhoneError('');
      return true; // Телефон не обязателен
    }
    
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      setPhoneError(t('contacts.phoneErrorLength'));
      return false;
    }
    
    // Проверяем формат российского номера (начинается с 7 или 8, или без них)
    const russianPhonePattern = /^(\+?7|8)?9\d{9}$/;
    if (!russianPhonePattern.test(digitsOnly) && digitsOnly.length === 11) {
      setPhoneError(t('contacts.phoneErrorFormat'));
      return false;
    }
    
    setPhoneError('');
    return true;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, phone: value });
    if (value) {
      validatePhone(value);
    } else {
      setPhoneError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация телефона перед отправкой
    if (formData.phone && !validatePhone(formData.phone)) {
      return;
    }
    
    // Формируем сообщение для WhatsApp
    const message = `${t('contacts.newRequestFromSite')}\n\n${t('contacts.yourName')}: ${formData.name}\nEmail: ${formData.email}\n${t('contacts.phone')}: ${formData.phone || t('contacts.notSpecified')}\n\n${t('contacts.message')}:\n${formData.message}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappNumber = COMPANY_INFO.defaultWhatsApp.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const contactInfo = [
    {
      icon: Phone,
      title: 'Телефон',
      content: COMPANY_INFO.defaultWhatsApp,
      link: `tel:${COMPANY_INFO.defaultWhatsApp}`,
    },
    {
      icon: Mail,
      title: 'Email',
      content: COMPANY_INFO.email,
      link: `mailto:${COMPANY_INFO.email}`,
    },
    {
      icon: MapPin,
      title: 'Адрес',
      content: COMPANY_INFO.address,
      link: '#',
    },
    {
      icon: Clock,
      title: 'Время работы',
      content: COMPANY_INFO.workingHours.full,
      link: '#',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#FF6B35] via-[#F7931E] to-[#FF8C42] pt-48 pb-24 relative overflow-hidden" style={{ paddingTop: '12rem', paddingBottom: '6rem' }}>
        {/* Декоративные элементы */}
        <div className="absolute inset-0 opacity-20">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{ 
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"
          ></motion.div>
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
            }}
            transition={{ 
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl"
          ></motion.div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white rounded-full blur-3xl opacity-10"></div>
        </div>
        
        {/* Анимированные частицы */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full opacity-30"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 3) * 20}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 text-center text-white relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mb-6 border-4 border-white/30">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 drop-shadow-2xl"
          >
            {t('contacts.contactUs')} <span className="text-white">{t('contacts.contactsTitle')}</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl lg:text-3xl max-w-3xl mx-auto font-semibold drop-shadow-lg mb-8"
          >
            {t('contacts.alwaysHappy')}
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4 mt-8"
          >
            {[t('contacts.fast'), t('contacts.reliable'), t('contacts.professional')].map((tag, i) => (
              <span
                key={i}
                className="px-6 py-2 bg-white/20 backdrop-blur-sm rounded-full border-2 border-white/30 text-white font-semibold text-sm md:text-base"
              >
                {tag}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="bg-gradient-to-br from-gray-50 via-white to-gray-50" style={{ paddingTop: '5rem', paddingBottom: '5rem', paddingLeft: '32px', paddingRight: '32px' }}>
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
            style={{ marginBottom: '60px' }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold" style={{ color: '#000000', marginBottom: '16px' }}>
              {t('contacts.ourContacts')} <span className="gradient-text">{t('contacts.contactsTitle')}</span>
            </h2>
            <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto font-semibold">
              {t('contacts.chooseContact')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {contactInfo.map((info, index) => (
              <motion.a
                key={index}
                href={info.link}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card p-10 text-center group hover:shadow-2xl cursor-pointer flex flex-col"
                style={{ minHeight: '280px' }}
              >
                <div className="flex-shrink-0" style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '20px', marginBottom: '32px' }}>
                  <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-lg">
                    <info.icon className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#000000' }}>{info.title}</h3>
                <p className="text-gray-600 leading-relaxed font-semibold">{info.content}</p>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="bg-gradient-to-b from-white via-gray-50 to-white" style={{ paddingTop: '1.5rem', paddingBottom: '5rem', paddingLeft: '32px', paddingRight: '32px' }}>
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
            style={{ marginBottom: '60px' }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold" style={{ color: '#000000', marginBottom: '16px' }}>
              {t('contacts.sendMessage')} <span className="gradient-text">{t('contacts.message')}</span>
            </h2>
            <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto font-semibold">
              {t('contacts.fillForm')}
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden"
            >
              <div className="card p-8 md:p-10 lg:p-12 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/20 border-2 border-orange-100 shadow-xl hover:shadow-2xl transition-all duration-300">
                {/* Декоративные элементы */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FF6B35]/10 to-transparent rounded-bl-full"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#F7931E]/10 to-transparent rounded-tr-full"></div>
                
                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: '#000000' }}>
                        {t('contacts.yourName')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] transition-all"
                        placeholder="Иван Иванов"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: '#000000' }}>
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] transition-all"
                        placeholder="ivan@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#000000' }}>
                      Телефон
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      onBlur={() => {
                        if (formData.phone) {
                          validatePhone(formData.phone);
                        }
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${
                        phoneError 
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                          : 'border-gray-200 focus:ring-[#FF6B35] focus:border-[#FF6B35]'
                      }`}
                      placeholder="+7 (900) 000-00-00"
                    />
                    {phoneError && (
                      <p className="mt-2 text-sm text-red-600 font-medium">{phoneError}</p>
                    )}
                  </div>

                  <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: '#000000' }}>
                        {t('contacts.message')} *
                      </label>
                      <textarea
                        required
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        rows={6}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] transition-all"
                        placeholder={t('contacts.messagePlaceholder')}
                      />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white font-semibold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all flex items-center justify-center space-x-2"
                    style={{ padding: '16px 32px' }}
                  >
                    <span>{t('contacts.sendMessageBtn')}</span>
                    <Send className="w-5 h-5" />
                  </button>

                  <p className="text-sm text-gray-600 text-center font-medium">
                    * {t('contacts.whatsappRedirect')}
                  </p>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

    </div>
  );
}
