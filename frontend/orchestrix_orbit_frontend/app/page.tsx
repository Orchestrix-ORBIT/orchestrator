"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAuthData, getDashboardPath } from "@/lib/auth";

/*
 * HOW THE AUTH FLOW WORKS (teaching note):
 *
 * 1. User fills in email + password + organization slug and clicks Sign In
 * 2. We call POST http://localhost:8080/api/auth/login
 *    - Body: { email, password }
 *    - Header: X-Tenant-ID: <tenantSlug>  ← tells Spring Boot which org's DB schema to use
 * 3. Spring Boot validates credentials (BCrypt), returns JSON:
 *    { token: "eyJ...", email: "x@lab.com", role: "ROLE_MEMBER" }
 * 4. We save token + role + email + tenantSlug to localStorage
 * 5. lib/api.ts automatically reads localStorage and adds the headers on every future request
 * 6. getDashboardPath(role) picks the right URL based on the role
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type Tab = "signin" | "signup";

export default function Home() {
  const [tab, setTab] = useState<Tab>("signin");

  // Sign-in state
  const [siEmail, setSiEmail] = useState("");
  const [siPass, setSiPass] = useState("");
  const [siTenant, setSiTenant] = useState("");

  // Sign-up state
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPass, setSuPass] = useState("");
  const [suConf, setSuConf] = useState("");
  const [suTenant, setSuTenant] = useState("");

  // Shared UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  function changeTab(nextTab: Tab) {
    setTab(nextTab);
    setError(null);
  }

  /* ── Sign In ──────────────────────────────────────────────────────────── */
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      /*
       * Step 1: Call the Spring Boot login endpoint.
       * We use native fetch here (not lib/api.ts) because we don't have a token yet.
       * lib/api.ts is for authenticated calls — we need the token first to get in.
       *
       * The X-Tenant-ID header tells Spring Boot:
       * "Look up this user in the 'org_<tenantSlug>' PostgreSQL schema."
       */
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": siTenant.trim() || "myorg",
        },
        body: JSON.stringify({ email: siEmail.trim(), password: siPass }),
      });

      if (!res.ok) {
        if (res.status >= 500) {
          throw new Error("The service is temporarily unavailable. Please try again later.");
        }
        const msg = await res.text();
        throw new Error(msg || "Invalid credentials");
      }

      /*
       * Step 2: Parse the response.
       * Backend returns: { token: "eyJ...", email: "...", role: "ROLE_MEMBER" }
       */
      const data = await res.json() as { token: string; email: string; role: string; userId?: string };

      /*
       * Step 3: Save to localStorage.
       * From now on, lib/api.ts will read these and attach them to every request.
       */
      saveAuthData(data.token, data.role, data.email, siTenant.trim(), data.userId);

      /*
       * Step 4: Redirect based on role.
       * ROLE_ADMIN / ROLE_OWNER → /lead-dashboard
       * ROLE_MEMBER / ROLE_GUEST → /dashboard/researcher
       */
      const destPath = getDashboardPath(data.role, data.email);
      console.log(`[Auth] Logged in as ${data.email} with role: ${data.role} -> Navigating to: ${destPath}`);
      router.push(destPath);

    } catch (err: unknown) {
      let errorMessage = err instanceof Error ? err.message : "Sign in failed";
      if (errorMessage === "Failed to fetch") {
        errorMessage = "Cannot connect to the server. Please check your internet connection or try again later.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  /* ── Sign Up ──────────────────────────────────────────────────────────── */
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (suPass !== suConf) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": suTenant.trim(),
        },
        body: JSON.stringify({
          email: suEmail.trim(),
          password: suPass,
          displayName: suName.trim(),
        }),
      });

      if (!res.ok) {
        if (res.status >= 500) {
          throw new Error("The service is temporarily unavailable. Please try again later.");
        }
        const msg = await res.text();
        throw new Error(msg || "Registration failed");
      }

      // Registration succeeded — redirect to sign-in so user can log in
      changeTab("signin");
    } catch (err: unknown) {
      let errorMessage = err instanceof Error ? err.message : "Registration failed";
      if (errorMessage === "Failed to fetch") {
        errorMessage = "Cannot connect to the server. Please check your internet connection or try again later.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      
      {/* ── Enhanced Left Brand Panel ── */}
      <div style={s.brandPanel}>
        <div style={s.brandInner}>
          <div style={s.logoRow}>
            <div style={s.logoBox}>O</div>
            <span style={s.logoName}>Orchestrix ORBIT</span>
          </div>
          <p style={s.brandTagline}>
            Privacy-preserving research collaboration platform.
          </p>
          <div style={s.divider} />
          <p style={s.brandQuote}>
            &ldquo;Designed for research teams that need security without compromise.&rdquo;
          </p>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div style={s.formPanel}>
        {/* ── Main Auth Card ────────────────────────────────────────────────── */}
        <div style={s.authCard}>

          {/* Tabs */}
          <div style={s.tabRow} role="tablist" aria-label="Account access">
            <span
              aria-hidden="true"
              className="auth-tab-indicator"
              style={{ ...s.tabIndicator, transform: tab === "signup" ? "translateX(100%)" : "translateX(0)" }}
            />
            <button
              type="button"
              id="tab-signin"
              className="auth-tab-button"
              role="tab"
              aria-selected={tab === "signin"}
              aria-controls="form-signin"
              style={tab === "signin" ? s.tabOn : s.tabOff}
              onClick={() => changeTab("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              id="tab-signup"
              className="auth-tab-button"
              role="tab"
              aria-selected={tab === "signup"}
              aria-controls="form-signup"
              style={tab === "signup" ? s.tabOn : s.tabOff}
              onClick={() => changeTab("signup")}
            >
              Sign up
            </button>
          </div>

          {/* ── Sign in ── */}
          {tab === "signin" && (
            <form id="form-signin" role="tabpanel" aria-labelledby="tab-signin" className="auth-form-enter" onSubmit={handleSignIn} style={s.form}>
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <h1 style={s.heading}>Welcome back</h1>
                <p style={s.sub}>Sign in to continue to your workspace</p>
              </div>

              {error && (
                <div id="signin-error" style={s.errorBanner}>
                  {error}
                </div>
              )}

              <Field id="si-tenant" label="Organization" type="text"
                placeholder="your-org-slug"
                value={siTenant} onChange={setSiTenant} />

              <Field id="si-email" label="Email address" type="email"
                placeholder="you@institution.edu"
                value={siEmail} onChange={setSiEmail} />

              <Field id="si-password" label="Password" type="password"
                placeholder="Enter your password"
                value={siPass} onChange={setSiPass} />

              <button id="btn-signin" type="submit" style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}

          {/* ── Sign up ── */}
          {tab === "signup" && (
            <form id="form-signup" role="tabpanel" aria-labelledby="tab-signup" className="auth-form-enter" onSubmit={handleSignUp} style={s.form}>
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <h1 style={s.heading}>Create account</h1>
                <p style={s.sub}>Join your research workspace</p>
              </div>

              {error && (
                <div id="signup-error" style={s.errorBanner}>
                  {error}
                </div>
              )}

              <Field id="su-tenant" label="Organization" type="text"
                placeholder="your-org-slug"
                value={suTenant} onChange={setSuTenant} />

              <Field id="su-name" label="Full name" type="text"
                placeholder="Dr. Jane Smith"
                value={suName} onChange={setSuName} />

              <Field id="su-email" label="Email address" type="email"
                placeholder="you@institution.edu"
                value={suEmail} onChange={setSuEmail} />

              <Field id="su-password" label="Password" type="password"
                placeholder="Create a password"
                value={suPass} onChange={setSuPass} />

              <Field id="su-confirm" label="Confirm password" type="password"
                placeholder="Repeat your password"
                value={suConf} onChange={setSuConf} />

              <button id="btn-signup" type="submit" style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Reusable field ─────────────────────────────────────────────────────── */
function Field({
  id, label, type, placeholder, value, onChange,
}: {
  id: string; label: string; type: string;
  placeholder: string; value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={f.wrap}>
      <label htmlFor={id} style={f.label}>{label}</label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={f.input}
        required
      />
    </div>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "var(--font)",
    background: "#f9fafb",
  },
  
  /* Enhanced Left Brand Panel */
  brandPanel: {
    flex: "0 0 45%",
    background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 56px",
    position: "relative",
    overflow: "hidden",
  },
  brandInner: {
    maxWidth: 380,
    width: "100%",
    position: "relative",
    zIndex: 2,
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 40,
  },
  logoBox: {
    width: 36,
    height: 36,
    background: "#ffffff",
    color: "#111827",
    borderRadius: 8,
    display: "flex" as unknown as string,
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 18,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  },
  logoName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "-0.4px",
  },
  brandTagline: {
    color: "#9ca3af",
    fontSize: 16,
    lineHeight: 1.6,
    marginBottom: 40,
    fontWeight: 400,
  },
  divider: {
    height: 1,
    background: "rgba(255, 255, 255, 0.1)",
    marginBottom: 32,
  },
  brandQuote: {
    color: "#9ca3af",
    fontSize: 14,
    lineHeight: 1.7,
    fontStyle: "italic",
  },

  /* Right Form Panel */
  formPanel: {
    flex: 1,
    background: "#f9fafb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 40px",
  },
  authCard: {
    width: "100%",
    maxWidth: 440,
    background: "#ffffff",
    borderRadius: 16,
    padding: "48px 40px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
    border: "1px solid #f3f4f6",
  },
  errorBanner: {
    padding: "10px 14px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    fontSize: 13,
    color: "#dc2626",
    lineHeight: 1.5,
  },
  tabRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    position: "relative",
    padding: 4,
    background: "#f3f4f6",
    borderRadius: 10,
    marginBottom: 32,
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    width: "calc((100% - 8px) / 2)",
    background: "#ffffff",
    borderRadius: 8,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
  },
  tabOn: {
    position: "relative",
    zIndex: 1,
    padding: "10px 0",
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    background: "none",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    transition: "color 180ms ease",
  },
  tabOff: {
    position: "relative",
    zIndex: 1,
    padding: "10px 0",
    fontSize: 14,
    fontWeight: 500,
    color: "#6b7280",
    background: "none",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    transition: "color 180ms ease",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
    letterSpacing: "-0.5px",
    marginBottom: 4,
  },
  sub: {
    fontSize: 14,
    color: "#6b7280",
  },
  btnPrimary: {
    width: "100%",
    padding: "12px 0",
    background: "#111827",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 8,
    transition: "background 0.2s",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
};

const f: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
  },
  input: {
    padding: "12px 14px",
    fontSize: 14,
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#ffffff",
    color: "#111827",
    outline: "none",
    width: "100%",
    fontFamily: "var(--font)",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
};
