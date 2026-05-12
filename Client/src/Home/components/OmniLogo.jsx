import React from "react";

export default function OmniLogo({ size = 36, className = "" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      {/* Outer circle — olive/khaki fill with thick dark border */}
      <circle
        cx="50" cy="50" r="46"
        fill="#b8b862"
        stroke="#1c1200"
        strokeWidth="5"
      />

      {/* Large pink circle — upper-left quadrant */}
      <circle
        cx="40" cy="37"
        r="27"
        fill="#f0a8dc"
        stroke="#1c1200"
        strokeWidth="4"
      />

      {/* Medium teal circle — lower-center, overlaps pink */}
      <circle
        cx="53" cy="69"
        r="18"
        fill="#5ccfcf"
        stroke="#1c1200"
        strokeWidth="4"
      />

      {/* Small orange circle — right side */}
      <circle
        cx="76" cy="54"
        r="9"
        fill="#f5a865"
        stroke="#1c1200"
        strokeWidth="3.5"
      />
    </svg>
  );
}
