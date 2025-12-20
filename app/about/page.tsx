'use client';

import { motion } from 'framer-motion';
import { Target, Users, Award, Zap } from 'lucide-react';

export default function AboutPage() {
  const values = [
    {
      icon: Target,
      title: 'Наша миссия',
      description:
        'Предоставлять качественное профессиональное оборудование и помогать бизнесу достигать своих целей',
    },
    {
      icon: Users,
      title: 'Команда экспертов',
      description:
        'Наши специалисты обладают глубокими знаниями и всегда готовы помочь с выбором',
    },
    {
      icon: Award,
      title: 'Качество',
      description:
        'Работаем только с проверенными производителями и гарантируем качество продукции',
    },
    {
      icon: Zap,
      title: 'Инновации',
      description:
        'Следим за новинками рынка и предлагаем самые современные решения',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#FF6B35] to-[#F7931E] py-20">
        <div className="container mx-auto px-4 text-center text-white">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-bold mb-6"
          >
            О компании ProfiTech
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl max-w-3xl mx-auto"
          >
            От идеи до воплощения - мы помогаем вашему бизнесу расти
          </motion.p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold mb-8 text-center">
                Наша <span className="gradient-text">история</span>
              </h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 mb-6">
                  ProfiTech - это команда профессионалов, которая уже более 10 лет
                  помогает бизнесу находить оптимальные решения в области
                  профессионального оборудования.
                </p>
                <p className="text-gray-700 mb-6">
                  Мы начинали как небольшая компания, специализирующаяся на
                  кофейном оборудовании, и выросли в крупного поставщика широкого
                  спектра профессионального оборудования для различных отраслей
                  бизнеса.
                </p>
                <p className="text-gray-700">
                  Сегодня мы гордимся тем, что помогли сотням компаний реализовать
                  их проекты, от небольших кофеен до крупных производственных
                  предприятий.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">
              Наши <span className="gradient-text">ценности</span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Принципы, которыми мы руководствуемся в работе
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card p-6 text-center hover:shadow-xl"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10+', label: 'Лет на рынке' },
              { value: '500+', label: 'Довольных клиентов' },
              { value: '10000+', label: 'Товаров в каталоге' },
              { value: '24/7', label: 'Поддержка' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-5xl font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

