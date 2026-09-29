import React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number | string;
};

function AdminIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  );
}

export const Shield = AdminIcon;
export const ShieldCheck = AdminIcon;
export const Lock = AdminIcon;
export const Key = AdminIcon;
export const User = AdminIcon;
export const Server = AdminIcon;
export const Cpu = AdminIcon;
export const Layers = AdminIcon;
export const Activity = AdminIcon;
export const CheckCircle2 = AdminIcon;
export const AlertTriangle = AdminIcon;
export const Search = AdminIcon;
export const Filter = AdminIcon;
export const RefreshCw = AdminIcon;
export const LogOut = AdminIcon;
export const ChevronRight = AdminIcon;
export const Bot = AdminIcon;
export const Sparkles = AdminIcon;
export const Clock = AdminIcon;
export const ArrowRight = AdminIcon;
export const Eye = AdminIcon;
export const EyeOff = AdminIcon;
export const Database = AdminIcon;
export const Terminal = AdminIcon;
export const Zap = AdminIcon;
export const Globe = AdminIcon;
export const Radio = AdminIcon;
export const SlidersHorizontal = AdminIcon;
export const X = AdminIcon;