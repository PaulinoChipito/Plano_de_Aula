import React from "react";
import Svg, {
  Path,
  Circle,
  Line,
  Polyline,
  Polygon,
  Rect,
  G,
} from "react-native-svg";

export type IconName =
  | "add"
  | "account-check"
  | "account-check-outline"
  | "arrow-right"
  | "bar-chart-2"
  | "bell"
  | "book-open"
  | "book-open-variant"
  | "calendar"
  | "calendar-outline"
  | "camera"
  | "check"
  | "checkmark"
  | "chevron-back"
  | "chevron-down"
  | "chevron-forward"
  | "chip"
  | "clipboard"
  | "clipboard-check"
  | "clipboard-text-outline"
  | "clock"
  | "close"
  | "download"
  | "edit"
  | "edit-2"
  | "file-text"
  | "help-circle"
  | "home"
  | "info"
  | "layers"
  | "mail"
  | "people"
  | "people-outline"
  | "person"
  | "person-add"
  | "phone"
  | "refresh-cw"
  | "robot"
  | "school"
  | "settings"
  | "shield"
  | "stats-chart"
  | "trash-2"
  | "upload"
  | "user"
  | "user-plus"
  | "users"
  | "alert-circle"
  | "alert-triangle"
  | "check-circle"
  | "cpu"
  | "save"
  | "smartphone"
  | "trending-up"
  | "x"
  | "zap";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: object;
}

const sw = 2;
const lc = "round" as const;
const lj = "round" as const;

