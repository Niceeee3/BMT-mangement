"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Trophy,
  Calendar,
  CreditCard,
  Users,
  Database,
  RefreshCw,
  LogOut,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  Power,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ==========================================
// 1. TypeScript Interfaces (5 ตารางหลัก)
// ==========================================
interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: "customer" | "admin";
  created_at: string;
}

interface Court {
  id: string;
  name: string;
  surface_type: string;
  hourly_rate: number;
  is_active: boolean;
  created_at?: string;
}

interface Booking {
  id: string;
  user_id: string;
  court_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  total_amount: number;
  created_at?: string;
}

interface EquipmentRental {
  id: string;
  booking_id: string;
  item_name: string;
  item_type: "rental" | "purchase";
  quantity: number;
  unit_price: number;
  subtotal?: number;
}

interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  method: "promptpay" | "credit_card" | "cash";
  status: "unpaid" | "paid" | "refunded";
  paid_at?: string | null;
  created_at?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  // Auth & Guard States
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null);

  // Navigation Tab
  const [activeTab, setActiveTab] = useState<"bookings" | "courts" | "users" | "db_inspector">("bookings");

  // 5-Table States
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [equipmentRentals, setEquipmentRentals] = useState<EquipmentRental[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // UI Feedback States
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form States: เพิ่มสนามใหม่
  const [newCourtName, setNewCourtName] = useState<string>("");
  const [newSurfaceType, setNewSurfaceType] = useState<string>("ยางสังเคราะห์มาตรฐาน BWF");
  const [newHourlyRate, setNewHourlyRate] = useState<string>("180");
  const [addingCourt, setAddingCourt] = useState<boolean>(false);

  // Form States: แก้ไขราคาสนาม
  const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
  const [editRateValue, setEditRateValue] = useState<string>("");

  // ==========================================
  // 2. ดึงข้อมูลทั้ง 5 ตาราง
  // ==========================================
  const fetchAllData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [
        { data: pData, error: pErr },
        { data: cData, error: cErr },
        { data: bData, error: bErr },
        { data: eData, error: eErr },
        { data: payData, error: payErr },
      ] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("courts").select("*").order("name", { ascending: true }),
        supabase.from("bookings").select("*").order("booking_date", { ascending: false }),
        supabase.from("equipment_rentals").select("*"),
        supabase.from("payments").select("*").order("created_at", { ascending: false }),
      ]);

      if (pErr) throw pErr;
      if (cErr) throw cErr;
      if (bErr) throw bErr;
      if (eErr) throw eErr;
      if (payErr) throw payErr;

      setProfiles((pData as Profile[]) || []);
      setCourts((cData as Court[]) || []);
      setBookings((bData as Booking[]) || []);
      setEquipmentRentals((eData as EquipmentRental[]) || []);
      setPayments((payData as Payment[]) || []);
    } catch (err: unknown) {
      const supaErr = err as { message?: string };
      setErrorMsg(
        supaErr?.message || (err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล")
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 3. ตรวจสอบสิทธิ์ Admin (Auth Guard)
  // ==========================================
  useEffect(() => {
    let isMounted = true;

    const verifyAdmin = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (!profile || profile.role !== "admin") {
        // ไม่ใช่ Admin -> ส่งกลับหน้า User ปกติ
        router.replace("/");
        return;
      }

      setAdminProfile(profile as Profile);
      await fetchAllData();
      if (isMounted) setCheckingAuth(false);
    };

    verifyAdmin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // ==========================================
  // 4. สรุปตัวเลขสถิติ (KPIs)
  // ==========================================
  const totalRevenue = useMemo(() => {
    return payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }, [payments]);

  const activeBookingsCount = useMemo(() => {
    return bookings.filter((b) => b.status === "confirmed" || b.status === "pending").length;
  }, [bookings]);

  const activeCourtsCount = useMemo(() => {
    return courts.filter((c) => c.is_active).length;
  }, [courts]);

  // ==========================================
  // 5. Actions จัดการ Bookings & Payments
  // ==========================================
  const handleUpdateBookingStatus = async (
    bookingId: string,
    newStatus: "pending" | "confirmed" | "cancelled" | "completed"
  ) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", bookingId);
      if (error) throw error;

      // ถ้ายกเลิกการจอง ให้ปรับสถานะ payment ที่จ่ายแล้วเป็น refunded อัตโนมัติ
      if (newStatus === "cancelled") {
        await supabase
          .from("payments")
          .update({ status: "refunded" })
          .eq("booking_id", bookingId)
          .eq("status", "paid");
      }

      setSuccessMsg(`อัปเดตสถานะการจองเป็น "${newStatus}" เรียบร้อยแล้ว`);
      await fetchAllData();
    } catch (err: unknown) {
      const supaErr = err as { message?: string };
      setErrorMsg(supaErr?.message || "ไม่สามารถอัปเดตสถานะการจองได้");
    }
  };

  const handleUpdatePaymentStatus = async (
    paymentId: string,
    newPayStatus: "unpaid" | "paid" | "refunded"
  ) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase
        .from("payments")
        .update({
          status: newPayStatus,
          paid_at: newPayStatus === "paid" ? new Date().toISOString() : null,
        })
        .eq("id", paymentId);
      if (error) throw error;

      setSuccessMsg(`อัปเดตสถานะการชำระเงินเป็น "${newPayStatus}" เรียบร้อยแล้ว`);
      await fetchAllData();
    } catch (err: unknown) {
      const supaErr = err as { message?: string };
      setErrorMsg(supaErr?.message || "ไม่สามารถอัปเดตสถานะการชำระเงินได้");
    }
  };

  // ==========================================
  // 6. Actions จัดการตาราง Courts
  // ==========================================
  const handleAddCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourtName.trim()) return;
    setAddingCourt(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase.from("courts").insert({
        name: newCourtName.trim(),
        surface_type: newSurfaceType.trim(),
        hourly_rate: Number(newHourlyRate) || 180,
        is_active: true,
      });
      if (error) throw error;

      setNewCourtName("");
      setSuccessMsg("เพิ่มสนามแบดมินตันใหม่เรียบร้อยแล้ว");
      await fetchAllData();
    } catch (err: unknown) {
      const supaErr = err as { message?: string };
      setErrorMsg(supaErr?.message || "ไม่สามารถเพิ่มสนามได้");
    } finally {
      setAddingCourt(false);
    }
  };

  const handleToggleCourtActive = async (court: Court) => {
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from("courts")
        .update({ is_active: !court.is_active })
        .eq("id", court.id);
      if (error) throw error;

      setSuccessMsg(
        `${!court.is_active ? "เปิดใช้งาน" : "ปิดปรับปรุง"} ${court.name} เรียบร้อยแล้ว`
      );
      await fetchAllData();
    } catch (err: unknown) {
      const supaErr = err as { message?: string };
      setErrorMsg(supaErr?.message || "ไม่สามารถเปลี่ยนสถานะสนามได้");
    }
  };

  const handleSaveCourtRate = async (courtId: string) => {
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from("courts")
        .update({ hourly_rate: Number(editRateValue) || 0 })
        .eq("id", courtId);
      if (error) throw error;

      setEditingCourtId(null);
      setSuccessMsg("อัปเดตราคาค่าสนามเรียบร้อยแล้ว");
      await fetchAllData();
    } catch (err: unknown) {
      const supaErr = err as { message?: string };
      setErrorMsg(supaErr?.message || "ไม่สามารถอัปเดตราคาได้");
    }
  };

  // ==========================================
  // 7. Actions จัดการสิทธิ์ผู้ใช้ (Profiles)
  // ==========================================
  const handleToggleUserRole = async (targetUser: Profile) => {
    if (targetUser.id === adminProfile?.id) {
      setErrorMsg("ไม่สามารถลดสิทธิ์บัญชี Admin ของตัวเองที่กำลังใช้งานอยู่ได้");
      return;
    }
    const nextRole = targetUser.role === "admin" ? "customer" : "admin";
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: nextRole })
        .eq("id", targetUser.id);
      if (error) throw error;

      setSuccessMsg(`เปลี่ยนสิทธิ์ของ ${targetUser.full_name} เป็น ${nextRole} เรียบร้อยแล้ว`);
      await fetchAllData();
    } catch (err: unknown) {
      const supaErr = err as { message?: string };
      setErrorMsg(supaErr?.message || "ไม่สามารถเปลี่ยนสิทธิ์ผู้ใช้งานได้");
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 text-amber-400 flex items-center justify-center text-sm">
        กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ (Admin)...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Admin Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">SmashCourt Admin</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500 text-slate-950">
                  Admin Panel
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ระบบจัดการสนาม การจอง การชำระเงิน และฐานข้อมูล 5 ตาราง
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-semibold text-white">
                {adminProfile?.full_name || "Administrator"}
              </div>
              <div className="text-[11px] text-amber-400">สิทธิ์ผู้ดูแลระบบ (admin)</div>
            </div>

            <button
              onClick={fetchAllData}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              ออกจากระบบ
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap gap-2 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab("bookings")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === "bookings"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            จัดการการจอง & ชำระเงิน ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab("courts")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === "courts"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Trophy className="w-4 h-4" />
            จัดการสนามแบด ({courts.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === "users"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            สมาชิกและสิทธิ์ ({profiles.length})
          </button>
          <button
            onClick={() => setActiveTab("db_inspector")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === "db_inspector"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Database className="w-4 h-4" />
            ฐานข้อมูล 5 ตาราง (Raw)
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">รายได้รวม (ชำระแล้ว)</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                ฿{totalRevenue.toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">รายการจองที่กำลังใช้งาน</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {activeBookingsCount} <span className="text-xs font-normal text-slate-500">/ {bookings.length}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">สนามที่เปิดให้บริการ</div>
              <div className="text-2xl font-bold text-sky-400 mt-1">
                {activeCourtsCount} <span className="text-xs font-normal text-slate-500">/ {courts.length}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400">
              <Trophy className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">ผู้ใช้งานทั้งหมด</div>
              <div className="text-2xl font-bold text-purple-400 mt-1">{profiles.length} คน</div>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <div>{errorMsg}</div>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* TAB 1: BOOKINGS & PAYMENTS */}
        {activeTab === "bookings" && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="font-semibold text-white">รายการจองสนามและการชำระเงินทั้งหมด</h2>
              <span className="text-xs text-slate-400">เชื่อมตาราง bookings + payments + equipment_rentals</span>
            </div>

            {bookings.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">ยังไม่มีรายการจองในระบบ</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/60 text-xs text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">วัน / เวลา</th>
                      <th className="px-5 py-3.5">สนาม & ผู้จอง</th>
                      <th className="px-5 py-3.5">อุปกรณ์เสริม</th>
                      <th className="px-5 py-3.5">ยอดรวม & การชำระเงิน</th>
                      <th className="px-5 py-3.5">สถานะการจอง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {bookings.map((b) => {
                      const court = courts.find((c) => c.id === b.court_id);
                      const user = profiles.find((p) => p.id === b.user_id);
                      const payment = payments.find((p) => p.booking_id === b.id);
                      const items = equipmentRentals.filter((eq) => eq.booking_id === b.id);

                      return (
                        <tr key={b.id} className="hover:bg-slate-800/30">
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="font-medium text-white">{b.booking_date}</div>
                            <div className="text-xs text-slate-400">
                              {b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-medium text-emerald-400">{court?.name || "-"}</div>
                            <div className="text-xs text-slate-300">
                              {user?.full_name || b.user_id}
                              {user?.phone ? ` (${user.phone})` : ""}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-300">
                            {items.length === 0 ? (
                              <span className="text-slate-500">- ไม่มี -</span>
                            ) : (
                              <ul className="space-y-0.5">
                                {items.map((it) => (
                                  <li key={it.id}>
                                    • {it.item_name} x{it.quantity}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-bold text-white">
                              ฿{Number(b.total_amount).toLocaleString()}
                            </div>
                            {payment ? (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[11px] text-slate-400">{payment.method}</span>
                                <select
                                  value={payment.status}
                                  onChange={(e) =>
                                    handleUpdatePaymentStatus(
                                      payment.id,
                                      e.target.value as "unpaid" | "paid" | "refunded"
                                    )
                                  }
                                  className={`text-xs rounded px-2 py-0.5 border bg-slate-950 ${
                                    payment.status === "paid"
                                      ? "border-emerald-500/40 text-emerald-400"
                                      : payment.status === "refunded"
                                      ? "border-rose-500/40 text-rose-400"
                                      : "border-amber-500/40 text-amber-400"
                                  }`}
                                >
                                  <option value="unpaid">unpaid</option>
                                  <option value="paid">paid</option>
                                  <option value="refunded">refunded</option>
                                </select>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">ไม่มีข้อมูลชำระเงิน</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <select
                              value={b.status}
                              onChange={(e) =>
                                handleUpdateBookingStatus(
                                  b.id,
                                  e.target.value as "pending" | "confirmed" | "cancelled" | "completed"
                                )
                              }
                              className={`text-xs font-medium rounded-lg px-2.5 py-1.5 border bg-slate-950 ${
                                b.status === "confirmed"
                                  ? "border-emerald-500/40 text-emerald-400"
                                  : b.status === "completed"
                                  ? "border-sky-500/40 text-sky-400"
                                  : b.status === "cancelled"
                                  ? "border-rose-500/40 text-rose-400"
                                  : "border-amber-500/40 text-amber-400"
                              }`}
                            >
                              <option value="pending">pending (รอดำเนินการ)</option>
                              <option value="confirmed">confirmed (ยืนยันแล้ว)</option>
                              <option value="completed">completed (เข้าใช้บริการแล้ว)</option>
                              <option value="cancelled">cancelled (ยกเลิก)</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COURTS MANAGEMENT */}
        {activeTab === "courts" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ฟอร์มเพิ่มสนามใหม่ */}
            <form
              onSubmit={handleAddCourt}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 h-fit"
            >
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                เพิ่มสนามแบดมินตันใหม่
              </h2>

              <div>
                <label className="block text-xs text-slate-400 mb-1">ชื่อสนาม</label>
                <input
                  type="text"
                  required
                  value={newCourtName}
                  onChange={(e) => setNewCourtName(e.target.value)}
                  placeholder="เช่น Court 5 - Pro Mat"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">ประเภทพื้นสนาม</label>
                <input
                  type="text"
                  required
                  value={newSurfaceType}
                  onChange={(e) => setNewSurfaceType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">ราคาต่อชั่วโมง (บาท)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={newHourlyRate}
                  onChange={(e) => setNewHourlyRate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={addingCourt}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition"
              >
                {addingCourt ? "กำลังบันทึก..." : "+ เพิ่มสนามเข้าสู่ระบบ"}
              </button>
            </form>

            {/* รายการสนามทั้งหมด */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courts.map((court) => {
                const isEditing = editingCourtId === court.id;
                return (
                  <div
                    key={court.id}
                    className={`p-5 rounded-2xl border space-y-4 ${
                      court.is_active
                        ? "bg-slate-900 border-slate-800"
                        : "bg-slate-900/50 border-rose-900/40 opacity-75"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-semibold text-white">{court.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{court.surface_type}</p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          court.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {court.is_active ? "เปิดให้บริการ" : "ปิดปรับปรุง"}
                      </span>
                    </div>

                    {/* แก้ไขราคาต่อชั่วโมง */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editRateValue}
                            onChange={(e) => setEditRateValue(e.target.value)}
                            className="w-24 bg-slate-800 border border-amber-500 rounded-lg px-2.5 py-1 text-sm text-white"
                          />
                          <button
                            onClick={() => handleSaveCourtRate(court.id)}
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            title="บันทึก"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingCourtId(null)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                            title="ยกเลิก"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-amber-400">
                            ฿{court.hourly_rate}
                          </span>
                          <span className="text-xs text-slate-400">/ ชม.</span>
                          <button
                            onClick={() => {
                              setEditingCourtId(court.id);
                              setEditRateValue(String(court.hourly_rate));
                            }}
                            className="p-1 text-slate-400 hover:text-white"
                            title="แก้ไขราคา"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => handleToggleCourtActive(court)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                          court.is_active
                            ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {court.is_active ? "ปิดสนาม" : "เปิดสนาม"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: USERS & ROLES */}
        {activeTab === "users" && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="font-semibold text-white">รายชื่อผู้ใช้งานและสิทธิ์ (ตาราง profiles)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-xs text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">ชื่อ-นามสกุล</th>
                    <th className="px-6 py-3.5">เบอร์โทรศัพท์</th>
                    <th className="px-6 py-3.5">สิทธิ์ (Role)</th>
                    <th className="px-6 py-3.5 text-right">จัดการสิทธิ์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {profiles.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-medium text-white">
                        {u.full_name}
                        {u.id === adminProfile?.id && (
                          <span className="ml-2 text-[11px] text-amber-400">(คุณ)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400">{u.phone || "-"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            u.role === "admin"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleUserRole(u)}
                          disabled={u.id === adminProfile?.id}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-slate-200 transition"
                        >
                          สลับเป็น {u.role === "admin" ? "customer" : "admin"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: RAW 5-TABLE INSPECTOR */}
        {activeTab === "db_inspector" && (
          <div className="space-y-6">
            {[
              { name: "1. profiles", rows: profiles },
              { name: "2. courts", rows: courts },
              { name: "3. bookings", rows: bookings },
              { name: "4. equipment_rentals", rows: equipmentRentals },
              { name: "5. payments", rows: payments },
            ].map((tbl) => (
              <div
                key={tbl.name}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden"
              >
                <div className="px-5 py-3 bg-slate-800/60 border-b border-slate-800 flex justify-between items-center">
                  <span className="font-mono text-sm font-semibold text-amber-400">
                    {tbl.name}
                  </span>
                  <span className="text-xs text-slate-400">{tbl.rows.length} rows</span>
                </div>
                <div className="p-4 overflow-x-auto">
                  <pre className="text-xs text-slate-300 font-mono">
                    {JSON.stringify(tbl.rows, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
