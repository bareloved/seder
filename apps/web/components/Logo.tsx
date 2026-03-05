import * as React from "react";

export function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Top Part */}
      <path
        d="M40 70 L100 20 L160 70"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M55 70 L100 32 L145 70"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M70 70 L100 44 L130 70"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Text */}
      <text
        x="100"
        y="115"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        fontSize="36"
        textAnchor="middle"
        fill="currentColor"
        letterSpacing="4"
      >
        SEDER
      </text>

      {/* Bottom Part */}
      <path
        d="M40 130 L100 180 L160 130"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M55 130 L100 168 L145 130"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M70 130 L100 156 L130 130"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}





