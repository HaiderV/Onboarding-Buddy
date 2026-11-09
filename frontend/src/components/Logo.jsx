import React from "react";

/**
 * Onboarding Buddy mark.
 * A ring, a face, two eyes and a stand — drawn from scratch, not traced.
 *
 * variant="color"  brand green ring / dark face / cyan eyes  (default)
 * variant="mono"   single-colour outline, inherits currentColor
 */
export default function Logo({ size = 28, variant = "color", className = "", title }) {
    const mono = variant === "mono";
    const ring = mono ? "currentColor" : "var(--logo-ring, #2eb872)";
    const face = mono ? "none" : "var(--logo-face, #11171b)";
    const eye = mono ? "currentColor" : "var(--logo-eye, #37d3ea)";

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            className={className}
            role={title ? "img" : "presentation"}
            aria-label={title || undefined}
            aria-hidden={title ? undefined : "true"}
            style={{ display: "block", flex: "none" }}
        >
            {/* ring */}
            <circle cx="24" cy="21.5" r="17.5" stroke={ring} strokeWidth="4.6" />
            {/* face */}
            <circle cx="24" cy="21.5" r="13" fill={face} />
            {/* eyes */}
            <ellipse cx="18.9" cy="20.6" rx="2.9" ry="4.3" fill={eye} />
            <ellipse cx="29.1" cy="20.6" rx="2.9" ry="4.3" fill={eye} />
            {/* stand */}
            <path d="M17.6 43h12.8" stroke={ring} strokeWidth="3.1" strokeLinecap="round" />
        </svg>
    );
}
