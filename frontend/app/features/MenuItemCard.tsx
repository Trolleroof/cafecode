import React from 'react';

interface MenuItemCardProps {
  icon: React.ReactNode;
  title: string;
  price: string;
  tags: string[];
  description: React.ReactNode;
  color: string;
  featured?: boolean;
  demoAction?: string;
  onDemoClick?: () => void;
}

export default function MenuItemCard({
  icon,
  title,
  price,
  tags,
  description,
  color,
  featured = false,
  demoAction,
  onDemoClick,
}: MenuItemCardProps) {
  const handleDemoClick = () => {
    if (onDemoClick) {
      onDemoClick();
    } else {
      console.log(`Demo clicked for: ${title}`);
    }
  };

  return (
    <div
      className={`relative bg-gradient-to-br from-[#f8f6f0] to-[#f3e9dd] border rounded-2xl shadow-lg p-8 transition-all duration-500 group cursor-pointer
        hover:-translate-y-3 hover:shadow-2xl hover:shadow-amber-200/20
        ${featured ? 'md:col-span-2 lg:col-span-1 xl:col-span-2 scale-105 border-2 ring-2 ring-amber-300/30' : 'border-brown-200'}
        transform-gpu will-change-transform`}
      style={{
        borderColor: featured ? '#d4af37' : '#8b4513',
        boxShadow: featured
          ? '0 12px 40px 0 rgba(212, 175, 55, 0.3), 0 4px 16px 0 rgba(111, 78, 55, 0.15)'
          : '0 6px 20px 0 rgba(60, 36, 20, 0.12)',
      }}
    >
      {featured && (
        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
          ⭐ POPULAR
        </div>
      )}
      
      <div className="flex justify-between items-start mb-6">
        <div className="relative">
          <span className="w-16 h-16 flex items-center justify-center rounded-full shadow-lg transition-all duration-500 group-hover:scale-125 group-hover:rotate-12"
            style={{ 
              background: `linear-gradient(135deg, ${color}, ${color}dd)`,
              boxShadow: `0 4px 16px ${color}40`
            }}>
            <span className="text-white text-2xl filter drop-shadow-sm">{icon}</span>
          </span>
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-sm"></div>
        </div>
        <span
          className="text-sm font-bold px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm border shadow-md transition-all duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:shadow-lg"
          style={{ color: '#6f4e37', borderColor: '#8b4513' }}
        >
          {price}
        </span>
      </div>
      
      <h3
        className="font-caveat text-3xl mb-4 font-bold text-[#3c2414] group-hover:text-[#2d1b0f] transition-colors duration-300"
        style={{ transform: 'rotate(-1deg)' }}
      >
        {title}
      </h3>
      
      <div className="font-inter text-base text-[#5d4037] mb-6 leading-relaxed">
        {description}
      </div>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}cc)`,
              color: '#fff',
              boxShadow: `0 2px 8px ${color}30`,
            }}
          >
            {tag}
          </span>
        ))}
      </div>
      
      {demoAction && (
        <button
          onClick={handleDemoClick}
          className="w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}dd)`,
            boxShadow: `0 4px 16px ${color}40`,
          }}
        >
          {demoAction} →
        </button>
      )}
      
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-amber-300 to-transparent rounded-full blur-2xl"></div>
        <div className="absolute bottom-4 left-4 w-24 h-24 bg-gradient-to-tr from-amber-200 to-transparent rounded-full blur-xl"></div>
      </div>
    </div>
  );
} 