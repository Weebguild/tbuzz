import { useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SelfDestructWrapperProps {
  children: ReactNode;
  expiresAt?: string | null;
}

export function SelfDestructWrapper({ children, expiresAt }: SelfDestructWrapperProps) {
  const [alive, setAlive] = useState(() => {
    if (!expiresAt) return true;
    return new Date(expiresAt).getTime() > Date.now();
  });
  const [isShattering, setIsShattering] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const check = () => {
      const remaining = new Date(expiresAt).getTime() - Date.now();

      // TRIGGER PHASE 1: The Shatter (1 second before it dies)
      if (remaining <= 1000 && remaining > 0 && !isShattering) {
        setIsShattering(true);
      }

      // TRIGGER PHASE 2: Complete Removal
      if (remaining <= 0) {
        setAlive(false);
      }
    };

    check();
    const id = setInterval(check, 500); // Check faster for better accuracy
    return () => clearInterval(id);
  }, [expiresAt, isShattering]);

  if (!expiresAt) return <>{children}</>;

  return (
    <AnimatePresence mode="sync">
      {alive && (
        <motion.div
          layout
          className={isShattering ? "is-shattering" : ""}
          initial={{ opacity: 1, scale: 1, height: "auto" }}
          animate={{
            x: isShattering ? [-4, 4, -4, 4, 0] : 0, // Violent shake during shatter
            filter: isShattering ? "brightness(1.5)" : "brightness(1)",
          }}
          exit={{
            opacity: [1, 0.8, 0],
            scale: [1, 0.95, 0.8],
            filter: "blur(12px) brightness(0.2)",
            height: 0,
            marginTop: 0,
            marginBottom: 0,
            paddingTop: 0,
            paddingBottom: 0,
          }}
          transition={{
            duration: 0.6,
            height: { delay: 0.4, duration: 0.4, ease: "easeInOut" },
            x: { duration: 0.4 },
          }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
