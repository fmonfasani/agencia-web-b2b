import React from "react";

// Glasses SVG mark — the two "oo" in webshooks styled as nerd glasses
// with orange pupils. From the Claude Design handoff (Webshooks Logo.html).
const GlassesMark = ({
  stroke,
  size = 1,
}: {
  stroke: string;
  size?: number;
}) => (
  <svg
    width={64 * size}
    height={52 * size}
    viewBox="0 0 64 52"
    fill="none"
    aria-hidden="true"
    style={{ display: "block", flexShrink: 0 }}
  >
    <ellipse
      cx="15"
      cy="30"
      rx="13"
      ry="15"
      stroke={stroke}
      strokeWidth={3 / size}
      fill="none"
    />
    <ellipse
      cx="49"
      cy="30"
      rx="13"
      ry="15"
      stroke={stroke}
      strokeWidth={3 / size}
      fill="none"
    />
    <circle cx="15" cy="33" r="3.2" fill="#d98a3a" />
    <circle cx="49" cy="33" r="3.2" fill="#d98a3a" />
  </svg>
);

type LogoVariant = "wordmark" | "lockup" | "icon";
type LogoTheme = "light" | "dark";

interface WebshooksLogoProps {
  /**
   * wordmark — full text with inline glasses replacing the "oo"
   * lockup   — black square icon + text beside it (default for sidebars)
   * icon     — glasses icon only (for favicon-size use)
   */
  variant?: LogoVariant;
  theme?: LogoTheme;
  /** Base font size in px for the wordmark. Default 32. */
  fontSize?: number;
  className?: string;
}

export function WebshooksLogo({
  variant = "lockup",
  theme = "light",
  fontSize = 32,
  className,
}: WebshooksLogoProps) {
  const ink = theme === "dark" ? "#f3f1ea" : "#1a1917";
  const iconBg = theme === "dark" ? "#f3f1ea" : "#1a1917";
  const iconStroke = theme === "dark" ? "#1a1917" : "#f3f1ea";
  const glyphSize = fontSize / 56; // scale SVG relative to font size

  if (variant === "icon") {
    return (
      <div
        className={className}
        style={{
          width: fontSize * 0.85,
          height: fontSize * 0.85,
          borderRadius: fontSize * 0.18,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        aria-label="webshooks"
      >
        <GlassesMark stroke={iconStroke} size={glyphSize * 0.8} />
      </div>
    );
  }

  if (variant === "wordmark") {
    const svgScale = glyphSize * 0.78;
    return (
      <div
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          fontFamily:
            "var(--font-manrope), ui-sans-serif, system-ui, sans-serif",
          fontSize,
          fontWeight: 600,
          letterSpacing: "-0.04em",
          color: ink,
          lineHeight: 1,
          gap: 0,
        }}
        aria-label="webshooks."
      >
        <span>websh</span>
        <span
          style={{ display: "flex", alignItems: "center", margin: "0 1px" }}
        >
          <GlassesMark stroke={ink} size={svgScale} />
        </span>
        <span>
          ks<span style={{ color: "#d98a3a" }}>.</span>
        </span>
      </div>
    );
  }

  // lockup: icon box + wordmark text
  const iconSize = Math.round(fontSize * 0.9);
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: Math.round(fontSize * 0.38),
      }}
      aria-label="webshooks."
    >
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: Math.round(iconSize * 0.22),
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <GlassesMark stroke={iconStroke} size={(iconSize / 64) * 0.75} />
      </div>
      <span
        style={{
          fontFamily:
            "var(--font-manrope), ui-sans-serif, system-ui, sans-serif",
          fontSize,
          fontWeight: 600,
          letterSpacing: "-0.035em",
          color: ink,
          lineHeight: 1,
        }}
      >
        webshooks<span style={{ color: "#d98a3a" }}>.</span>
      </span>
    </div>
  );
}
