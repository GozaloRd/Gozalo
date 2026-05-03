import LogoG from "./LogoG";

type LogoSize = "sm" | "md" | "lg";

const sizeMap: Record<LogoSize, "sm" | "md"> = {
  sm: "sm",
  md: "md",
  lg: "md",
};

export function Logo({ size = "md" }: { size?: LogoSize }) {
  return <LogoG size={sizeMap[size]} />;
}
