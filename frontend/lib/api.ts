// Simple API Configuration
// Default: Uses Render URL from .env
// Override: Set NEXT_PUBLIC_USE_LOCALHOST=true to use localhost

const RENDER_URL = 'https://cafecode-backend.onrender.com/api';
const LOCALHOST_URL = 'http://localhost:8000/api';

// Simple override: set NEXT_PUBLIC_USE_LOCALHOST=true to use localhost
const useLocalhost = process.env.NEXT_PUBLIC_USE_LOCALHOST === 'true';

export const getApiBaseUrl = (): string => {
  return useLocalhost ? LOCALHOST_URL : RENDER_URL;
};

// API utility functions
export const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  return fetch(url, { ...defaultOptions, ...options });
};

// Specific API functions for common operations
export const api = {
  // Code execution
  runCode: (data: any) => apiCall('/code/run', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  analyzeCode: (data: any) => apiCall('/code/analyze', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  fixCode: (data: any) => apiCall('/code/fix', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Python execution
  runPython: (data: any) => apiCall('/python/run', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Guided projects
  startProject: (data: any) => apiCall('/guided/startProject', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  analyzeStep: (data: any) => apiCall('/guided/analyzeStep', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  simpleChat: (data: any) => apiCall('/guided/simple-chat', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  recap: (data: any) => apiCall('/guided/recap', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Hints
  getHint: (data: any) => apiCall('/hint', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Translation
  translate: (data: any) => apiCall('/translate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // LeetCode
  getAssignedProblems: () => apiCall('/leetcode/assigned'),
  
  getTestCases: (slug: string) => apiCall(`/leetcode/testcases?slug=${slug}`),
  
  startLeetCodeProblem: (data: any) => apiCall('/leetcode/startProblem', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  leetCodeChat: (data: any) => apiCall('/leetcode/chat', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  analyzeLeetCodeStep: (data: any) => apiCall('/leetcode/analyzeStep', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  getStructuredProblem: (slug: string) => apiCall(`/leetcode/problem/${slug}/structured`),
  
  generateSimilarProblem: (data: any) => apiCall('/leetcode/similar', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Tavus
  createTavusConversation: (data: any) => apiCall('/tavus/create-conversation', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  deleteTavusConversation: (conversationId: string) => apiCall(`/tavus/delete-conversation`, {
    method: 'DELETE',
    body: JSON.stringify({ conversation_id: conversationId }),
  }),
};

// Debug information
export const getApiInfo = () => ({
  baseUrl: getApiBaseUrl(),
  useLocalhost,
  environment: process.env.NODE_ENV,
});

// Log API configuration every time the page loads
if (typeof window !== 'undefined') {
  const baseUrl = getApiBaseUrl();
  const isLocalhost = baseUrl.includes('localhost');
  
  console.log('🌐 API URL:', baseUrl);
  console.log('🌐 Backend:', isLocalhost ? 'localhost:8000' : 'Render');
  console.log('🌐 Full Config:', getApiInfo());
} 