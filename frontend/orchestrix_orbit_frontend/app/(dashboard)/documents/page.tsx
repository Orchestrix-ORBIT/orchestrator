"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useTenant } from "@/context/TenantContext";

const S = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "24px",
    height: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleGroup: {
    display: "flex",
    flexDirection: "column" as const,
  },
  title: {
    fontSize: "24px",
    fontWeight: 600,
    color: "var(--navy-900)",
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  subtitle: {
    fontSize: "13px",
    color: "var(--text-muted)",
    marginTop: "4px",
  },
  btnPrimary: {
    background: "var(--navy-900)",
    color: "var(--white)",
    border: "none",
    padding: "10px 20px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "background 0.2s ease",
  },
  searchBar: {
    padding: "10px 16px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    width: "300px",
    fontSize: "14px",
    outline: "none",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "24px",
  },
  card: {
    background: "var(--white)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    padding: "20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    boxShadow: "var(--shadow-sm)",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  iconBox: {
    width: "40px",
    height: "40px",
    borderRadius: "var(--radius-sm)",
    background: "var(--navy-100)",
    color: "var(--navy-900)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  docName: {
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--navy-900)",
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  docMeta: {
    fontSize: "12px",
    color: "var(--text-muted)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
    paddingTop: "12px",
    borderTop: "1px solid var(--border)",
  },
  tag: {
    background: "var(--off-white)",
    padding: "2px 8px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 500,
    border: "1px solid var(--border)",
  }
};

interface Document {
  id: string;
  name: string;
  type: string; // pdf, docx, txt
  sizeStr: string;
  updatedAt: string;
}

const MOCK_DOCS: Document[] = [
  { id: "d1", name: "Research_Proposal_v2.pdf", type: "pdf", sizeStr: "2.4 MB", updatedAt: "2026-08-12T14:30:00Z" },
  { id: "d2", name: "Lab_Safety_Guidelines.docx", type: "docx", sizeStr: "850 KB", updatedAt: "2026-08-10T09:00:00Z" },
  { id: "d3", name: "Experiment_Results_Data.csv", type: "csv", sizeStr: "12 MB", updatedAt: "2026-08-13T11:15:00Z" },
  { id: "d4", name: "Meeting_Minutes_Aug.txt", type: "txt", sizeStr: "12 KB", updatedAt: "2026-08-11T16:45:00Z" },
];

export default function DocumentsPage() {
  const { tenantSlug } = useTenant();
  const [docs, setDocs] = useState<Document[]>(MOCK_DOCS);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // API call would go here
  }, [tenantSlug]);

  const filteredDocs = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  const getIcon = (type: string) => {
    if (type === "pdf") return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    );
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    );
  };

  return (
    <div style={S.container} className="animate-fade-up">
      <header style={S.header}>
        <div style={S.titleGroup}>
          <h2 style={S.title}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Document Library
          </h2>
          <span style={S.subtitle}>Secure, version-controlled storage for research papers and data.</span>
        </div>

        <button style={S.btnPrimary}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Upload File
        </button>
      </header>

      <div>
        <input 
          type="text" 
          placeholder="Search documents..." 
          style={S.searchBar}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={S.grid}>
        {filteredDocs.map(doc => (
          <div 
            key={doc.id} 
            style={S.card}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "var(--shadow-md)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={S.iconBox}>
                {getIcon(doc.type)}
              </div>
              <div style={{ overflow: "hidden" }}>
                <h3 style={S.docName} title={doc.name}>{doc.name}</h3>
                <span style={S.tag}>{doc.type.toUpperCase()}</span>
              </div>
            </div>
            
            <div style={S.docMeta}>
              <span>{doc.sizeStr}</span>
              <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
