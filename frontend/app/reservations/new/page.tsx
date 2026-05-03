'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { stationApi, vehicleApi, reservationApi, handleApiError } from '@/lib/api';
import { type ChargingStation, type Vehicle, type Charger, type ReservationCreate } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    return <div>Please log in to make a reservation.</div>;
  }

  return (
    <div className="min-h-screen bg-[#F2F2F0] py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#000D0C]">New Reservation</h1>
          <p className="text-[#012623] mt-2">Book a charging slot at your preferred station</p>
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
                currentStep === step ? 'bg-[#4C736F] text-white' :
                ['vehicle', 'datetime', 'payment', 'confirmation'].indexOf(currentStep) > index ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                <Icon size={20} />
              </div>
              <span className={`ml-2 text-sm ${currentStep === step ? 'font-semibold' : ''}`}>{label}</span>
              {index < 3 && <div className="w-12 h-0.5 bg-gray-300 mx-4" />}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>Reserve a charger</CardTitle>
          </CardHeader>
          <CardContent>
            {currentStep === 'vehicle' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-[#13423a] bg-[#031912] p-4 text-[#D9D5D2]">
                  <p className="text-sm">Select the vehicle you want to charge.</p>
                </div>

                <div className="grid gap-4">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className={`border rounded-lg p-4 cursor-pointer ${selectedVehicle?.id === vehicle.id ? 'border-[#4C736F] bg-[#E6FFFA]' : 'hover:bg-gray-50'}`}
                      onClick={() => handleVehicleSelect(vehicle)}
                    >
                      <h3 className="font-semibold">{vehicle.brand} {vehicle.model}</h3>
                      <p className="text-sm text-gray-600">Plate: {vehicle.plate_number}</p>
                      <p className="text-sm text-gray-500">Connector: {vehicle.connector_type}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div>
                    <Label htmlFor="station">Station</Label>
                    <select
                      id="station"
                      className="mt-2 block w-full rounded-3xl border border-[#4C736F] bg-[#031B18] px-4 py-3 text-[#F2F2F0] outline-none"
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
                    <Label htmlFor="charger">Charger</Label>
                    <select
                      id="charger"
                      className="mt-2 block w-full rounded-3xl border border-[#4C736F] bg-[#031B18] px-4 py-3 text-[#F2F2F0] outline-none"
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
                  <div className={`rounded-xl border p-4 ${compatibility.is_compatible ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
                    {compatibility.message}
                  </div>
                )}

                <Button
                  onClick={() => setCurrentStep('datetime')}
                  disabled={!selectedVehicle || !station || !charger || !compatibility?.is_compatible}
                  className="w-full"
                >
                  Continue to available slots
                </Button>
              </div>
            )}

            {currentStep === 'datetime' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-[#13423a] bg-[#031912] p-4 text-[#D9D5D2]">
                  <p className="text-sm">Station: {station?.name}</p>
                  <p className="text-sm">Charger: {charger?.charger_code}</p>
                </div>

                {availableSlots.length === 0 ? (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-900">
                    No available slots found for this charger right now.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.value}
                        type="button"
                        onClick={() => setSelectedSlot(slot.value)}
                        className={`rounded-3xl border p-4 text-left ${selectedSlot === slot.value ? 'border-[#4C736F] bg-[#E6FFFA]' : 'border-[#CBD5E1] bg-white/90 hover:border-[#4C736F]'}`}
                      >
                        <p className="text-sm text-[#0F172A]">{formatSlot(slot.value)}</p>
                        <p className="mt-2 text-xs text-[#475569]">Available</p>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={handleConfirmSlot} disabled={!selectedSlot}>
                    Continue to payment
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 'payment' && (
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="rounded-xl border border-[#13423a] bg-[#031912] p-4 text-[#D9D5D2]">
                  <p className="text-sm">Station: {station?.name}</p>
                  <p className="text-sm">Charger: {charger?.charger_code}</p>
                  <p className="text-sm">Vehicle: {selectedVehicle?.brand} {selectedVehicle?.model}</p>
                  <p className="text-sm">Slot: {selectedSlot ? formatSlot(selectedSlot) : 'Not selected'}</p>
                </div>

                <div>
                  <Label htmlFor="cardholderName">Cardholder Name</Label>
                  <Input
                    id="cardholderName"
                    value={paymentData.cardholderName}
                    onChange={(e) => setPaymentData((prev) => ({ ...prev, cardholderName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    value={paymentData.cardNumber}
                    onChange={(e) => setPaymentData((prev) => ({ ...prev, cardNumber: e.target.value }))}
                    placeholder="1234 5678 9012 3456"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      value={paymentData.expiryDate}
                      onChange={(e) => setPaymentData((prev) => ({ ...prev, expiryDate: e.target.value }))}
                      placeholder="MM/YY"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      value={paymentData.cvv}
                      onChange={(e) => setPaymentData((prev) => ({ ...prev, cvv: e.target.value }))}
                      placeholder="123"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Processing...' : 'Confirm payment'}
                </Button>
              </form>
            )}

            {currentStep === 'confirmation' && (
              <div className="text-center space-y-4">
                <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                <h2 className="text-2xl font-bold text-green-600">Reservation complete</h2>
                <p className="text-gray-600">Your reservation is confirmed. View it on your reservations page.</p>
                <Button onClick={handleClose} className="mt-6">
                  Go to reservations
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}