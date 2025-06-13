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
        {/* Background */}
        <div className="absolute inset-0 gradient-bg opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50"></div>
        
        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-primary-200 rounded-full opacity-20 animate-bounce-gentle"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-accent-200 rounded-full opacity-20 animate-bounce-gentle" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-40 left-20 w-12 h-12 bg-primary-300 rounded-full opacity-20 animate-bounce-gentle" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-slide-up">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-primary-200 rounded-full px-4 py-2 mb-8">
              <Sparkles className="h-4 w-4 text-primary-500" />
              <span className="text-sm font-medium text-primary-700">Perfect for Beginners</span>
            </div>

            {/* Main heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-gray-900 mb-6 text-balance">
              Learn to Code with
              <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent"> Confidence</span>
            </h1>

            {/* Subheading */}
            <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto text-balance">
              A beginner-friendly online IDE designed for self-taught developers and bootcamp students. 
              Write code, get instant help, and learn by doing.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12">
              <button 
                onClick={() => router.push('/ide')}
                className="group bg-gradient-to-r from-primary-500 to-accent-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl transition-all duration-300 flex items-center space-x-2 animate-pulse-glow"
              >
                <Play className="h-5 w-5" />
                <span>Start Coding Now</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all duration-300">
                Watch Demo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">10K+</div>
                <div className="text-gray-600">Students Learning</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent-600 mb-2">50+</div>
                <div className="text-gray-600">Coding Challenges</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">24/7</div>
                <div className="text-gray-600">AI Assistant</div>
              </div>
            </div>
          </div>
        </div>

        {/* Code preview mockup */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-full max-w-4xl px-4 animate-fade-in" style={{ animationDelay: '1s' }}>
          <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
            <div className="flex items-center space-x-2 px-4 py-3 bg-gray-800">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div className="ml-4 text-gray-400 text-sm font-mono">main.js</div>
            </div>
            <div className="p-6 font-mono text-sm">
              <div className="text-gray-500">// Your first JavaScript function</div>
              <div className="text-blue-400">function <span className="text-yellow-400">greetUser</span>(<span className="text-orange-400">name</span>) {'{'}</div>
              <div className="ml-4 text-green-400">console.log(<span className="text-red-400">`Hello, ${'${name}'} Welcome to coding!`</span>);</div>
              <div className="text-blue-400">{'}'}</div>
              <div className="mt-2 text-yellow-400">greetUser(<span className="text-red-400">&apos;Future Developer&apos;</span>);</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to
              <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent"> Start Coding</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our IDE is specifically designed for beginners, with features that make learning to code intuitive and enjoyable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                className="group bg-white rounded-xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary-200"
              >
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${feature.color} mb-6`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 group-hover:text-primary-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How CodeCraft IDE
              <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent"> Works</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Three simple steps to start your coding journey with confidence and support every step of the way.
            </p>
          </div>

          <div className="space-y-20">
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
                className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12`}
              >
                {/* Content */}
                <div className="flex-1 space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full text-white font-bold text-lg">
                      {index + 1}
                    </div>
                    <div className="bg-gradient-to-r from-primary-500 to-accent-500 p-3 rounded-lg">
                      <step.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                  <button className="inline-flex items-center text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                    Learn more
                    <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Image */}
                <div className="flex-1">
                  <div className="relative">
                    <Image
                      src={step.image}
                      alt={step.title}
                      width={600}
                      height={400}
                      className="w-full h-80 object-cover rounded-2xl shadow-2xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-2xl"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-primary-50 to-accent-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              What Our
              <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent"> Students Say</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join thousands of beginners who have successfully started their coding journey with CodeCraft IDE.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <div className="flex items-center mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <Quote className="h-8 w-8 text-primary-300 mb-4" />
                
                <p className="text-gray-700 mb-6 leading-relaxed">
                  &quot;{testimonial.content}&quot;
                </p>
                
                <div className="flex items-center">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-gray-600 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent
              <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent"> Pricing</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Start free and upgrade as you grow. No hidden fees, no complicated tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
                className={`relative bg-white rounded-2xl border-2 p-8 ${
                  plan.popular
                    ? 'border-primary-500 shadow-2xl scale-105'
                    : 'border-gray-200 shadow-sm hover:shadow-lg'
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-primary-500 to-accent-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center space-x-1">
                      <Sparkles className="h-4 w-4" />
                      <span>Most Popular</span>
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-2">/{plan.period}</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white hover:shadow-lg'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              All plans include a 14-day free trial. No credit card required.
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <span>✓ Cancel anytime</span>
              <span>✓ 30-day money back guarantee</span>
              <span>✓ No setup fees</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}