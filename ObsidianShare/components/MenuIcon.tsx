import React from "react";
import Svg, { Path } from "react-native-svg";

interface MenuIconProps {
  size?: number;
  color?: string;
}

export function MenuIcon({ size = 20, color = "#1d1b20" }: MenuIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M3 6.5h13M3 13.5h8"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}
