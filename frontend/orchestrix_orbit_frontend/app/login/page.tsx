// app/login/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTenant } from "@/context/TenantContext";

/* ── Styles ──────────────────────────────────────────────────────────────── */
const S = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(160deg, #ffffff 0%, #f0f6ff 55%, #dce8f5 100%)",
    padding: "24px",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    position: "relative" as const,
    overflow: "hidden",
  },
  /* Decorative background orbs */
  orbBg1: {
    position: "absolute" as const,
    top: "-120px",
    right: "-120px",
    width: "480px",
    height: "480px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(26,95,168,0.07) 0%, transparent 70%)",
    pointerEvents: "none" as const,
  },
  orbBg2: {
    position: "absolute" as const,
    bottom: "-80px",
    left: "-80px",
    width: "360px",
    height: "360px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(10,34,64,0.05) 0%, transparent 70%)",
    pointerEvents: "none" as const,
  },
  card: {
    position: "relative" as const,
    zIndex: 2,
    background: "#ffffff",
    border: "1px solid var(--border, #d0dded)",
    borderRadius: "var(--radius, 12px)",
    boxShadow: "0 8px 40px rgba(10, 34, 64, 0.10), 0 1px 4px rgba(10,34,64,0.06)",
    padding: "48px 44px 40px",
    width: "100%",
    maxWidth: "440px",
    animation: "fadeUp 0.5s ease both",
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "8px",
    textDecoration: "none",
    color: "var(--navy-900, #0a2240)",
  },
  logoText: {
    fontWeight: 700,
    fontSize: "20px",
    letterSpacing: "-0.3px",
    color: "var(--navy-900, #0a2240)",
  },
  tagline: {
    textAlign: "center" as const,
    fontSize: "13px",
    color: "var(--text-muted, #4a6080)",
    marginBottom: "32px",
    letterSpacing: "0.01em",
  },
  divider: {
    height: "1px",
    background: "var(--border, #d0dded)",
    marginBottom: "28px",
  },
  heading: {
    fontSize: "22px",
    fontWeight: 700,
    color: "var(--navy-900, #0a2240)",
    marginBottom: "6px",
    letterSpacing: "-0.3px",
  },
  subheading: {
    fontSize: "14px",
    color: "var(--text-muted, #4a6080)",
    marginBottom: "28px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
    marginBottom: "28px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--navy-900, #0a2240)",
    marginBottom: "7px",
    letterSpacing: "0.01em",
  },
  inputWrap: {
    position: "relative" as const,
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    fontSize: "15px",
    color: "var(--text-main, #0a2240)",
    background: "#f8fafd",
    border: "1.5px solid var(--border, #d0dded)",
    borderRadius: "var(--radius-sm, 8px)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "inherit",
    boxSizing: "border-box" as const,
  },
  hint: {
    fontSize: "12px",
    color: "var(--text-muted, #4a6080)",
    marginTop: "5px",
  },
  btnPrimary: {
    width: "100%",
    padding: "13px",
    background: "var(--navy-900, #0a2240)",
    color: "#ffffff",
    border: "none",
    borderRadius: "var(--radius-sm, 8px)",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s, transform 0.15s, box-shadow 0.2s",
    letterSpacing: "0.01em",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontFamily: "inherit",
  },
  error: {
    background: "#fff0f0",
    border: "1px solid #fca5a5",
    borderRadius: "var(--radius-sm, 8px)",
    color: "#b91c1c",
    fontSize: "13px",
    padding: "10px 14px",
    marginBottom: "20px",
  },
  footer: {
    marginTop: "24px",
    textAlign: "center" as const,
    fontSize: "13px",
    color: "var(--text-muted, #4a6080)",
  },
  footerLink: {
    color: "var(--navy-500, #1a5fa8)",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
  },
};

/* ── Orbit Icon SVG (matches homepage navbar exactly) ────────────────────── */
function OrbitIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="4" fill="var(--navy-900, #0a2240)" />
      <ellipse
        cx="14" cy="14" rx="13" ry="5.5"
        stroke="var(--navy-700, #0d3b6e)" strokeWidth="1.8" fill="none"
      />
      <ellipse
        cx="14" cy="14" rx="13" ry="5.5"
        stroke="var(--navy-500, #1a5fa8)" strokeWidth="1.8" fill="none"
        transform="rotate(60 14 14)" opacity="0.6"
      />
      <ellipse
        cx="14" cy="14" rx="13" ry="5.5"
        stroke="var(--navy-500, #1a5fa8)" strokeWidth="1.8" fill="none"
        transform="rotate(120 14 14)" opacity="0.4"
      />
    </svg>
  );
}