function renderIcon(name: IconName, color: string, s: number) {
  const p = { stroke: color, strokeWidth: sw, strokeLinecap: lc, strokeLinejoin: lj, fill: "none" };
  const f = { fill: color, stroke: "none" };

  switch (name) {
    case "add":
      return (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" {...p} />
          <Line x1="5" y1="12" x2="19" y2="12" {...p} />
        </>
      );
    case "account-check":
      return (
        <>
          <Path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" {...f} />
          <Path d="M21 7l-2.5 2.5-1-1" {...p} strokeWidth={1.5} />
          <Circle cx="21" cy="7" r="0" fill="none" />
        </>
      );
    case "account-check-outline":
      return (
        <>
          <Path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" stroke={color} strokeWidth={sw} fill="none" strokeLinecap={lc} strokeLinejoin={lj} />
          <Polyline points="16,14 18.5,16.5 23,12" {...p} />
        </>
      );
    case "arrow-right":
      return (
        <>
          <Line x1="5" y1="12" x2="19" y2="12" {...p} />
          <Polyline points="12 5 19 12 12 19" {...p} />
        </>
      );
    case "bar-chart-2":
      return (
        <>
          <Line x1="18" y1="20" x2="18" y2="10" {...p} />
          <Line x1="12" y1="20" x2="12" y2="4" {...p} />
          <Line x1="6" y1="20" x2="6" y2="14" {...p} />
        </>
      );
    case "bell":
      return (
        <>
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" {...p} />
          <Path d="M13.73 21a2 2 0 0 1-3.46 0" {...p} />
        </>
      );
    case "book-open":
      return (
        <>
          <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" {...p} />
          <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" {...p} />
        </>
      );
    case "book-open-variant":
      return (
        <>
          <Path d="M12 6v13M12 6C10 4.5 6 4 3 5v13c3-1 7-.5 9 1zM12 6c2-1.5 6-2 9-1v13c-3-1-7-.5-9 1z" {...p} />
        </>
      );
    case "calendar":
      return (
        <>
          <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" {...p} />
          <Line x1="16" y1="2" x2="16" y2="6" {...p} />
          <Line x1="8" y1="2" x2="8" y2="6" {...p} />
          <Line x1="3" y1="10" x2="21" y2="10" {...p} />
        </>
      );
    case "calendar-outline":
      return (
        <>
          <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" {...p} />
          <Line x1="16" y1="2" x2="16" y2="6" {...p} />
          <Line x1="8" y1="2" x2="8" y2="6" {...p} />
          <Line x1="3" y1="10" x2="21" y2="10" {...p} />
        </>
      );
    case "camera":
      return (
        <>
          <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" {...p} />
          <Circle cx="12" cy="13" r="4" {...p} />
        </>
      );
    case "check":
      return <Polyline points="20 6 9 17 4 12" {...p} />;
    case "checkmark":
      return <Polyline points="20 6 9 17 4 12" {...p} />;
    case "chevron-back":
      return <Polyline points="15 18 9 12 15 6" {...p} />;
    case "chevron-down":
      return <Polyline points="6 9 12 15 18 9" {...p} />;
    case "chevron-forward":
      return <Polyline points="9 18 15 12 9 6" {...p} />;
    case "chip":
      return (
        <>
          <Rect x="7" y="7" width="10" height="10" rx="1" {...p} />
          <Line x1="9" y1="7" x2="9" y2="4" {...p} />
          <Line x1="12" y1="7" x2="12" y2="4" {...p} />
          <Line x1="15" y1="7" x2="15" y2="4" {...p} />
          <Line x1="9" y1="20" x2="9" y2="17" {...p} />
          <Line x1="12" y1="20" x2="12" y2="17" {...p} />
          <Line x1="15" y1="20" x2="15" y2="17" {...p} />
          <Line x1="7" y1="9" x2="4" y2="9" {...p} />
          <Line x1="7" y1="12" x2="4" y2="12" {...p} />
          <Line x1="7" y1="15" x2="4" y2="15" {...p} />
          <Line x1="20" y1="9" x2="17" y2="9" {...p} />
          <Line x1="20" y1="12" x2="17" y2="12" {...p} />
          <Line x1="20" y1="15" x2="17" y2="15" {...p} />
        </>
      );
    case "clipboard":
      return (
        <>
          <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" {...p} />
          <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" {...p} />
        </>
      );
    case "clipboard-check":
      return (
        <>
          <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" {...p} />
          <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" {...p} />
          <Polyline points="9 14 11 16 15 12" {...p} />
        </>
      );
    case "clipboard-text-outline":
      return (
        <>
          <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" {...p} />
          <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" {...p} />
          <Line x1="9" y1="12" x2="15" y2="12" {...p} />
          <Line x1="9" y1="16" x2="13" y2="16" {...p} />
        </>
      );
    case "clock":
      return (
        <>
          <Circle cx="12" cy="12" r="10" {...p} />
          <Polyline points="12 6 12 12 16 14" {...p} />
        </>
      );
    case "close":
      return (
        <>
          <Line x1="18" y1="6" x2="6" y2="18" {...p} />
          <Line x1="6" y1="6" x2="18" y2="18" {...p} />
        </>
      );
    case "download":
      return (
        <>
          <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" {...p} />
          <Polyline points="7 10 12 15 17 10" {...p} />
          <Line x1="12" y1="15" x2="12" y2="3" {...p} />
        </>
      );
    case "edit":
      return (
        <>
          <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" {...p} />
          <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" {...p} />
        </>
      );
    case "edit-2":
      return (
        <Path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" {...p} />
      );
    case "file-text":
      return (
        <>
          <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...p} />
          <Polyline points="14 2 14 8 20 8" {...p} />
          <Line x1="16" y1="13" x2="8" y2="13" {...p} />
          <Line x1="16" y1="17" x2="8" y2="17" {...p} />
          <Polyline points="10 9 9 9 8 9" {...p} />
        </>
      );
    case "help-circle":
      return (
        <>
          <Circle cx="12" cy="12" r="10" {...p} />
          <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" {...p} />
          <Line x1="12" y1="17" x2="12.01" y2="17" {...p} />
        </>
      );
    case "home":
      return (
        <>
          <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...p} />
          <Polyline points="9 22 9 12 15 12 15 22" {...p} />
        </>
      );
    case "info":
      return (
        <>
          <Circle cx="12" cy="12" r="10" {...p} />
          <Line x1="12" y1="8" x2="12" y2="8" {...p} strokeWidth={3} strokeLinecap="round" />
          <Line x1="12" y1="12" x2="12" y2="16" {...p} />
        </>
      );
    case "layers":
      return (
        <>
          <Polygon points="12 2 2 7 12 12 22 7 12 2" {...p} />
          <Polyline points="2 17 12 22 22 17" {...p} />
          <Polyline points="2 12 12 17 22 12" {...p} />
        </>
      );
    case "mail":
      return (
        <>
          <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" {...p} />
          <Polyline points="22 6 12 13 2 6" {...p} />
        </>
      );
    case "people":
      return (
        <>
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...p} />
          <Circle cx="9" cy="7" r="4" {...p} />
          <Path d="M23 21v-2a4 4 0 0 0-3-3.87" {...p} />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" {...p} />
        </>
      );
    case "people-outline":
      return (
        <>
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...p} />
          <Circle cx="9" cy="7" r="4" {...p} />
          <Path d="M23 21v-2a4 4 0 0 0-3-3.87" {...p} />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" {...p} />
        </>
      );
    case "person":
      return (
        <>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...p} />
          <Circle cx="12" cy="7" r="4" {...p} />
        </>
      );
    case "person-add":
      return (
        <>
          <Path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...p} />
          <Circle cx="8.5" cy="7" r="4" {...p} />
          <Line x1="20" y1="8" x2="20" y2="14" {...p} />
          <Line x1="23" y1="11" x2="17" y2="11" {...p} />
        </>
      );
    case "phone":
      return (
        <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" {...p} />
      );
    case "refresh-cw":
      return (
        <>
          <Polyline points="23 4 23 10 17 10" {...p} />
          <Polyline points="1 20 1 14 7 14" {...p} />
          <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" {...p} />
        </>
      );
    case "robot":
      return (
        <>
          <Rect x="3" y="11" width="18" height="11" rx="2" {...p} />
          <Path d="M9 11V9a3 3 0 0 1 6 0v2" {...p} />
          <Line x1="12" y1="2" x2="12" y2="6" {...p} />
          <Circle cx="9" cy="16" r="1" fill={color} stroke="none" />
          <Circle cx="15" cy="16" r="1" fill={color} stroke="none" />
          <Line x1="9" y1="19" x2="15" y2="19" {...p} />
        </>
      );
    case "school":
      return (
        <>
          <Path d="M3 20V10L12 4l9 6v10H3z" {...p} />
          <Path d="M9 20v-6h6v6" {...p} />
          <Line x1="12" y1="4" x2="12" y2="10" {...p} />
          <Polyline points="9 10 12 8 15 10" {...p} />
        </>
      );
    case "settings":
      return (
        <>
          <Circle cx="12" cy="12" r="3" {...p} />
          <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" {...p} />
        </>
      );
    case "shield":
      return (
        <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...p} />
      );
    case "stats-chart":
      return (
        <>
          <Line x1="18" y1="20" x2="18" y2="10" {...p} />
          <Line x1="12" y1="20" x2="12" y2="4" {...p} />
          <Line x1="6" y1="20" x2="6" y2="14" {...p} />
          <Line x1="3" y1="20" x2="21" y2="20" {...p} />
        </>
      );
    case "trash-2":
      return (
        <>
          <Polyline points="3 6 5 6 21 6" {...p} />
          <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...p} />
          <Line x1="10" y1="11" x2="10" y2="17" {...p} />
          <Line x1="14" y1="11" x2="14" y2="17" {...p} />
        </>
      );
    case "upload":
      return (
        <>
          <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" {...p} />
          <Polyline points="17 8 12 3 7 8" {...p} />
          <Line x1="12" y1="3" x2="12" y2="15" {...p} />
        </>
      );
    case "user":
      return (
        <>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...p} />
          <Circle cx="12" cy="7" r="4" {...p} />
        </>
      );
    case "user-plus":
      return (
        <>
          <Path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...p} />
          <Circle cx="8.5" cy="7" r="4" {...p} />
          <Line x1="20" y1="8" x2="20" y2="14" {...p} />
          <Line x1="23" y1="11" x2="17" y2="11" {...p} />
        </>
      );
    case "users":
      return (
        <>
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...p} />
          <Circle cx="9" cy="7" r="4" {...p} />
          <Path d="M23 21v-2a4 4 0 0 0-3-3.87" {...p} />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" {...p} />
        </>
      );
    case "x":
      return (
        <>
          <Line x1="18" y1="6" x2="6" y2="18" {...p} />
          <Line x1="6" y1="6" x2="18" y2="18" {...p} />
        </>
      );
    case "alert-circle":
      return (
        <>
          <Circle cx="12" cy="12" r="10" {...p} />
          <Line x1="12" y1="8" x2="12" y2="12" {...p} />
          <Line x1="12" y1="16" x2="12.01" y2="16" {...p} strokeWidth={3} strokeLinecap="round" />
        </>
      );
    case "alert-triangle":
      return (
        <>
          <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" {...p} />
          <Line x1="12" y1="9" x2="12" y2="13" {...p} />
          <Line x1="12" y1="17" x2="12.01" y2="17" {...p} strokeWidth={3} strokeLinecap="round" />
        </>
      );
    case "check-circle":
      return (
        <>
          <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" {...p} />
          <Polyline points="22 4 12 14.01 9 11.01" {...p} />
        </>
      );
    case "cpu":
      return (
        <>
          <Rect x="4" y="4" width="16" height="16" rx="2" {...p} />
          <Rect x="9" y="9" width="6" height="6" {...p} />
          <Line x1="9" y1="1" x2="9" y2="4" {...p} />
          <Line x1="15" y1="1" x2="15" y2="4" {...p} />
          <Line x1="9" y1="20" x2="9" y2="23" {...p} />
          <Line x1="15" y1="20" x2="15" y2="23" {...p} />
          <Line x1="20" y1="9" x2="23" y2="9" {...p} />
          <Line x1="20" y1="14" x2="23" y2="14" {...p} />
          <Line x1="1" y1="9" x2="4" y2="9" {...p} />
          <Line x1="1" y1="14" x2="4" y2="14" {...p} />
        </>
      );
    case "save":
      return (
        <>
          <Path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" {...p} />
          <Polyline points="17 21 17 13 7 13 7 21" {...p} />
          <Polyline points="7 3 7 8 15 8" {...p} />
        </>
      );
    case "smartphone":
      return (
        <>
          <Rect x="5" y="2" width="14" height="20" rx="2" ry="2" {...p} />
          <Line x1="12" y1="18" x2="12.01" y2="18" {...p} strokeWidth={3} strokeLinecap="round" />
        </>
      );
    case "trending-up":
      return (
        <>
          <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" {...p} />
          <Polyline points="17 6 23 6 23 12" {...p} />
        </>
      );
    case "zap":
      return <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" {...p} />;
    default:
      return null;
  }
}

export default function Icon({ name, size = 24, color = "#000", style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {renderIcon(name, color, size)}
    </Svg>
  );
}
