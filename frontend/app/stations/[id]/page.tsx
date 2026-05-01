import Link from 'next/link';
import { ArrowLeft, BatteryCharging, DollarSign, Wifi, Zap } from 'lucide-react';
import { ChargingStation } from '@/lib/types';
import { stationChargerDevices } from '@/lib/mockData';

const statusStyles: Record<string, string> = {
  available: 'bg-emerald-500/10 text-emerald-300',
  occupied: 'bg-amber-500/10 text-amber-300',
  offline: 'bg-red-500/10 text-red-300',
};

const chargerTypeStyles: Record<string, string> = {
  AC: 'bg-sky-500/10 text-sky-300',
  DC: 'bg-violet-500/10 text-violet-300',
};

interface StationDetailsPageProps {
  params: { id: string };
}

export default function StationDetailsPage({ params }: StationDetailsPageProps) {
  const station: ChargingStation = {
    id: Number(params.id),
    name: 'Greenway Charging Hub',
    latitude: 41.0082,
    longitude: 28.9784,
    address: 'Bosphorus Avenue 12',
    city: 'Istanbul',
    operating_hours: '24/7',
    status: 'active',
    created_at: '2026-04-30T12:00:00Z',
  };

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/stations"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#70B4A6] transition hover:text-[#6BC0A4]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to stations
        </Link>

        <div className="mt-6 rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Station details</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">{station.name}</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#D9D5D2]/80">
                Fast charging hub with multiple DC and AC chargers, ideal for drivers in the city.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-[#4C736F] bg-[#062C24] px-4 py-2 text-sm text-[#D9D5D2]">
                <Zap className="h-4 w-4 text-[#6BC0A4]" />
                {station.latitude.toFixed(2)}, {station.longitude.toFixed(2)}
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-[#4C736F] bg-[#062C24] px-4 py-2 text-sm text-[#D9D5D2]">
                <BatteryCharging className="h-4 w-4 text-[#6BC0A4]" />
                {stationChargerDevices.length} chargers
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-[#4C736F] bg-[#062C24] px-4 py-2 text-sm text-[#D9D5D2]">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${station.status === 'active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                  {station.status}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {stationChargerDevices.map((device) => (
              <div
                key={device.id}
                className="rounded-[24px] border border-[#18423b]/80 bg-[#042117]/95 p-6 shadow-[0_24px_50px_rgba(0,0,0,0.25)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">{device.charger_code}</p>
                    <h2 className="mt-3 text-xl font-semibold text-white">{device.connector_type}</h2>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${chargerTypeStyles[device.charger_type]}`}>
                    {device.charger_type}
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3 rounded-3xl border border-[#13423a]/80 bg-[#031912]/95 px-4 py-4">
                    <BatteryCharging className="h-4 w-4 text-[#6BC0A4]" />
                    <div>
                      <p className="text-sm text-[#D9D5D2]">Power</p>
                      <p className="text-lg font-semibold text-white">{device.power_output} kW</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-3xl border border-[#13423a]/80 bg-[#031912]/95 px-4 py-4">
                    <DollarSign className="h-4 w-4 text-[#6BC0A4]" />
                    <div>
                      <p className="text-sm text-[#D9D5D2]">Price / kWh</p>
                      <p className="text-lg font-semibold text-white">${device.pricing_per_kwh.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-3xl border border-[#13423a]/80 bg-[#031912]/95 px-4 py-4">
                    <Wifi className="h-4 w-4 text-[#6BC0A4]" />
                    <div>
                      <p className="text-sm text-[#D9D5D2]">Status</p>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[device.status]}`}>
                        {device.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
