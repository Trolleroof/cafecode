'use client';

import React from 'react';
import { 
  PlayIcon, 
  ArrowRightIcon, 
  CodeBracketIcon, 
  StarIcon, 
  ChatBubbleLeftRightIcon, 
  CheckIcon, 
  PencilIcon, 
  RocketLaunchIcon, 
  HeartIcon, 
  SparklesIcon, 
  TrophyIcon, 
  ArrowTrendingUpIcon,
  BrainIcon
} from '@heroicons/react/24/outline';
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
    <div className="min-h-screen bg-light-cream">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 pb-16">
        {/* Coffee Shop Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-light-cream via-cream-beige to-medium-coffee/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(163,106,62,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(129,77,51,0.1),transparent_50%)]"></div>
        
        {/* Animated coffee elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-medium-coffee to-deep-espresso rounded-full opacity-10 animate-steam-rise blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-deep-espresso to-medium-coffee rounded-full opacity-10 animate-coffee-drip blur-xl" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/3 left-20 w-20 h-20 bg-gradient-to-br from-medium-coffee to-cream-beige rounded-full opacity-10 animate-bean-bounce blur-xl" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-gradient-to-br from-deep-espresso to-medium-coffee rounded-full opacity-10 animate-float" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10 w-full max-w-7xl mx-auto text-center flex flex-col items-center px-4">
          {/* Coffee Shop Badge */}
          <div className="inline-flex items-center space-x-3 coffee-glass rounded-full px-8 py-4 mb-8 shadow-xl border border-medium-coffee/20">
            <div className="w-2 h-2 bg-medium-coffee rounded-full animate-pulse"></div>
            <SparklesIcon className="h-5 w-5 text-deep-espresso" />
            <span className="text-sm font-bold text-dark-charcoal tracking-wide">Brewed for Real Learning</span>
            <div className="w-2 h-2 bg-medium-coffee rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>

          {/* Main heading with coffee theme */}
          <h1 className="font-heading text-6xl sm:text-7xl lg:text-8xl font-black text-dark-charcoal mb-6 leading-tight">
            <span className="block">Brew Your Code</span>
            <span className="block bg-gradient-to-r from-medium-coffee via-deep-espresso to-medium-coffee bg-clip-text text-transparent animate-gradient">
              Like a Barista
            </span>
          </h1>

          {/* Coffee-themed Subheading */}
          <p className="text-2xl sm:text-3xl lg:text-4xl text-deep-espresso mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
            A cozy coding environment where every line of code is crafted with care.
            <span className="block mt-3 font-bold text-dark-charcoal">Fresh code, perfect blend, endless possibilities.</span>
          </p>

          {/* Coffee-themed CTA Buttons */}
          <div className="relative flex flex-col sm:flex-row justify-center gap-6 mb-12">
            <button 
              onClick={handleStartCoding}
              className="group btn-coffee-primary px-12 py-6 text-xl font-bold animate-warm-glow"
            >
              <div className="relative flex items-center space-x-4">
                <PlayIcon className="h-8 w-8 group-hover:scale-110 transition-transform" />
                <span className="tracking-wide">Start Brewing Code</span>
                <ArrowRightIcon className="h-8 w-8 group-hover:translate-x-2 transition-transform" />
              </div>
            </button>
            
            <button 
              onClick={handleLeetCodePractice}
              className="group btn-coffee-secondary px-12 py-6 text-xl font-bold"
            >
              <div className="flex items-center space-x-4">
                <CodeBracketIcon className="h-8 w-8 group-hover:scale-110 transition-transform" />
                <span className="tracking-wide">Practice Algorithms</span>
                <ArrowRightIcon className="h-8 w-8 group-hover:translate-x-2 transition-transform" />
              </div>
            </button>
          </div>

          {/* Coffee-themed Code preview */}
          <div className="relative w-full max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="bg-dark-charcoal rounded-3xl shadow-2xl overflow-hidden border border-medium-coffee">
              <div className="flex items-center space-x-3 px-8 py-5 bg-deep-espresso/50 backdrop-blur-sm">
                <div className="w-4 h-4 bg-red-500 rounded-full shadow-sm"></div>
                <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-sm"></div>
                <div className="w-4 h-4 bg-green-500 rounded-full shadow-sm"></div>
                <div className="ml-6 text-cream-beige text-sm font-mono">coffee-calculator.js</div>
              </div>
              <div className="p-10 font-mono text-lg leading-relaxed bg-gradient-to-br from-dark-charcoal to-deep-espresso">
                <div className="text-medium-coffee mb-4">// Brewing the perfect calculation</div>
                <div className="text-cream-beige mb-2">function <span className="text-medium-coffee">brewCoffee</span>(<span className="text-deep-espresso">beans, water</span>) {'{'}</div>
                <div className="ml-6 text-green-400 mb-2">return beans.reduce((brew, bean) => brew + bean.strength, 0);</div>
                <div className="text-cream-beige mb-4">{'}'}</div>
                <div className="text-medium-coffee mb-2">// Perfect morning blend</div>
                <div className="text-medium-coffee">console.log(brewCoffee(coffeeBeans)); <span className="text-deep-espresso">// Output: Perfect ☕</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement Section - Coffee themed */}
      <section id="problemStatement" className='py-32 bg-gradient-to-br from-medium-coffee/10 via-deep-espresso/10 to-cream-beige relative overflow-hidden'>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(129,77,51,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(163,106,62,0.1),transparent_50%)]"></div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-3 bg-red-100 rounded-full px-6 py-3 mb-8">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-700 font-semibold text-sm">The Bitter Truth</span>
            </div>
            
            <h2 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black text-deep-espresso mb-8 leading-tight">
              Coding Education is
              <span className="block text-red-800">Over-Roasted</span>
            </h2>
            
            <div className="max-w-5xl mx-auto space-y-6">
              <p className="text-2xl lg:text-3xl text-dark-charcoal leading-relaxed font-medium">
                Like burnt coffee, modern coding education leaves a bitter taste. 
                <span className="block mt-3 text-red-600 font-semibold">When AI can generate code instantly, why learn the craft?</span>
              </p>

              <p className="text-xl lg:text-2xl text-deep-espresso leading-relaxed">
                This convenience trap creates two worlds: master baristas who understand every bean, 
                and those who just push buttons on automatic machines.
              </p>

              <p className="text-xl lg:text-2xl text-deep-espresso leading-relaxed">
                Meanwhile, aspiring developers see an impossible menu of prerequisites. 
                <span className="block mt-2 text-red-600 font-semibold">The message becomes clear: this café isn't for you.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Coffee Shop themed */}
      <section id="features" className="py-32 bg-gradient-to-br from-light-cream via-cream-beige to-light-cream relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(163,106,62,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(129,77,51,0.1),transparent_50%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <div className="inline-flex items-center space-x-3 bg-medium-coffee/10 rounded-full px-6 py-3 mb-8">
              <SparklesIcon className="h-5 w-5 text-medium-coffee" />
              <span className="text-deep-espresso font-semibold text-sm">Our Special Blend</span>
            </div>
            
            <h2 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black text-dark-charcoal mb-8 leading-tight">
              CodeCraft Café to the
              <span className="block bg-gradient-to-r from-medium-coffee to-deep-espresso bg-clip-text text-transparent"> Rescue!</span>
            </h2>
            <p className="text-2xl lg:text-3xl text-deep-espresso max-w-4xl mx-auto leading-relaxed font-medium">
              Our IDE is like a welcoming coffee shop, designed for beginners with features that make learning to code as comforting as your morning brew.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: BrainIcon,
                title: 'AI Barista Assistant',
                description: 'Get instant help and contextual hints while you code. Our AI understands your learning journey like a skilled barista knows your order.',
                color: 'from-medium-coffee to-deep-espresso',
                gradient: 'from-cream-beige to-light-cream'
              },
              {
                icon: RocketLaunchIcon,
                title: 'Espresso-Speed Fixes',
                description: 'Apply suggested fixes directly to your code with one click. Learn from mistakes and understand corrections faster than pulling an espresso shot.',
                color: 'from-deep-espresso to-medium-coffee',
                gradient: 'from-medium-coffee/10 to-deep-espresso/10'
              },
              {
                icon: HeartIcon,
                title: 'Cozy Learning Environment',
                description: 'Write single-file programs and see results instantly. Perfect for beginners who want to focus on core concepts in a warm, welcoming space.',
                color: 'from-medium-coffee to-cream-beige',
                gradient: 'from-light-cream to-cream-beige'
              },
              {
                icon: ChatBubbleLeftRightIcon,
                title: 'Friendly Café Atmosphere',
                description: 'Clean, distraction-free environment designed specifically for self-taught developers and bootcamp students. Like your favorite study spot.',
                color: 'from-cream-beige to-medium-coffee',
                gradient: 'from-cream-beige/20 to-light-cream'
              },
              {
                icon: TrophyIcon,
                title: 'Community Coffee Table',
                description: 'Connect with other learners, share your progress, and get help from experienced developers in our welcoming community.',
                color: 'from-deep-espresso to-dark-charcoal',
                gradient: 'from-medium-coffee/10 to-deep-espresso/10'
              },
              {
                icon: SparklesIcon,
                title: 'Safe Brewing Space',
                description: 'Practice coding without fear of breaking anything. Our sandboxed environment lets you experiment freely, like trying new coffee recipes.',
                color: 'from-medium-coffee to-deep-espresso',
                gradient: 'from-cream-beige/30 to-light-cream/30'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group coffee-card p-8"
              >
                <div className={`inline-flex p-5 rounded-2xl bg-gradient-to-r ${feature.color} mb-8 shadow-coffee group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-10 w-10 text-light-cream" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-dark-charcoal mb-6 group-hover:text-medium-coffee transition-colors">
                  {feature.title}
                </h3>
                <p className="text-deep-espresso leading-relaxed text-lg">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section - Coffee Process themed */}
      <section id="how-it-works" className="py-32 bg-light-cream relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(163,106,62,0.05),transparent_50%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <div className="inline-flex items-center space-x-3 bg-deep-espresso/10 rounded-full px-6 py-3 mb-8">
              <CodeBracketIcon className="h-5 w-5 text-deep-espresso" />
              <span className="text-dark-charcoal font-semibold text-sm">The Brewing Process</span>
            </div>
            
            <h2 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black text-dark-charcoal mb-8 leading-tight">
              Three Steps to
              <span className="block bg-gradient-to-r from-medium-coffee to-deep-espresso bg-clip-text text-transparent"> Perfect Code</span>
            </h2>
            <p className="text-2xl lg:text-3xl text-deep-espresso max-w-4xl mx-auto leading-relaxed font-medium">
              Start your coding journey with the same care and attention as brewing the perfect cup of coffee.
            </p>
          </div>

          <div className="space-y-32">
            {[
              {
                icon: PencilIcon,
                title: 'Grind Your Skills',
                description: 'Work on projects that matter to you, and receive guidance that helps you make real progress on your programs. Like selecting the perfect coffee beans.',
                image: 'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=600',
                color: 'from-medium-coffee to-deep-espresso'
              },
              {
                icon: ChatBubbleLeftRightIcon,
                title: 'Extract Knowledge',
                description: 'Stuck on something? Our AI barista provides contextual hints and applies small code fixes to help you understand what you code quicker.',
                image: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=600',
                color: 'from-deep-espresso to-medium-coffee'
              },
              {
                icon: CheckIcon,
                title: 'Serve Excellence',
                description: 'Learn and practice the most common LeetCode patterns asked to applicants during SWE interviews to get the job. Perfect your craft.',
                image: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=600',
                color: 'from-medium-coffee to-cream-beige'
              }
            ].map((step, index) => (
              <div
                key={index}
                className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-20`}
              >
                {/* Content */}
                <div className="flex-1 space-y-10">
                  <div className="flex items-center space-x-8">
                    <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-r from-medium-coffee to-deep-espresso rounded-full text-light-cream font-black text-3xl shadow-coffee">
                      {index + 1}
                    </div>
                    <div className={`bg-gradient-to-r ${step.color} p-5 rounded-2xl shadow-xl`}>
                      <step.icon className="h-10 w-10 text-light-cream" />
                    </div>
                  </div>
                  <h3 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black text-dark-charcoal leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-2xl text-deep-espresso leading-relaxed">
                    {step.description}
                  </p>
                  <button className="inline-flex items-center text-medium-coffee font-bold text-xl hover:text-deep-espresso transition-colors group">
                    Learn more
                    <ArrowRightIcon className="ml-4 h-6 w-6 group-hover:translate-x-2 transition-transform" />
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

      {/* Testimonials Section - Coffee Reviews themed */}
      <section className="py-32 bg-gradient-to-br from-cream-beige via-light-cream to-cream-beige relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(163,106,62,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(129,77,51,0.1),transparent_50%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <div className="inline-flex items-center space-x-3 bg-medium-coffee/10 rounded-full px-6 py-3 mb-8">
              <TrophyIcon className="h-5 w-5 text-deep-espresso" />
              <span className="text-dark-charcoal font-semibold text-sm">Customer Reviews</span>
            </div>
            
            <h2 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black text-dark-charcoal mb-8 leading-tight">
              What Our
              <span className="block bg-gradient-to-r from-medium-coffee to-deep-espresso bg-clip-text text-transparent"> Regulars Say</span>
            </h2>
            <p className="text-2xl lg:text-3xl text-deep-espresso max-w-4xl mx-auto leading-relaxed font-medium">
              Join thousands of developers who have found their perfect coding blend at CodeCraft Café.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: 'Sarah Chen',
                role: 'Self-taught Developer',
                image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
                content: 'CodeCraft Café made learning JavaScript as smooth as my morning latte. The AI barista helped me understand concepts I was struggling with for weeks.',
                rating: 5,
                color: 'from-medium-coffee to-deep-espresso'
              },
              {
                name: 'Marcus Johnson',
                role: 'Bootcamp Graduate',
                image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
                content: 'The espresso-speed code fixes are incredible. I learned more about debugging in a month than I did in my entire bootcamp. Perfect blend!',
                rating: 5,
                color: 'from-deep-espresso to-medium-coffee'
              },
              {
                name: 'Emily Rodriguez',
                role: 'Career Changer',
                image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150',
                content: 'As someone switching careers, CodeCraft gave me the confidence to code. The cozy atmosphere is exactly what I needed to learn.',
                rating: 5,
                color: 'from-medium-coffee to-cream-beige'
              }
            ].map((testimonial, index) => (
              <div
                key={index}
                className="group coffee-card p-10"
              >
                <div className="flex items-center mb-8">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="h-7 w-7 text-medium-coffee fill-current" />
                  ))}
                </div>
                
                <ChatBubbleLeftRightIcon className="h-12 w-12 text-medium-coffee/50 mb-8" />
                
                <p className="text-dark-charcoal mb-10 leading-relaxed text-xl">
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
                    <h4 className="font-bold text-dark-charcoal text-xl">{testimonial.name}</h4>
                    <p className="text-deep-espresso text-lg">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Coffee Menu themed */}
      <section id="pricing" className="py-32 bg-light-cream relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(163,106,62,0.05),transparent_50%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <div className="inline-flex items-center space-x-3 bg-deep-espresso/10 rounded-full px-6 py-3 mb-8">
              <ArrowTrendingUpIcon className="h-5 w-5 text-deep-espresso" />
              <span className="text-dark-charcoal font-semibold text-sm">Our Menu</span>
            </div>
            
            <h2 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black text-dark-charcoal mb-8 leading-tight">
              Simple, Transparent
              <span className="block bg-gradient-to-r from-medium-coffee to-deep-espresso bg-clip-text text-transparent"> Pricing</span>
            </h2>
            <p className="text-2xl lg:text-3xl text-deep-espresso max-w-4xl mx-auto leading-relaxed font-medium">
              Start with our free house blend and upgrade as your taste develops. No hidden fees, no complicated menu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: 'House Blend',
                price: '$0',
                period: 'forever',
                description: 'Perfect for getting started',
                features: [
                  'Basic code editor',
                  'AI barista (10 queries/day)',
                  'Single file projects',
                  'Community support',
                  'Basic syntax highlighting'
                ],
                cta: 'Start Free',
                popular: false,
                color: 'from-deep-espresso to-dark-charcoal'
              },
              {
                name: 'Signature Roast',
                price: '$9',
                period: 'per month',
                description: 'For serious coffee lovers',
                features: [
                  'Everything in House Blend',
                  'Unlimited AI assistance',
                  'Advanced code fixes',
                  'Multiple file projects',
                  'Priority support',
                  'Code templates',
                  'Progress tracking'
                ],
                cta: 'Start Pro Trial',
                popular: true,
                color: 'from-medium-coffee to-deep-espresso'
              },
              {
                name: 'Café Franchise',
                price: '$19',
                period: 'per month',
                description: 'For bootcamps and groups',
                features: [
                  'Everything in Signature Roast',
                  'Team collaboration',
                  'Instructor dashboard',
                  'Student progress monitoring',
                  'Custom assignments',
                  'Bulk user management',
                  'Advanced analytics'
                ],
                cta: 'Contact Sales',
                popular: false,
                color: 'from-deep-espresso to-medium-coffee'
              }
            ].map((plan, index) => (
              <div
                key={index}
                className={`relative coffee-card p-10 ${
                  plan.popular
                    ? 'border-medium-coffee shadow-coffee scale-105'
                    : 'border-medium-coffee/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-medium-coffee to-deep-espresso text-light-cream px-8 py-4 rounded-full text-sm font-bold flex items-center space-x-3 shadow-xl">
                      <SparklesIcon className="h-6 w-6" />
                      <span>Most Popular</span>
                    </div>
                  </div>
                )}

                <div className="text-center mb-12">
                  <h3 className="font-heading text-4xl font-black text-dark-charcoal mb-6">{plan.name}</h3>
                  <div className="mb-8">
                    <span className="text-6xl font-black text-dark-charcoal">{plan.price}</span>
                    <span className="text-deep-espresso ml-3 text-2xl">/{plan.period}</span>
                  </div>
                  <p className="text-deep-espresso text-xl">{plan.description}</p>
                </div>

                <ul className="space-y-6 mb-12">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <CheckIcon className="h-7 w-7 text-medium-coffee mr-5 flex-shrink-0" />
                      <span className="text-dark-charcoal text-xl">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-6 px-8 rounded-2xl font-bold text-xl transition-all duration-300 ${
                    plan.popular
                      ? 'btn-coffee-primary shadow-xl hover:shadow-coffee'
                      : 'btn-coffee-secondary'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-20">
            <p className="text-deep-espresso mb-8 text-xl">
              All plans include a 14-day free trial. No credit card required.
            </p>
            <div className="flex items-center justify-center space-x-12 text-deep-espresso font-semibold text-lg">
              <span className="flex items-center">
                <CheckIcon className="h-6 w-6 text-medium-coffee mr-3" />
                Cancel anytime
              </span>
              <span className="flex items-center">
                <CheckIcon className="h-6 w-6 text-medium-coffee mr-3" />
                30-day money back guarantee
              </span>
              <span className="flex items-center">
                <CheckIcon className="h-6 w-6 text-medium-coffee mr-3" />
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