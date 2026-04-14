import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
  locationKey: string;
}

export function PageTransition({ children, locationKey }: PageTransitionProps) {
  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={locationKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className="flex-1 flex flex-col min-h-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
