"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "signin" | "signup";

export default function Home() {
  const [tab, setTab]           = useState<Tab>("signin");
  const [siEmail, setSiEmail]   = useState("");
  const [siPass, setSiPass]     = useState("");
  const [suName, setSuName]     = useState("");
  const [suEmail, setSuEmail]   = useState("");
  const [suPass, setSuPass]     = useState("");
  const [suConf, setSuConf]     = useState("");
  const router = useRouter();

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    // TODO: POST /api/auth/login → receive JWT → redirect to dashboard
    router.push("/dashboard");
  }

  function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    // TODO: POST /api/auth/register → redirect to sign-in
    setTab("signin");
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
              id="tab-signin"
              style={tab === "signin" ? s.tabOn : s.tabOff}
              onClick={() => setTab("signin")}
            >
              Sign in
            </button>
            <button
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

              <Field id="si-email" label="Email address" type="email"
                placeholder="you@institution.edu"
                value={siEmail} onChange={setSiEmail} />

              <Field id="si-password" label="Password" type="password"
                placeholder="Enter your password"
                value={siPass} onChange={setSiPass} />

              <button id="btn-signin" type="submit" style={s.btnPrimary}>
                Sign in
              </button>

              <p style={s.switchLine}>
                Don&apos;t have an account?{" "}
                <button type="button" id="switch-signup" style={s.switchBtn}
                  onClick={() => setTab("signup")}>
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

              <button id="btn-signup" type="submit" style={s.btnPrimary}>
                Create account
              </button>

              <p style={s.switchLine}>
                Already have an account?{" "}
                <button type="button" id="switch-signin" style={s.switchBtn}
                  onClick={() => setTab("signin")}>
                  Sign in
                </button>
              </p>
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

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "var(--font)",
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
