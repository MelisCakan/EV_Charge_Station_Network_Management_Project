"use client";

import { useState, useEffect } from "react";
import { stationApi, vehicleApi, reservationApi, walletApi, handleApiError } from "@/lib/api";
import { type Vehicle, type Charger, type ReservationCreate, type MapStation, type Wallet } from "@/lib/types";
import { CheckCircle, Clock, Car, Wallet as WalletIcon, X } from "lucide-react";

type Step = "vehicle" | "datetime" | "payment" | "confirmation";

const stepOrder: Step[] = ["vehicle", "datetime", "payment", "confirmation"];

function buildAvailableSlots(charger: Charger | null, reservations: any[] = []) {
  if (!charger || charger.status === "offline") return [];
  
  const slots: Array<{ value: string; label: string; disabled?: boolean }> = [];
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);

  const endTime = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  let currentTime = new Date(now);

  while (currentTime <= endTime) {
    const slotStart = new Date(currentTime);
    const slotEnd = new Date(currentTime.getTime() + 60 * 60 * 1000);
    const isOccupied = reservations.some(r => {
      const rStart = new Date(r.start_time);
      const duration = r.duration_minutes || 60;
      const rEnd = new Date(r.end_time || rStart.getTime() + duration * 60000);
      return (slotStart < rEnd && slotEnd > rStart);
    });
    const dayStr = slotStart.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = slotStart.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    slots.push({ value: slotStart.toISOString(), label: `${dayStr} ${timeStr} — ${isOccupied ? 'Occupied' : 'Available'}`, disabled: isOccupied });
    currentTime.setHours(currentTime.getHours() + 1);
  }
  return slots;
}

