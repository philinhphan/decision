"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";

interface PaywallModalProps {
  onClose: () => void;
}

export function PaywallModal({ onClose }: PaywallModalProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="paywall-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          key="paywall-modal"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="bg-white text-black max-w-sm w-full p-8 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
          >
            <X size={16} />
          </button>

          <p className="text-xs tracking-[0.2em] text-gray-500 mb-6">ACCESS REQUIRED</p>

          <p className="text-sm leading-relaxed text-gray-700 mb-6">
            You have used your 3 free deliberations. Pay $1 to run one more debate.
          </p>

          <div className="border border-gray-200 p-4 mb-6">
            <div className="flex items-baseline justify-between">
              <span className="text-xs tracking-[0.15em] text-gray-500">ONE DEBATE</span>
              <span className="text-base font-medium">$1.00</span>
            </div>
          </div>

          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full bg-black text-white text-sm tracking-[0.1em] py-3 flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Redirecting...
              </>
            ) : (
              "Pay $1 to continue →"
            )}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
