import { useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SelfDestructWrapperProps {
  children: ReactNode;
  expiresAt?: string | null;
}

export function SelfDestructWrapper({ children, expiresAt }: SelfDestructWrapperProps) {
  const [alive, setAlive] = useState(true);

  useEffect(() => {
    if (!expiresAt) return;

    const check = () => {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        setAlive(false);
      }
    };

    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  // No expiry — render normally
  if (!expiresAt) return <>{children}</>;

  return (
    <AnimatePresence mode="sync">
      {alive && (
        <motion.div
          layout
          initial={{ opacity: 1, scale: 1, height: "auto" }}
          exit={{
            opacity: [1, 1, 0.8, 0],
            scale: [1, 1.02, 1.03, 0.95],
            x: [0, -2, 2, -1, 1, 0],
            filter: [
              "blur(0px) brightness(1)",
              "blur(0px) brightness(1.3)",
              "blur(2px) brightness(1.5)",
              "blur(8px) brightness(0.5)",
            ],
            height: 0,
            marginTop: 0,
            marginBottom: 0,
            paddingTop: 0,
            paddingBottom: 0,
          }}
          transition={{
            duration: 1.2,
            ease: [0.22, 1, 0.36, 1],
            height: { delay: 0.8, duration: 0.4, ease: "easeInOut" },
            x: { duration: 0.3, repeat: 2, repeatType: "mirror" },
          }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
