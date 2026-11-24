"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  ShoppingBag,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Trophy,
  Plus,
  Minus,
  LogOut,
  Receipt,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ==========================================
// 1. TypeScript Interfaces
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

interface EquipmentCatalogItem {
  id: string;
  name: string;
  type: "rental" | "purchase";
  price: number;
}

// ==========================================
// 2. ข้อมูลตั้งต้น
// ==========================================
const EQUIPMENT_CATALOG: EquipmentCatalogItem[] = [
  { id: "eq-1", name: "เช่าไม้แบดมินตัน Yonex Astrox", type: "rental", price: 60 },
  { id: "eq-2", name: "เช่ารองเท้าแบดมินตัน", type: "rental", price: 80 },
  { id: "eq-3", name: "ลูกแบดขนไก่ (1 หลอด / 12 ลูก)", type: "purchase", price: 480 },
  { id: "eq-4", name: "ลูกแบดพลาสติก (3 ลูก)", type: "purchase", price: 120 },
  { id: "eq-5", name: "กริปพันด้ามไม้แบด", type: "purchase", price: 45 },
];

const TIME_SLOTS: string[] = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00",
];

const PAYMENT_METHOD_LABEL: Record<Payment["method"], string> = {
  promptpay: "PromptPay QR Code",
  credit_card: "บัตรเครดิต / เดบิต",
  cash: "เงินสดหน้าเคาน์เตอร์",
};

