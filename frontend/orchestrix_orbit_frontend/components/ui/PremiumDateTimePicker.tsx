"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { format, parseISO, isValid } from "date-fns";
import { DayPicker } from "react-day-picker";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";
import "react-day-picker/dist/style.css";

interface PremiumDateTimePickerProps {
  label: string;
  value: string; // Expected format: YYYY-MM-DDThh:mm
  onChange: (value: string) => void;
  required?: boolean;
}

export function PremiumDateTimePicker({ label, value, onChange, required = false }: PremiumDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Parse initial state
  const initialDate = value ? parseISO(value) : undefined;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(isValid(initialDate) ? initialDate : undefined);
  
  const [hours, setHours] = useState(initialDate ? format(initialDate, "hh") : "12");
  const [minutes, setMinutes] = useState(initialDate ? format(initialDate, "mm") : "00");
  const [ampm, setAmpm] = useState<"AM" | "PM">(initialDate ? format(initialDate, "a") as "AM" | "PM" : "AM");

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sync external value changes
    if (value) {
      const parsed = parseISO(value);
      if (isValid(parsed)) {
        setSelectedDate(parsed);
        setHours(format(parsed, "hh"));
        setMinutes(format(parsed, "mm"));
        setAmpm(format(parsed, "a") as "AM" | "PM");
      }
    }
  }, [value]);

  useEffect(() => {
    // Auto-populate with current time when opened if empty
    if (isOpen && !selectedDate && !value) {
      const now = new Date();
      let nextMinutes = Math.ceil(now.getMinutes() / 15) * 15;
      if (nextMinutes === 60) {
        now.setHours(now.getHours() + 1);
        nextMinutes = 0;
      }
      now.setMinutes(nextMinutes);
      
      setSelectedDate(now);
      setHours(format(now, "hh"));
      setMinutes(format(now, "mm"));
      setAmpm(format(now, "a") as "AM" | "PM");
    }
  }, [isOpen, selectedDate, value]);

  useEffect(() => {
    // Close on click outside
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleApply = () => {
    if (!selectedDate) return;
    
    // Construct final date
    const finalDate = new Date(selectedDate);
    let hr = parseInt(hours, 10);
    if (ampm === "PM" && hr < 12) hr += 12;
    if (ampm === "AM" && hr === 12) hr = 0;
    
    finalDate.setHours(hr);
    finalDate.setMinutes(parseInt(minutes, 10));
    finalDate.setSeconds(0);
    finalDate.setMilliseconds(0);

    // Format for datetime-local: YYYY-MM-DDThh:mm
    const year = finalDate.getFullYear();
    const month = String(finalDate.getMonth() + 1).padStart(2, '0');
    const day = String(finalDate.getDate()).padStart(2, '0');
    const h = String(finalDate.getHours()).padStart(2, '0');
    const m = String(finalDate.getMinutes()).padStart(2, '0');
    
    onChange(`${year}-${month}-${day}T${h}:${m}`);
    setIsOpen(false);
  };

  const isPast = React.useMemo(() => {
    if (!selectedDate) return false;
    const finalDate = new Date(selectedDate);
    let hr = parseInt(hours, 10);
    if (ampm === "PM" && hr < 12) hr += 12;
    if (ampm === "AM" && hr === 12) hr = 0;
    
    finalDate.setHours(hr);
    finalDate.setMinutes(parseInt(minutes, 10));
    finalDate.setSeconds(0);
    finalDate.setMilliseconds(0);

    return finalDate.getTime() < new Date().getTime();
  }, [selectedDate, hours, minutes, ampm]);

  const displayValue = value && isValid(parseISO(value)) 
    ? format(parseISO(value), "MMM d, yyyy • h:mm a") 
    : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative" }} ref={wrapperRef}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase" }}>
        {label}
      </label>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          background: "#ffffff",
          cursor: "pointer",
          transition: "all 0.2s",
          boxShadow: isOpen ? "0 0 0 2px rgba(15, 23, 42, 0.1)" : "none",
          borderColor: isOpen ? "#0f172a" : "#cbd5e1"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CalendarIcon size={16} color="#64748b" />
          <span style={{ fontSize: 14, color: displayValue ? "#0f172a" : "#94a3b8", fontWeight: displayValue ? 600 : 400 }}>
            {displayValue || "Select date and time"}
          </span>
        </div>
        {displayValue && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setSelectedDate(undefined);
            }}
            style={{ padding: 4, marginRight: -4, color: "#94a3b8", display: "flex" }}
          >
            <X size={14} />
          </div>
        )}
      </div>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div 
            onClick={() => setIsOpen(false)}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.3)", backdropFilter: "blur(2px)" }}
          />
          <div style={{
            position: "relative",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 20,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            width: 320
          }}>
            <div style={{ padding: 16 }}>
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              showOutsideDays
              disabled={{ before: new Date() }}
              styles={{
                caption_label: { color: "#0f172a", fontWeight: 700, fontSize: 14 },
                weekday: { color: "#64748b", fontWeight: 600, fontSize: 12 },
                day: { padding: 4 },
                day_button: { borderRadius: 8, width: 36, height: 36, fontSize: 14, fontWeight: 500 },
                selected: { background: "#0f172a", color: "#ffffff", fontWeight: 700 },
                today: { color: "#2563eb", fontWeight: 700 },
              }}
              components={{
                Chevron: ({ orientation }) => orientation === "left" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />,
              }}
            />
          </div>
          
          <div style={{ background: "#f8fafc", padding: "16px", borderTop: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#475569" }}>
                <Clock size={16} />
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Time</span>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 8 }}>
              <select 
                value={hours} 
                onChange={(e) => setHours(e.target.value)}
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", outline: "none", fontSize: 14, fontWeight: 600, appearance: "none", textAlign: "center" }}
              >
                {Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#64748b", padding: "8px 0" }}>:</span>
              <select 
                value={minutes} 
                onChange={(e) => setMinutes(e.target.value)}
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", outline: "none", fontSize: 14, fontWeight: 600, appearance: "none", textAlign: "center" }}
              >
                {["00", "15", "30", "45"].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 8, padding: 2 }}>
                <button 
                  onClick={() => setAmpm("AM")} 
                  type="button"
                  style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: ampm === "AM" ? "#fff" : "transparent", color: ampm === "AM" ? "#0f172a" : "#64748b", fontWeight: 700, fontSize: 12, cursor: "pointer", boxShadow: ampm === "AM" ? "0 1px 2px rgba(0,0,0,0.1)" : "none" }}
                >AM</button>
                <button 
                  onClick={() => setAmpm("PM")} 
                  type="button"
                  style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: ampm === "PM" ? "#fff" : "transparent", color: ampm === "PM" ? "#0f172a" : "#64748b", fontWeight: 700, fontSize: 12, cursor: "pointer", boxShadow: ampm === "PM" ? "0 1px 2px rgba(0,0,0,0.1)" : "none" }}
                >PM</button>
              </div>
            </div>
          </div>
          
          <div style={{ padding: "12px 16px", background: "#fff", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {isPast && selectedDate ? (
              <span style={{ fontSize: 11, color: "#e11d48", fontWeight: 700 }}>Cannot select a past time</span>
            ) : (
              <span />
            )}
            <button 
              type="button"
              onClick={handleApply}
              disabled={!selectedDate || isPast}
              style={{
                background: selectedDate && !isPast ? "#0f172a" : "#cbd5e1",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: selectedDate && !isPast ? "pointer" : "not-allowed",
                transition: "all 0.2s"
              }}
            >
              Apply Date & Time
            </button>
          </div>
        </div>
        </div>,
        document.body
      )}
    </div>
  );
}
