'use client';

import React, { useState } from 'react';
import {
  IconPlayerPlay,
  IconArrowRight,
  IconCode,
  IconStar,
  IconMessage,
  IconCircleCheck,
  IconPencil,
  IconRocket,
  IconHeart,
  IconSparkles,
  IconTrophy,
  IconTrendingUp,
  IconBulb,
  IconRefresh,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import dynamic from 'next/dynamic';
import { supabase } from '../lib/supabase';

const MenuBoard = dynamic(() => import('./features/MenuBoard'), { ssr: false });

export default function Home() {
  const router = useRouter();
  const [loadingButton, setLoadingButton] = useState<null | 'ide'>(null);

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  const handleStartCoding = () => {
    setLoadingButton('ide');
    setTimeout(() => {
      router.push('/ide');
    }, 900);
  };

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
    } else {
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
      setAuthError('');
      setAuthLoading(false);
      // Optionally, refresh or redirect
    }
  };
  const handleSignInWithGoogle = async () => {
    setAuthLoading(true);
    setAuthError('');
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };
  const handleSignUpRedirect = () => {
    setShowAuthModal(false);
    router.push('/sign-up');
  };

  return (
    <>
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-light-cream rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-dark-charcoal hover:text-medium-coffee"
              onClick={() => setShowAuthModal(false)}
              aria-label="Close"
            >
              <IconArrowRight className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-bold mb-4 text-medium-coffee">Sign In</h2>
            <form onSubmit={handleSignIn} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-medium-coffee"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-medium-coffee"
                required
              />
              {authError && <div className="text-red-600 text-sm">{authError}</div>}
              <button
                type="submit"
                className="w-full btn-coffee-primary py-2 text-lg"
                disabled={authLoading}
              >
                {authLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
            <div className="my-4 flex items-center justify-center">
              <span className="text-gray-400">or</span>
            </div>
            <button
              onClick={handleSignInWithGoogle}
              className="w-full btn-coffee-secondary py-2 text-lg flex items-center justify-center gap-2"
              disabled={authLoading}
            >
              <img src="/images/logo-trans.png" alt="Google" className="h-5 w-5" />
              Sign In with Google
            </button>
            <div className="mt-6 text-center">
              <span className="text-gray-600">Don't have an account? </span>
              <button
                onClick={handleSignUpRedirect}
                className="text-medium-coffee font-semibold hover:underline"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Bolt.new Badge Configuration */}
     
      <div className="min-h-screen bg-light-cream">
        <Header />

        {/* Hero Section */}
        <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden w-full py-24 md:py-32">
          {/* Uniform background color for hero section */}
          <div className="absolute inset-0 bg-light-cream"></div>
          {/* Auth Modal (only overlays hero section) */}
          {showAuthModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-light-cream rounded-lg shadow-lg p-8 w-full max-w-md relative">
                <button
                  className="absolute top-2 right-2 text-dark-charcoal hover:text-medium-coffee"
                  onClick={() => setShowAuthModal(false)}
                  aria-label="Close"
                >
                  <IconArrowRight className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold mb-4 text-medium-coffee">Sign In</h2>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <input
                    type="email"
                    placeholder="Email"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-medium-coffee"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-medium-coffee"
                    required
                  />
                  {authError && <div className="text-red-600 text-sm">{authError}</div>}
                  <button
                    type="submit"
                    className="w-full btn-coffee-primary py-2 text-lg"
                    disabled={authLoading}
                  >
                    {authLoading ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>
                <div className="my-4 flex items-center justify-center">
                  <span className="text-gray-400">or</span>
                </div>
                <button
                  onClick={handleSignInWithGoogle}
                  className="w-full btn-coffee-secondary py-2 text-lg flex items-center justify-center gap-2"
                  disabled={authLoading}
                >
                  <img src="/images/logo-trans.png" alt="Google" className="h-5 w-5" />
                  Sign In with Google
                </button>
                <div className="mt-6 text-center">
                  <span className="text-gray-600">Don't have an account? </span>
                  <button
                    onClick={handleSignUpRedirect}
                    className="text-medium-coffee font-semibold hover:underline"
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Animated coffee elements */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-medium-coffee to-deep-espresso rounded-full opacity-10 animate-steam-rise blur-xl"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-deep-espresso to-medium-coffee rounded-full opacity-10 animate-coffee-drip blur-xl" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-1/3 left-20 w-20 h-20 bg-gradient-to-br from-medium-coffee to-cream-beige rounded-full opacity-10 animate-bean-bounce blur-xl" style={{ animationDelay: '4s' }}></div>
          <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-gradient-to-br from-deep-espresso to-medium-coffee rounded-full opacity-10 animate-float" style={{ animationDelay: '1s' }}></div>

          <div className="relative z-10 w-full max-w-[2000px] mx-auto flex flex-col md:flex-row items-center px-4 xl:px-16 2xl:px-32 gap-12 md:gap-20">
            {/* Left: Text Content */}
            <div className="flex-1 flex flex-col pt-12 mt-8 items-start md:items-start text-left max-w-xl">
            {/* Coffee Shop Badge */}
             
            {/* Main heading with coffee theme */}
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black text-dark-charcoal leading-tight">
                <span className="block mb-2">Ship Your Code,</span>
                <span className="block bg-gradient-to-r from-medium-coffee via-deep-espresso to-medium-coffee bg-clip-text text-transparent animate-gradient leading-[1.2] py-1 mb-6">
                  Sip Your Coffee
                </span>
              </h1>
              {/* Coffee-themed Subheading */}
              <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl text-medium-coffee mb-10 max-w-2xl leading-relaxed font-medium">
                Actually learn to code projects in the time it takes to sip your morning coffee
                <span className="block mt-8 font-bold text-dark-charcoal text-base sm:text-lg xl:text-xl">The only rule? No vibecoding.</span>
              </p>
              {/* Hero action buttons */}
              <div className="flex gap-6 mb-12">
                <button
                  onClick={handleStartCoding}
                  className="btn-coffee-primary px-8 py-4 text-lg xl:text-2xl font-bold rounded-xl shadow hover:shadow-lg transition flex items-center justify-center gap-2"
                  disabled={loadingButton !== null}
                >
                  {loadingButton === 'ide' ? (
                    <>
                      <IconRefresh className="h-5 w-5 animate-spin" />
                      Loading IDE...
                    </>
                  ) : (
                    'Go to IDE'
                  )}
                </button>
              </div>
            </div>
            {/* Right: Hero Image */}
            <div className="flex-1 flex justify-center items-center w-full max-w-3xl xl:max-w-5xl 2xl:max-w-6xl mx-auto">
              <Image
                src="/images/demo.png"
                alt="demo screen"
                width={1600}
                height={1100}
                className="rounded-3xl shadow-2xl object-contain max-w-full h-auto max-h-[600px] border-4 border-medium-coffee"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
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
                Vibecoding is
                <span className="block text-red-800 pt-2">Over-Roasted</span>
              </h2>
              
              <div className="max-w-5xl mx-auto space-y-6">
                <p className="text-2xl lg:text-3xl text-dark-charcoal leading-relaxed font-medium">
                  Modern coding education leaves a bitter taste due to high learning curves and costs.
                  <span className="block mt-3 text-red-600 font-semibold">When AI can generate code instantly, why learn the craft?</span>
                </p>

                <p className="text-xl lg:text-2xl text-deep-espresso leading-relaxed">
                  This convenience trap creates a two-tiered world: the master baristas who understand the craft, and those who just push buttons on a machine.
                </p>

                <p className="text-xl lg:text-2xl text-deep-espresso leading-relaxed">
                  This leaves aspiring developers facing an impossible menu of prerequisites.
                  <span className="block mt-2 text-red-600 font-semibold">The message becomes clear: coding isn't for you.</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Coffee Shop themed */}
        <section id="features" className="relative z-10">
          <MenuBoard />
        </section>

        {/* How It Works Section - Coffee Process themed */}
        <section id="how-it-works" className="py-32 bg-light-cream relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(163,106,62,0.05),transparent_50%)]"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-18">
            

              <h2 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black text-dark-charcoal mb-8 leading-tight">
                Three Steps to
                <span className="block bg-gradient-to-r from-medium-coffee to-deep-espresso bg-clip-text text-transparent"> Perfect Code</span>
              </h2>
              <p className="text-2xl lg:text-3xl text-deep-espresso max-w-4xl mx-auto leading-relaxed font-medium pb-4">
                Start your coding journey with the same care and attention as brewing the perfect cup of coffee.
              </p>
            </div>

            <div className="space-y-32">
              {[
                {
                  icon: IconPencil,
                  title: 'Grind Your Skills',
                  description: 'Work on coding tasks that matter to you, and receive guidance that helps you make real progress on your programs. Like selecting the perfect coffee beans.',
                  image: 'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=600',
                  color: 'from-medium-coffee to-deep-espresso'
                },
                {
                  icon: IconMessage,
                  title: 'Extract Knowledge',
                  description: 'Stuck on something? Our AI barista provides contextual hints and applies small code fixes to help you understand what you code quicker.',
                  image: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=600',
                  color: 'from-deep-espresso to-medium-coffee'
                },
                {
                  icon: IconCircleCheck,
                  title: 'Serve Excellence',
                  description: 'Learn and practice the most common IDE features and tools to get the job. Perfect your craft.',
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
                      <IconArrowRight className="ml-4 h-6 w-6 group-hover:translate-x-2 transition-transform" />
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

        {/* Testimonials Section - Coffee Reviews themed
        <section className="py-32 bg-gradient-to-br from-cream-beige via-light-cream to-cream-beige relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(163,106,62,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(129,77,51,0.1),transparent_50%)]"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-24">
              <div className="inline-flex items-center space-x-3 bg-medium-coffee/10 rounded-full px-6 py-3 mb-8">
                <IconTrophy className="h-5 w-5 text-deep-espresso" />
                <span className="text-dark-charcoal font-semibold text-sm">Customer Reviews</span>
              </div>
              
              <h2 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black text-dark-charcoal mb-8 leading-tight">
                What Our
                <span className="block bg-gradient-to-r from-medium-coffee to-deep-espresso bg-clip-text text-transparent"> Regulars Say</span>
              </h2>
              <p className="text-2xl lg:text-3xl text-deep-espresso max-w-4xl mx-auto leading-relaxed font-medium">
                These are what developers have said about Cafécode and how it helped them find the perfect coding brew.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  name: 'Sarah Chen',
                  role: 'Self-taught Developer',
                  image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
                  content: 'Cafécode made learning JavaScript as smooth as my morning latte. The AI barista helped me understand concepts I was struggling with for weeks.',
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
                  content: 'As someone switching careers, Cafécode gave me the confidence to code. The cozy atmosphere is exactly what I needed to learn.',
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
                      <IconStar key={i} className="h-7 w-7 text-medium-coffee fill-current" />
                    ))}
                  </div>
                  
                  <IconMessage className="h-12 w-12 text-medium-coffee/50 mb-8" />
                  
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
        </section> */}

        {/* Pricing Section - Coffee Menu themed */}
        <section id="pricing" className="py-32 bg-light-cream relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(163,106,62,0.05),transparent_50%)]"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-24">
              <div className="inline-flex items-center space-x-3 bg-deep-espresso/10 rounded-full px-6 py-3 mb-8">
                <IconTrendingUp className="h-5 w-5 text-deep-espresso" />
                <span className="text-dark-charcoal font-semibold text-sm">Our Menu</span>
              </div>
              
              <h2 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black text-dark-charcoal mb-5 leading-tight">
                Simple, Transparent
                <span className="block bg-gradient-to-r pt-6 pb-2 from-medium-coffee to-deep-espresso bg-clip-text text-transparent"> Pricing</span>
              </h2>
              <p className="text-2xl lg:text-3xl text-deep-espresso max-w-4xl mx-auto leading-relaxed font-medium">
                Start with our free house blend and upgrade as your taste develops. No hidden fees, no complicated menu.
              </p>
            </div>

            {/* Diagonal overlay for pricing */}
            <div className="relative w-full mb-12">
              <div className="absolute top-0 left-0 right-0 bottom-0 z-10 overflow-hidden">
                <div className="absolute top-0 left-0 w-[200%] h-full bg-medium-coffee/20 transform -rotate-12 origin-top-left flex items-center justify-center">
                  <p className="text-4xl md:text-6xl font-bold text-deep-espresso/90 tracking-wider rotate-12 whitespace-nowrap px-4 py-2 text-center" style={{ fontFamily: 'var(--font-heading)' }}>
                    PRICING OPTIONS COMING SOON
                  </p>
                </div>
              </div>
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
                    'Single file applications',
                    'Community support',
                    'Basic syntax highlighting'
                  ],
                  cta: 'Coming Soon!',
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
                    'Multiple file applications',
                    'Priority support',
                    'Code templates',
                    'Progress tracking'
                  ],
                  cta: 'Coming Soon!',
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
                  cta: 'Coming Soon!',
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
                        <IconCircleCheck className="h-7 w-7 text-medium-coffee mr-5 flex-shrink-0" />
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
                  <IconCircleCheck className="h-6 w-6 text-medium-coffee mr-3" />
                  Cancel anytime
                </span>
                <span className="flex items-center">
                  <IconCircleCheck className="h-6 w-6 text-medium-coffee mr-3" />
                  30-day money back guarantee
                </span>
                       <span className="flex items-center">
                  <IconCircleCheck className="h-6 w-6 text-medium-coffee mr-3" />
                  No setup fees
                </span>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}