export default function BadmintonBookingPage() {
  const router = useRouter();

  // Auth & Guard States
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [activeUserId, setActiveUserId] = useState<string>("");

  // Active Tab (เหลือ 2 แท็บ: จองสนาม & รายการจองของฉัน)
  const [activeTab, setActiveTab] = useState<"booking" | "my_bookings">("booking");

  // Database States
  const [courts, setCourts] = useState<Court[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [equipmentRentals, setEquipmentRentals] = useState<EquipmentRental[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Modal ใบเสร็จรับเงิน
  const [receiptBookingId, setReceiptBookingId] = useState<string | null>(null);

  // UI & Form States
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Booking Selection States
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedCourtId, setSelectedCourtId] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("18:00");
  const [durationHours, setDurationHours] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<"promptpay" | "credit_card" | "cash">("promptpay");
  const [selectedEquipment, setSelectedEquipment] = useState<Record<string, number>>({});

  // ==========================================
  // 3. ดึงข้อมูลจาก Supabase
  // ==========================================
  const fetchAllData = async (preferredCourtId?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [
        { data: courtsData, error: cErr },
        { data: bookingsData, error: bErr },
        { data: eqData, error: eErr },
        { data: payData, error: payErr },
      ] = await Promise.all([
        supabase.from("courts").select("*").order("name", { ascending: true }),
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("equipment_rentals").select("*"),
        supabase.from("payments").select("*").order("created_at", { ascending: false }),
      ]);

      if (cErr) throw cErr;
      if (bErr) throw bErr;
      if (eErr) throw eErr;
      if (payErr) throw payErr;

      const typedCourts = (courtsData as Court[]) || [];
      setCourts(typedCourts);
      setBookings((bookingsData as Booking[]) || []);
      setEquipmentRentals((eqData as EquipmentRental[]) || []);
      setPayments((payData as Payment[]) || []);

      const currentCourt = preferredCourtId || selectedCourtId;
      if (typedCourts.length > 0 && !currentCourt) {
        const activeCourt = typedCourts.find((c) => c.is_active);
        if (activeCourt) setSelectedCourtId(activeCourt.id);
      }
    } catch (err: unknown) {
      const supaErr = err as { message?: string };
      setErrorMsg(
        supaErr?.message ||
          (err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อ Supabase")
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 4. ตรวจสอบ Session ตอนเปิดหน้าแรก
  // ==========================================
  useEffect(() => {
    let isMounted = true;

    const initSessionAndData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (profileData) {
        const typedProfile = profileData as Profile;
        if (typedProfile.role === "admin") {
          router.replace("/admin");
          return;
        }
        setCurrentUserProfile(typedProfile);
        setActiveUserId(typedProfile.id);
      } else {
        setActiveUserId(session.user.id);
      }

      setSelectedDate(new Date().toISOString().split("T")[0]);
      await fetchAllData();
      if (isMounted) {
        setCheckingAuth(false);
      }
    };

    initSessionAndData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
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

  // กรองเฉพาะรายการจองของ User คนที่ล็อกอินอยู่เท่านั้น
  const myBookings = useMemo(() => {
    if (!activeUserId) return [];
    return bookings.filter((b) => b.user_id === activeUserId);
  }, [bookings, activeUserId]);

  // ==========================================
  // 5. คำนวณเวลาสิ้นสุด & ราคารวม
  // ==========================================
  const endTime = useMemo<string>(() => {
    if (!startTime) return "";
    const [hourStr, minStr] = startTime.split(":");
    const endHour = parseInt(hourStr, 10) + durationHours;
    return `${String(endHour).padStart(2, "0")}:${minStr}`;
  }, [startTime, durationHours]);

  const selectedCourt = useMemo<Court | undefined>(() => {
    return courts.find((c) => c.id === selectedCourtId);
  }, [courts, selectedCourtId]);

  const courtCost = useMemo<number>(() => {
    return selectedCourt ? Number(selectedCourt.hourly_rate) * durationHours : 0;
  }, [selectedCourt, durationHours]);

  const equipmentCost = useMemo<number>(() => {
    return EQUIPMENT_CATALOG.reduce((sum, item) => {
      const qty = selectedEquipment[item.id] || 0;
      return sum + item.price * qty;
    }, 0);
  }, [selectedEquipment]);

  const grandTotal = courtCost + equipmentCost;

  const isSlotBooked = (courtId: string, slotStart: string): boolean => {
    return bookings.some((b) => {
      if (b.court_id !== courtId || b.booking_date !== selectedDate || b.status === "cancelled") {
        return false;
      }
      const bStart = b.start_time.slice(0, 5);
      const bEnd = b.end_time.slice(0, 5);
      return slotStart >= bStart && slotStart < bEnd;
    });
  };

  const updateEquipmentQty = (itemId: string, delta: number) => {
    setSelectedEquipment((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  // ==========================================
  // 6. สร้างการจองในสถานะ "รอชำระเงิน (unpaid)"
  // ==========================================
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!activeUserId) {
      setErrorMsg("ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่");
      return;
    }
    if (!selectedCourtId) {
      setErrorMsg("กรุณาเลือกสนามแบดมินตัน");
      return;
    }

    setSubmitting(true);
    try {
      const { data: newBooking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: activeUserId,
          court_id: selectedCourtId,
          booking_date: selectedDate,
          start_time: `${startTime}:00`,
          end_time: `${endTime}:00`,
          status: "pending", // รอแอดมินยืนยันหลังชำระเงิน
          total_amount: grandTotal,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;
      const createdBooking = newBooking as Booking;

      const rentalRows = Object.entries(selectedEquipment)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, qty]) => {
          const catalogItem = EQUIPMENT_CATALOG.find((i) => i.id === itemId)!;
          return {
            booking_id: createdBooking.id,
            item_name: catalogItem.name,
            item_type: catalogItem.type,
            quantity: qty,
            unit_price: catalogItem.price,
          };
        });

      if (rentalRows.length > 0) {
        const { error: rentalError } = await supabase
          .from("equipment_rentals")
          .insert(rentalRows);
        if (rentalError) throw rentalError;
      }

      // บันทึกการชำระเงินเป็น "unpaid" (ติดรอชำระเงิน)
      const { error: paymentError } = await supabase.from("payments").insert({
        booking_id: createdBooking.id,
        amount: grandTotal,
        method: paymentMethod,
        status: "unpaid",
        paid_at: null,
      });

      if (paymentError) throw paymentError;

      setSuccessMsg(
        "ส่งคำขอจองเรียบร้อยแล้ว! สถานะการชำระเงินอยู่ระหว่าง 'รอชำระเงิน' รอแอดมินตรวจสอบและยืนยัน"
      );
      setSelectedEquipment({});
      await fetchAllData(selectedCourtId);
      setActiveTab("my_bookings");
    } catch (err: unknown) {
      const supaErr = err as { message?: string };
      const msg =
        supaErr?.message ||
        (err instanceof Error ? err.message : "ไม่สามารถบันทึกการจองได้");
      if (msg.includes("prevent_double_booking")) {
        setErrorMsg("ขออภัย ช่วงเวลาและสนามนี้ถูกจองไปแล้ว กรุณาเลือกเวลาอื่น");
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // 7. ยกเลิกการจองของตัวเองเท่านั้น
  // ==========================================
  const handleCancelBooking = async (booking: Booking) => {
    if (booking.user_id !== activeUserId) {
      setErrorMsg("คุณสามารถยกเลิกได้เฉพาะรายการจองของตัวเองเท่านั้น");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error: bErr } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id)
        .eq("user_id", activeUserId);
      if (bErr) throw bErr;

      const currentPayment = payments.find((p) => p.booking_id === booking.id);
      const nextPayStatus = currentPayment?.status === "paid" ? "refunded" : "unpaid";

      const { error: pErr } = await supabase
        .from("payments")
        .update({ status: nextPayStatus })
        .eq("booking_id", booking.id);
      if (pErr) throw pErr;

      setSuccessMsg("ยกเลิกการจองเรียบร้อยแล้ว");
      await fetchAllData(selectedCourtId);
    } catch (err: unknown) {
      const supaErr = err as { message?: string };
      setErrorMsg(
        supaErr?.message ||
          (err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการยกเลิก")
      );
    }
  };

  // ข้อมูลใบเสร็จสำหรับ Modal
  const activeReceiptData = useMemo(() => {
    if (!receiptBookingId) return null;
    const booking = myBookings.find((b) => b.id === receiptBookingId);
    if (!booking) return null;
    const payment = payments.find((p) => p.booking_id === booking.id);
    if (!payment || payment.status !== "paid") return null;
    const court = courts.find((c) => c.id === booking.court_id);
    const items = equipmentRentals.filter((eq) => eq.booking_id === booking.id);
    return { booking, payment, court, items };
  }, [receiptBookingId, myBookings, payments, courts, equipmentRentals]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center text-sm">
        กำลังตรวจสอบสถานะการเข้าสู่ระบบ...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                SmashCourt Booking
              </h1>
              <p className="text-xs text-slate-400">
                ระบบจองสนามแบดมินตันและใบเสร็จรับเงินอิเล็กทรอนิกส์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-semibold text-white">
                {currentUserProfile?.full_name || "ผู้ใช้งาน"}
              </div>
              <div className="text-[11px] text-emerald-400">
                สมาชิก ({currentUserProfile?.role || "customer"})
              </div>
            </div>

            <button
              onClick={() => fetchAllData(selectedCourtId)}
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

        <div className="max-w-6xl mx-auto px-4 flex gap-2 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab("booking")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === "booking"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            จองสนามแบดมินตัน
          </button>
          <button
            onClick={() => setActiveTab("my_bookings")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === "my_bookings"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            รายการจองของฉัน ({myBookings.length})
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <div className="text-sm">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
            <div className="text-sm">{successMsg}</div>
          </div>
        )}

        {activeTab === "booking" && (
          <form onSubmit={handleCreateBooking} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center">
                    1
                  </span>
                  เลือกวันที่และสนามแบดมินตัน
                </h2>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">วันที่ต้องการเข้าใช้บริการ</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {courts.map((court) => {
                    const isSelected = court.id === selectedCourtId;
                    return (
                      <button
                        type="button"
                        key={court.id}
                        disabled={!court.is_active}
                        onClick={() => setSelectedCourtId(court.id)}
                        className={`p-4 rounded-xl border text-left transition ${
                          !court.is_active
                            ? "opacity-40 cursor-not-allowed bg-slate-900 border-slate-800"
                            : isSelected
                            ? "bg-emerald-500/10 border-emerald-500 text-white"
                            : "bg-slate-800/50 border-slate-700 hover:border-slate-600 text-slate-300"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-sm">{court.name}</span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                            ฿{court.hourly_rate}/ชม.
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{court.surface_type}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center">
                    2
                  </span>
                  เลือกช่วงเวลาและจำนวนชั่วโมง
                </h2>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const booked = selectedCourtId ? isSlotBooked(selectedCourtId, slot) : false;
                    const active = startTime === slot;
                    return (
                      <button
                        type="button"
                        key={slot}
                        disabled={booked}
                        onClick={() => setStartTime(slot)}
                        className={`py-2 px-2 rounded-lg text-xs font-medium border transition ${
                          booked
                            ? "bg-rose-950/30 border-rose-900/50 text-rose-400/60 line-through cursor-not-allowed"
                            : active
                            ? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold"
                            : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center gap-4">
                  <span className="text-xs text-slate-400">จำนวนชั่วโมง:</span>
                  {[1, 2, 3, 4].map((hr) => (
                    <button
                      type="button"
                      key={hr}
                      onClick={() => setDurationHours(hr)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                        durationHours === hr
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : "bg-slate-800 border-slate-700 text-slate-400"
                      }`}
                    >
                      {hr} ชั่วโมง
                    </button>
                  ))}
                </div>
              </section>

              <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center">
                    3
                  </span>
                  อุปกรณ์เสริมและลูกแบด
                </h2>

                <div className="divide-y divide-slate-800">
                  {EQUIPMENT_CATALOG.map((item) => {
                    const qty = selectedEquipment[item.id] || 0;
                    return (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium text-slate-200">{item.name}</div>
                          <div className="text-xs text-slate-400">
                            {item.type === "rental" ? "เช่ายืม" : "ซื้อขาด"} • ฿{item.price}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateEquipmentQty(item.id, -1)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                          <button
                            type="button"
                            onClick={() => updateEquipmentQty(item.id, 1)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="lg:col-span-1">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 sticky top-28 space-y-5">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  สรุปรายการจอง
                </h3>

                <div className="space-y-2.5 text-sm border-y border-slate-800 py-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">สนาม:</span>
                    <span className="font-medium text-white">{selectedCourt?.name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">วันที่:</span>
                    <span className="text-slate-200">{selectedDate || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">เวลา:</span>
                    <span className="text-slate-200">
                      {startTime} - {endTime} ({durationHours} ชม.)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ค่าสนาม:</span>
                    <span className="text-slate-200">฿{courtCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">อุปกรณ์เสริม:</span>
                    <span className="text-slate-200">฿{equipmentCost.toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    ช่องทางชำระเงิน
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as "promptpay" | "credit_card" | "cash")
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="promptpay">PromptPay QR Code</option>
                    <option value="credit_card">บัตรเครดิต / เดบิต</option>
                    <option value="cash">เงินสดหน้าเคาน์เตอร์</option>
                  </select>
                  <p className="text-[11px] text-amber-400 mt-1.5">
                    * กดจองแล้วจะขึ้นสถานะ "รอชำระเงิน" รอแอดมินยืนยันเพื่อออกใบเสร็จ
                  </p>
                </div>

                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-sm text-slate-400">ยอดชำระสุทธิ</span>
                  <span className="text-2xl font-bold text-emerald-400">
                    ฿{grandTotal.toLocaleString()}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedCourtId}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm transition flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {submitting ? "กำลังส่งคำขอจอง..." : "ยืนยันการจอง (รอชำระเงิน)"}
                </button>
              </div>
            </div>
          </form>
        )}

        {activeTab === "my_bookings" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">รายการจองของฉัน</h2>
              <span className="text-xs text-slate-400">
                แสดงเฉพาะบัญชี {currentUserProfile?.full_name || "ของคุณ"}
              </span>
            </div>

            {myBookings.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-sm">
                คุณยังไม่มีรายการจองสนาม
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myBookings.map((booking) => {
                  const court = courts.find((c) => c.id === booking.court_id);
                  const payment = payments.find((p) => p.booking_id === booking.id);
                  const items = equipmentRentals.filter((eq) => eq.booking_id === booking.id);
                  const isPaid = payment?.status === "paid";

                  return (
                    <div
                      key={booking.id}
                      className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="font-semibold text-white">
                            {court?.name || "ไม่พบข้อมูลสนาม"}
                          </div>
                          <div className="text-xs text-slate-400">
                            {court?.surface_type || ""}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              booking.status === "confirmed" || booking.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : booking.status === "cancelled"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            การจอง: {booking.status}
                          </span>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isPaid
                                ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                                : payment?.status === "refunded"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {isPaid
                              ? "ชำระเงินแล้ว"
                              : payment?.status === "refunded"
                              ? "คืนเงินแล้ว"
                              : "รอชำระเงิน"}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 space-y-1 bg-slate-950/60 p-3 rounded-xl">
                        <div>
                          วันที่: <strong>{booking.booking_date}</strong> | เวลา:{" "}
                          <strong>
                            {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                          </strong>
                        </div>
                        <div>
                          ยอดรวม: <strong>฿{Number(booking.total_amount).toLocaleString()}</strong> (
                          {payment ? PAYMENT_METHOD_LABEL[payment.method] : "-"})
                        </div>
                        {items.length > 0 && (
                          <div className="pt-1 text-slate-400">
                            อุปกรณ์เสริม:{" "}
                            {items.map((i) => `${i.item_name} x${i.quantity}`).join(", ")}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {isPaid ? (
                          <button
                            onClick={() => setReceiptBookingId(booking.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            ดูใบเสร็จรับเงิน
                          </button>
                        ) : (
                          <span className="text-[11px] text-amber-400">
                            {booking.status === "cancelled"
                              ? "รายการนี้ถูกยกเลิกแล้ว"
                              : "รอแอดมินยืนยันการชำระเงินเพื่อออกใบเสร็จ"}
                          </span>
                        )}

                        {booking.status !== "cancelled" && (
                          <button
                            onClick={() => handleCancelBooking(booking)}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-1.5 transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            ยกเลิกการจอง
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal ใบเสร็จรับเงิน (แสดงเมื่อ Payment เป็น paid) */}
      {activeReceiptData && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white text-slate-900 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  ใบเสร็จรับเงิน / RECEIPT
                </div>
                <h3 className="text-lg font-bold text-slate-900">SmashCourt Badminton</h3>
                <p className="text-xs text-slate-500">
                  เลขที่ใบเสร็จ: RCP-{activeReceiptData.payment.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setReceiptBookingId(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">ผู้รับบริการ:</span>
                <span className="font-semibold">{currentUserProfile?.full_name || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">สนาม:</span>
                <span className="font-semibold">{activeReceiptData.court?.name || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">วันที่จอง / เวลา:</span>
                <span className="font-semibold">
                  {activeReceiptData.booking.booking_date} (
                  {activeReceiptData.booking.start_time.slice(0, 5)} -{" "}
                  {activeReceiptData.booking.end_time.slice(0, 5)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ช่องทางชำระเงิน:</span>
                <span className="font-semibold">
                  {PAYMENT_METHOD_LABEL[activeReceiptData.payment.method]}
                </span>
              </div>
              {activeReceiptData.payment.paid_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">ยืนยันชำระเมื่อ:</span>
                  <span className="font-medium">
                    {new Date(activeReceiptData.payment.paid_at).toLocaleString("th-TH")}
                  </span>
                </div>
              )}
            </div>

            {activeReceiptData.items.length > 0 && (
              <div className="border-t border-dashed border-slate-300 pt-3 space-y-1 text-xs">
                <div className="font-semibold text-slate-700">รายการอุปกรณ์เสริม:</div>
                {activeReceiptData.items.map((it) => (
                  <div key={it.id} className="flex justify-between text-slate-600">
                    <span>
                      {it.item_name} x{it.quantity}
                    </span>
                    <span>฿{(it.unit_price * it.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-800">ยอดชำระสุทธิ</span>
              <span className="text-xl font-extrabold text-emerald-600">
                ฿{Number(activeReceiptData.payment.amount).toLocaleString()}
              </span>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
              >
                พิมพ์ใบเสร็จ
              </button>
              <button
                onClick={() => setReceiptBookingId(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}