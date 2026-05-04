'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { stationApi, vehicleApi, reservationApi, walletApi, handleApiError } from '@/lib/api';
import { type ChargingStation, type Vehicle, type Charger, type ReservationCreate } from '@/lib/types';
import { CheckCircle, Clock, Car, Wallet } from 'lucide-react';

type Step = 'vehicle' | 'datetime' | 'payment' | 'confirmation';

function buildAvailableSlots(charger: Charger | null, reservations: any[]) {
  if (!charger || charger.status !== 'available') {
    return [];
  }

  const chargerReservations = reservations.filter(
    (r) => String(r.charger_id) === String(charger.id) && r.status === 'confirmed'
  );

  const now = new Date();
  const maxDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Backend limits to 24 hours
  const slots: Array<{ value: string; label: string }> = [];

  for (let dayOffset = 0; dayOffset < 2; dayOffset += 1) {
    for (let hour = 0; hour < 24; hour++) {
      const candidate = new Date(now);
      candidate.setDate(now.getDate() + dayOffset);
      candidate.setHours(hour, 0, 0, 0);
      
      // Only allow slots in the future and within the 24 hour limit
      if (candidate <= now || candidate > maxDate) continue;

      const isOccupied = chargerReservations.some((res) => {
        const start = new Date(res.start_time);
        const end = new Date(res.end_time);
        return candidate >= start && candidate < end;
      });

      if (isOccupied) continue;

      // Use local timezone strings to avoid UTC mismatch
      const year = candidate.getFullYear();
      const month = String(candidate.getMonth() + 1).padStart(2, '0');
      const day = String(candidate.getDate()).padStart(2, '0');
      const hr = String(candidate.getHours()).padStart(2, '0');
      
      const value = `${year}-${month}-${day}T${hr}:00`;
      const label = `${year}-${month}-${day} ${hr}:00`;

      slots.push({ value, label });
    }
  }

  return slots;
}

