'use client';

import React from 'react';
import { 
  Play, 
  ArrowRight, 
  Code, 
  Star, 
  Chat, 
  Check, 
  Pencil, 
  RocketLaunch, 
  Heart, 
  Coffee, 
  GameController, 
  Sparkle, 
  Trophy, 
  Target, 
  TrendUp,
  Brain
} from 'phosphor-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Home() {
  const router = useRouter();

  const handleStartCoding = () => {
    router.push('/ide');
  };

  const handleLeetCodePractice = () => {
    router.push('/leetcode');
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 pb-16">
        {/* Enhanced background with new color palette */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#094074]/5 via-[#5adbff]/5 to-[#ffdd4a]/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(9,64,116,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(90,219,255,0.1),transparent_50%)]"></div>
        
        {/* Animated floating elements with new colors */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#094074] to-[#3c6997] rounded-full opacity-10 animate-pulse blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-[#5adbff] to-[#ffdd4a] rounded-full opacity-10 animate-pulse blur-xl" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/3 left-20 w-20 h-20 bg-gradient-to-br from-[#ff960d] to-[#ffdd4a] rounded-full opacity-10 animate-pulse blur-xl" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-gradient-to-br from-[#3c6997] to-[#5adbff] rounded-full opacity-10 animate-bounce" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10 w-full max-w-7xl mx-auto text-center flex flex-col items-center px-4">
          {/* Enhanced Badge */}
          <div className="inline-flex items-center space-x-3 bg-white/80 backdrop-blur-sm rounded-full px-8 py-4 mb-8 shadow-xl border border-white/20">
            <div className="w-2 h-2 bg-[#5adbff] rounded-full animate-pulse"></div>
            <Sparkle weight="fill" className="h-5 w-5 text-[#094074]" />
            <span className="text-sm font-bold text-gray-700 tracking-wide">Built for Real Learning</span>
            <div className="w-2 h-2 bg-[#5adbff] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>

          {/* Enhanced Main heading */}
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-gray-900 mb-6 leading-tight">
            <span className="block">Learn to Code</span>
            <span className="block bg-gradient-to-r from-[#094074] via-[#3c6997] to-[#5adbff] bg-clip-text text-transparent animate-gradient">
              Without the BS
            </span>
          </h1>

          {/* Enhanced Subheading */}
          <p className="text-2xl sm:text-3xl lg:text-4xl text-gray-700 mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
            A beginner-friendly IDE that actually teaches you to code, not just copy-paste.
            <span className="block mt-3 font-bold text-gray-900">Write real code, get real help, build real skills.</span>
          </p>

          {/* Enhanced CTA Buttons */}
          <div className="relative flex flex-col sm:flex-row justify-center gap-6 mb-12">
            <button 
              onClick={handleStartCoding}
              className="group relative px-12 py-6 text-xl font-bold text-white bg-gradient-to-r from-[#094074] to-[#5adbff] rounded-2xl shadow-2xl hover:shadow-[#094074]/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#094074] to-[#5adbff] rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative flex items-center space-x-4">
                <Play weight="fill" className="h-8 w-8 group-hover:scale-110 transition-transform" />
                <span className="tracking-wide">Start Coding Now</span>
                <ArrowRight weight="bold" className="h-8 w-8 group-hover:translate-x-2 transition-transform" />
              </div>
            </button>
            
            <button 
              onClick={handleLeetCodePractice}
              className="group px-12 py-6 text-xl font-bold text-[#094074] bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl border-2 border-[#3c6997] hover:border-[#5adbff] transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
            >
              <div className="flex items-center space-x-4">
                <Code weight="bold" className="h-8 w-8 group-hover:scale-110 transition-transform" />
                <span className="tracking-wide">Practice LeetCode</span>
                <ArrowRight weight="bold" className="h-8 w-8 group-hover:translate-x-2 transition-transform" />
              </div>
            </button>
          </div>

          {/* Enhanced Code preview */}
          <div className="relative w-full max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-700">
              <div className="flex items-center space-x-3 px-8 py-5 bg-gray-800/50 backdrop-blur-sm">
              <div className="w-4 h-4 bg-red-500 rounded-full shadow-sm"></div>
              <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-sm"></div>
              <div className="w-4 h-4 bg-green-500 rounded-full shadow-sm"></div>
              <div className="ml-6 text-gray-400 text-sm font-mono">main.js</div>
            </div>
              <div className="p-10 font-mono text-lg leading-relaxed bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="text-gray-500 mb-4">// Your first real JavaScript function</div>
                <div className="text-[#5adbff] mb-2">function <span className="text-[#ffdd4a]">calculateSum</span>(<span className="text-[#ff960d]">numbers</span>) {'{'}</div>
                <div className="ml-6 text-green-400 mb-2">return numbers.reduce((sum, num) => sum + num, 0);</div>
                <div className="text-[#5adbff] mb-4">{'}'}</div>
                <div className="text-gray-500 mb-2">// Test your function</div>
                <div className="text-[#ffdd4a]">console.log(calculateSum([1, 2, 3, 4, 5])); <span className="text-gray-500">// Output: 15</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Problem Statement Section */}
      <section id="problemStatement" className='py-32 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 relative overflow-hidden'>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,150,13,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,221,74,0.1),transparent_50%)]"></div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-3 bg-red-100 rounded-full px-6 py-3 mb-8">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-700 font-semibold text-sm">The Problem</span>
          </div>
            
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black text-red-700 mb-8 leading-tight">
              Modern Coding is
              <span className="block text-red-800">Broken</span>
            </h2>
            
            <div className="max-w-5xl mx-auto space-y-6">
              <p className="text-2xl lg:text-3xl text-gray-700 leading-relaxed font-medium">
                AI coding tools promised to democratize programming. Instead, they're building higher walls. 
                <span className="block mt-3 text-red-600 font-semibold">When anyone can generate code instantly, why learn to code at all?</span>
              </p>

              <p className="text-xl lg:text-2xl text-gray-600 leading-relaxed">
                This convenience trap is creating two worlds: those who understand the magic behind the screen, 
                and those who just watch it happen.
              </p>

              <p className="text-xl lg:text-2xl text-gray-600 leading-relaxed">
                Meanwhile, underprivileged communities see an impossible mountain of prerequisites. 
                <span className="block mt-2 text-red-600 font-semibold">The message becomes clear: coding isn't for you.</span>
              </p>
          </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="py-32 bg-gradient-to-br from-gray-50 via-blue-50 to-emerald-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(9,64,116,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(90,219,255,0.1),transparent_50%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <div className="inline-flex items-center space-x-3 bg-blue-100 rounded-full px-6 py-3 mb-8">
              <Sparkle weight="fill" className="h-5 w-5 text-[#094074]" />
              <span className="text-[#094074] font-semibold text-sm">The Solution</span>
            </div>
            
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 mb-8 leading-tight">
              HelloWurld to the
              <span className="block bg-gradient-to-r from-[#094074] to-[#5adbff] bg-clip-text text-transparent"> Rescue!</span>
            </h2>
            <p className="text-2xl lg:text-3xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-medium">
              Our IDE is specifically designed for beginners, with features that make learning to code intuitive and enjoyable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: 'AI-Powered Chat Assistant',
                description: 'Get instant help and contextual hints while you code. Our AI understands your learning journey and provides personalized guidance.',
                color: 'from-[#094074] to-[#5adbff]',
                gradient: 'from-blue-50 to-cyan-50'
              },
              {
                icon: RocketLaunch,
                title: 'Line-by-Line Code Fixes',
                description: 'Apply suggested fixes directly to your code with one click. Learn from mistakes and understand corrections in real-time.',
                color: 'from-[#ffdd4a] to-[#ff960d]',
                gradient: 'from-yellow-50 to-orange-50'
              },
              {
                icon: Heart,
                title: 'Interactive Learning',
                description: 'Write single-file programs and see results instantly. Perfect for beginners who want to focus on core concepts.',
                color: 'from-[#3c6997] to-[#5adbff]',
                gradient: 'from-purple-50 to-pink-50'
              },
              {
                icon: Coffee,
                title: 'Beginner-Friendly Interface',
                description: 'Clean, distraction-free environment designed specifically for self-taught developers and bootcamp students.',
                color: 'from-[#5adbff] to-[#ffdd4a]',
                gradient: 'from-green-50 to-teal-50'
              },
              {
                icon: GameController,
                title: 'Community Support',
                description: 'Connect with other learners, share your progress, and get help from experienced developers in our community.',
                color: 'from-[#094074] to-[#3c6997]',
                gradient: 'from-indigo-50 to-purple-50'
              },
              {
                icon: Sparkle,
                title: 'Safe Learning Environment',
                description: 'Practice coding without fear of breaking anything. Our sandboxed environment lets you experiment freely.',
                color: 'from-[#ff960d] to-[#ffdd4a]',
                gradient: 'from-red-50 to-pink-50'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/20 transform hover:-translate-y-3 hover:scale-105"
              >
                <div className={`inline-flex p-5 rounded-2xl bg-gradient-to-r ${feature.color} mb-8 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon weight="fill" className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 group-hover:text-[#094074] transition-colors">
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

      {/* Enhanced How It Works Section */}
      <section id="how-it-works" className="py-32 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(9,64,116,0.05),transparent_50%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <div className="inline-flex items-center space-x-3 bg-emerald-100 rounded-full px-6 py-3 mb-8">
              <Target weight="bold" className="h-5 w-5 text-[#5adbff]" />
              <span className="text-[#094074] font-semibold text-sm">How It Works</span>
            </div>
            
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 mb-8 leading-tight">
              Three Steps to
              <span className="block bg-gradient-to-r from-[#094074] to-[#5adbff] bg-clip-text text-transparent"> Success</span>
            </h2>
            <p className="text-2xl lg:text-3xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-medium">
              Start your coding journey with confidence and support every step of the way.
            </p>
          </div>

          <div className="space-y-32">
            {[
              {
                icon: Pencil,
                title: 'Escape Tutorial Hell',
                description: 'Work on projects that matter to you, and receive guidance that helps you make real progress on your programs.',
                image: 'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=600',
                color: 'from-[#094074] to-[#5adbff]'
              },
              {
                icon: Chat,
                title: 'Get Instant Help',
                description: 'Stuck on something? Our AI chat assistant provides contextual hints and applies small code fixes to help you understand what you code quicker.',
                image: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=600',
                color: 'from-[#3c6997] to-[#ffdd4a]'
              },
              {
                icon: Check,
                title: 'Practice for Interviews',
                description: 'Learn and practice the most common LeetCode patterns asked to applicants during SWE interviews to get the job.',
                image: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=600',
                color: 'from-[#5adbff] to-[#ff960d]'
              }
            ].map((step, index) => (
              <div
                key={index}
                className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-20`}
              >
                {/* Content */}
                <div className="flex-1 space-y-10">
                  <div className="flex items-center space-x-8">
                    <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-r from-[#094074] to-[#5adbff] rounded-full text-white font-black text-3xl shadow-2xl">
                      {index + 1}
                    </div>
                    <div className={`bg-gradient-to-r ${step.color} p-5 rounded-2xl shadow-xl`}>
                      <step.icon weight="fill" className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-2xl text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                  <button className="inline-flex items-center text-[#094074] font-bold text-xl hover:text-[#3c6997] transition-colors group">
                    Learn more
                    <ArrowRight weight="bold" className="ml-4 h-6 w-6 group-hover:translate-x-2 transition-transform" />
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
                      className="w-full h-[500px] object-cover rounded-3xl shadow-2xl group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-r ${step.color} opacity-20 rounded-3xl group-hover:opacity-30 transition-opacity duration-500`}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials Section */}
      <section className="py-32 bg-gradient-to-br from-blue-50 via-purple-50 to-emerald-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(9,64,116,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(90,219,255,0.1),transparent_50%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <div className="inline-flex items-center space-x-3 bg-purple-100 rounded-full px-6 py-3 mb-8">
              <Trophy weight="fill" className="h-5 w-5 text-[#3c6997]" />
              <span className="text-[#094074] font-semibold text-sm">Student Success</span>
            </div>
            
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 mb-8 leading-tight">
              What Our
              <span className="block bg-gradient-to-r from-[#094074] to-[#5adbff] bg-clip-text text-transparent"> Students Say</span>
            </h2>
            <p className="text-2xl lg:text-3xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-medium">
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
                rating: 5,
                color: 'from-[#094074] to-[#5adbff]'
              },
              {
                name: 'Marcus Johnson',
                role: 'Bootcamp Graduate',
                image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
                content: 'The line-by-line code fixes feature is incredible. I learned more about debugging in a month than I did in my entire bootcamp.',
                rating: 5,
                color: 'from-[#3c6997] to-[#ffdd4a]'
              },
              {
                name: 'Emily Rodriguez',
                role: 'Career Changer',
                image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150',
                content: 'As someone switching careers, CodeCraft gave me the confidence to code. The beginner-friendly interface is exactly what I needed.',
                rating: 5,
                color: 'from-[#5adbff] to-[#ff960d]'
              }
            ].map((testimonial, index) => (
              <div
                key={index}
                className="group bg-white/80 backdrop-blur-sm rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/20 transform hover:-translate-y-3 hover:scale-105"
              >
                <div className="flex items-center mb-8">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} weight="fill" className="h-7 w-7 text-[#ffdd4a]" />
                  ))}
                </div>
                
                <Chat weight="fill" className="h-12 w-12 text-gray-300 mb-8" />
                
                <p className="text-gray-700 mb-10 leading-relaxed text-xl">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full object-cover mr-6 shadow-lg"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900 text-xl">{testimonial.name}</h4>
                    <p className="text-gray-600 text-lg">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Pricing Section */}
      <section id="pricing" className="py-32 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(9,64,116,0.05),transparent_50%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <div className="inline-flex items-center space-x-3 bg-emerald-100 rounded-full px-6 py-3 mb-8">
              <TrendUp weight="bold" className="h-5 w-5 text-[#5adbff]" />
              <span className="text-[#094074] font-semibold text-sm">Simple Pricing</span>
            </div>
            
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 mb-8 leading-tight">
              Simple, Transparent
              <span className="block bg-gradient-to-r from-[#094074] to-[#5adbff] bg-clip-text text-transparent"> Pricing</span>
            </h2>
            <p className="text-2xl lg:text-3xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-medium">
              Start free and upgrade as you grow. No hidden fees, no complicated tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
                popular: false,
                color: 'from-gray-500 to-gray-600'
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
                popular: true,
                color: 'from-[#094074] to-[#5adbff]'
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
                popular: false,
                color: 'from-[#3c6997] to-[#ff960d]'
              }
            ].map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white/80 backdrop-blur-sm rounded-3xl border-2 p-10 ${
                  plan.popular
                    ? 'border-[#094074] shadow-2xl scale-105 shadow-[#094074]/25'
                    : 'border-gray-200 shadow-xl hover:shadow-2xl'
                } transition-all duration-500 transform hover:-translate-y-3 hover:scale-105`}
              >
                {plan.popular && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-[#094074] to-[#5adbff] text-white px-8 py-4 rounded-full text-sm font-bold flex items-center space-x-3 shadow-xl">
                      <Sparkle weight="fill" className="h-6 w-6" />
                      <span>Most Popular</span>
                    </div>
                  </div>
                )}

                <div className="text-center mb-12">
                  <h3 className="text-4xl font-black text-gray-900 mb-6">{plan.name}</h3>
                  <div className="mb-8">
                    <span className="text-6xl font-black text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-3 text-2xl">/{plan.period}</span>
                  </div>
                  <p className="text-gray-600 text-xl">{plan.description}</p>
                </div>

                <ul className="space-y-6 mb-12">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check weight="bold" className="h-7 w-7 text-[#5adbff] mr-5 flex-shrink-0" />
                      <span className="text-gray-700 text-xl">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-6 px-8 rounded-2xl font-bold text-xl transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-[#094074] to-[#5adbff] text-white shadow-xl hover:shadow-2xl'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-20">
            <p className="text-gray-600 mb-8 text-xl">
              All plans include a 14-day free trial. No credit card required.
            </p>
            <div className="flex items-center justify-center space-x-12 text-gray-500 font-semibold text-lg">
              <span className="flex items-center">
                <Check weight="bold" className="h-6 w-6 text-[#5adbff] mr-3" />
                Cancel anytime
              </span>
              <span className="flex items-center">
                <Check weight="bold" className="h-6 w-6 text-[#5adbff] mr-3" />
                30-day money back guarantee
              </span>
              <span className="flex items-center">
                <Check weight="bold" className="h-6 w-6 text-[#5adbff] mr-3" />
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