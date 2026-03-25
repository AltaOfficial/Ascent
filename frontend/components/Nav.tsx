"use client";

import { useEffect, useState } from "react";

const navLinks = [
  { label: "Features",   href: "features" },
  { label: "Ranks",      href: "ranks" },
  { label: "Compliance", href: "compliance" },
  { label: "Advisor",    href: "advisor" },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  function handleNavLink(href: string) {
    setMenuOpen(false);
    scrollTo(href);
  }

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 px-6 md:px-15 py-5 flex items-center justify-between transition-all duration-300 ${
          scrolled || menuOpen
            ? "border-b backdrop-blur-md bg-bg/90"
            : "border-b border-transparent bg-transparent"
        }`}
        style={scrolled || menuOpen ? { borderColor: "var(--border)" } : undefined}
      >
        <div className="flex items-center gap-2.5 font-display text-[15px] font-bold tracking-[0.01em] text-text-primary">
          <img src="/logo.svg" alt="Ascent" className="w-5 h-5" />
          Ascent
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-[12px] text-text-secondary tracking-[0.04em] cursor-pointer hover:text-text-mid transition-colors duration-150 bg-transparent border-none"
            >
              {link.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => scrollTo("waitlist")}
            className="hidden md:block bg-text-primary text-bg font-mono text-[11px] font-medium px-5 py-2 rounded-[6px] border-none cursor-pointer tracking-[0.04em] hover:opacity-90 transition-opacity"
          >
            Get Early Access
          </button>

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden flex flex-col gap-1.5 bg-transparent border-none cursor-pointer p-1"
            aria-label="Toggle menu"
          >
            <span
              className="block w-5 h-px transition-all duration-300"
              style={{
                background: "var(--text-secondary)",
                transform: menuOpen ? "translateY(5px) rotate(45deg)" : "none",
              }}
            />
            <span
              className="block w-5 h-px transition-all duration-300"
              style={{
                background: "var(--text-secondary)",
                opacity: menuOpen ? 0 : 1,
              }}
            />
            <span
              className="block w-5 h-px transition-all duration-300"
              style={{
                background: "var(--text-secondary)",
                transform: menuOpen ? "translateY(-5px) rotate(-45deg)" : "none",
              }}
            />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="fixed top-[61px] left-0 right-0 z-40 flex flex-col px-6 py-6 gap-5 border-b md:hidden"
          style={{ background: "var(--bg)", borderColor: "var(--border)" }}
        >
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNavLink(link.href)}
              className="text-left text-[14px] text-text-secondary tracking-[0.04em] bg-transparent border-none cursor-pointer hover:text-text-mid transition-colors"
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => handleNavLink("waitlist")}
            className="mt-2 bg-text-primary text-bg font-mono text-[12px] font-medium px-5 py-3 rounded-[6px] border-none cursor-pointer tracking-[0.04em] hover:opacity-90 transition-opacity text-center"
          >
            Get Early Access
          </button>
        </div>
      )}
    </>
  );
}
