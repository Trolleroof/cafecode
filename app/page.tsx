'use client';

import React, { useState } from 'react';
import { Menu, X, Code2, Play, ArrowRight, Sparkles, Github, Twitter, Lightbulb, MessageSquare, Edit3, MessageCircle, CheckCircle, Star, Quote, Zap, Shield, Users, BookOpen, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Enhanced Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-accent-500/5"></div>
        
        {/* Enhanced floating elements */}
        <div className="absolute top-20 left-10 w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full opacity-20 animate-float blur-sm"></div>
        <div className="absolute top-40 right-20 w-20 h-20 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full opacity-20 animate-float blur-sm" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-40 left-20 w-16 h-16 bg-gradient-to-br from-primary-300 to-accent-300 rounded-full opacity-20 animate-float blur-sm" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-1/2 right-1/4 w-12 h-12 bg-gradient-to-br from-accent-500 to-primary-500 rounded-full opacity-15 animate-bounce-gentle" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-slide-up">
            {/* Enhanced Badge */}
            <div className="inline-flex items-center space-x-2 glass rounded-full px-6 py-3 mb-8 shadow-lg">
              <Sparkles className="h-5 w-5 text-primary-600" />
              <span className="text-sm font-semibold text-primary-700 tracking-wide">Perfect for Beginners</span>
            </div>

            {/* Enhanced Main heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold text-gray-900 mb-8 leading-tight">
              Learn to Code with
              <span className="block bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 bg-clip-text text-transparent animate-gradient"> Confidence</span>
            </h1>

            {/* Enhanced Subheading */}
            <p className="text-xl sm:text-2xl lg:text-3xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
              A beginner-friendly online IDE designed for self-taught developers and bootcamp students. 
              <span className="block mt-2 font-medium text-gray-700">Write code, get instant help, and learn by doing.</span>
            </p>

            {/* Enhanced CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 mb-16">
              <button 
                onClick={() => router.push('/ide')}
                className="group btn-primary px-10 py-5 text-xl font-bold shadow-2xl animate-pulse-glow"
              >
                <div className="flex items-center space-x-3">
                  <Play className="h-6 w-6" />
                  <span>Start Coding Now</span>
                  <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
                </div>
              </button>
              <button className="btn-secondary px-10 py-5 text-xl font-bold">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Watch Demo</span>
                </div>
              </button>
            </div>

            {/* Enhanced Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 max-w-3xl mx-auto">
              <div className="text-center group">
                <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">10K+</div>
                <div className="text-gray-600 font-medium text-lg">Students Learning</div>
              </div>
              <div className="text-center group">
                <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-accent-600 to-accent-500 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">50+</div>
                <div className="text-gray-600 font-medium text-lg">Coding Challenges</div>
              </div>
              <div className="text-center group">
                <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">24/7</div>
                <div className="text-gray-600 font-medium text-lg">AI Assistant</div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced code preview mockup */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-full max-w-5xl px-4 animate-fade-in" style={{ animationDelay: '1s' }}>
          <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700 shadow-glow">
            <div className="flex items-center space-x-3 px-6 py-4 bg-gray-800">
              <div className="w-4 h-4 bg-red-500 rounded-full shadow-sm"></div>
              <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-sm"></div>
              <div className="w-4 h-4 bg-green-500 rounded-full shadow-sm"></div>
              <div className="ml-6 text-gray-400 text-sm font-mono">main.js</div>
            </div>
            <div className="p-8 font-mono text-base leading-relaxed">
              <div className="text-gray-500">// Your first JavaScript function</div>
              <div className="text-blue-400">function <span className="text-yellow-400">greetUser</span>(<span className="text-orange-400">name</span>) {'{'}</div>
              <div className="ml-6 text-green-400">console.log(<span className="text-red-400">`Hello, ${'${name}'} Welcome to coding!`</span>);</div>
              <div className="text-blue-400">{'}'}</div>
              <div className="mt-3 text-yellow-400">greetUser(<span className="text-red-400">&apos;Future Developer&apos;</span>);</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-br from-gray-50 to-primary-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Everything You Need to
              <span className="block bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent"> Start Coding</span>
            </h2>
            <p className="text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Our IDE is specifically designed for beginners, with features that make learning to code intuitive and enjoyable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[
              {
                icon: MessageSquare,
                title: 'AI-Powered Chat Assistant',
                description: 'Get instant help and contextual hints while you code. Our AI understands your learning journey and provides personalized guidance.',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                icon: Zap,
                title: 'Line-by-Line Code Fixes',
                description: 'Apply suggested fixes directly to your code with one click. Learn from mistakes and understand corrections in real-time.',
                color: 'from-yellow-500 to-orange-500'
              },
              {
                icon: Lightbulb,
                title: 'Interactive Learning',
                description: 'Write single-file programs and see results instantly. Perfect for beginners who want to focus on core concepts.',
                color: 'from-purple-500 to-pink-500'
              },
              {
                icon: BookOpen,
                title: 'Beginner-Friendly Interface',
                description: 'Clean, distraction-free environment designed specifically for self-taught developers and bootcamp students.',
                color: 'from-green-500 to-teal-500'
              },
              {
                icon: Users,
                title: 'Community Support',
                description: 'Connect with other learners, share your progress, and get help from experienced developers in our community.',
                color: 'from-indigo-500 to-purple-500'
              },
              {
                icon: Shield,
                title: 'Safe Learning Environment',
                description: 'Practice coding without fear of breaking anything. Our sandboxed environment lets you experiment freely.',
                color: 'from-red-500 to-pink-500'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group bg-white rounded-2xl p-10 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-primary-200 transform hover:-translate-y-2"
              >
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${feature.color} mb-8 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 group-hover:text-primary-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-lg">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              How CodeCraft IDE
              <span className="block bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent"> Works</span>
            </h2>
            <p className="text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Three simple steps to start your coding journey with confidence and support every step of the way.
            </p>
          </div>

          <div className="space-y-32">
            {[
              {
                icon: Edit3,
                title: 'Write Your Code',
                description: 'Start with simple, single-file programs. Our clean interface helps you focus on learning without distractions.',
                image: 'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=600'
              },
              {
                icon: MessageCircle,
                title: 'Get Instant Help',
                description: 'Stuck on something? Our AI chat assistant provides contextual hints and explanations tailored to your skill level.',
                image: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=600'
              },
              {
                icon: CheckCircle,
                title: 'Apply Fixes & Learn',
                description: 'Apply suggested code fixes with one click and understand why they work. Learn from every mistake.',
                image: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=600'
              }
            ].map((step, index) => (
              <div
                key={index}
                className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16`}
              >
                {/* Content */}
                <div className="flex-1 space-y-8">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full text-white font-bold text-2xl shadow-lg">
                      {index + 1}
                    </div>
                    <div className="bg-gradient-to-r from-primary-500 to-accent-500 p-4 rounded-xl shadow-lg">
                      <step.icon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-xl text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                  <button className="inline-flex items-center text-primary-600 font-bold text-lg hover:text-primary-700 transition-colors group">
                    Learn more
                    <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                {/* Image */}
                <div className="flex-1">
                  <div className="relative group">
                    <Image
                      src={step.image}
                      alt={step.title}
                      width={700}
                      height={500}
                      className="w-full h-96 object-cover rounded-3xl shadow-2xl group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-3xl group-hover:opacity-75 transition-opacity duration-500"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gradient-to-br from-primary-50 to-accent-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              What Our
              <span className="block bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent"> Students Say</span>
            </h2>
            <p className="text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Join thousands of beginners who have successfully started their coding journey with CodeCraft IDE.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[
              {
                name: 'Sarah Chen',
                role: 'Self-taught Developer',
                image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
                content: 'CodeCraft IDE made learning JavaScript so much easier. The AI assistant helped me understand concepts I was struggling with for weeks.',
                rating: 5
              },
              {
                name: 'Marcus Johnson',
                role: 'Bootcamp Graduate',
                image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
                content: 'The line-by-line code fixes feature is incredible. I learned more about debugging in a month than I did in my entire bootcamp.',
                rating: 5
              },
              {
                name: 'Emily Rodriguez',
                role: 'Career Changer',
                image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150',
                content: 'As someone switching careers, CodeCraft gave me the confidence to code. The beginner-friendly interface is exactly what I needed.',
                rating: 5
              }
            ].map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-3xl p-10 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 transform hover:-translate-y-2"
              >
                <div className="flex items-center mb-8">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <Quote className="h-10 w-10 text-primary-300 mb-6" />
                
                <p className="text-gray-700 mb-8 leading-relaxed text-lg">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-full object-cover mr-4 shadow-lg"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{testimonial.name}</h4>
                    <p className="text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Simple, Transparent
              <span className="block bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent"> Pricing</span>
            </h2>
            <p className="text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Start free and upgrade as you grow. No hidden fees, no complicated tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
            {[
              {
                name: 'Free',
                price: '$0',
                period: 'forever',
                description: 'Perfect for getting started',
                features: [
                  'Basic code editor',
                  'AI chat assistant (10 queries/day)',
                  'Single file projects',
                  'Community support',
                  'Basic syntax highlighting'
                ],
                cta: 'Start Free',
                popular: false
              },
              {
                name: 'Pro',
                price: '$9',
                period: 'per month',
                description: 'For serious learners',
                features: [
                  'Everything in Free',
                  'Unlimited AI assistance',
                  'Advanced code fixes',
                  'Multiple file projects',
                  'Priority support',
                  'Code templates',
                  'Progress tracking'
                ],
                cta: 'Start Pro Trial',
                popular: true
              },
              {
                name: 'Team',
                price: '$19',
                period: 'per month',
                description: 'For bootcamps and groups',
                features: [
                  'Everything in Pro',
                  'Team collaboration',
                  'Instructor dashboard',
                  'Student progress monitoring',
                  'Custom assignments',
                  'Bulk user management',
                  'Advanced analytics'
                ],
                cta: 'Contact Sales',
                popular: false
              }
            ].map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-3xl border-2 p-10 ${
                  plan.popular
                    ? 'border-primary-500 shadow-2xl scale-105 shadow-glow'
                    : 'border-gray-200 shadow-lg hover:shadow-2xl'
                } transition-all duration-500 transform hover:-translate-y-2`}
              >
                {plan.popular && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-primary-500 to-accent-500 text-white px-6 py-3 rounded-full text-sm font-bold flex items-center space-x-2 shadow-lg">
                      <Sparkles className="h-5 w-5" />
                      <span>Most Popular</span>
                    </div>
                  </div>
                )}

                <div className="text-center mb-10">
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-2 text-xl">/{plan.period}</span>
                  </div>
                  <p className="text-gray-600 text-lg">{plan.description}</p>
                </div>

                <ul className="space-y-5 mb-10">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="h-6 w-6 text-green-500 mr-4 flex-shrink-0" />
                      <span className="text-gray-700 text-lg">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 ${
                    plan.popular
                      ? 'btn-primary shadow-lg'
                      : 'btn-secondary'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <p className="text-gray-600 mb-6 text-lg">
              All plans include a 14-day free trial. No credit card required.
            </p>
            <div className="flex items-center justify-center space-x-8 text-gray-500 font-medium">
              <span className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-2" />
                Cancel anytime
              </span>
              <span className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-2" />
                30-day money back guarantee
              </span>
              <span className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-2" />
                No setup fees
              </span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}