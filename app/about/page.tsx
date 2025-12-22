'use client';

import { motion } from 'framer-motion';
import { Target, Users, Award, Zap, TrendingUp, Heart, Shield, Sparkles } from 'lucide-react';

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
            О компании <span className="text-white">ProfiTech</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl lg:text-3xl max-w-3xl mx-auto font-semibold drop-shadow-lg mb-8"
          >
            От идеи до воплощения - мы помогаем вашему бизнесу расти
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4 mt-8"
          >
            {['Качество', 'Надежность', 'Профессионализм'].map((tag, i) => (
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

      {/* Story Section */}
      <section className="bg-gradient-to-b from-white via-gray-50 to-white" style={{ paddingTop: '5rem', paddingBottom: '5rem', paddingLeft: '32px', paddingRight: '32px' }}>
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
            style={{ marginBottom: '60px' }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold" style={{ color: '#000000', marginBottom: '16px' }}>
              Наша <span className="gradient-text">история</span>
            </h2>
            <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto font-semibold">
              Путь от небольшой компании до лидера рынка
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
                
                <div className="relative z-10 space-y-6">
                  <p className="leading-relaxed text-lg md:text-xl font-medium" style={{ color: '#1f2937' }}>
                    <span className="font-bold text-2xl gradient-text">ProfiTech</span> - это команда профессионалов, которая уже более 10 лет
                    помогает бизнесу находить оптимальные решения в области
                    профессионального оборудования.
                  </p>
                  
                  <div className="h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent my-6"></div>
                  
                  <p className="leading-relaxed text-lg md:text-xl font-medium" style={{ color: '#1f2937' }}>
                    Мы начинали как небольшая компания, специализирующаяся на
                    кофейном оборудовании, и выросли в крупного поставщика широкого
                    спектра профессионального оборудования для различных отраслей
                    бизнеса.
                  </p>
                  
                  <div className="h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent my-6"></div>
                  
                  <p className="leading-relaxed text-lg md:text-xl font-medium" style={{ color: '#1f2937' }}>
                    Сегодня мы гордимся тем, что помогли сотням компаний реализовать
                    их проекты, от небольших кофеен до крупных производственных
                    предприятий.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-gradient-to-br from-gray-50 via-white to-gray-50" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
            style={{ marginBottom: '60px' }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold" style={{ color: '#000000', marginBottom: '16px' }}>
              Наши <span className="gradient-text">ценности</span>
            </h2>
            <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto font-semibold">
              Принципы, которыми мы руководствуемся в работе
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card p-10 text-center group hover:shadow-2xl cursor-pointer flex flex-col"
                style={{ minHeight: '280px' }}
              >
                <div className="flex-shrink-0" style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '20px', marginBottom: '32px' }}>
                  <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-lg">
                    <value.icon className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-semibold mb-4" style={{ color: '#000000' }}>{value.title}</h3>
                <p className="text-gray-600 leading-relaxed font-semibold">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gradient-to-br from-[#FF6B35] via-[#F7931E] to-[#FF8C42] relative overflow-hidden" style={{ paddingTop: '6rem', paddingBottom: '6rem' }}>
        {/* Анимированные декоративные элементы */}
        <div className="absolute inset-0 opacity-15">
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              x: [0, 50, 0],
              y: [0, 30, 0],
            }}
            transition={{ 
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-10 left-20 w-64 h-64 bg-white rounded-full blur-3xl"
          ></motion.div>
          <motion.div 
            animate={{ 
              scale: [1, 1.4, 1],
              x: [0, -40, 0],
              y: [0, -20, 0],
            }}
            transition={{ 
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute bottom-10 right-20 w-80 h-80 bg-white rounded-full blur-3xl"
          ></motion.div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
            style={{ marginBottom: '60px' }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg" style={{ color: '#ffffff' }}>
              <span style={{ color: '#ffffff' }}>Наши</span> <span style={{ color: '#ffffff' }}>достижения</span>
            </h2>
            <p className="text-white/90 text-lg md:text-xl max-w-3xl mx-auto font-semibold">
              Цифры, которые говорят сами за себя
            </p>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { value: '10+', label: 'Лет на рынке', icon: TrendingUp },
              { value: '500+', label: 'Довольных клиентов', icon: Users },
              { value: '10000+', label: 'Товаров в каталоге', icon: Award },
              { value: '24/7', label: 'Поддержка', icon: Shield },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, type: "spring", stiffness: 100 }}
                whileHover={{ scale: 1.1, y: -5 }}
                className="group text-center bg-white/15 backdrop-blur-md rounded-3xl p-6 md:p-10 border-2 border-white/30 hover:bg-white/25 hover:border-white/50 transition-all duration-500 shadow-xl hover:shadow-2xl"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-white/30"
                >
                  <stat.icon className="w-8 h-8 text-white" />
                </motion.div>
                <motion.div 
                  className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-3 drop-shadow-2xl"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 + 0.2, type: "spring", stiffness: 200 }}
                >
                  {stat.value}
                </motion.div>
                <div className="text-white text-base md:text-lg lg:text-xl font-bold drop-shadow-md">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

