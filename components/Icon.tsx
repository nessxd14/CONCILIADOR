import type { CSSProperties } from "react";

const paths = {
  menu: "M4 6h16M4 12h16M4 18h16",
  chart: "M4 20V10M10 20V4M16 20v-8M22 20H2",
  calendar: "M4 5h16v16H4ZM8 3v4M16 3v4M4 10h16",
  wallet: "M3 6h17v14H3ZM3 6V3h14v3M16 10h5v6h-5ZM17 13h.1",
  credit: "M3 5h18v14H3ZM3 9h18M7 15h4",
  receipt: "M5 3h14v18l-3-2-4 2-4-2-3 2ZM9 7h6M9 11h6M9 15h3",
  box: "M3 7l9-5 9 5v10l-9 5-9-5ZM3 7l9 5 9-5M12 12v10M7 4l10 6",
  lock: "M5 10h14v11H5ZM8 10V6a4 4 0 0 1 8 0v4M12 14v3",
  home: "M3 10 12 3l9 7M5 9v11h14V9M9 20v-7h6v7",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87",
  folder: "M3 7h7l2 2h9v11H3ZM3 7V4h6l3 3",
  camera: "M3 7h4l2-3h6l2 3h4v13H3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  book: "M4 3h16v18H4ZM8 3v18M12 8h4M12 12h4",
  arrow: "M5 12h14M13 6l6 6-6 6",
  back: "M19 12H5M11 6l-6 6 6 6",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M16 16l5 5",
  refresh: "M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 2M4 17l2 2a7 7 0 0 0 12-2",
  check: "M5 12l4 4L19 6",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2",
  logout: "M9 21H3V3h6M10 12h11M17 8l4 4-4 4",
  plus: "M12 5v14M5 12h14",
  alert: "M12 3 2 21h20ZM12 9v5M12 17v.1",
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name, size = 20, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>;
}
