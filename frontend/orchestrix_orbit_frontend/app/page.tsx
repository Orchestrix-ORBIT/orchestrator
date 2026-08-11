"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

/* ── Inline styles (no Tailwind dependency for core layout) ───────────────── */
const S = {
  /* Nav */
  nav: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid var(--border)",
    transition: "box-shadow 0.3s",
  },
  navInner: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "0 24px",
    height: 68,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 700,
    fontSize: 18,
    color: "var(--navy-900)",
    letterSpacing: "-0.3px",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: 32,
  },
  navLink: {
    fontSize: 15,
    color: "var(--text-muted)",
    fontWeight: 500,
    transition: "color 0.2s",
    cursor: "pointer",
  },
  btnNavPrimary: {
    background: "var(--navy-900)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding: "9px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s, transform 0.15s",
  },

  /* Hero */
  hero: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(160deg, #ffffff 0%, #f0f6ff 55%, #dce8f5 100%)",
    padding: "120px 24px 80px",
    position: "relative" as const,
    overflow: "hidden",
  },
  heroContent: {
    maxWidth: 720,
    textAlign: "center" as const,
    position: "relative" as const,
    zIndex: 2,
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "var(--navy-100)",
    color: "var(--navy-700)",
    borderRadius: 100,
    padding: "6px 16px",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 28,
    border: "1px solid rgba(13,59,110,0.15)",
  },
  h1: {
    fontSize: "clamp(42px, 6vw, 68px)",
    fontWeight: 800,
    color: "var(--navy-900)",
    lineHeight: 1.1,
    letterSpacing: "-1.5px",
    marginBottom: 24,
  },
  heroAccent: {
    color: "var(--navy-700)",
    position: "relative" as const,
  },
  heroSub: {
    fontSize: 18,
    color: "var(--text-muted)",
    lineHeight: 1.7,
    maxWidth: 560,
    margin: "0 auto 40px",
  },
  heroCtas: {
    display: "flex",
    gap: 14,
    justifyContent: "center",
    flexWrap: "wrap" as const,
  },
  btnPrimary: {
    background: "var(--navy-900)",
    color: "#fff",
    border: "2px solid var(--navy-900)",
    borderRadius: "var(--radius-sm)",
    padding: "14px 32px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  btnSecondary: {
    background: "transparent",
    color: "var(--navy-900)",
    border: "2px solid var(--navy-900)",
    borderRadius: "var(--radius-sm)",
    padding: "14px 32px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },

  /* Floating decorative blobs */
  blob1: {
    position: "absolute" as const,
    width: 480,
    height: 480,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(13,59,110,0.07) 0%, transparent 70%)",
    top: "10%",
    right: "-8%",
    pointerEvents: "none" as const,
  },
  blob2: {
    position: "absolute" as const,
    width: 360,
    height: 360,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(10,34,64,0.05) 0%, transparent 70%)",
    bottom: "5%",
    left: "-5%",
    pointerEvents: "none" as const,
  },

  /* Stats strip */
  statsStrip: {
    background: "var(--navy-900)",
    padding: "28px 24px",
  },
  statsInner: {
    maxWidth: 1180,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-around",
    flexWrap: "wrap" as const,
    gap: 24,
  },
  statItem: {
    textAlign: "center" as const,
    color: "#fff",
  },
  statNum: {
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: "-1px",
    display: "block",
  },
  statLabel: {
    fontSize: 13,
    opacity: 0.65,
    fontWeight: 500,
    marginTop: 2,
  },

  /* Features */
  section: {
    padding: "96px 24px",
    background: "var(--white)",
  },
  sectionAlt: {
    padding: "96px 24px",
    background: "var(--off-white)",
  },
  sectionInner: {
    maxWidth: 1180,
    margin: "0 auto",
  },
  sectionTag: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "1.5px",
    color: "var(--navy-700)",
    textTransform: "uppercase" as const,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: "clamp(28px, 3.5vw, 40px)",
    fontWeight: 800,
    color: "var(--navy-900)",
    lineHeight: 1.15,
    letterSpacing: "-0.8px",
    marginBottom: 16,
  },
  sectionSub: {
    fontSize: 16,
    color: "var(--text-muted)",
    maxWidth: 520,
    lineHeight: 1.7,
    marginBottom: 56,
  },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 24,
  },
  featureCard: {
    background: "var(--white)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "32px 28px",
    boxShadow: "var(--shadow-sm)",
    transition: "transform 0.2s, box-shadow 0.2s",
    cursor: "default",
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: "var(--radius-sm)",
    background: "var(--navy-100)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    fontSize: 22,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: "var(--navy-900)",
    marginBottom: 10,
  },
  featureDesc: {
    fontSize: 14,
    color: "var(--text-muted)",
    lineHeight: 1.65,
  },

  /* How it works */
  howGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 0,
    position: "relative" as const,
  },
  howStep: {
    padding: "24px 28px",
    textAlign: "center" as const,
  },
  howNum: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "var(--navy-900)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  howTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "var(--navy-900)",
    marginBottom: 8,
  },
  howDesc: {
    fontSize: 13,
    color: "var(--text-muted)",
    lineHeight: 1.6,
  },

  /* CTA banner */
  ctaBanner: {
    background: "linear-gradient(135deg, var(--navy-900) 0%, var(--navy-700) 100%)",
    padding: "80px 24px",
    textAlign: "center" as const,
  },
  ctaTitle: {
    fontSize: "clamp(28px, 3.5vw, 40px)",
    fontWeight: 800,
    color: "#fff",
    marginBottom: 16,
    letterSpacing: "-0.8px",
  },
  ctaSub: {
    fontSize: 16,
    color: "rgba(255,255,255,0.72)",
    marginBottom: 36,
    maxWidth: 480,
    margin: "0 auto 36px",
    lineHeight: 1.7,
  },
  btnWhite: {
    background: "#fff",
    color: "var(--navy-900)",
    border: "2px solid #fff",
    borderRadius: "var(--radius-sm)",
    padding: "14px 32px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },

  /* Footer */
  footer: {
    background: "var(--navy-900)",
    color: "rgba(255,255,255,0.5)",
    padding: "32px 24px",
    textAlign: "center" as const,
    fontSize: 13,
  },
  footerInner: {
    maxWidth: 1180,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: 12,
  },
  footerLogo: {
    fontWeight: 700,
    color: "#fff",
    fontSize: 15,
  },
  footerLinks: {
    display: "flex",
    gap: 24,
  },
  footerLink: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    transition: "color 0.2s",
    cursor: "pointer",
  },
};

