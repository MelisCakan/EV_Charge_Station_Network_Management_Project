'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, X } from 'lucide-react';
import { Vehicle } from '@/lib/types';
import { vehicleApi, handleApiError } from '@/lib/api';
import { sampleVehicles } from '@/lib/mockData';

const brandOptions = ['Tesla', 'Nissan', 'Audi', 'BMW', 'Hyundai', 'Volkswagen'];
const connectorOptions: Vehicle['connector_type'][] = ['CCS', 'CHAdeMO', 'Type2'];

interface EditForm {
  brand: string;
  model: string;
  battery_capacity: number;
  connector_type: Vehicle['connector_type'];
  plate_number: string;
}

interface FormErrors {
  brand?: string;
  model?: string;
  battery_capacity?: string;
  connector_type?: string;
  plate_number?: string;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(sampleVehicles);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await vehicleApi.list();
      setVehicles(data || sampleVehicles);
    } catch (error) {
      const apiErr = handleApiError(error);
      setApiError(apiErr.message);
      setVehicles(sampleVehicles);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (vehicleId: number) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    setIsDeleting(true);
    try {
      await vehicleApi.delete(vehicleId);
      setVehicles((current) => current.filter((vehicle) => vehicle.id !== vehicleId));
      if (selectedVehicle?.id === vehicleId) {
        setSelectedVehicle(null);
        setEditForm(null);
        setFormErrors({});
      }
    } catch (error) {
      const apiErr = handleApiError(error);
      alert(`Failed to delete vehicle: ${apiErr.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setEditForm({
      brand: vehicle.brand,
      model: vehicle.model,
      battery_capacity: vehicle.battery_capacity,
      connector_type: vehicle.connector_type,
      plate_number: vehicle.plate_number,
    });
    setFormErrors({});
  };

  const closeEditModal = () => {
    setSelectedVehicle(null);
    setEditForm(null);
    setFormErrors({});
  };

  const validateEditForm = (form: EditForm): FormErrors => {
    const errors: FormErrors = {};

    if (!form.brand.trim()) {
      errors.brand = 'Choose a vehicle brand.';
    }

    if (!form.model.trim()) {
      errors.model = 'Model name is required.';
    }

    if (Number.isNaN(form.battery_capacity) || form.battery_capacity <= 0) {
      errors.battery_capacity = 'Battery capacity must be a positive number.';
    }

    if (!form.connector_type) {
      errors.connector_type = 'Select a connector type.';
    }

    if (!form.plate_number.trim()) {
      errors.plate_number = 'Plate number is required.';
    }

    return errors;
  };

  const handleSave = async () => {
    if (!editForm || !selectedVehicle) return;

    const errors = validateEditForm(editForm);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    try {
      const updatedVehicle = await vehicleApi.update(selectedVehicle.id, editForm);
      setVehicles((current) =>
        current.map((vehicle) =>
          vehicle.id === selectedVehicle.id
            ? { ...vehicle, ...updatedVehicle }
            : vehicle
        )
      );
      closeEditModal();
    } catch (error) {
      const apiErr = handleApiError(error);
      alert(`Failed to save vehicle: ${apiErr.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">My vehicles</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Registered EVs</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#D9D5D2]/80">
              Manage your registered vehicles and review connector information, battery capacity, and plate details.
            </p>
          </div>

          <Link
            href="/vehicles/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#4C736F] bg-[#0B3E34] px-5 py-3 text-sm font-semibold text-[#F2F2F0] shadow-[0_12px_30px_rgba(11,62,52,0.3)] transition hover:border-[#6BC0A4] hover:bg-[#11614b]"
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Link>
        </div>

        {apiError && (
          <div className="mt-6 rounded-2xl border border-[#D45D5D]/40 bg-[#3F1818]/50 px-4 py-3 text-sm text-[#F2D1D1]">
            {apiError}
          </div>
        )}

        <div className="mt-8 overflow-hidden rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 shadow-[0_30px_70px_rgba(0,0,0,0.25)]">
          <div className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_0.85fr] gap-0 border-b border-[#18423b]/80 bg-[#042117]/95 px-5 py-4 text-xs uppercase tracking-[0.27em] text-[#9fd1c8]/90 sm:text-sm">
            <span className="font-semibold">Brand</span>
            <span className="font-semibold">Model</span>
            <span className="font-semibold">Battery</span>
            <span className="font-semibold">Connector</span>
            <span className="font-semibold">Plate</span>
            <span className="sr-only">Actions</span>
          </div>

          {vehicles.length > 0 ? (
            <div className="divide-y divide-[#13423a]/60">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_0.85fr] items-center gap-0 px-5 py-5 text-sm sm:text-base"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-white">{vehicle.brand}</p>
                    <p className="text-xs text-[#D9D5D2]/70 sm:text-sm">Added {new Date(vehicle.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-[#E7F0EA]">{vehicle.model}</div>
                  <div className="text-[#E7F0EA]">{vehicle.battery_capacity} kWh</div>
                  <div className="text-[#E7F0EA]">{vehicle.connector_type}</div>
                  <div className="text-[#E7F0EA]">{vehicle.plate_number}</div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(vehicle)}
                      className="inline-flex h-10 items-center justify-center rounded-2xl border border-[#3E6359] bg-[#0D2B25] px-3 text-sm text-[#C6E3DA] transition hover:border-[#6BC0A4] hover:bg-[#133A31]"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(vehicle.id)}
                      disabled={isDeleting}
                      className="inline-flex h-10 items-center justify-center rounded-2xl border border-[#592D2D] bg-[#2C1111] px-3 text-sm text-[#F2D1D1] transition hover:border-[#D45D5D] hover:bg-[#3F1818] disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-[#D9D5D2]/80 sm:text-base">
              No registered vehicles yet. Use the button above to add your first car.
            </div>
          )}
        </div>
      </div>

      {selectedVehicle && editForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-6 shadow-[0_35px_80px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#18423b]/80 pb-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Edit vehicle</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Update vehicle details</h2>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#3E6359] bg-[#0D2B25] text-[#D9D5D2] transition hover:border-[#6BC0A4] hover:bg-[#133A31]"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#D9D5D2]">Brand</span>
                <select
                  value={editForm.brand}
                  onChange={(event) => setEditForm({ ...editForm, brand: event.target.value })}
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
                  value={editForm.model}
                  onChange={(event) => setEditForm({ ...editForm, model: event.target.value })}
                  className="w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20"
                />
                {formErrors.model ? <p className="text-sm text-[#F2D1D1]">{formErrors.model}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#D9D5D2]">Battery capacity (kWh)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={editForm.battery_capacity}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      battery_capacity: Number(event.target.value),
                    })
                  }
                  className="w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20"
                />
                {formErrors.battery_capacity ? (
                  <p className="text-sm text-[#F2D1D1]">{formErrors.battery_capacity}</p>
                ) : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#D9D5D2]">Connector type</span>
                <select
                  value={editForm.connector_type}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      connector_type: event.target.value as Vehicle['connector_type'],
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
                  value={editForm.plate_number}
                  onChange={(event) => setEditForm({ ...editForm, plate_number: event.target.value })}
                  className="w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20"
                />
                {formErrors.plate_number ? (
                  <p className="text-sm text-[#F2D1D1]">{formErrors.plate_number}</p>
                ) : null}
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-[#18423b]/80 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#3E6359] bg-[#0D2B25] px-5 text-sm font-semibold text-[#C6E3DA] transition hover:border-[#6BC0A4] hover:bg-[#133A31]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#4C736F] px-5 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#6BC0A4] disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
