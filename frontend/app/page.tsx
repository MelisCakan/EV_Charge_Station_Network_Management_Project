import { Suspense } from "react";
import { MapView } from "@/components/map/MapView";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center p-4 h-[calc(100vh-64px)] w-full">
      <div className="w-full max-w-7xl h-full flex flex-col gap-4">
        <h1 className="text-2xl font-bold">EV Charging Stations</h1>
        <div className="flex-1 w-full">
          <Suspense fallback={<div className="text-[#A7BEB5]">Loading map...</div>}>
            <MapView />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
