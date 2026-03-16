import { motion } from "framer-motion";

interface ShipPortalTransitionProps {
  mode: "enter" | "exit";
  onComplete?: () => void;
  children: React.ReactNode;
}

const ShipPortalTransition = ({ mode, onComplete, children }: ShipPortalTransitionProps) => {
  if (mode === "enter") {
    return (
      <motion.div
        className="fixed inset-0 z-[100]"
        style={{ background: "#0D0D1A" }}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 28 }}
        onAnimationComplete={onComplete}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-[100]"
      initial={{ scale: 1, opacity: 1 }}
      animate={{ scale: 0.92, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 32 }}
      onAnimationComplete={onComplete}
    >
      {children}
    </motion.div>
  );
};

export default ShipPortalTransition;
