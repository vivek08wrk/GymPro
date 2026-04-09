'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * LoginLoader Component
 */
export default function LoginLoader({ isVisible = false }) {
  const [statusMessage, setStatusMessage] = useState("Waking up server...");

  useEffect(() => {
    if (!isVisible) return;

    // Step 1: Immediately show waking message
    setStatusMessage("Waking up server...");

    // Step 2: After small delay → signing in
    const timer = setTimeout(() => {
      setStatusMessage("Signing you in securely...");
    }, 1200); // tu isko tweak kar sakta hai

    return () => clearTimeout(timer);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950"
    >
      {/* Blurred background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-500 opacity-10 blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyan-500 opacity-10 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.15, 0.1, 0.15] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1 }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          className="mb-8"
        >
          <motion.div
            animate={{ rotateY: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="text-6xl md:text-7xl inline-block"
          >
            💪
          </motion.div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 bg-clip-text text-transparent mb-2">
            Welcome Back!
          </h2>

          {/* 🔥 Dynamic message */}
          <p className="text-base md:text-lg text-slate-400 font-light">
            {statusMessage}
          </p>
        </motion.div>

        {/* Dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
          className="flex justify-center gap-3 mb-8"
        >
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400"
              animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: index * 0.15,
              }}
            />
          ))}
        </motion.div>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
          className="w-48 md:w-64 h-1.5 bg-slate-700 rounded-full overflow-hidden mx-auto"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.8, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}