/* ── Feature data ─────────────────────────────────────────────────────────── */
const features = [
  {
    icon: "📁",
    title: "Project Management",
    desc: "Create and manage research projects with full visibility into timelines, milestones, and team assignments.",
  },
  {
    icon: "✅",
    title: "Task Orchestration",
    desc: "Break projects into granular tasks, assign priorities, set deadlines, and track status from TODO to DONE.",
  },
  {
    icon: "🗓️",
    title: "Resource Booking",
    desc: "Reserve shared lab equipment, rooms, or compute resources with conflict-free time-slot scheduling.",
  },
  {
    icon: "🤖",
    title: "AI Summaries",
    desc: "Automatically summarise research documents, extract action items, and surface deadline suggestions.",
  },
  {
    icon: "💬",
    title: "Encrypted Chat",
    desc: "End-to-end encrypted messaging per project — your research conversations stay private.",
  },
  {
    icon: "🔒",
    title: "Multi-Tenant Isolation",
    desc: "Every organisation gets its own isolated database schema. Zero cross-tenant data leakage, by design.",
  },
];

const steps = [
  { num: "01", title: "Register Your Organisation", desc: "Provision a tenant in seconds. Your own isolated schema is created automatically." },
  { num: "02", title: "Invite Your Team", desc: "Add researchers, assign roles, and set up research teams with a few clicks." },
  { num: "03", title: "Create Projects & Tasks", desc: "Structure your work into projects and break them down into actionable tasks." },
  { num: "04", title: "Let AI Help", desc: "Upload documents and let the Context Engine surface summaries and next steps." },
];

