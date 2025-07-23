import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const backendUrl = 'https://v2-bolt-hackathon.onrender.com/api';

//  ? 'http://localhost:8000/api'
