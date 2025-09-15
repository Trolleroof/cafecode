'use client';

import React, { useState, useEffect } from 'react';
import {
  IconCode,
  IconRefresh,
  IconLock,
  IconPencil,
  IconMessage,
  IconCircleCheck,
  IconTrendingUp,
  IconSparkles,
} from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import dynamic from 'next/dynamic';
import { supabase } from '../lib/supabase';
import PaymentModal from '@/components/PaymentModal';
import ProjectCounter from '@/components/ProjectCounter';
import { useProjectManager } from '@/hooks/useProjectManager';

const MenuBoard = dynamic(() => import('./features/MenuBoard'), { ssr: false });

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingButton, setLoadingButton] = useState<null | 'ide'>(null);
  const [loadingPlan, setLoadingPlan] = useState<null | string>(null);
  
  // Use project manager hook for frontend RPC calls
  const { grantUnlimitedAccess: frontendGrantUnlimited } = useProjectManager();

  // Auth state - removed modal, now redirects to login page

  // Basic state - will be populated after hydration
  const [user, setUser] = useState<any>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [hasUnlimitedAccess, setHasUnlimitedAccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  
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

  // Listen for project count changes (e.g., when user completes projects in IDE)
  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription to profiles table
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Profile updated:', payload);
          const newData = payload.new;
          if (newData) {
            const newProjectCount = newData.project_count || 0;
            const newHasUnlimitedAccess = newData.payment_status === 'paid' || newData.has_unlimited_access === true;
            
            setProjectCount(newProjectCount);
            setHasUnlimitedAccess(newHasUnlimitedAccess);
          }
        }
      )
      .subscribe();

    // Fallback: periodic refresh every 10 seconds as backup
    const refreshInterval = setInterval(async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('project_count, payment_status, has_unlimited_access')
          .eq('id', user.id)
          .maybeSingle();
        
        if (!error && profile) {
          const newProjectCount = profile.project_count || 0;
          const newHasUnlimitedAccess = profile.payment_status === 'paid' || profile.has_unlimited_access === true;
          
          // Only update if values actually changed to avoid unnecessary re-renders
          if (newProjectCount !== projectCount) {
            setProjectCount(newProjectCount);
          }
          if (newHasUnlimitedAccess !== hasUnlimitedAccess) {
            setHasUnlimitedAccess(newHasUnlimitedAccess);
          }
        }
      } catch (error) {
        // Silently fail - this is just a background refresh
        console.debug('Background refresh failed:', error);
      }
    }, 10000); // Check every 10 seconds as backup

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, [user, projectCount, hasUnlimitedAccess]);

  const handleStartCoding = () => {
    if (!user) {
      router.push('/security/login');
      return;
    }
    setLoadingButton('ide');
    router.push('/ide');
  };


  // Removed dev-only grant unlimited handler. Stripe handles upgrades.

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
              <section className="relative flex flex-col justify-center min-h-screen px-4 py-16 overflow-hidden bg-gradient-to-b from-white to-light-cream sm:py-20 sm:px-6 lg:px-8">
                <div className="relative z-10 w-full max-w-screen-xl mx-auto">
                
                <div className="grid items-center grid-cols-1 gap-10 md:grid-cols-12 lg:gap-14 xl:gap-16">
                  {/* Left: Text Content - Reordered for mobile */}
                  <div className="flex flex-col items-center text-center md:col-span-6 md:items-start md:text-left lg:col-span-5 space-y-7">
                    {/* Main heading with coffee theme */}
                    <h1 className="text-4xl font-bold tracking-tight font-heading sm:text-5xl lg:text-6xl xl:text-6xl text-dark-charcoal leading-tight">
                      <span>Ship Your Code. </span>
                      <span className="text-medium-coffee">Sip Your Coffee.</span>
                    </h1>
                    
                    {/* Coffee-themed Subheading */}
                    <p className="max-w-xl text-lg font-medium leading-relaxed font-body sm:text-xl lg:text-2xl text-medium-coffee">
                      Actually learn to code projects in the time it takes to sip your morning coffee.
                    </p>

                    {/* Hero action buttons */}
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <button
                        onClick={() => {
                          if (!user) {
                            router.push('/security/login');
                          } else {
                            handleStartCoding();
                          }
                        }}
                        className="flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold transition-all duration-300 border-2 rounded-full shadow-md hover:shadow-lg xl:text-xl bg-deep-espresso text-light-cream border-deep-espresso hover:bg-deep-espresso/90 hover:scale-[1.02]"
                        disabled={loadingButton !== null}
                      >
                        {loadingButton === 'ide' ? (
                          <>
                            <div className="spinner-coffee h-6 w-6"></div>
                            Loading IDE...
                          </>
                        ) : (
                          <>
                            <IconCode className="w-5 h-5" />
                            Start Coding!
                          </>
                        )}
                      </button>
                      
                      {/* Watch Demo Button */}
                    
                    </div>
                  </div>

                  {/* Right: Demo Video & Project Counter */}
                  <div className="w-full md:col-span-6 lg:col-span-7">
                    {/* Project Counter - positioned above video on mobile */}
                    {user && (
                      <div className="w-full max-w-md mx-auto mb-8 md:max-w-none">
                        <ProjectCounter
                          projectCount={projectCount}
                          hasUnlimitedAccess={hasUnlimitedAccess}
                          onUpgradeClick={() => setShowPaymentModal(true)}
                        />
                      </div>
                    )}

                    <div className="relative flex items-center justify-center w-full group">
                      {/* Video Container */}
                      <div className="relative w-full overflow-hidden border-4 rounded-3xl aspect-video shadow-2xl border-medium-coffee/20 bg-gradient-to-br from-medium-coffee/10 to-deep-espresso/10">
                        {/* Placeholder for video - you'll replace src with your demo video */}
                        <video
                          id="demo-video"
                          className="object-cover w-full h-full rounded-2xl"
                          poster="/images/demo.png"
                          controls
                          preload="metadata"
                          playsInline
                        >
                          {/* Replace with your actual demo video URL */}
                          <source src="/videos/demo.mp4" type="video/mp4" />
                          <source src="/videos/demo.webm" type="video/webm" />
                          {/* Fallback to image if video doesn't load */}
                          Your browser doesn't support video playback.
                        </video>
                        
                        {/* Video Overlay Elements */}
                        <div className="absolute inset-0 transition-opacity duration-300 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 pointer-events-none rounded-2xl"></div>
                        
                        {/* Play Button Overlay - only shows when video is paused */}
                        <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 opacity-0 pointer-events-none group-hover:opacity-100">
                          <div className="p-6 rounded-full bg-deep-espresso/80 backdrop-blur-sm">
                            <IconTrendingUp className="w-12 h-12 text-light-cream" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Video Features Badges */}
                      <div className="absolute flex flex-col gap-2 -bottom-6 -left-6">
                        <div className="px-4 py-2 border-2 rounded-xl bg-light-cream border-medium-coffee/30 shadow-lg">
                          <span className="text-sm font-semibold text-deep-espresso"> Demo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
{/* Problem Statement Section - Coffee themed */}
            <section id="problemStatement" className='relative py-20 overflow-hidden md:py-24 bg-light-cream'>
              
              <div className="relative max-w-6xl px-4 mx-auto sm:px-6 lg:px-8">
                <div className="mb-12 text-center">
                  <div className="inline-flex items-center px-6 py-3 mb-8 space-x-3 bg-red-100 rounded-full">
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
                    Start your coding journey with the same care and attention as brewing the perfect cup of coffee—CafeCode scaffolds projects, refactors code, and pours in guidance while you learn.
                  </p>
                </div>

                <div className="space-y-20 md:space-y-24">
                  {[
                    {
                      icon: IconPencil,
                      title: 'Grind Your Skills',
                      description: 'Kick off new ideas from templates or your own repos and let CafeCode scaffold files, suggest completions, and track your progress.',
                      image: 'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=600',
                      color: 'from-medium-coffee to-deep-espresso'
                    },
                    {
                      icon: IconMessage,
                      title: 'Extract Knowledge',
                      description: 'Ask Codey, our assistant, for hints, best practices, or debugging help. It explains errors, refactors code, and generates snippets so you can extract knowledge faster.',
                      image: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=600',
                      color: 'from-deep-espresso to-medium-coffee'
                    },
                    {
                      icon: IconCircleCheck,
                      title: 'Build Real Projects',
                      description: 'Create complete, working applications from start to finish. Build towards a portfolio of real projects that showcase your coding skills.',
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
            <section id="pricing" className="py-12 md:py-16 bg-light-cream relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(163,106,62,0.03),transparent_50%)]"></div>
              
              <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center space-x-2 bg-deep-espresso/10 rounded-full px-4 py-2 mb-4">
                    <span className="text-dark-charcoal font-semibold text-xs">Pricing Plans</span>
                  </div>
                  
                  <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black text-dark-charcoal mb-4 leading-tight">
                    <span className="block bg-gradient-to-r pb-2 from-medium-coffee to-deep-espresso bg-clip-text text-transparent"> Our Menu </span>
                  </h2>
                  <p className="text-xl lg:text-2xl text-black max-w-2xl mx-auto leading-relaxed font-medium mb-12">
                    Our plans help you accelerate your coding journey 
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
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
                      price: hasUnlimitedAccess ? 'Active' : '$4.99',
                      period: 'lifetime',
                      description: hasUnlimitedAccess ? 'You have unlimited access!' : 'Unlimited projects & priority support',
                      features: [
                        'Everything in Starter',
                        'Unlimited Project creation',
                        'Unlimited project guidance',
                        'Priority support from founder',
                        'AI Conversational Video Mentor'
                      ],
                      cta: hasUnlimitedAccess ? 'Start Coding in IDE' : 'Get Cold Brew Access',
                      popular: false,
                      color: 'from-medium-coffee to-deep-espresso'
                    }
                  ].map((plan, index) => (
                    <div
                      key={index}
                      className={`relative p-6 rounded-2xl shadow-lg ${
                        plan.name === 'Cold Brew'
                          ? 'border-2 border-medium-coffee bg-light-cream'
                          : 'border border-medium-coffee/20 bg-light-cream'
                      }`}
                    >
                      {plan.name === 'Cold Brew' && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <div className="bg-deep-espresso text-light-cream px-4 py-1 rounded-full text-xs font-semibold shadow-lg border border-medium-coffee/30">
                            Premium Access
                          </div>
                        </div>
                      )}

                      <div className="text-center mb-6">
                        <h3 className="font-heading text-3xl font-black text-dark-charcoal mb-4">{plan.name}</h3>
                        <div className="mb-4">
                          <span className="text-5xl font-black text-dark-charcoal">{plan.price}</span>
                          <span className="text-deep-espresso ml-2 text-xl">/{plan.period}</span>
                        </div>
                        <p className="text-deep-espresso text-lg">{plan.description}</p>
                      </div>

                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start">
                            <IconCircleCheck className="h-5 w-5 text-medium-coffee mr-3 flex-shrink-0 mt-0.5" />
                            <span className="text-dark-charcoal text-base leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => {
                          try {
                            setLoadingPlan(plan.name);
                            if (plan.name === 'Cold Brew') {
                              if (hasUnlimitedAccess) {
                                // User already has access, go to IDE
                                router.push('/ide');
                                setTimeout(() => setLoadingPlan(null), 500);
                              } else {
                                // Open payment modal for Cold Brew tier
                                setShowPaymentModal(true);
                                // brief visual confirmation
                                setTimeout(() => setLoadingPlan(null), 500);
                              }
                            } else if (plan.name === 'Starter') {
                              // Handle Starter tier (Start Coding Free button)
                              if (!user) {
                                router.push('/security/login');
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
                        className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                          plan.name === 'Cold Brew'
                            ? 'bg-medium-coffee text-light-cream hover:bg-deep-espresso shadow-lg'
                            : 'btn-coffee-secondary hover:bg-medium-coffee hover:text-light-cream'
                        }`}
                      >
                        {loadingPlan === plan.name ? (
                          <>
                            <div className="spinner-coffee h-4 w-4"></div>
                            {plan.name === 'Cold Brew' ? (hasUnlimitedAccess ? 'Opening IDE...' : 'Loading...') : 'Preparing...'}
                          </>
                        ) : (
                          plan.cta
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="text-center mt-8">
                  <p className="text-deep-espresso mb-6 text-lg">
                    Start coding for free, upgrade to Cold Brew for unlimited projects and priority support.
                  </p>
                  <div className="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-8 text-deep-espresso font-semibold text-base">
                    <span className="flex items-center">
                      <IconCircleCheck className="h-5 w-5 text-medium-coffee mr-2" />
                      Cancel anytime
                    </span>
                    <span className="flex items-center">
                      <IconCircleCheck className="h-5 w-5 text-medium-coffee mr-2" />
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
