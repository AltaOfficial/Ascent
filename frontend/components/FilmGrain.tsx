"use client";

import { usePathname } from "next/navigation";

export default function FilmGrain() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
        opacity: 0.025,
        pointerEvents: "none",
        zIndex: 1000,
      }}
    />
  );
}
