import "../styles/ship.css";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ShipWorldBackground from "../components/ShipWorldBackground";
import ShipHeader from "./ShipHeader";
import ShipBottomNav from "./ShipBottomNav";

const ShipLayout = () => {
  const location = useLocation();

  return (
    <div className="relative min-h-[100dvh]">
      <ShipWorldBackground />

      <ShipHeader />

      <main
        className="ship-scroll relative z-10"
        style={{
          paddingTop: "var(--ship-header-height)",
          paddingBottom: "var(--ship-nav-height)",
          minHeight: "100dvh",
          overflowY: "auto",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <ShipBottomNav />
    </div>
  );
};

export default ShipLayout;
