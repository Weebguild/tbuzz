import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import ShipLogo from "./ShipLogo";

const ShipHeader = () => {
  const navigate = useNavigate();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5"
      style={{
        height: "var(--ship-header-height)",
        background: "rgba(13,13,26,0.7)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <ShipLogo />

      <button
        onClick={() => navigate("/ship/profile")}
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <User className="h-4 w-4 text-white/60" />
      </button>
    </header>
  );
};

export default ShipHeader;
