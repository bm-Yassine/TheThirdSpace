import React from 'react';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';

/**
 * The app's own icon set.
 *
 * Drawn to match the floating navigation, which uses a 24×24 grid with 2.5
 * stroke weight and round caps. Lucide's default 2 weight sits noticeably
 * lighter next to it, so the overlay controls in Discover looked like they
 * came from a different product than the navigation directly beneath them.
 *
 * Only the glyphs that appear over photography live here. Screens on white
 * still use Lucide, where the lighter weight is correct.
 */

type IconProps = {
  size?: number;
  color?: string;
  /** Solid fill, for a favourited heart or a selected state. */
  filled?: boolean;
  strokeWidth?: number;
};

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24' });

export function HeartIcon({ size = 20, color = '#fff', filled = false, strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CheckIcon({ size = 20, color = '#fff', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M4 12.5 9.5 18 20 6.5"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ClockIcon({ size = 20, color = '#fff', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx="12" cy="12" r="8.5" fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M12 7.5V12l3 2"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PinIcon({ size = 20, color = '#fff', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M12 21.5s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10.5" r="2.6" fill="none" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function PeopleIcon({ size = 20, color = '#fff', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx="9" cy="8" r="3.4" fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M16.5 5.2a3.4 3.4 0 0 1 0 5.6M17.5 14.9c2 .6 3.5 2.3 3.5 4.6"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PauseIcon({ size = 20, color = '#fff', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Line x1="9" y1="5.5" x2="9" y2="18.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="15" y1="5.5" x2="15" y2="18.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function PlayIcon({ size = 20, color = '#fff', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M7.5 5.2 19 12 7.5 18.8z"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SoundOnIcon({ size = 20, color = '#fff', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Path
        d="M15.8 9a4.2 4.2 0 0 1 0 6M18.4 6.4a7.8 7.8 0 0 1 0 11.2"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function SoundOffIcon({ size = 20, color = '#fff', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Line x1="16" y1="9.5" x2="21" y2="14.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="21" y1="9.5" x2="16" y2="14.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function CardsIcon({ size = 20, color = '#fff', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}
