"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

interface FuelPumpIllustrationProps {
  pumpNumber?: string;
  fuelType?: {
    name: string;
    code: string;
    color: string;
  };
  status?: "active" | "maintenance" | "offline";
  className?: string;
}

export function FuelPumpIllustration({
  pumpNumber,
  fuelType,
  status = "active",
  className,
}: FuelPumpIllustrationProps) {
  const statusColors = {
    active: "#22c55e",
    maintenance: "#f97316",
    offline: "#ef4444",
  };

  const statusLabels = {
    active: "ACTIVE",
    maintenance: "MAINT",
    offline: "OFFLINE",
  };

  const statusColor = statusColors[status];
  const fuelColor = fuelType?.color || "#3b82f6";

  return (
    <div className={cn("relative", className)}>
      {/* 3D Fuel Pump Image */}
      <div className="relative w-full h-full flex items-center justify-center pt-8">
        <Image
          src="/images/fuel/fuel-pump-3d.png"
          alt="3D Fuel Pump"
          width={180}
          height={240}
          className="object-contain drop-shadow-2xl"
          style={{ filter: "drop-shadow(0 15px 30px rgba(0,0,0,0.25))" }}
          priority
        />

        {/* Pump Number Badge - Top */}
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl shadow-lg"
          style={{
            backgroundColor: fuelColor,
            boxShadow: `0 4px 20px ${fuelColor}40`,
          }}
        >
          <span className="text-white font-bold text-base tracking-wide whitespace-nowrap">
            {pumpNumber ? `PUMP ${pumpNumber}` : "PUMP —"}
          </span>
        </div>

        {/* Status Indicator - Top Right */}
        <div
          className="absolute top-8 -right-2 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-md"
        >
          <div className="relative">
            {status === "active" && (
              <div
                className="w-2.5 h-2.5 rounded-full animate-ping absolute"
                style={{ backgroundColor: statusColor, opacity: 0.5 }}
              />
            )}
            <div
              className="w-2.5 h-2.5 rounded-full relative"
              style={{
                backgroundColor: statusColor,
                boxShadow: `0 0 8px 2px ${statusColor}60`,
              }}
            />
          </div>
          <span
            className="text-[9px] font-bold tracking-wide"
            style={{ color: statusColor }}
          >
            {statusLabels[status]}
          </span>
        </div>

        {/* Fuel Type Badge - Below pump */}
        {fuelType && (
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-lg shadow-lg"
            style={{
              backgroundColor: fuelColor,
              boxShadow: `0 4px 16px ${fuelColor}50`,
            }}
          >
            <div className="text-center">
              <div className="text-white font-bold text-sm tracking-wide">
                {fuelType.code || fuelType.name.substring(0, 3).toUpperCase()}
              </div>
              <div className="text-white/80 text-[9px] font-medium">
                {fuelType.name}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
