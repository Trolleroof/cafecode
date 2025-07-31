import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Use the API rewrite from next.config.js - this will route to localhost in development
export const backendUrl = '/api';

// Old hardcoded URL (now using next.config.js rewrites):
// export const backendUrl = 'https://cafecode-bacend.fly.dev/api';
