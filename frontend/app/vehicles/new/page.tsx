'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Vehicle } from '@/lib/types';
import { vehicleApi, handleApiError } from '@/lib/api';
import { useRouter } from 'next/navigation';

const brandOptions = ['Tesla', 'Nissan', 'Audi', 'BMW', 'Hyundai', 'Volkswagen'];
const connectorOptions: Vehicle['connector_type'][] = ['CCS', 'CHAdeMO', 'Type2'];

interface NewVehicleForm {
  brand: string;
  model: string;
  battery_capacity: number | '';
  connector_type: Vehicle['connector_type'] | '';
  plate_number: string;
}

interface FormErrors {
  brand?: string;
  model?: string;
  battery_capacity?: string;
  connector_type?: string;
  plate_number?: string;
}

export default function NewVehiclePage() {
  const router = useRouter();
  const [form, setForm] = useState<NewVehicleForm>({
    brand: '',
    model: '',
    battery_capacity: '',
    connector_type: '',
    plate_number: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validateForm = (data: NewVehicleForm): FormErrors => {
    const errors: FormErrors = {};

    if (!data.brand.trim()) {
      errors.brand = 'Choose a vehicle brand.';
    }

    if (!data.model.trim()) {
      errors.model = 'Model name is required.';
    }

    const batteryNum = typeof data.battery_capacity === 'number' ? data.battery_capacity : Number(data.battery_capacity);
    if (Number.isNaN(batteryNum) || batteryNum <= 0) {
      errors.battery_capacity = 'Battery capacity must be a positive number.';
    }

    if (!data.connector_type) {
      errors.connector_type = 'Select a connector type.';
    }

    if (!data.plate_number.trim()) {
      errors.plate_number = 'Plate number is required.';
    }

    return errors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormErrors({});
    setApiError(null);

    const errors = validateForm(form);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    try {
      await vehicleApi.create({
        brand: form.brand,
        model: form.model,
        battery_capacity: typeof form.battery_capacity === 'number' ? form.battery_capacity : Number(form.battery_capacity),
        connector_type: form.connector_type,
        plate_number: form.plate_number,
      });
      router.push('/vehicles');
    } catch (error) {
      const apiErr = handleApiError(error);
      setApiError(apiErr.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/vehicles"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#70B4A6] transition hover:text-[#6BC0A4]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to vehicles
        </Link>

        <div className="mt-6 rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">New vehicle</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Register a new vehicle</h1>
            <p className="mt-2 text-sm leading-6 text-[#D9D5D2]/80">
              Fill in the details below to add a new vehicle to your account.
            </p>
          </div>

          {apiError && (
            <div className="mb-6 rounded-2xl border border-[#D45D5D]/40 bg-[#3F1818]/50 px-4 py-3 text-sm text-[#F2D1D1]">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#D9D5D2]">Brand</span>
                <select
                  value={form.brand}
                  onChange={(event) => setForm({ ...form, brand: event.target.value })}
                  className="w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20"
                >
                  <option value="">Choose a brand</option>
                  {brandOptions.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
                {formErrors.brand ? <p className="text-sm text-[#F2D1D1]">{formErrors.brand}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#D9D5D2]">Model</span>
                <input
                  type="text"
                  value={form.model}
                  onChange={(event) => setForm({ ...form, model: event.target.value })}
                  className="w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20"
                  placeholder="e.g. Model 3"
                />
                {formErrors.model ? <p className="text-sm text-[#F2D1D1]">{formErrors.model}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#D9D5D2]">Battery capacity (kWh)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.battery_capacity}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      battery_capacity: event.target.value === '' ? '' : Number(event.target.value),
                    })
                  }
                  className="w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20"
                  placeholder="e.g. 82"
                />
                {formErrors.battery_capacity ? (
                  <p className="text-sm text-[#F2D1D1]">{formErrors.battery_capacity}</p>
                ) : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#D9D5D2]">Connector type</span>
                <select
                  value={form.connector_type}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      connector_type: event.target.value as Vehicle['connector_type'] | '',
                    })
                  }
                  className="w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20"
                >
                  <option value="">Choose connector</option>
                  {connectorOptions.map((connector) => (
                    <option key={connector} value={connector}>
                      {connector}
                    </option>
                  ))}
                </select>
                {formErrors.connector_type ? (
                  <p className="text-sm text-[#F2D1D1]">{formErrors.connector_type}</p>
                ) : null}
              </label>

              <label className="sm:col-span-2 space-y-2">
                <span className="text-sm font-medium text-[#D9D5D2]">Plate number</span>
                <input
                  type="text"
                  value={form.plate_number}
                  onChange={(event) => setForm({ ...form, plate_number: event.target.value })}
                  className="w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20"
                  placeholder="e.g. 34EV1234"
                />
                {formErrors.plate_number ? (
                  <p className="text-sm text-[#F2D1D1]">{formErrors.plate_number}</p>
                ) : null}
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#18423b]/80 pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/vehicles"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#3E6359] bg-[#0D2B25] px-5 text-sm font-semibold text-[#C6E3DA] transition hover:border-[#6BC0A4] hover:bg-[#133A31]"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#4C736F] px-5 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#6BC0A4] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Register vehicle'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
