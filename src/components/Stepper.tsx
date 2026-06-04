'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Play } from 'lucide-react';

export interface Step {
  title: string;
  description: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed
  status: 'idle' | 'loading' | 'success' | 'error';
  errorMessage?: string;
}

export default function Stepper({ steps, currentStep, status, errorMessage }: StepperProps) {
  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900/60 backdrop-blur-xl border border-violet-500/20 rounded-xl p-6 shadow-2xl relative overflow-hidden">
      {/* Background glow overlay */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 rounded-full blur-2xl" />

      <h3 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
        {status === 'loading' && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />}
        {status === 'success' && <Check className="w-5 h-5 text-emerald-400" />}
        {status === 'error' && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
        {status === 'loading' ? 'Ingestion Engine Running' : 'Repository Analysis'}
      </h3>

      <div className="space-y-6 relative">
        {/* Connection line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-slate-800" />
        
        {/* Dynamic completed line */}
        <motion.div 
          className="absolute left-[19px] top-2 w-[2px] bg-gradient-to-b from-cyan-400 to-violet-500"
          initial={{ height: 0 }}
          animate={{ 
            height: `${Math.min(100, (currentStep / (steps.length - 1)) * 100)}%` 
          }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{ maxHeight: 'calc(100% - 16px)' }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep || (idx === currentStep && status === 'success');
          const isActive = idx === currentStep && status === 'loading';
          const isPending = idx > currentStep;

          return (
            <div key={idx} className="flex gap-4 items-start relative z-10">
              {/* Icon / Circle */}
              <div className="relative flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {isCompleted ? (
                    <motion.div
                      key="completed"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    >
                      <Check className="w-5 h-5 text-emerald-400" />
                    </motion.div>
                  ) : isActive ? (
                    <motion.div
                      key="active"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center shadow-[0_0_12px_rgba(6,180,212,0.4)]"
                    >
                      <Loader2 className="w-5 h-5 text-cyan-300 animate-spin" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="pending"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500"
                    >
                      <span className="text-sm font-semibold">{idx + 1}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Step info */}
              <div className="flex-1 pt-1.5">
                <h4 className={`text-sm font-medium transition-colors duration-300 ${
                  isCompleted ? 'text-slate-200' : isActive ? 'text-cyan-300 font-semibold' : 'text-slate-500'
                }`}>
                  {step.title}
                </h4>
                <p className={`text-xs mt-0.5 transition-colors duration-300 ${
                  isCompleted || isActive ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {status === 'error' && errorMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center"
        >
          {errorMessage}
        </motion.div>
      )}
    </div>
  );
}
