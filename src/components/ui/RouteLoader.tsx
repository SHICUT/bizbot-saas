"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function RouteLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5">
      <div className="h-full bg-primary animate-shimmer" style={{ width: "70%", backgroundSize: "200% 100%", background: "linear-gradient(90deg, var(--color-primary) 0%, #818cf8 50%, var(--color-primary) 100%)" }} />
    </div>
  );
}