/* ── Loading Spinner ─────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <svg
      width="18" height="18" viewBox="0 0 18 18" fill="none"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <circle cx="9" cy="9" r="7" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
      <path d="M9 2a7 7 0 0 1 7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

/* ── Login Page ──────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const { setTenantSlug } = useTenant();

  const [tenantSlug, setTenantSlugField] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* Focus styles applied via JS (avoids :focus pseudo-class in inline styles) */
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "var(--navy-500, #1a5fa8)";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(26,95,168,0.12)";
    e.currentTarget.style.background = "#ffffff";
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "var(--border, #d0dded)";
    e.currentTarget.style.boxShadow = "none";
    e.currentTarget.style.background = "#f8fafd";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    /* Basic client-side validation */
    if (!tenantSlug.trim()) {
      setError("Tenant slug is required.");
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    // TODO: Replace mock login with real API call to POST /api/auth/login
    // Real implementation should look like:
    //
    // try {
    //   const data = await api.post<{ token: string }>("/api/auth/login", {
    //     tenantSlug: tenantSlug.trim(),
    //     email,
    //     password,
    //   });
    //   router.push("/projects");
    // } catch (err) {
    //   setError(err instanceof Error ? err.message : "Login failed.");
    //   setLoading(false);
    // }

    /* ── MOCK: simulate network delay, then navigate ── */
    await new Promise((resolve) => setTimeout(resolve, 900));

    // Persist slug in context + localStorage (TenantContext handles localStorage write)
    setTenantSlug(tenantSlug.trim());

    // Persist a mock token so api.ts sends Authorization headers immediately
    localStorage.setItem("authToken", "mock-jwt-token");

    router.push("/projects");
  };

  return (
    <>
      {/* Inject fadeUp keyframe (globals.css already has it, but kept as fallback) */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <main style={S.page}>
        {/* Decorative background orbs */}
        <div style={S.orbBg1} />
        <div style={S.orbBg2} />

        <div style={S.card}>
          {/* ── Logo ── */}
          <Link href="/" style={{ ...S.logoWrap, textDecoration: "none" }}>
            <OrbitIcon size={32} />
            <span style={S.logoText}>
              Orchestrix&nbsp;<span style={{ color: "var(--navy-700, #0d3b6e)" }}>ORBIT</span>
            </span>
          </Link>

          <p style={S.tagline}>Privacy-Preserving Research Collaboration</p>

          <div style={S.divider} />

          {/* ── Heading ── */}
          <h1 style={S.heading}>Welcome back</h1>
          <p style={S.subheading}>Sign in to your organisation's workspace.</p>

          {/* ── Error Banner ── */}
          {error && <div style={S.error} role="alert">{error}</div>}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} noValidate>
            <div style={S.fieldGroup}>
              {/* Tenant Slug */}
              <div>
                <label htmlFor="login-tenant-slug" style={S.label}>
                  Tenant Slug
                </label>
                <div style={S.inputWrap}>
                  <input
                    id="login-tenant-slug"
                    type="text"
                    placeholder="e.g. acme"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlugField(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={S.input}
                    autoComplete="organization"
                    disabled={loading}
                    required
                  />
                </div>
                <p style={S.hint}>Your organisation's unique identifier (sets X-Tenant-ID).</p>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="login-email" style={S.label}>
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@organisation.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={S.input}
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="login-password" style={S.label}>
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={S.input}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              style={S.btnPrimary}
              disabled={loading}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = "var(--navy-700, #0d3b6e)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(10,34,64,0.22)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--navy-900, #0a2240)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {loading ? (
                <>
                  <Spinner />
                  Signing in…
                </>
              ) : (
                "Sign in →"
              )}
            </button>
          </form>

          {/* ── Footer ── */}
          <p style={S.footer}>
            <Link href="/" style={S.footerLink}>
              ← Back to homepage
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
