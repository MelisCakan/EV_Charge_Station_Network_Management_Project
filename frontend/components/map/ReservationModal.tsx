"use client";

import { useState, useEffect } from "react";
import { stationApi, vehicleApi, reservationApi, handleApiError } from "@/lib/api";
import { type Vehicle, type Charger, type ReservationCreate, type MapStation } from "@/lib/types";
import { CheckCircle, Clock, Car, CreditCard, X } from "lucide-react";

type Step = "vehicle" | "datetime" | "payment" | "confirmation";

const stepOrder: Step[] = ["vehicle", "datetime", "payment", "confirmation"];

function buildAvailableSlots(charger: Charger | null) {
  if (!charger || charger.status !== "available") return [];
  const now = new Date();
  const slots: Array<{ value: string; label: string }> = [];
  const times = ["08:00", "10:00", "12:00", "14:00", "16:00"];
  for (let dayOffset = 0; dayOffset < 3; dayOffset += 1) {
    const slotDate = new Date(now);
    slotDate.setDate(now.getDate() + dayOffset);
    const dateString = slotDate.toISOString().slice(0, 10);
    times.forEach((time) => {
      const [hour, minute] = time.split(":").map(Number);
      const candidate = new Date(slotDate);
      candidate.setHours(hour, minute, 0, 0);
      if (candidate <= now) return;
      slots.push({ value: `${dateString}T${time}`, label: `${dateString} ${time}` });
    });
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
  const [paymentData, setPaymentData] = useState({
    cardholderName: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [chargerList, vehicleList] = await Promise.all([
          stationApi.chargers(station.id),
          vehicleApi.list(),
        ]);
        setChargers(chargerList);
        setVehicles(vehicleList);
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

  const handleChargerSelect = (selected: Charger) => {
    setCharger(selected);
    if (!selectedVehicle) return;
    const isCompatible = selected.connector_type === selectedVehicle.connector_type;
    setCompatibility({
      is_compatible: isCompatible,
      message: isCompatible
        ? "Bu şarj cihazı seçili araçla uyumlu."
        : `${selectedVehicle.connector_type}, ${selected.connector_type} ile uyumlu değil.`,
    });
  };

  const handlePaymentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
  const availableSlots = buildAvailableSlots(charger);

  const steps = [
    { step: "vehicle", label: "Araç", icon: Car },
    { step: "datetime", label: "Saat", icon: Clock },
    { step: "payment", label: "Ödeme", icon: CreditCard },
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
              <div className="grid grid-cols-2 gap-3">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => setSelectedSlot(slot.value)}
                    className={`rounded-2xl border p-3 text-left text-xs transition ${
                      selectedSlot === slot.value
                        ? "border-[#6BC0A4] bg-[#0F3E32] shadow-[0_0_15px_rgba(107,192,164,0.15)] text-white"
                        : "border-[#13423a] bg-[#031912] hover:border-[#4C736F] hover:bg-[#062C24] text-[#D9D5D2]"
                    }`}
                  >
                    {formatSlot(slot.value)}
                  </button>
                ))}
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
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="rounded-2xl border border-[#13423a]/80 bg-[#031912]/95 p-4 text-sm text-[#D9D5D2]">
              <p>İstasyon: <span className="text-white">{station.name}</span></p>
              <p className="mt-1">Cihaz: <span className="text-white">{charger?.charger_code}</span></p>
              <p className="mt-1">Araç: <span className="text-white">{selectedVehicle?.brand} {selectedVehicle?.model}</span></p>
              <p className="mt-1">Slot: <span className="text-white">{selectedSlot ? formatSlot(selectedSlot) : ""}</span></p>
            </div>

            {(["cardholderName", "cardNumber"] as const).map((key) => (
              <div key={key}>
                <label htmlFor={key} className="block text-sm font-medium text-[#D9D5D2] mb-2">
                  {key === "cardholderName" ? "Kart Sahibi Adı" : "Kart Numarası"}
                </label>
                <input
                  id={key}
                  value={paymentData[key]}
                  onChange={(e) => setPaymentData((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={key === "cardNumber" ? "1234 5678 9012 3456" : ""}
                  required
                  className="w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] text-sm outline-none focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20 placeholder:text-[#4C736F]/50"
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
              {(["expiryDate", "cvv"] as const).map((key) => (
                <div key={key}>
                  <label htmlFor={key} className="block text-sm font-medium text-[#D9D5D2] mb-2">
                    {key === "expiryDate" ? "Son Kullanma" : "CVV"}
                  </label>
                  <input
                    id={key}
                    value={paymentData[key]}
                    onChange={(e) => setPaymentData((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={key === "expiryDate" ? "MM/YY" : "123"}
                    required
                    className="w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] text-sm outline-none focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20 placeholder:text-[#4C736F]/50"
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 rounded-2xl bg-[#4C736F] px-4 py-3 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#6BC0A4] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "İşleniyor..." : "Ödemeyi Onayla"}
            </button>
          </form>
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
