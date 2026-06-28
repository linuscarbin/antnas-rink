/**
 * Decorative floating isometric planes used as a background accent.
 * Purely visual; non-interactive and hidden from screen readers.
 */
export default function IsoDecor({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* Teal plane */}
      <div
        className="absolute -left-10 top-10 h-44 w-44 rounded-3xl opacity-60 blur-[1px]"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.72 0.13 184 / 0.55), oklch(0.72 0.13 184 / 0.1))",
          transform: "rotate(45deg) skewX(-12deg)",
        }}
      />
      {/* Ocean plane */}
      <div
        className="absolute right-6 top-24 h-56 w-56 rounded-3xl opacity-50 blur-[1px]"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.6 0.17 250 / 0.5), oklch(0.6 0.17 250 / 0.08))",
          transform: "rotate(45deg) skewX(-12deg)",
        }}
      />
      {/* Coral plane */}
      <div
        className="absolute left-1/3 -top-8 h-32 w-32 rounded-2xl opacity-55"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.7 0.18 25 / 0.5), oklch(0.7 0.18 25 / 0.08))",
          transform: "rotate(45deg) skewX(-12deg)",
        }}
      />
    </div>
  );
}
