import React from 'react';

interface MenuItemCardProps {
  icon: React.ReactNode;
  title: string;
  price: string;
  tags: string[];
  description: React.ReactNode;
  color: string;
  featured?: boolean;
}

export default function MenuItemCard({
  icon,
  title,
  price,
  tags,
  description,
  color,
  featured = false,
}: MenuItemCardProps) {
  return (
    <div
      className={`relative bg-[#f8f6f0] border rounded-2xl shadow-lg p-8 transition-all duration-300 group
        hover:-translate-y-2 hover:shadow-2xl
        ${featured ? 'md:col-span-2 scale-105 border-2' : 'border-brown-200'}`}
      style={{
        borderColor: '#8b4513',
        boxShadow: featured
          ? '0 8px 32px 0 rgba(111, 78, 55, 0.25)'
          : '0 4px 16px 0 rgba(60, 36, 20, 0.10)',
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <span className="w-14 h-14 flex items-center justify-center rounded-full shadow-md transition-transform duration-300 group-hover:scale-110"
          style={{ background: typeof color === 'string' && color.startsWith('linear') ? '#6f4e37' : color }}>
          <span className="text-4xl">{icon}</span>
        </span>
        <span
          className="text-lg font-bold px-4 py-1 rounded-full bg-white border border-brown-300 shadow transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
          style={{ color: '#6f4e37', borderColor: '#8b4513' }}
        >
          {price}
        </span>
      </div>
      <h3
        className="font-caveat text-2xl mb-2"
        style={{ transform: 'rotate(-2deg)' }}
      >
        {title}
      </h3>
      <div className="font-inter text-base text-brown-900 mb-4">{description}</div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: typeof color === 'string' && color.startsWith('linear') ? '#6f4e37' : color,
              color: '#fff',
              opacity: 0.85,
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
} 