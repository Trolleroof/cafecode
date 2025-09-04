'use client';

import React, { useState, useEffect } from 'react';
import {
  IconCode,
  IconStar,
  IconRefresh,
  IconLock,
  IconPencil,
  IconMessage,
  IconCircleCheck,
  IconTrendingUp,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import dynamic from 'next/dynamic';
import { supabase } from '../lib/supabase';
import PaymentModal from '@/components/PaymentModal';
import ProjectCounter from '@/components/ProjectCounter';

const MenuBoard = dynamic(() => import('./features/MenuBoard'), { ssr: false });

export default function Home() {
  const router = useRouter();
  const [loadingButton, setLoadingButton] = useState<null | 'ide'>(null);
  const [loadingPlan, setLoadingPlan] = useState<null | string>(null);

  // Auth state - removed modal, now redirects to login page

  // Basic state - will be populated after hydration
  const [user, setUser] = useState<any>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [hasUnlimitedAccess, setHasUnlimitedAccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isCompletingTest, setIsCompletingTest] = useState(false);
  
  // Function to refresh user data
  const refreshUserData = async () => {
    if (!user) {
      console.log('No user found, skipping refresh');
      return;
    }
    
    setIsRefreshing(true);
    setRefreshError(null);
    
    try {
      console.log('Refreshing user data for user:', user.id);
      
      // Check if Supabase is properly configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Supabase configuration missing. Please check environment variables.');
      }
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('project_count, payment_status, has_unlimited_access')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (profile) {
        console.log('Profile data received:', profile);
        setProjectCount(profile.project_count || 0);
        setHasUnlimitedAccess(
          profile.payment_status === 'paid' || 
          profile.has_unlimited_access === true
        );
      } else {
        console.log('No profile data received');
      }
    } catch (error: any) {
      console.error('Error refreshing user data:', error);
      
      // Set user-friendly error message
      let errorMessage = 'Failed to refresh data';
      if (error?.message) {
        console.error('Error message:', error.message);
        if (error.message.includes('apikey') || error.message.includes('API key')) {
          errorMessage = 'API configuration issue. Please check your setup.';
        } else {
          errorMessage = error.message;
        }
      }
      if (error?.details) {
        console.error('Error details:', error.details);
      }
      if (error?.hint) {
        console.error('Error hint:', error.hint);
      }
      
      setRefreshError(errorMessage);
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setRefreshError(null);
      }, 5000);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initialize user data
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          
          // Fetch user's project count and payment status from database
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('project_count, payment_status, has_unlimited_access')
              .eq('id', user.id)
              .maybeSingle();
            
            if (!error && profile) {
              setProjectCount(profile.project_count || 0);
              setHasUnlimitedAccess(
                profile.payment_status === 'paid' || 
                profile.has_unlimited_access === true
              );
            } else {
              // Set defaults if no profile found
              setProjectCount(0);
              setHasUnlimitedAccess(false);
            }
          } catch (profileError) {
            console.error('Error fetching user profile:', profileError);
            setProjectCount(0);
            setHasUnlimitedAccess(false);
          }
        }
      } catch (error) {
        console.error('Error initializing user:', error);
      }
    };
    
    initializeUser();
  }, []);

  const handleStartCoding = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setLoadingButton('ide');
    router.push('/ide');
  };

  // Test helper: mark a project as completed to increment project count
  const handleTestCompleteProject = async () => {
    try {
      setIsCompletingTest(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login');
        return;
      }

      // Try primary endpoint
      let resp = await fetch('/api/guided/completeProject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ projectId: null }),
      });

      // Fallback to explicit increment route if not found
      if (resp.status === 404) {
        resp = await fetch('/api/guided/incrementProjectCount', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        });
      }

      const data = await resp.json().catch(() => ({}));
      if (resp.ok) {
        // Prefer server-returned count, otherwise increment locally
        if (typeof data?.project_count === 'number') {
          setProjectCount(data.project_count);
        } else {
          setProjectCount((c) => c + 1);
        }
        // Sync from DB to be sure
        await refreshUserData();
      } else {
        console.warn('Failed to complete project:', data);
      }
    } catch (e) {
      console.warn('Network error completing project:', e);
    } finally {
      setIsCompletingTest(false);
    }
  };

  // Auth functions removed - now handled by dedicated login/signup pages

  return (
    <>
      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        projectCount={projectCount}
        onPaymentSuccess={() => {
          setShowPaymentModal(false);
          refreshUserData(); // Refresh user data after successful payment
        }}
      />

      {/* Main content */}
      <div className="min-h-screen bg-light-cream">
        <Header />

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-white to-light-cream w-full py-24">
              <div className="relative z-10 w-full max-w-[2000px] mx-auto flex flex-col md:flex-row items-center px-6 xl:px-16 2xl:px-32 gap-12 md:gap-20">
                {/* Left: Text Content */}
                <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left max-w-xl space-y-8">
                {/* Coffee Shop Badge */}

                {/* Project Counter - Show user's project status */}
                {user && (
                  <div className="mb-8">
                    <ProjectCounter
                      projectCount={projectCount}
                      hasUnlimitedAccess={hasUnlimitedAccess}
                      onUpgradeClick={() => setShowPaymentModal(true)}
                      onRefresh={refreshUserData}
                      isRefreshing={isRefreshing}
                      refreshError={refreshError}
                    />

                    {/* Status message */}
                    <div className="mt-3 text-sm text-medium-coffee">
                      {hasUnlimitedAccess ? (
                        <span className="flex items-center gap-2">
                          <IconStar className="h-4 w-4 text-yellow-500" />
                          You have unlimited access to create projects!
                        </span>
                      ) : projectCount >= 1 ? (
                        <span className="flex items-center gap-2">
                          <IconLock className="h-4 w-4 text-red-500" />
                          You've used your free project. Upgrade to continue coding!
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <IconCode className="h-4 w-4 text-medium-coffee" />
                          You have 1 free project remaining
                        </span>
                      )}
                    </div>

                    {/* Test button: simulate project completion to increment count */}
                    <div className="mt-4">
                      <button
                        onClick={handleTestCompleteProject}
                        disabled={isCompletingTest}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-medium-coffee/30 text-deep-espresso bg-cream-beige hover:bg-light-cream transition-colors disabled:opacity-60"
                        aria-label="Test: Complete a project"
                      >
                        {isCompletingTest ? (
                          <>
                            <div className="spinner-coffee h-4 w-4" />
                            Recording completion...
                          </>
                        ) : (
                          <>
                            <IconTrendingUp className="h-4 w-4" />
                            Test: Complete Project (increment)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Main heading with coffee theme */}
                  <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold text-dark-charcoal tracking-tight">
                    <span className="block">Ship Your Code.</span>
                    <span className="block text-medium-coffee">Sip Your Coffee.</span>
                  </h1>
                  {/* Coffee-themed Subheading */}
                  <p className="text-lg sm:text-xl lg:text-2xl text-medium-coffee max-w-2xl leading-relaxed font-medium">
                    Actually learn to code projects in the time it takes to sip your morning coffee.
                    <span className="block mt-6 font-semibold text-dark-charcoal text-base sm:text-lg">The only rule? Novibecoding.</span>
                  </p>
                  {/* Hero action buttons */}
                  <div className="flex gap-6 mt-4">
                    <button
                      onClick={() => {
                        if (!user) {
                          router.push('/login');
                        } else {
                          handleStartCoding();
                        }
                      }}
                      className="px-10 py-4 text-lg xl:text-xl font-semibold rounded-full shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 bg-medium-coffee text-light-cream hover:bg-deep-espresso border-2 border-deep-espresso"
                      disabled={loadingButton !== null}
                    >
                      {loadingButton === 'ide' ? (
                        <>
                          <div className="spinner-coffee h-5 w-5"></div>
                          Loading IDE...
                        </>
                      ) : (
                        'Start Coding!'
                      )}
                    </button>

                  </div>

                </div>
                {/* Right: Hero Image */}
                <div className="flex-1 flex justify-center items-center w-full max-w-3xl xl:max-w-5xl 2xl:max-w-6xl mx-auto relative">
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
            <section id="problemStatement" className='py-20 md:py-24 bg-light-cream relative overflow-hidden'>
              
              <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
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
            <section id="features" className="relative z-10 bg-light-cream">
              <MenuBoard />
            </section>

            {/* How It Works Section - Coffee Process themed */}
            <section id="how-it-works" className="py-20 md:py-24 bg-light-cream relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(163,106,62,0.03),transparent_50%)]"></div>
              
              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                

                  <h2 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black text-dark-charcoal mb-8 leading-tight">
                    Three Steps to
                    <span className="block bg-gradient-to-r from-medium-coffee to-deep-espresso bg-clip-text text-transparent"> Perfect Code</span>
                  </h2>
                  <p className="text-2xl lg:text-3xl text-deep-espresso max-w-4xl mx-auto leading-relaxed font-medium pb-4">
                    Start your coding journey with the same care and attention as brewing the perfect cup of coffee.
                  </p>
                </div>

                <div className="space-y-20 md:space-y-24">
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
                      className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 md:gap-16`}
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
            <section id="pricing" className="py-20 md:py-24 bg-light-cream relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(163,106,62,0.03),transparent_50%)]"></div>
              
              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                  <div className="inline-flex items-center space-x-3 bg-deep-espresso/10 rounded-full px-6 py-3 mb-8">
                    <IconTrendingUp className="h-5 w-5 text-deep-espresso" />
                    <span className="text-dark-charcoal font-semibold text-sm">Pricing Plans</span>
                  </div>
                  
                  <h2 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black text-dark-charcoal mb-5 leading-tight">
                    <span className="block bg-gradient-to-r pb-2 from-medium-coffee to-deep-espresso bg-clip-text text-transparent"> Our Menu </span>
                  </h2>
                  <p className="text-lg lg:text-xl text-black max-w-2xl mx-auto leading-relaxed font-medium mb-16">
                    Here are the options we provide to help you accelerate your coding journey 
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {[
                    {
                      name: 'Starter',
                      price: '$0',
                      period: 'month',
                      description: 'Sample our platform',
                      features: [
                        'Brewster coding assistant',
                        'Full-featured code editor',
                        'Guided Project Planner',
                        'Real-time hints, fixes, and explanations',
                      ],
                      cta: 'Start Coding Free',
                      popular: false,
                      color: 'from-deep-espresso to-dark-charcoal'
                    },
                    {
                      name: 'Cold Brew',
                      price: '$4.99',
                      period: 'lifetime',
                      description: 'Unlimited projects & priority support',
                      features: [
                        'Everything in Starter',
                        'Unlimited Project creation',
                        'Unlimited project guidance',
                        'Priority support from founder',
                        'AI Conversational Video Mentor'
                      ],
                      cta: 'Get Cold Brew Access',
                      popular: false,
                      color: 'from-medium-coffee to-deep-espresso'
                    }
                  ].map((plan, index) => (
                    <div
                      key={index}
                      className={`relative p-8 md:p-10 rounded-3xl shadow-lg ${
                        plan.name === 'Cold Brew'
                          ? 'border-2 border-medium-coffee bg-light-cream'
                          : 'border border-medium-coffee/20 bg-light-cream'
                      }`}
                    >
                      {plan.name === 'Cold Brew' && (
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                          <div className="bg-deep-espresso text-light-cream px-6 py-2 rounded-full text-sm font-semibold shadow-lg border border-medium-coffee/30">
                            Premium Access
                          </div>
                        </div>
                      )}

                      <div className="text-center mb-8 md:mb-12">
                        <h3 className="font-heading text-3xl md:text-4xl font-black text-dark-charcoal mb-4 md:mb-6">{plan.name}</h3>
                        <div className="mb-6 md:mb-8">
                          <span className="text-5xl md:text-6xl font-black text-dark-charcoal">{plan.price}</span>
                          <span className="text-deep-espresso ml-2 md:ml-3 text-xl md:text-2xl">/{plan.period}</span>
                        </div>
                        <p className="text-deep-espresso text-lg md:text-xl">{plan.description}</p>
                      </div>

                      <ul className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start">
                            <IconCircleCheck className="h-5 w-5 md:h-7 md:w-7 text-medium-coffee mr-3 md:mr-5 flex-shrink-0 mt-0.5" />
                            <span className="text-dark-charcoal text-base md:text-xl leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => {
                          try {
                            setLoadingPlan(plan.name);
                            if (plan.name === 'Cold Brew') {
                              // Open payment modal for Cold Brew tier
                              setShowPaymentModal(true);
                              // brief visual confirmation
                              setTimeout(() => setLoadingPlan(null), 500);
                            } else if (plan.name === 'Starter') {
                              // Handle Starter tier (Start Coding Free button)
                              if (!user) {
                                router.push('/login');
                              } else {
                                router.push('/ide');
                              }
                            }
                          } catch (error) {
                            console.error('Error handling button click:', error);
                            setLoadingPlan(null);
                          }
                        }}
                        disabled={loadingPlan === plan.name}
                        className={`w-full py-4 md:py-6 px-6 md:px-8 rounded-2xl font-bold text-lg md:text-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed ${
                          plan.name === 'Cold Brew'
                            ? 'bg-medium-coffee text-light-cream hover:bg-deep-espresso shadow-lg'
                            : 'btn-coffee-secondary hover:bg-medium-coffee hover:text-light-cream'
                        }`}
                      >
                        {loadingPlan === plan.name ? (
                          <>
                            <div className="spinner-coffee h-5 w-5"></div>
                            {plan.name === 'Cold Brew' ? 'Loading Checkout...' : 'Preparing IDE...'}
                          </>
                        ) : (
                          plan.cta
                        )}
                      </button>
                      
                    
                    </div>
                  ))}
                </div>

                <div className="text-center mt-16">
                  <p className="text-deep-espresso mb-8 text-xl">
                    Start coding for free, upgrade to Cold Brew for unlimited projects and priority support.
                  </p>
                  <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-12 text-deep-espresso font-semibold text-lg">
                    <span className="flex items-center">
                      <IconCircleCheck className="h-6 w-6 text-medium-coffee mr-3" />
                      Cancel anytime
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
