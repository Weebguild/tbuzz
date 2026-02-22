import { useState } from "react";
import { Button } from "@/components/ui/button";

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="flex items-center gap-4">
      <Button variant="outline" onClick={() => setCount((c) => c - 1)}>-</Button>
      <span className="text-lg font-semibold">{count}</span>
      <Button variant="outline" onClick={() => setCount((c) => c + 1)}>+</Button>
    </div>
  );
};

export default Counter;
