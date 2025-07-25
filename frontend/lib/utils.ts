import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const backendUrl = 'https://cafecode-bacend.fly.dev/api';

//  ? 'http://localhost:8000/api'
