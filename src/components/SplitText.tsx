'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export default function SplitText({ text, className = '', delay = 0 }: SplitTextProps) {
  const letters = Array.from(text);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: (customDelay: number) => ({
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
        delayChildren: customDelay,
      },
    }),
  };

  const letterVariants = {
    hidden: { y: 25, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        damping: 15,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.span
      className={`inline-block ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={delay}
    >
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          className="inline-block whitespace-pre"
          variants={letterVariants}
        >
          {letter}
        </motion.span>
      ))}
    </motion.span>
  );
}
