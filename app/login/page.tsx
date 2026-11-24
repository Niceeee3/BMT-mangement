"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  User,
  ShieldAlert,
  Mail,
  Lock,
  Phone,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  // เลือกประเภทบัญชี: 'customer' (User ปกติ) หรือ 'admin' (ผู้ดูแลระบบ)
  const [portalRole, setPortalRole] = useState<"customer" | "admin">("customer");

  // โหมดฟอร์ม: 'login' หรือ 'signup' (Admin จะถูกบังคับเป็น 'login' เท่านั้น)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // Form Inputs
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  // UI States
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSelectPortal = (role: "customer" | "admin") => {
    setPortalRole(role);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (role === "admin") {
      setAuthMode("login");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // ==========================================
      // กรณีที่ 1: สมัครสมาชิก (เฉพาะ User ปกติเท่านั้น)
      // ==========================================
      if (authMode === "signup" && portalRole === "customer") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone,
            },
          },
        });

        if (error) throw error;

        let activeUser = data.user;
        if (!data.session) {
          const { data: autoLogin, error: autoLoginErr } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });
          if (autoLoginErr) throw autoLoginErr;
          activeUser = autoLogin.user;
        }

        if (activeUser) {
          const { error: upsertErr } = await supabase.from("profiles").upsert({
            id: activeUser.id,
            full_name: fullName || email.split("@")[0],
            phone: phone || null,
            role: "customer",
          });

          if (upsertErr) throw upsertErr;

          setSuccessMsg("สมัครสมาชิกและเข้าสู่ระบบสำเร็จ! กำลังพาไปหน้าจองสนาม...");
          setTimeout(() => {
            router.replace("/");
          }, 700);
        }
        return;
      }

      // ==========================================
      // กรณีที่ 2: เข้าสู่ระบบ (ทั้ง User ปกติ และ Admin)
      // ==========================================
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) throw signInError;
      if (!signInData.user) throw new Error("ไม่พบข้อมูลผู้ใช้งาน");

      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", signInData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        const fallbackName =
          (signInData.user.user_metadata?.full_name as string) ||
          signInData.user.email?.split("@")[0] ||
          "ผู้ใช้งาน";

        const { data: createdProfile, error: createErr } = await supabase
          .from("profiles")
          .upsert({
            id: signInData.user.id,
            full_name: fallbackName,
            role: "customer",
          })
          .select("role, full_name")
          .single();

        if (createErr) throw createErr;
        profile = createdProfile;
      }

      if (portalRole === "admin") {
        if (profile.role !== "admin") {
          await supabase.auth.signOut();
          throw new Error(
            "บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ (Admin) กรุณาเข้าสู่ระบบในโหมดผู้ใช้งานทั่วไป"
          );
        }
        setSuccessMsg(`ยินดีต้อนรับ Admin ${profile.full_name} กำลังเข้าสู่ระบบจัดการ...`);
        setTimeout(() => {
          router.replace("/admin");
        }, 700);
      } else {
        setSuccessMsg(`ยินดีต้อนรับคุณ ${profile.full_name} กำลังเข้าสู่หน้าจองสนาม...`);
        setTimeout(() => {
          router.replace("/");
        }, 700);
      }
    } catch (err: unknown) {
      const supaErr = err as { message?: string };
      setErrorMsg(
        supaErr?.message ||
          (err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-hidden">
      {/* ==========================================
          LAYER หลังสุด: ภาพพื้นหลัง + Fade Gradient Overlay
          ========================================== */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* เปลี่ยน src เป็น "/badminton-bg.jpg" ได้เลยหากวางรูปไว้ในโฟลเดอร์ public/ */}
        <img
          src="/badminton-bg1.jpg"
          alt="Badminton Court Background"
          className="w-full h-full object-cover object-center opacity-90 scale-105 blur-[1px]"
        />
        {/* ไล่เฉดมืดทับด้านบน-ล่างและขอบรอบด้านให้กลืนกับพื้นหลัง */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/65 to-slate-950/95" />
        <div
          className={`absolute inset-0 transition-colors duration-500 ${
            portalRole === "admin"
              ? "bg-radial from-amber-500/10 via-transparent to-slate-950/80"
              : "bg-radial from-emerald-500/10 via-transparent to-slate-950/80"
          }`}
        />
      </div>

      {/* ==========================================
          LAYER ด้านหน้า: กล่องฟอร์ม Login / Sign Up (Glassmorphism)
          ========================================== */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/85 backdrop-blur-md border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Trophy className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white">SmashCourt Booking</h1>
          <p className="text-xs text-slate-400">
            เลือกรูปแบบบัญชีเพื่อเข้าใช้งานระบบจองสนามแบดมินตัน
          </p>
        </div>

        {/* ตัวเลือกประเภทบัญชี: User ปกติ vs Admin */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
          <button
            type="button"
            onClick={() => handleSelectPortal("customer")}
            className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
              portalRole === "customer"
                ? "bg-emerald-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <User className="w-4 h-4" />
            ผู้ใช้งานทั่วไป
          </button>

          <button
            type="button"
            onClick={() => handleSelectPortal("admin")}
            className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
              portalRole === "admin"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            ผู้ดูแลระบบ (Admin)
          </button>
        </div>

        {/* ปุ่มสลับ Login / Sign Up (แสดงเฉพาะโหมด User ปกติเท่านั้น) */}
        {portalRole === "customer" ? (
          <div className="flex border-b border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setErrorMsg(null);
              }}
              className={`flex-1 pb-2.5 text-sm font-medium border-b-2 transition ${
                authMode === "login"
                  ? "border-emerald-400 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              เข้าสู่ระบบ (Login)
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setErrorMsg(null);
              }}
              className={`flex-1 pb-2.5 text-sm font-medium border-b-2 transition ${
                authMode === "signup"
                  ? "border-emerald-400 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              สมัครสมาชิก (Sign Up)
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
            <span>โหมดผู้ดูแลระบบเปิดให้เฉพาะเข้าสู่ระบบ (Login) เท่านั้น</span>
          </div>
        )}

        {/* แจ้งเตือน Error / Success */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ฟอร์มกรอกข้อมูล */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === "signup" && portalRole === "customer" && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">ชื่อ-นามสกุล</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="เช่น สมชาย ใจดี"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">เบอร์โทรศัพท์</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">อีเมล</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 ${
              portalRole === "admin"
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
            }`}
          >
            {authMode === "signup" && portalRole === "customer" ? (
              <>
                <UserPlus className="w-4 h-4" />
                {loading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                {loading
                  ? "กำลังตรวจสอบสิทธิ์..."
                  : portalRole === "admin"
                  ? "เข้าสู่ระบบผู้ดูแล (Admin Login)"
                  : "เข้าสู่ระบบ"}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
