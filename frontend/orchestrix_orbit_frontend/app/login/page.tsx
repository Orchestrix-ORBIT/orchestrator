"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  Building2,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);

  // Sign In Form State
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  // Sign Up Form State (referencing user, tenant, department database schema fields)
  const [signUpData, setSignUpData] = useState({
    displayName: "",
    email: "",
    organization: "",
    department: "",
    role: "RESEARCHER",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    // Pure frontend simulation - navigate to researcher dashboard without backend connection
    router.push("/dashboard");
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    // Pure frontend simulation - navigate to researcher dashboard without backend connection
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen w-full bg-[#f8f9fa] flex flex-col justify-between items-center py-10 px-4">
      {/* Top Header Logo */}
      <div className="flex flex-col items-center mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[#111111] flex items-center justify-center text-white font-bold text-lg">
            O
          </div>
          <span className="text-2xl font-bold text-[#111111] tracking-tight">Orchestrix</span>
        </div>
        <p className="text-xs text-[#737373] font-medium">Privacy-Preserving Research Workspace</p>
      </div>

      {/* Main Form Card */}
      <div className="w-full max-w-[440px] bg-white border border-[#e5e5e5] rounded-xl shadow-xs p-6 sm:p-8">

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 bg-[#f4f4f5] p-1 rounded-lg mb-6 border border-[#e4e4e7]">
          <button
            type="button"
            onClick={() => setActiveTab("signin")}
            className={`py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === "signin"
                ? "bg-[#111111] text-white shadow-xs"
                : "text-[#737373] hover:text-black"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("signup")}
            className={`py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === "signup"
                ? "bg-[#111111] text-white shadow-xs"
                : "text-[#737373] hover:text-black"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Tab 1: SIGN IN FORM */}
        {activeTab === "signin" && (
          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#a3a3a3] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="researcher@university.edu"
                  value={signInData.email}
                  onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#d4d4d4] rounded-md text-sm text-black placeholder-[#a3a3a3] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider">
                  Password
                </label>
                <button type="button" className="text-xs text-[#737373] hover:text-black font-medium">
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#a3a3a3] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={signInData.password}
                  onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#d4d4d4] rounded-md text-sm text-black placeholder-[#a3a3a3] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a3a3a3] hover:text-black cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 my-1">
              <input
                type="checkbox"
                id="remember"
                checked={signInData.rememberMe}
                onChange={(e) => setSignInData({ ...signInData, rememberMe: e.target.checked })}
                className="w-4 h-4 rounded border-[#d4d4d4] text-black focus:ring-black accent-black cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs text-[#525252] cursor-pointer">
                Remember this session for 30 days
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#111111] hover:bg-[#262626] text-white text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 mt-2 shadow-xs cursor-pointer"
            >
              <span>Sign In to Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Tab 2: SIGN UP FORM */}
        {activeTab === "signup" && (
          <form onSubmit={handleSignUp} className="flex flex-col gap-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#a3a3a3] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Dr. Alex Morgan"
                  value={signUpData.displayName}
                  onChange={(e) => setSignUpData({ ...signUpData, displayName: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#d4d4d4] rounded-md text-sm text-black placeholder-[#a3a3a3] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#a3a3a3] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="a.morgan@lab.org"
                  value={signUpData.email}
                  onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#d4d4d4] rounded-md text-sm text-black placeholder-[#a3a3a3] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                />
              </div>
            </div>

            {/* Organization & Department */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1">
                  Organization / Lab
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#a3a3a3] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Alpha Centauri"
                    value={signUpData.organization}
                    onChange={(e) => setSignUpData({ ...signUpData, organization: e.target.value })}
                    className="w-full pl-9 pr-2 py-2 bg-white border border-[#d4d4d4] rounded-md text-xs text-black placeholder-[#a3a3a3] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1">
                  Department
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-[#a3a3a3] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Astrophysics"
                    value={signUpData.department}
                    onChange={(e) => setSignUpData({ ...signUpData, department: e.target.value })}
                    className="w-full pl-9 pr-2 py-2 bg-white border border-[#d4d4d4] rounded-md text-xs text-black placeholder-[#a3a3a3] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1">
                Research Role
              </label>
              <select
                value={signUpData.role}
                onChange={(e) => setSignUpData({ ...signUpData, role: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#d4d4d4] rounded-md text-xs text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors cursor-pointer"
              >
                <option value="RESEARCHER">Primary Researcher</option>
                <option value="LAB_LEAD">Principal Investigator / Lab Lead</option>
                <option value="STUDENT">Postdoc / Graduate Student</option>
                <option value="COLLABORATOR">External Collaborator</option>
              </select>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 chars"
                  value={signUpData.password}
                  onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#d4d4d4] rounded-md text-xs text-black placeholder-[#a3a3a3] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={signUpData.confirmPassword}
                  onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#d4d4d4] rounded-md text-xs text-black placeholder-[#a3a3a3] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                />
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-2 my-1">
              <input
                type="checkbox"
                id="terms"
                required
                checked={signUpData.agreeTerms}
                onChange={(e) => setSignUpData({ ...signUpData, agreeTerms: e.target.checked })}
                className="w-4 h-4 rounded border-[#d4d4d4] text-black focus:ring-black accent-black cursor-pointer mt-0.5"
              />
              <label htmlFor="terms" className="text-[11px] text-[#525252] leading-tight cursor-pointer">
                I agree to the Research Privacy Policy and Terms of Workspace Access.
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#111111] hover:bg-[#262626] text-white text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 mt-1 shadow-xs cursor-pointer"
            >
              <span>Create Researcher Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Encrypted Session Footer Notice */}
        <div className="mt-6 pt-4 border-t border-[#f0f0f0] flex items-center justify-center gap-1.5 text-[11px] text-[#737373]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#111111]" />
          <span>Zero-Trust Encrypted Session Active</span>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="text-[11px] text-[#a3a3a3] font-medium">
        © 2026 Orchestrix Research Workspace. All rights reserved.
      </div>
    </div>
  );
}
