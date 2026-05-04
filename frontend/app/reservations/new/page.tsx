'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { stationApi, vehicleApi, reservationApi, handleApiError } from '@/lib/api';
import { type ChargingStation, type Vehicle, type Charger, type ReservationCreate } from '@/lib/types';
import { CheckCircle, Clock, Car, CreditCard } from 'lucide-react';

type Step = 'vehicle' | 'datetime' | 'payment' | 'confirmation';

function buildAvailableSlots(charger: Charger | null) {
  if (!charger || charger.status !== 'available') {
    return [];
  }

  const now = new Date();
  const slots: Array<{ value: string; label: string }> = [];
  const times = ['08:00', '10:00', '12:00', '14:00', '16:00'];

  for (let dayOffset = 0; dayOffset < 3; dayOffset += 1) {
    const slotDate = new Date(now);
    slotDate.setDate(now.getDate() + dayOffset);
    const dateString = slotDate.toISOString().slice(0, 10);

    times.forEach((time) => {
      const [hour, minute] = time.split(':').map(Number);
      const candidate = new Date(slotDate);
      candidate.setHours(hour, minute, 0, 0);
      if (candidate <= now) return;
      slots.push({ value: `${dateString}T${time}`, label: `${dateString} ${time}` });
    });
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
  const [compatibility, setCompatibility] = useState<{ is_compatible: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    loadInitialData();
  }, [isAuthenticated, isLoading, router]);

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
      const [stationsData, vehiclesData] = await Promise.all([stationApi.list(), vehicleApi.list()]);
      setStations(stationsData);
      setVehicles(vehiclesData);
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

    setLoading(true);
    setError(null);

    try {
      const payload: ReservationCreate = {
        vehicle_id: selectedVehicle.id,
        station_id: station.id,
        charger_id: charger.id,
        start_time: new Date(selectedSlot).toISOString(),
        duration_minutes: 60,
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

  const availableSlots = buildAvailableSlots(charger);

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
            { step: 'payment', label: 'Payment', icon: CreditCard },
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
                  <div className="grid gap-3 md:grid-cols-2">
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
                )}

                <div className="flex justify-end mt-6">
                  <button 
                    onClick={handleConfirmSlot} 
                    disabled={!selectedSlot}
                    className="rounded-2xl bg-[#4C736F] px-6 py-3 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#6BC0A4] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to payment
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'payment' && (
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="rounded-2xl border border-[#13423a]/80 bg-[#031912]/95 p-4 text-[#D9D5D2]">
                  <p className="text-sm">Station: <span className="text-white">{station?.name}</span></p>
                  <p className="text-sm mt-1">Charger: <span className="text-white">{charger?.charger_code}</span></p>
                  <p className="text-sm mt-1">Vehicle: <span className="text-white">{selectedVehicle?.brand} {selectedVehicle?.model}</span></p>
                  <p className="text-sm mt-1">Slot: <span className="text-white">{selectedSlot ? formatSlot(selectedSlot) : 'Not selected'}</span></p>
                </div>

                <div className="mt-6">
                  <label htmlFor="cardholderName" className="block text-sm font-medium text-[#D9D5D2]">Cardholder Name</label>
                  <input
                    id="cardholderName"
                    value={paymentData.cardholderName}
                    onChange={(e) => setPaymentData((prev) => ({ ...prev, cardholderName: e.target.value }))}
                    required
                    className="mt-2 block w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20"
                  />
                </div>
                <div>
                  <label htmlFor="cardNumber" className="block text-sm font-medium text-[#D9D5D2]">Card Number</label>
                  <input
                    id="cardNumber"
                    value={paymentData.cardNumber}
                    onChange={(e) => setPaymentData((prev) => ({ ...prev, cardNumber: e.target.value }))}
                    placeholder="1234 5678 9012 3456"
                    required
                    className="mt-2 block w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20 placeholder:text-[#4C736F]/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expiryDate" className="block text-sm font-medium text-[#D9D5D2]">Expiry Date</label>
                    <input
                      id="expiryDate"
                      value={paymentData.expiryDate}
                      onChange={(e) => setPaymentData((prev) => ({ ...prev, expiryDate: e.target.value }))}
                      placeholder="MM/YY"
                      required
                      className="mt-2 block w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20 placeholder:text-[#4C736F]/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="cvv" className="block text-sm font-medium text-[#D9D5D2]">CVV</label>
                    <input
                      id="cvv"
                      value={paymentData.cvv}
                      onChange={(e) => setPaymentData((prev) => ({ ...prev, cvv: e.target.value }))}
                      placeholder="123"
                      required
                      className="mt-2 block w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20 placeholder:text-[#4C736F]/50"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full mt-6 rounded-2xl bg-[#4C736F] px-4 py-3 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#6BC0A4] disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Processing...' : 'Confirm payment'}
                </button>
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