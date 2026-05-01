'use client';

import { ChangeEvent } from 'react';

type ConnectorType = 'CCS' | 'CHAdeMO' | 'Type2';

const connectorOptions: ConnectorType[] = ['CCS', 'CHAdeMO', 'Type2'];

const powerOptions = [
  { id: 'low', label: 'Up to 50 kW', value: [0, 50] as [number, number] },
  { id: 'medium', label: '50 - 150 kW', value: [50, 150] as [number, number] },
  { id: 'high', label: '150+ kW', value: [150, 1000] as [number, number] },
];

interface FilterPanelProps {
  selectedConnectors: ConnectorType[];
  selectedPowerId: string;
  priceRange: [number, number];
  onConnectorChange: (connector: ConnectorType, checked: boolean) => void;
  onPowerChange: (powerId: string) => void;
  onPriceChange: (priceRange: [number, number]) => void;
}

export function FilterPanel({
  selectedConnectors,
  selectedPowerId,
  priceRange,
  onConnectorChange,
  onPowerChange,
  onPriceChange,
}: FilterPanelProps) {
  const handleConnectorToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const connector = event.target.value as ConnectorType;
    onConnectorChange(connector, event.target.checked);
  };

  const handlePriceMinChange = (event: ChangeEvent<HTMLInputElement>) => {
    const min = Number(event.target.value);
    onPriceChange([Math.min(min, priceRange[1]), priceRange[1]]);
  };

  const handlePriceMaxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const max = Number(event.target.value);
    onPriceChange([priceRange[0], Math.max(max, priceRange[0])]);
  };

  return (
    <aside className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)] text-[#F2F2F0] max-h-[calc(100vh-180px)] overflow-auto lg:max-h-[calc(100vh-140px)]">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#70B4A6]">Filters</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Station search</h2>
          <p className="mt-2 text-sm text-[#D9D5D2]/80">
            Narrow results by connector type, charger power, and price range.
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-[#13423a]/80 bg-[#042117]/95 p-4">
          <p className="text-sm font-semibold text-white">Connector type</p>
          <div className="space-y-2">
            {connectorOptions.map((option) => (
              <label
                key={option}
                className="inline-flex w-full cursor-pointer items-center justify-between rounded-2xl border border-[#0E3A2F] bg-[#031B16] px-4 py-3 text-sm transition hover:border-[#6BC0A4]"
              >
                <span>{option}</span>
                <input
                  type="checkbox"
                  value={option}
                  checked={selectedConnectors.includes(option)}
                  onChange={handleConnectorToggle}
                  className="h-4 w-4 rounded border-gray-300 text-[#6BC0A4] focus:outline-none focus:ring-2 focus:ring-[#6BC0A4]"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-3xl border border-[#13423a]/80 bg-[#042117]/95 p-4">
          <p className="text-sm font-semibold text-white">Charger power</p>
          <div className="grid gap-3">
            {powerOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => onPowerChange(option.id)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  selectedPowerId === option.id
                    ? 'border-[#6BC0A4] bg-[#0F3E32] text-white'
                    : 'border-[#0E3A2F] bg-[#031B16] text-[#D9D5D2] hover:border-[#6BC0A4]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-3xl border border-[#13423a]/80 bg-[#042117]/95 p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-white">Price range</p>
            <span className="text-xs text-[#D9D5D2]/80">${priceRange[0].toFixed(1)} - ${priceRange[1].toFixed(1)}</span>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs text-[#D9D5D2]/80">
                <span>Min</span>
                <span>${priceRange[0].toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.1}
                value={priceRange[0]}
                onChange={handlePriceMinChange}
                className="w-full accent-[#6BC0A4] h-2 rounded-full bg-[#0A2E23]"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs text-[#D9D5D2]/80">
                <span>Max</span>
                <span>${priceRange[1].toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.1}
                value={priceRange[1]}
                onChange={handlePriceMaxChange}
                className="w-full accent-[#6BC0A4] h-2 rounded-full bg-[#0A2E23]"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