function formatSlot(value: string) {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NewReservationPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('vehicle');
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [station, setStation] = useState<ChargingStation | null>(null);
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [charger, setCharger] = useState<Charger | null>(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [durationHours, setDurationHours] = useState<number>(1);
  const [existingReservations, setExistingReservations] = useState<any[]>([]);
  const [compatibility, setCompatibility] = useState<{ is_compatible: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wallet balance state
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    loadInitialData();
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && currentStep === 'payment') {
      walletApi.get()
        .then(res => setWalletBalance(res.balance))
        .catch(err => setError(handleApiError(err).message));
    }
  }, [isAuthenticated, currentStep]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const stationId = params.get('station');
    const chargerId = params.get('charger');
    const datetime = params.get('datetime');

    if (stationId) {
      const foundStation = stations.find((item) => String(item.id) === stationId);
      if (foundStation) {
        setStation(foundStation);
      }
    }

    if (stationId && chargerId) {
      void stationApi.chargers(stationId).then((chargerList) => {
        setChargers(chargerList);
        const foundCharger = chargerList.find((item) => String(item.id) === chargerId);
        if (foundCharger) {
          setCharger(foundCharger);
        }
      }).catch((err) => setError(handleApiError(err).message));
    }

    if (datetime) {
      const parsed = new Date(datetime);
      if (!Number.isNaN(parsed.getTime())) {
        setSelectedSlot(parsed.toISOString().slice(0, 16));
      }
    }
  }, [stations]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [stationsData, vehiclesData, reservationsData] = await Promise.all([stationApi.list(), vehicleApi.list(), reservationApi.list()]);
      setStations(stationsData);
      setVehicles(vehiclesData);
      setExistingReservations(reservationsData);
    } catch (err) {
      setError(handleApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleStationSelect = async (selected: ChargingStation) => {
    setStation(selected);
    setLoading(true);
    setError(null);

    try {
      const stationChargers = await stationApi.chargers(String(selected.id));
      setChargers(stationChargers);
    } catch (err) {
      setError(handleApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    if (!charger) {
      return;
    }

    const isCompatible = charger.connector_type === vehicle.connector_type;
    setCompatibility({
      is_compatible: isCompatible,
      message: isCompatible
        ? 'This vehicle is compatible with the selected charger.'
        : `${vehicle.connector_type} is not compatible with ${charger.connector_type}.`,
    });
  };

  const handleChargerSelect = (selected: Charger) => {
    setCharger(selected);
    if (!selectedVehicle) {
      return;
    }

    const isCompatible = selected.connector_type === selectedVehicle.connector_type;
    setCompatibility({
      is_compatible: isCompatible,
      message: isCompatible
        ? 'This charger is compatible with the selected vehicle.'
        : `${selectedVehicle.connector_type} is not compatible with ${selected.connector_type}.`,
    });
  };

  const handleConfirmSlot = () => {
    if (selectedSlot) {
      setCurrentStep('payment');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedVehicle || !station || !charger || !selectedSlot) {
      setError('Please complete every step before submitting.');
      return;
    }

    const totalCost = charger.pricing_per_kwh * charger.power_output * durationHours;

    if (walletBalance === null || walletBalance < totalCost) {
      setError("Ah, it looks like your wallet is running a little light. Please top up your balance to proceed with the reservation!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await walletApi.deduct(totalCost);

      const payload: any = {
        vehicle_id: selectedVehicle.id,
        station_id: station.id,
        charger_id: charger.id,
        start_time: new Date(selectedSlot).toISOString(),
        duration_minutes: durationHours * 60,
        total_cost: totalCost,
      };

      await reservationApi.create(payload);
      setCurrentStep('confirmation');
    } catch (err) {
      setError(handleApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.push('/reservations');
  };

  const availableSlots = buildAvailableSlots(charger, existingReservations);

  useEffect(() => {
    if (!selectedSlot || !charger) return;
    const start = new Date(selectedSlot);
    const chargerReservations = existingReservations.filter(
      (r) => String(r.charger_id) === String(charger.id) && r.status === 'confirmed'
    );
    const twoHoursEnd = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const canBookTwoHours = !chargerReservations.some((res) => {
      const rStart = new Date(res.start_time);
      return start < new Date(res.end_time) && twoHoursEnd > rStart;
    });

    if (!canBookTwoHours && durationHours === 2) {
      setDurationHours(1);
    }
  }, [selectedSlot, charger, existingReservations, durationHours]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center">
        <p className="text-lg">Please log in to make a reservation.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">New Reservation</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Book a charging slot</h1>
          <p className="text-[#D9D5D2]/80 mt-2">Reserve a charger at your preferred station</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-8">
          {[
            { step: 'vehicle', label: 'Vehicle', icon: Car },
            { step: 'datetime', label: 'Time', icon: Clock },
            { step: 'payment', label: 'Payment', icon: Wallet },
            { step: 'confirmation', label: 'Done', icon: CheckCircle },
          ].map(({ step, label, icon: Icon }, index) => (
            <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep === step ? 'bg-[#4C736F] text-white shadow-[0_0_15px_rgba(76,115,111,0.5)]' :
                ['vehicle', 'datetime', 'payment', 'confirmation'].indexOf(currentStep) > index ? 'bg-[#2D564F] text-white' :
                'bg-[#062C24] text-[#70B4A6]'
              }`}>
                <Icon size={20} />
              </div>
              <span className={`ml-2 text-sm hidden sm:inline ${currentStep === step ? 'font-semibold text-white' : 'text-[#D9D5D2]/80'}`}>{label}</span>
              {index < 3 && <div className="w-8 sm:w-12 h-0.5 bg-[#18423b] mx-2 sm:mx-4" />}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 rounded-2xl border border-[#D45D5D]/40 bg-[#3F1818]/50 px-4 py-3 text-sm text-[#F2D1D1]">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
          <div className="mb-6 border-b border-[#18423b]/80 pb-4">
            <h2 className="text-2xl font-semibold text-white">Reserve a charger</h2>
          </div>
          <div>
            {currentStep === 'vehicle' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[#13423a]/80 bg-[#031912]/95 p-4 text-[#D9D5D2]">
                  <p className="text-sm">Select the vehicle you want to charge.</p>
                </div>

                <div className="grid gap-4">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className={`border rounded-2xl p-4 cursor-pointer transition ${selectedVehicle?.id === vehicle.id ? 'border-[#6BC0A4] bg-[#0F3E32] shadow-[0_0_15px_rgba(107,192,164,0.15)]' : 'border-[#13423a] bg-[#031912] hover:border-[#4C736F] hover:bg-[#062C24]'}`}
                      onClick={() => handleVehicleSelect(vehicle)}
                    >
                      <h3 className="font-semibold text-white">{vehicle.brand} {vehicle.model}</h3>
                      <p className="text-sm text-[#D9D5D2]/80 mt-1">Plate: {vehicle.plate_number}</p>
                      <p className="text-sm text-[#D9D5D2]/80">Connector: {vehicle.connector_type}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div>
                    <label htmlFor="station" className="block text-sm font-medium text-[#D9D5D2]">Station</label>
                    <select
                      id="station"
                      className="mt-2 block w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20"
                      value={station?.id ?? ''}
                      onChange={async (e) => {
                        const selected = stations.find((item) => String(item.id) === e.target.value);
                        if (selected) await handleStationSelect(selected);
                      }}
                    >
                      <option value="">Choose station</option>
                      {stations.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="charger" className="block text-sm font-medium text-[#D9D5D2]">Charger</label>
                    <select
                      id="charger"
                      className="mt-2 block w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20"
                      value={charger?.id ?? ''}
                      onChange={(e) => {
                        const selected = chargers.find((item) => String(item.id) === e.target.value);
                        if (selected) handleChargerSelect(selected);
                      }}
                    >
                      <option value="">Choose charger</option>
                      {chargers.map((item) => (
                        <option key={item.id} value={item.id}>{item.charger_code} - {item.connector_type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {compatibility && (
                  <div className={`rounded-xl border p-4 text-sm ${compatibility.is_compatible ? 'border-[#4C736F]/40 bg-[#16382F]/50 text-[#BCE3CD]' : 'border-[#D45D5D]/40 bg-[#3F1818]/50 text-[#F2D1D1]'}`}>
                    {compatibility.message}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setCurrentStep('datetime')}
                  disabled={!selectedVehicle || !station || !charger || !compatibility?.is_compatible}
                  className="w-full rounded-2xl bg-[#4C736F] px-4 py-3 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#6BC0A4] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to available slots
                </button>
              </div>
            )}

            {currentStep === 'datetime' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[#13423a]/80 bg-[#031912]/95 p-4 text-[#D9D5D2]">
                  <p className="text-sm">Station: <span className="text-white">{station?.name}</span></p>
                  <p className="text-sm mt-1">Charger: <span className="text-white">{charger?.charger_code}</span></p>
                </div>

                {availableSlots.length === 0 ? (
                  <div className="rounded-xl border border-[#D45D5D]/40 bg-[#3F1818]/50 p-4 text-[#F2D1D1]">
                    No available slots found for this charger right now.
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid max-h-96 gap-3 overflow-y-auto pr-2 md:grid-cols-3">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => setSelectedSlot(slot.value)}
                          className={`rounded-2xl border p-4 text-left transition ${selectedSlot === slot.value ? 'border-[#6BC0A4] bg-[#0F3E32] shadow-[0_0_15px_rgba(107,192,164,0.15)]' : 'border-[#13423a] bg-[#031912] hover:border-[#4C736F] hover:bg-[#062C24]'}`}
                        >
                          <p className="text-sm font-medium text-white">{formatSlot(slot.value)}</p>
                          <p className="mt-2 text-xs text-[#D9D5D2]/80">Available</p>
                        </button>
                      ))}
                    </div>

                    {selectedSlot && (
                      <div className="border-t border-[#13423a]/80 pt-4">
                        <label className="mb-3 block text-sm font-medium text-[#D9D5D2]">Duration</label>
                        <div className="flex gap-4">
                          {(() => {
                            if (!charger) return null;
                            const start = new Date(selectedSlot);
                            const chargerReservations = existingReservations.filter(
                              (r) => String(r.charger_id) === String(charger.id) && r.status === 'confirmed'
                            );
                            const twoHoursEnd = new Date(start.getTime() + 2 * 60 * 60 * 1000);
                            const canBookTwoHours = !chargerReservations.some((res) => {
                              const rStart = new Date(res.start_time);
                              return start < new Date(res.end_time) && twoHoursEnd > rStart;
                            });
                            
                            const maxHours = canBookTwoHours ? 2 : 1;

                            return [1, 2].map((hours) => (
                              <button
                                key={hours}
                                type="button"
                                onClick={() => setDurationHours(hours)}
                                disabled={hours > maxHours}
                                className={`flex-1 rounded-2xl border px-6 py-3 text-sm font-medium transition sm:flex-none ${hours > maxHours ? 'opacity-50 cursor-not-allowed border-[#13423a] bg-[#031912] text-[#D9D5D2]/50' : durationHours === hours ? 'border-[#6BC0A4] bg-[#0F3E32] text-white shadow-[0_0_15px_rgba(107,192,164,0.15)]' : 'border-[#13423a] bg-[#031912] text-[#D9D5D2] hover:border-[#4C736F] hover:bg-[#062C24]'}`}
                              >
                                {hours} Hour{hours > 1 ? 's' : ''}
                              </button>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('vehicle')}
                    className="rounded-2xl border border-[#4C736F] px-6 py-3 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#062C24]"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleConfirmSlot} 
                    disabled={!selectedSlot}
                    className="flex-1 rounded-2xl bg-[#4C736F] px-6 py-3 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#6BC0A4] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to payment
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'payment' && (
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="rounded-2xl border border-[#13423a]/80 bg-[#031912]/95 p-4 text-[#D9D5D2]">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-sm">Station: <span className="text-white">{station?.name}</span></p>
                      <p className="mt-1 text-sm">Charger: <span className="text-white">{charger?.charger_code} ({charger?.power_output} kW)</span></p>
                      <p className="mt-1 text-sm">Vehicle: <span className="text-white">{selectedVehicle?.brand} {selectedVehicle?.model}</span></p>
                      <p className="mt-1 text-sm">Slot: <span className="text-white">{selectedSlot ? formatSlot(selectedSlot) : 'Not selected'}</span></p>
                      <p className="mt-1 text-sm">Duration: <span className="text-white">{durationHours} Hour{durationHours > 1 ? 's' : ''}</span></p>
                    </div>
                    <div className="mt-4 border-t border-[#13423a]/80 pt-4 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0 sm:text-right">
                      <p className="text-sm">Rate: <span className="text-white">₺{charger?.pricing_per_kwh}/kWh</span></p>
                      <p className="mt-1 text-sm">Estimated power: <span className="text-white">{charger?.power_output} kW/h</span></p>
                      <p className="mt-1 text-sm">Est. hourly cost: <span className="text-white">₺{charger ? (charger.pricing_per_kwh * charger.power_output).toFixed(2) : '0.00'}</span></p>
                      <p className="mt-2 text-lg font-semibold text-[#6BC0A4]">
                        Total: ₺{charger ? (charger.pricing_per_kwh * charger.power_output * durationHours).toFixed(2) : '0.00'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-[#4C736F] bg-[#0A2E23] p-6 text-center">
                  <p className="text-sm text-[#D9D5D2]">Current Wallet Balance</p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    ₺{walletBalance !== null ? walletBalance.toFixed(2) : '0.00'}
                  </p>
                  
                  {walletBalance !== null && charger !== null && (walletBalance < charger.pricing_per_kwh * charger.power_output * durationHours) && (
                    <div className="mt-4 rounded-xl bg-[#3F1818]/50 p-3 border border-[#D45D5D]/40">
                      <p className="text-sm text-[#F2D1D1]">
                        Ah, it looks like your wallet is running a little light. Please top up your balance to proceed with the reservation!
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('datetime')}
                    disabled={loading}
                    className="rounded-2xl border border-[#4C736F] px-6 py-3 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#062C24]"
                  >
                    Back
                  </button>
                  <button type="submit" disabled={loading || (walletBalance !== null && charger !== null && walletBalance < charger.pricing_per_kwh * charger.power_output * durationHours)} className="flex-1 rounded-2xl bg-[#4C736F] px-4 py-3 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#6BC0A4] disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? 'Processing...' : 'Pay from Wallet'}
                  </button>
                </div>
              </form>
            )}

            {currentStep === 'confirmation' && (
              <div className="text-center space-y-4 py-8">
                <CheckCircle className="mx-auto h-16 w-16 text-[#6BC0A4]" />
                <h2 className="text-2xl font-bold text-white">Reservation complete</h2>
                <p className="text-[#D9D5D2]/80">Your reservation is confirmed. View it on your reservations page.</p>
                <button onClick={handleClose} className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-[#4C736F] px-6 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#6BC0A4]">
                  Go to reservations
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}