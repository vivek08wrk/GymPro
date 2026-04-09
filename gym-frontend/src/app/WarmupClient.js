'use client';

import { useEffect } from 'react';

export default function WarmupClient() {
  useEffect(() => {
    // Check if warm-up already ran in this session
    const SESSION_KEY = 'backend_warmup_done';
    if (sessionStorage.getItem(SESSION_KEY)) {
      return;
    }

    // Warm up the backend
    const warmupBackend = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

      try {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://gym-backend-bykv.onrender.com/api').replace('/api', '');
        await fetch(`${baseUrl}/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        
        // Mark warm-up as done
        sessionStorage.setItem(SESSION_KEY, 'true');
      } catch (error) {
        // Fail silently - don't log or show errors
        // This includes network errors, timeouts, and JSON parse errors
      } finally {
        clearTimeout(timeoutId);
      }
    };

    warmupBackend();
  }, []); // Run only once on mount

  return null; // This component renders nothing
}
