import { motion } from "framer-motion";

const ShipLogo = () => {
  return (
    <motion.div
      animate={{ opacity: [0.8, 1, 0.8] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="ship-logo">ship</span>
    </motion.div>
  );
};

export default ShipLogo;