/* ── Component ────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav style={{ ...S.nav, boxShadow: scrolled ? "var(--shadow-md)" : "none" }}>
        <div style={S.navInner}>
          {/* Logo */}
          <Link href="/" style={S.logo}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="4" fill="var(--navy-900)" />
              <ellipse cx="14" cy="14" rx="13" ry="5.5" stroke="var(--navy-700)" strokeWidth="1.8" fill="none" />
              <ellipse cx="14" cy="14" rx="13" ry="5.5" stroke="var(--navy-500)" strokeWidth="1.8" fill="none"
                transform="rotate(60 14 14)" opacity="0.6" />
              <ellipse cx="14" cy="14" rx="13" ry="5.5" stroke="var(--navy-500)" strokeWidth="1.8" fill="none"
                transform="rotate(120 14 14)" opacity="0.4" />
            </svg>
            Orchestrix&nbsp;<span style={{ color: "var(--navy-700)" }}>ORBIT</span>
          </Link>

          {/* Links */}
          <div style={S.navLinks}>
            <a href="#features" style={S.navLink}>Features</a>
            <a href="#how-it-works" style={S.navLink}>How It Works</a>
            <Link href="/login" style={S.navLink}>Login</Link>
            <Link href="/login">
              <button
                id="nav-get-started"
                style={S.btnNavPrimary}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--navy-700)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--navy-900)")}
              >
                Get Started →
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section style={S.hero}>
        {/* Decorative blobs */}
        <div style={S.blob1} />
        <div style={S.blob2} />

        <div style={S.heroContent} className="animate-fade-up">
          {/* Eyebrow badge */}
          <div style={S.eyebrow}>
            <span>🔬</span> Built for Research Teams
          </div>

          {/* Headline */}
          <h1 style={S.h1}>
            Orchestrate Research.{" "}
            <span style={S.heroAccent}>Privately.</span>
          </h1>

          {/* Sub-headline */}
          <p style={S.heroSub}>
            A secure, multi-tenant platform for academic and research teams —
            manage projects, tasks, resources, and get AI-powered document
            summaries, all under one roof.
          </p>

          {/* CTAs */}
          <div style={S.heroCtas}>
            <Link href="/login">
              <button
                id="hero-start-trial"
                style={S.btnPrimary}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--navy-700)";
                  e.currentTarget.style.borderColor = "var(--navy-700)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--navy-900)";
                  e.currentTarget.style.borderColor = "var(--navy-900)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Get Started Free →
              </button>
            </Link>
            <a href="#features">
              <button
                id="hero-learn-more"
                style={S.btnSecondary}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--navy-100)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Explore Features
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ────────────────────────────────────────────────────── */}
      <div style={S.statsStrip}>
        <div style={S.statsInner}>
          {[
            { num: "100%", label: "Data Isolation per Organisation" },
            { num: "13",   label: "Tenant-scoped Database Tables" },
            { num: "3",    label: "Backend Microservices" },
            { num: "AI",   label: "Powered Document Summaries" },
          ].map((s) => (
            <div key={s.label} style={S.statItem}>
              <span style={S.statNum}>{s.num}</span>
              <span style={S.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" style={S.section}>
        <div style={S.sectionInner}>
          <p style={S.sectionTag}>Platform Features</p>
          <h2 style={S.sectionTitle}>Everything your research team needs</h2>
          <p style={S.sectionSub}>
            From project kick-off to AI-assisted document analysis — Orchestrix
            ORBIT keeps your entire team aligned and your data private.
          </p>

          <div style={S.featureGrid}>
            {features.map((f, i) => (
              <div
                key={f.title}
                id={`feature-card-${i}`}
                style={{
                  ...S.featureCard,
                  transform: hoveredCard === i ? "translateY(-6px)" : "translateY(0)",
                  boxShadow: hoveredCard === i ? "var(--shadow-md)" : "var(--shadow-sm)",
                  borderColor: hoveredCard === i ? "var(--navy-100)" : "var(--border)",
                }}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div style={S.featureIcon}>{f.icon}</div>
                <h3 style={S.featureTitle}>{f.title}</h3>
                <p style={S.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" style={S.sectionAlt}>
        <div style={S.sectionInner}>
          <p style={{ ...S.sectionTag, textAlign: "center" }}>How It Works</p>
          <h2 style={{ ...S.sectionTitle, textAlign: "center", marginBottom: 8 }}>
            Up and running in minutes
          </h2>
          <p style={{ ...S.sectionSub, textAlign: "center", margin: "0 auto 56px" }}>
            No complex setup. Provision your tenant, invite your team, and start
            orchestrating.
          </p>

          <div style={S.howGrid}>
            {steps.map((step, i) => (
              <div key={step.num} style={S.howStep}>
                <div style={S.howNum}>{i + 1}</div>
                <h3 style={S.howTitle}>{step.title}</h3>
                <p style={S.howDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────────────────── */}
      <section style={S.ctaBanner}>
        <h2 style={S.ctaTitle}>Ready to orchestrate your research?</h2>
        <p style={S.ctaSub}>
          Join research teams already using Orchestrix ORBIT to collaborate
          securely and efficiently.
        </p>
        <Link href="/login">
          <button
            id="cta-start-now"
            style={S.btnWhite}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--navy-100)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Start Now — It&apos;s Free
          </button>
        </Link>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={S.footer}>
        <div style={S.footerInner}>
          <span style={S.footerLogo}>Orchestrix ORBIT</span>
          <div style={S.footerLinks}>
            <a href="#features" style={S.footerLink}>Features</a>
            <a href="#how-it-works" style={S.footerLink}>How It Works</a>
            <Link href="/login" style={S.footerLink}>Login</Link>
          </div>
          <span>© {new Date().getFullYear()} Orchestrix ORBIT. Built for research teams.</span>
        </div>
      </footer>
    </>
  );
}
