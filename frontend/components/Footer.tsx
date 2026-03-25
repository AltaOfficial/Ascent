export default function Footer() {
  return (
    <footer className="border-t py-8 px-6 md:px-15 flex flex-col sm:flex-row items-center gap-4 sm:gap-0 justify-between" style={{ borderColor: "var(--border)" }}>
      <div className="flex-1 font-display font-semibold text-[13px] tracking-[0.01em] text-text-primary text-center sm:text-left">
        Ascent
      </div>
      <div className="flex-1 text-center text-[11px] text-text-secondary tracking-[0.04em]">
        Built for the operator mindset.
      </div>
      <div className="flex-1 flex justify-center sm:justify-end gap-6">
        {["Privacy", "Terms", "Contact"].map((link) => (
          <span
            key={link}
            className="text-[11px] text-text-secondary tracking-[0.04em] cursor-pointer hover:text-text-mid transition-colors duration-150"
          >
            {link}
          </span>
        ))}
      </div>
    </footer>
  );
}
