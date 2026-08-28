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
  const [tab, setTab]             = useState<Tab>("signin");

  // Sign-in state
  const [siEmail, setSiEmail]     = useState("");
  const [siPass, setSiPass]       = useState("");
  const [siTenant, setSiTenant]   = useState("");

  // Sign-up state
  const [suName, setSuName]       = useState("");
  const [suEmail, setSuEmail]     = useState("");
  const [suPass, setSuPass]       = useState("");
  const [suConf, setSuConf]       = useState("");
  const [suTenant, setSuTenant]   = useState("");

  // Shared UI state
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const router = useRouter();

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
        const msg = await res.text();
        throw new Error(msg || "Invalid credentials");
      }

      /*
       * Step 2: Parse the response.
       * Backend returns: { token: "eyJ...", email: "...", role: "ROLE_MEMBER" }
       */
      const data = await res.json() as { token: string; email: string; role: string };

      /*
       * Step 3: Save to localStorage.
       * From now on, lib/api.ts will read these and attach them to every request.
       */
      saveAuthData(data.token, data.role, data.email, siTenant.trim());

      /*
       * Step 4: Redirect based on role.
       * ROLE_ADMIN / ROLE_OWNER → /lead-dashboard
       * ROLE_MEMBER / ROLE_GUEST → /dashboard/researcher
       */
      const destPath = getDashboardPath(data.role, data.email);
      console.log(`[Auth] Logged in as ${data.email} with role: ${data.role} -> Navigating to: ${destPath}`);
      router.push(destPath);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
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
        const msg = await res.text();
        throw new Error(msg || "Registration failed");
      }

      // Registration succeeded — redirect to sign-in so user can log in
      setTab("signin");
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>

      {/* ── Left — brand panel ───────────────────────────────────────────── */}
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

      {/* ── Right — auth form ────────────────────────────────────────────── */}
      <div style={s.formPanel}>
        <div style={s.formBox}>

          {/* Tabs */}
          <div style={s.tabRow}>
            <button
              type="button"
              id="tab-signin"
              style={tab === "signin" ? s.tabOn : s.tabOff}
              onClick={() => setTab("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              id="tab-signup"
              style={tab === "signup" ? s.tabOn : s.tabOff}
              onClick={() => setTab("signup")}
            >
              Sign up
            </button>
          </div>

          {/* ── Sign in ── */}
          {tab === "signin" && (
            <form id="form-signin" onSubmit={handleSignIn} style={s.form}>
              <div>
                <h1 style={s.heading}>Welcome back</h1>
                <p style={s.sub}>Sign in to continue to your workspace</p>
              </div>

              {/* Error banner — shown if the API returns an error */}
              {error && (
                <div id="signin-error" style={s.errorBanner}>
                  {error}
                </div>
              )}

              {/*
               * Organization Slug — this becomes the X-Tenant-ID header.
               * It maps to a PostgreSQL schema (e.g. "research-lab" → schema "org_research-lab").
               * Users must know their org's slug to log in.
               */}
              <Field id="si-tenant" label="Organization" type="text"
                placeholder="your-org-slug"
                value={siTenant} onChange={setSiTenant} />

              <Field id="si-email" label="Email address" type="email"
                placeholder="you@institution.edu"
                value={siEmail} onChange={setSiEmail} />

              <Field id="si-password" label="Password" type="password"
                placeholder="Enter your password"
                value={siPass} onChange={setSiPass} />

              <button id="btn-signin" type="submit" style={{...s.btnPrimary, opacity: loading ? 0.6 : 1}} disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>

              <p style={s.switchLine}>
                Don&apos;t have an account?{" "}
                <button type="button" id="switch-signup" style={s.switchBtn}
                  onClick={() => { setTab("signup"); setError(null); }}>
                  Sign up
                </button>
              </p>
            </form>
          )}

          {/* ── Sign up ── */}
          {tab === "signup" && (
            <form id="form-signup" onSubmit={handleSignUp} style={s.form}>
              <div>
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

              <button id="btn-signup" type="submit" style={{...s.btnPrimary, opacity: loading ? 0.6 : 1}} disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </button>

              <p style={s.switchLine}>
                Already have an account?{" "}
                <button type="button" id="switch-signin" style={s.switchBtn}
                  onClick={() => { setTab("signin"); setError(null); }}>
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* ── Quick Role Switcher for sprint review ──────────────────── */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #eeeeee", display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#9e9e9e", letterSpacing: "0.6px", textTransform: "uppercase" }}>
              DEMO ROLE PORTALS
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                id="portal-researcher"
                onClick={() => router.push("/dashboard")}
                style={{
                  padding: "8px 10px",
                  background: "#ffffff",
                  border: "1px solid #d0d0d0",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#161616",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                🔬 Researcher Portal
              </button>
              <button
                type="button"
                id="portal-resource-manager"
                onClick={() => router.push("/resource-dashboard")}
                style={{
                  padding: "8px 10px",
                  background: "#161616",
                  border: "1px solid #161616",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#ffffff",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                ⚙️ Resource Manager
              </button>
            </div>
          </div>

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
  },

  /* Error banner — shown when sign-in or sign-up fails */
  errorBanner: {
    padding: "10px 14px",
    background: "#fff0f0",
    border: "1px solid #f5c6cb",
    borderRadius: 6,
    fontSize: 13,
    color: "#c62828",
    lineHeight: 1.5,
  },

  /* Left brand panel */
  brandPanel: {
    width: "42%",
    background: "#161616",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 56px",
  },
  brandInner: {
    maxWidth: 360,
    width: "100%",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
  },
  logoBox: {
    width: 36,
    height: 36,
    background: "#ffffff",
    color: "#161616",
    borderRadius: 6,
    display: "flex" as unknown as string,
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 16,
    flexShrink: 0,
  },
  logoName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: "-0.3px",
  },
  brandTagline: {
    color: "#aaaaaa",
    fontSize: 15,
    lineHeight: 1.65,
    marginBottom: 40,
  },
  divider: {
    height: 1,
    background: "#2e2e2e",
    marginBottom: 32,
  },
  brandQuote: {
    color: "#666666",
    fontSize: 13,
    lineHeight: 1.7,
    fontStyle: "italic",
  },

  /* Right form panel */
  formPanel: {
    flex: 1,
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 40px",
  },
  formBox: {
    width: "100%",
    maxWidth: 380,
  },

  /* Tabs */
  tabRow: {
    display: "flex",
    borderBottom: "2px solid #161616",
    marginBottom: 32,
  },
  tabOn: {
    flex: 1,
    padding: "10px 0",
    fontSize: 13,
    fontWeight: 700,
    color: "#161616",
    background: "none",
    border: "none",
    borderBottom: "2px solid #161616",
    marginBottom: -2,
    cursor: "pointer",
  },
  tabOff: {
    flex: 1,
    padding: "10px 0",
    fontSize: 13,
    fontWeight: 500,
    color: "#9e9e9e",
    background: "none",
    border: "none",
    cursor: "pointer",
  },

  /* Form */
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.4px",
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    color: "#888888",
  },
  btnPrimary: {
    width: "100%",
    padding: "12px 0",
    background: "#161616",
    color: "#ffffff",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
    letterSpacing: "0.1px",
  },
  switchLine: {
    fontSize: 13,
    color: "#888888",
    textAlign: "center" as const,
  },
  switchBtn: {
    background: "none",
    border: "none",
    fontSize: 13,
    fontWeight: 600,
    color: "#161616",
    cursor: "pointer",
    textDecoration: "underline",
    padding: 0,
  },
};

/* Field-level styles */
const f: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#161616",
    letterSpacing: "0.1px",
  },
  input: {
    padding: "10px 12px",
    fontSize: 14,
    border: "1.5px solid #161616",
    borderRadius: 6,
    background: "#ffffff",
    color: "#161616",
    outline: "none",
    width: "100%",
    fontFamily: "var(--font)",
  },
};
