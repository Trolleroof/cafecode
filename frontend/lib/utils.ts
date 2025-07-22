import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const backendUrl = process.env.NEXT_PUBLIC_USE_LOCALHOST === 'true'
'https://v2-bolt-hackathon.onrender.com/api';

//  ? 'http://localhost:8000/api'