function formatSlot(value: string) {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ReservationModalProps {
  station: MapStation;
  onSuccess: () => void;
  onClose: () => void;
}

export function ReservationModal({ station, onSuccess, onClose }: ReservationModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("vehicle");
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [charger, setCharger] = useState<Charger | null>(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [compatibility, setCompatibility] = useState<{ is_compatible: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [chargerReservations, setChargerReservations] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [chargerList, vehicleList, walletData] = await Promise.all([
          stationApi.chargers(station.id),
          vehicleApi.list(),
          walletApi.balance()
        ]);
        setChargers(chargerList);
        setVehicles(vehicleList);
        setWallet(walletData);
      } catch (err) {
        setError(handleApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [station.id]);

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    if (!charger) return;
    const isCompatible = charger.connector_type === vehicle.connector_type;
    setCompatibility({
      is_compatible: isCompatible,
      message: isCompatible
        ? "Bu araç seçili şarj cihazıyla uyumlu."
        : `${vehicle.connector_type}, ${charger.connector_type} ile uyumlu değil.`,
    });
  };

  const handleChargerSelect = async (selected: Charger) => {
    setCharger(selected);
    try {
      const res = await reservationApi.getForCharger(selected.id);
      setChargerReservations(res);
    } catch {
      setChargerReservations([]);
    }
    if (!selectedVehicle) return;
    const isCompatible = selected.connector_type === selectedVehicle.connector_type;
    setCompatibility({
      is_compatible: isCompatible,
      message: isCompatible
        ? "Bu şarj cihazı seçili araçla uyumlu."
        : `${selectedVehicle.connector_type}, ${selected.connector_type} ile uyumlu değil.`,
    });
  };

  const handlePaymentSubmit = async () => {
    if (!selectedVehicle || !charger || !selectedSlot) {
      setError("Lütfen tüm adımları tamamlayın.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload: ReservationCreate = {
        vehicle_id: selectedVehicle.id,
        station_id: Number(station.id),
        charger_id: charger.id,
        start_time: new Date(selectedSlot).toISOString(),
        duration_minutes: 60,
      };
      await reservationApi.create(payload);
      setCurrentStep("confirmation");
    } catch (err) {
      setError(handleApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = stepOrder.indexOf(currentStep);
  const availableSlots = buildAvailableSlots(charger, chargerReservations);

  const steps = [
    { step: "vehicle", label: "Araç", icon: Car },
    { step: "datetime", label: "Saat", icon: Clock },
    { step: "payment", label: "Ödeme", icon: WalletIcon },
    { step: "confirmation", label: "Tamam", icon: CheckCircle },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#031712] border border-[#18423b] rounded-[28px] w-full max-w-lg max-h-[90vh] overflow-y-auto p-8">

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#70B4A6] mb-1">Yeni Rezervasyon</p>
            <h2 className="text-xl font-bold text-white">{station.name}</h2>
          </div>
          <button onClick={onClose} className="text-[#70B4A6] hover:text-white transition p-1">
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center mb-6">
          {steps.map(({ step, label, icon: Icon }, index) => (
            <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center w-9 h-9 rounded-full transition ${
                currentStepIndex === index
                  ? "bg-[#4C736F] text-white shadow-[0_0_15px_rgba(76,115,111,0.5)]"
                  : currentStepIndex > index
                  ? "bg-[#2D564F] text-white"
                  : "bg-[#062C24] text-[#70B4A6]"
              }`}>
                <Icon size={16} />
              </div>
              <span className={`ml-1.5 text-xs hidden sm:inline ${currentStepIndex === index ? "text-white font-semibold" : "text-[#D9D5D2]/60"}`}>
                {label}
              </span>
              {index < 3 && <div className="w-8 h-px bg-[#18423b] mx-2" />}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-2xl border border-[#D45D5D]/40 bg-[#3F1818]/50 px-4 py-3 text-sm text-[#F2D1D1]">
            {error}
          </div>
        )}

        {/* Step: Vehicle */}
        {currentStep === "vehicle" && (
          <div className="space-y-4">
            <p className="text-sm text-[#D9D5D2]">Şarj etmek istediğiniz aracı seçin.</p>

            {loading ? (
              <p className="text-sm text-[#70B4A6]">Yükleniyor...</p>
            ) : (
              <div className="space-y-3">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    onClick={() => handleVehicleSelect(vehicle)}
                    className={`border rounded-2xl p-4 cursor-pointer transition ${
                      selectedVehicle?.id === vehicle.id
                        ? "border-[#6BC0A4] bg-[#0F3E32] shadow-[0_0_15px_rgba(107,192,164,0.15)]"
                        : "border-[#13423a] bg-[#031912] hover:border-[#4C736F] hover:bg-[#062C24]"
                    }`}
                  >
                    <p className="font-semibold text-white">{vehicle.brand} {vehicle.model}</p>
                    <p className="text-xs text-[#D9D5D2]/80 mt-1">
                      Plaka: {vehicle.plate_number} · {vehicle.connector_type}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#D9D5D2] mb-2">Şarj Cihazı</label>
              <select
                value={charger?.id ?? ""}
                onChange={(e) => {
                  const selected = chargers.find((c) => String(c.id) === e.target.value);
                  if (selected) handleChargerSelect(selected);
                }}
                className="w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] text-sm outline-none focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20"
              >
                <option value="">Şarj cihazı seçin</option>
                {chargers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.charger_code} — {c.connector_type} · {c.power_output} kW ({c.status})
                  </option>
                ))}
              </select>
            </div>

            {compatibility && (
              <div className={`rounded-xl border p-3 text-sm ${
                compatibility.is_compatible
                  ? "border-[#4C736F]/40 bg-[#16382F]/50 text-[#BCE3CD]"
                  : "border-[#D45D5D]/40 bg-[#3F1818]/50 text-[#F2D1D1]"
              }`}>
                {compatibility.message}
              </div>
            )}

            <button
              type="button"
              onClick={() => setCurrentStep("datetime")}
              disabled={!selectedVehicle || !charger || !compatibility?.is_compatible}
              className="w-full rounded-2xl bg-[#4C736F] px-4 py-3 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#6BC0A4] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Müsait Saatlere Geç
            </button>
          </div>
        )}

        {/* Step: Datetime */}
        {currentStep === "datetime" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#13423a]/80 bg-[#031912]/95 p-4 text-sm text-[#D9D5D2]">
              <p>İstasyon: <span className="text-white">{station.name}</span></p>
              <p className="mt-1">Cihaz: <span className="text-white">{charger?.charger_code}</span></p>
            </div>

            {availableSlots.length === 0 ? (
              <p className="text-sm text-[#F2D1D1]">Bu cihaz için müsait slot bulunamadı.</p>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[#D9D5D2] mb-2">Saat Seçimi</label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] text-sm outline-none focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20"
                >
                  <option value="" disabled>Lütfen bir saat seçin</option>
                  {availableSlots.map((slot) => (
                    <option key={slot.value} value={slot.value} disabled={slot.disabled}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCurrentStep("payment")}
                disabled={!selectedSlot}
                className="rounded-2xl bg-[#4C736F] px-6 py-3 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#6BC0A4] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ödemeye Geç
              </button>
            </div>
          </div>
        )}

        {/* Step: Payment */}
        {currentStep === "payment" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#13423a]/80 bg-[#031912]/95 p-4 text-sm text-[#D9D5D2]">
              <p>İstasyon: <span className="text-white">{station.name}</span></p>
              <p className="mt-1">Cihaz: <span className="text-white">{charger?.charger_code}</span></p>
              <p className="mt-1">Araç: <span className="text-white">{selectedVehicle?.brand} {selectedVehicle?.model}</span></p>
              <p className="mt-1">Slot: <span className="text-white">{selectedSlot ? formatSlot(selectedSlot) : ""}</span></p>
            </div>

            <div className="mt-6 rounded-2xl border border-[#4C736F] bg-[#0A2E23] p-6 text-center shadow-lg">
              <p className="text-sm font-medium text-[#D9D5D2]">Cüzdan Bakiyeniz</p>
              <p className="mt-2 text-4xl font-bold text-white">{wallet?.balance?.toFixed(2) || '0.00'} <span className="text-xl text-[#A7BEB5]">TL</span></p>
              <div className="mt-6 border-t border-[#13423a]/80 pt-6">
                <p className="text-sm font-medium text-[#D9D5D2]">Rezervasyon Ücreti</p>
                <p className="mt-2 text-2xl font-bold text-[#6BC0A4]">50.00 TL</p>
              </div>
            </div>

            {(wallet?.balance ?? 0) < 50 ? (
              <div className="mt-4 rounded-xl border border-[#D45D5D]/40 bg-[#3F1818]/50 p-4 text-center text-sm text-[#F2D1D1]">
                Yetersiz bakiye. Lütfen devam etmek için cüzdanınıza para yükleyin.
              </div>
            ) : (
              <button type="button" onClick={handlePaymentSubmit} disabled={loading} className="w-full mt-2 rounded-2xl bg-[#4C736F] px-4 py-3 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#6BC0A4] disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? "İşleniyor..." : "Cüzdandan 50.00 TL Öde"}
              </button>
            )}
          </div>
        )}

        {/* Step: Confirmation */}
        {currentStep === "confirmation" && (
          <div className="text-center py-8 space-y-4">
            <CheckCircle className="mx-auto h-16 w-16 text-[#6BC0A4]" />
            <h3 className="text-xl font-bold text-white">Rezervasyon Tamamlandı!</h3>
            <p className="text-sm text-[#D9D5D2]/80">
              Rezervasyonunuz onaylandı. Haritada rotanız gösterilecek.
            </p>
            <button
              onClick={onSuccess}
              className="mt-4 inline-flex h-12 items-center justify-center rounded-2xl bg-[#4C736F] px-8 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#6BC0A4]"
            >
              Rotayı Göster
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
