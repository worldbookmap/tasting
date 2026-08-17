"use client";

import "leaflet/dist/leaflet.css";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, GeoJsonObject } from "geojson";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsRotate,
  faBookOpen,
  faCalendarAlt,
  faCamera,
  faCheck,
  faChevronLeft,
  faChevronRight,
  faGlassCheers,
  faHouse,
  faList,
  faPen,
  faSearch,
  faSpinner,
  faTableCellsLarge,
  faTrash,
  faUpload,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import distilleries from "@/assets/distillery.json";

type RegionBlock = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  center?: [number, number];
};

const LeafletMap = dynamic(
  async () => {
    const mod = await import("react-leaflet");
    const MapController = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
      const map = mod.useMap();
      useEffect(() => {
        map.flyTo(center, zoom, { duration: 1.2 });
      }, [map, center, zoom]);
      return null;
    };

    return function LeafletMapInner({
      center,
      zoom,
      children,
      className,
      ...props
    }: {
      center: [number, number];
      zoom: number;
      children: React.ReactNode;
      className?: string;
      [key: string]: unknown;
    }) {
      return (
        <mod.MapContainer center={center} zoom={zoom} className={className ? `relative ${className}` : "relative"} {...props}>
          {children}
          <MapController center={center} zoom={zoom} />
        </mod.MapContainer>
      );
    };
  },
  { ssr: false },
);

const LeafletTileLayer = dynamic(
  async () => (await import("react-leaflet")).TileLayer,
  { ssr: false },
);

const LeafletCircleMarker = dynamic(
  async () => (await import("react-leaflet")).CircleMarker,
  { ssr: false },
);

const LeafletRectangle = dynamic(
  async () => (await import("react-leaflet")).Rectangle,
  { ssr: false },
);

const LeafletGeoJSON = dynamic(
  async () => (await import("react-leaflet")).GeoJSON,
  { ssr: false },
);

const LeafletMarker = dynamic(
  async () => (await import("react-leaflet")).Marker,
  { ssr: false },
);

let leafletDivIconFactory: ((options: Record<string, unknown>) => unknown) | null = null;

if (typeof window !== "undefined") {
  import("leaflet").then((module) => {
    leafletDivIconFactory = module.divIcon;
  }).catch(() => {
    leafletDivIconFactory = null;
  });
}

const getRegionLabelPalette = (label: string) => {
  const palettes = [
    { bg: "#f8efe7", border: "#b67d56" },
    { bg: "#eef7ef", border: "#6d9a74" },
    { bg: "#edf3fb", border: "#648cc5" },
    { bg: "#f7ecf7", border: "#9b6eb3" },
    { bg: "#fdf0e3", border: "#d18d5d" },
    { bg: "#eefaf9", border: "#5f9e97" },
  ];

  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }

  return palettes[Math.abs(hash) % palettes.length];
};

const createBlockLabelIcon = (label: string, isActive = false, isDimmed = false) => {
  if (!leafletDivIconFactory || typeof window === "undefined") return undefined;
  const palette = getRegionLabelPalette(label);
  const background = isActive ? "rgba(255,247,242,0.98)" : isDimmed ? "rgba(248,242,237,0.85)" : palette.bg;
  const border = isActive ? "rgba(93,57,44,0.9)" : isDimmed ? "rgba(196,170,155,0.8)" : palette.border;
  const shadow = isActive
    ? "0 0 0 3px rgba(199,145,108,0.17), 0 10px 18px rgba(48,31,23,0.18)"
    : "0 2px 8px rgba(26,18,15,0.07)";
  const textColor = isActive ? "#2d201d" : isDimmed ? "rgba(96,76,68,0.72)" : "#473b36";
  const opacity = isDimmed ? 0.7 : 1;

  const icon = leafletDivIconFactory({
    className: "region-label-icon",
    html: `<div style="display:flex;align-items:center;justify-content:center;min-width:62px;padding:4px 10px;border-radius:999px;background:${background};border:1.5px solid ${border};box-shadow:${shadow};color:${textColor};font-size:9px;font-weight:700;letter-spacing:0.02em;line-height:1.1;transform:${isActive ? "translateY(-5px) scale(1.08)" : "translateY(0) scale(1)"};transition:transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;filter:${isActive ? "drop-shadow(0 5px 8px rgba(90,42,34,0.12))" : "none"};opacity:${opacity};">${label}</div>`,
    iconSize: [82, 26],
    iconAnchor: [41, 13],
  });
  return icon as unknown as ReturnType<typeof import("leaflet").divIcon> | undefined;
};

function CustomSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: T | "";
  options: readonly T[];
  onChange: (value: T) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-h-[40px] w-full items-center justify-between rounded-[14px] border border-[#f4d7c8] bg-[#fffaf9]/90 px-3 py-2 text-left text-[12.5px] text-[#2d2522] shadow-[0_4px_12px_rgba(130,96,79,0.05)] transition-all duration-200 hover:border-[#e6b69d] hover:shadow-[0_8px_18px_rgba(130,96,79,0.07)] focus:outline-none"
      >
        <div className="flex min-w-0 items-center gap-2">
          {value ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fce9e3] px-1.5 py-0.5 text-[9px] font-medium tracking-[0.12em] text-[#5c463f]">
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#e7a68c] text-[7px] text-white shadow-sm">✓</span>
              {value}
            </span>
          ) : (
            <span className="text-[#86756d]">{placeholder || "선택"}</span>
          )}
        </div>
        <svg viewBox="0 0 20 20" fill="none" className={`h-4 w-4 text-[#584b45] transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true">
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="custom-select-scroll absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-[18px] border border-[#e7d9c8] bg-[rgba(255,250,247,0.98)] shadow-[0_18px_40px_rgba(58,42,33,0.12)] backdrop-blur-sm">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`group flex w-full items-center justify-between px-3 py-2 text-left text-[11.5px] transition-all duration-200 ${value === option ? "bg-[#fbe7db] text-[#2d201d]" : "text-[#4b3c35] hover:bg-[#fff5ee] hover:translate-x-0.5"}`}
            >
              <span className="flex items-center gap-2">
                <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[8px] transition-all ${value === option ? "border-[#9b6d48] bg-[#9b6d48] text-white shadow-sm" : "border-[#d4b89f] bg-white text-transparent group-hover:border-[#c59d7a]"}`}>
                  ✓
                </span>
                {option}
              </span>
              {value === option && <span className="text-[8px] font-semibold tracking-[0.12em] text-[#725b4e]">선택됨</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomMultiSelect<T extends string>({
  values,
  displayValues = values,
  options,
  onChange,
  label,
}: {
  values: T[];
  displayValues?: string[];
  options: readonly T[];
  onChange: (values: T[]) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-h-[40px] w-full items-center justify-between gap-2 rounded-[14px] border border-[#f4d7c8] bg-[#fffaf9]/90 px-3 py-2 text-left text-[#2d2522] shadow-[0_4px_12px_rgba(130,96,79,0.05)] transition-all duration-200 hover:border-[#e6b69d] focus:outline-none"
      >
        <span className="flex min-w-0 flex-wrap gap-1">
          {displayValues.length ? displayValues.map((value) => (
            <span key={value} className="inline-flex items-center gap-1 rounded-full bg-[#fce9e3] px-2 py-0.5 text-[10px] font-medium text-[#5c463f]">
              <span className="text-[8px]">✓</span>{value}
            </span>
          )) : <span className="text-[12px] text-[#86756d]">선택</span>}
        </span>
        <svg viewBox="0 0 20 20" fill="none" className={`h-4 w-4 shrink-0 text-[#584b45] transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true">
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="custom-select-scroll absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-[18px] border border-[#e7d9c8] bg-[rgba(255,250,247,0.98)] p-1 shadow-[0_18px_40px_rgba(58,42,33,0.12)] backdrop-blur-sm">
          {options.map((option) => {
            const selected = values.includes(option);
            return (
              <button
                key={option}
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => onChange(selected ? values.filter((value) => value !== option) : [...values, option])}
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[12px] transition-colors ${selected ? "bg-[#fbe7db] text-[#2d201d]" : "text-[#4b3c35] hover:bg-[#fff5ee]"}`}
              >
                <span className="flex items-center gap-2">
                  <span className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[9px] ${selected ? "border-[#9b6d48] bg-[#9b6d48] text-white" : "border-[#d4b89f] bg-white text-transparent"}`}>✓</span>
                  {option}
                </span>
                {selected && <span className="text-[9px] font-semibold text-[#725b4e]">선택됨</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WhiskyPinMap({ distillery }: { distillery: Distillery | null }) {
  if (!distillery) return null;

  return (
    <div className="h-64 w-full overflow-hidden rounded-2xl border border-[#d5c2a5]">
      <LeafletMap center={[distillery.latitude, distillery.longitude]} zoom={5} scrollWheelZoom={false} className="h-full w-full" attributionControl={false}>
        <LeafletTileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        <LeafletCircleMarker
          center={[distillery.latitude, distillery.longitude]}
          radius={10}
          pathOptions={{ color: "#d95f48", fillColor: "#d95f48", fillOpacity: 1 }}
        />
      </LeafletMap>
    </div>
  );
}

function WhiskyDistillerySelectionMap({
  items,
  selected,
  onSelect,
}: {
  items: Distillery[];
  selected: Distillery | null;
  onSelect: (distillery: Distillery) => void;
}) {
  const focused = items.length <= 30 ? items[0] : selected;
  const center: [number, number] = focused
    ? [focused.latitude, focused.longitude]
    : [56.5, -4.2];

  return (
    <div className="h-64 w-full overflow-hidden rounded-2xl border border-[#d5c2a5]">
      <LeafletMap center={center} zoom={focused ? 7 : 5} scrollWheelZoom={false} className="h-full w-full" attributionControl={false}>
        <LeafletTileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        {items.map((item) => {
          const isSelected = selected?.name === item.name;
          return (
            <LeafletCircleMarker
              key={`${item.name}-${item.latitude}-${item.longitude}`}
              center={[item.latitude, item.longitude]}
              radius={isSelected ? 10 : 6}
              eventHandlers={{ click: () => onSelect(item) }}
              pathOptions={{
                color: isSelected ? "#4e2d2d" : "#9b6d48",
                weight: isSelected ? 3 : 1.5,
                fillColor: isSelected ? "#d95f48" : "#e7b38d",
                fillOpacity: isSelected ? 1 : 0.78,
              }}
            />
          );
        })}
      </LeafletMap>
    </div>
  );
}

function RegionBlockMap({
  items,
  activeId,
  onSelect,
  showMap = false,
  mapShape,
  geoJson,
  hideUnselected = false,
}: {
  items: RegionBlock[];
  activeId?: string;
  onSelect: (name: string) => void;
  showMap?: boolean;
  mapShape?: string;
  geoJson?: GeoJsonObject;
  hideUnselected?: boolean;
}) {
  if (!items.length) return null;

  const visibleItems = hideUnselected && activeId ? items.filter((item) => item.name === activeId) : items;
  const safeVisibleItems = visibleItems.length ? visibleItems : items;
  if (!safeVisibleItems.length) return null;

  const avgLat = safeVisibleItems.reduce((sum, item) => sum + ((item.center?.[0] ?? ((item.y + item.h / 2) / 100) * 20)), 0) / safeVisibleItems.length;
  const avgLng = safeVisibleItems.reduce((sum, item) => sum + ((item.center?.[1] ?? ((item.x + item.w / 2) / 100) * 28)), 0) / safeVisibleItems.length;
  const center: [number, number] = [avgLat, avgLng];

  const shouldDim = !!activeId && !hideUnselected;

  return (
    <div className="h-64 w-full overflow-hidden rounded-2xl border border-[#d5c2a5]">
      <LeafletMap center={center} zoom={4} scrollWheelZoom={false} className="h-full w-full" attributionControl={false}>
        <LeafletTileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        {geoJson && (
          <LeafletGeoJSON
            data={geoJson}
            style={() => ({
              color: "transparent",
              weight: 0,
              fillColor: "transparent",
              fillOpacity: 0,
              opacity: 0,
            })}
          />
        )}
        {showMap && mapShape && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-70">
            <path d={mapShape} fill="rgba(91,70,58,0.06)" stroke="rgba(74,58,49,0.18)" strokeWidth="0.6" />
          </svg>
        )}
        {visibleItems.map((item) => {
          const isActive = activeId === item.name;
          const isDimmed = shouldDim && !isActive;
          const latCenter = item.center?.[0] ?? ((item.y + item.h / 2) / 100) * 20;
          const lngCenter = item.center?.[1] ?? ((item.x + item.w / 2) / 100) * 28;
          const latSpan = (item.h / 100) * 6;
          const lngSpan = (item.w / 100) * 8;
          const bounds: [[number, number], [number, number]] = [
            [latCenter - latSpan / 2, lngCenter - lngSpan / 2],
            [latCenter + latSpan / 2, lngCenter + lngSpan / 2],
          ];

          return (
            <div key={item.id}>
              <LeafletRectangle
                bounds={bounds}
                eventHandlers={{ click: () => onSelect(item.name) }}
                pathOptions={{
                  color: isActive ? "#4e2d2d" : isDimmed ? "#d7b9a1" : "#c89d7a",
                  weight: isActive ? 3.8 : isDimmed ? 1.2 : 1.7,
                  opacity: isActive ? 1 : isDimmed ? 0.45 : 0.72,
                  fillColor: isActive ? "#c88762" : isDimmed ? "#f6eadf" : "#f3e7d8",
                  fillOpacity: isActive ? 1 : isDimmed ? 0.24 : 0.42,
                  dashArray: isActive ? undefined : "0",
                  className: isActive ? "region-selected" : undefined,
                }}
              />
              <LeafletMarker
                position={[latCenter, lngCenter]}
                icon={createBlockLabelIcon(item.name, isActive, isDimmed)}
                eventHandlers={{ click: () => onSelect(item.name) }}
              />
            </div>
          );
        })}
      </LeafletMap>
    </div>
  );
}

const categoryLabels = { whisky: "위스키", wine: "와인", tea: "차" } as const;
const APP_VERSION = "1.30";
type Category = keyof typeof categoryLabels;
type TagField = "aroma" | "taste" | "finish";
type CustomTags = Record<Category, Record<TagField, string[]>>;

const createEmptyCustomTags = (): CustomTags => ({
  whisky: { aroma: [], taste: [], finish: [] },
  wine: { aroma: [], taste: [], finish: [] },
  tea: { aroma: [], taste: [], finish: [] },
});

type Distillery = {
  name: string;
  name_ko: string;
  latitude: number;
  longitude: number;
};

type Note = {
  id: string;
  category: Category;
  date: string;
  place: string;
  people: string;
  type: string;
  name: string;
  photo: string;
  photoUrl: string;
  labelPhoto: string;
  labelPhotoUrl: string;
  selectedDistillery: Distillery | null;
  distilleryName: string;
  regionName: string;
  teaVariety: string;
  teaLeafPhoto: string;
  teaLeafUrl: string;
  aroma: string;
  taste: string;
  finish: string;
  body: number;
  acidity: number;
  tannin: number;
  alcohol: number;
  sweetness: number;
  complexity: number;
  balance: number;
  notes: string;
  createdAt: string;
};

type FormState = Omit<Note, "id" | "createdAt"> & {
  peopleCustom: string;
};

const whiskyTags = ["오크", "바닐라", "초콜릿", "시트러스", "피트", "허벌", "스모키", "견과류", "과일", "향신료", "달콤함", "상큼함"];
const wineTags = ["꽃향", "과일향", "초콜릿", "허브", "토스트", "흙내음", "스파이스", "미네랄", "산미", "부드러움", "복합성", "풍부함"];
const teaTags = ["꽃향", "시원함", "풀잎", "대추", "볶음향", "과실향", "신선함", "단맛", "구수함", "깊은 향", "부드러움", "정원"];
const whiskyKinds = ["싱글몰트", "블렌디드", "블렌디드몰트", "싱글그레인", "기타"];
const wineKinds = ["스파클링", "화이트", "레드", "로제", "디저트", "기타"];
const teaKinds = ["녹차", "백차", "황차", "청차", "흑차", "홍차"];
const peopleOptions = ["진욱", "지선", "직접입력"] as const;

const parsePeople = (value: string) => value.split(",").map((person) => person.trim()).filter(Boolean);

const resolvePeople = (value: string, customValue: string) => {
  const selected = parsePeople(value).filter((person) => person !== "직접입력");
  const custom = parsePeople(customValue);
  return Array.from(new Set([...selected, ...custom])).join(", ");
};

const getPeopleFormValues = (value: string) => {
  if (value === "함께") return { people: "진욱, 지선", peopleCustom: "" };

  const people = parsePeople(value);
  const selected: string[] = people.filter((person) => person === "진욱" || person === "지선");
  const custom = people.filter((person) => person !== "진욱" && person !== "지선");
  if (custom.length) selected.push("직접입력");
  return { people: selected.join(", "), peopleCustom: custom.join(", ") };
};
type RegionPoint = {
  name: string;
  center: [number, number];
};

const teaRegions: RegionPoint[] = [
  { name: "안휘", center: [30.9, 117.8] },
  { name: "푸젠", center: [26.1, 118.3] },
  { name: "윈난", center: [25.0, 101.0] },
  { name: "저장", center: [29.3, 119.8] },
  { name: "쓰촨", center: [30.7, 104.1] },
  { name: "광둥", center: [23.1, 113.2] },
  { name: "후난", center: [27.6, 109.9] },
  { name: "장시", center: [27.6, 115.9] },
  { name: "구이저우", center: [26.8, 106.7] },
  { name: "허난", center: [34.3, 113.4] },
  { name: "후베이", center: [30.7, 111.3] },
  { name: "광시", center: [23.8, 108.3] },
  { name: "대만", center: [23.7, 120.9] },
  { name: "한국", center: [36.5, 127.8] },
  { name: "일본", center: [36.2, 138.3] },
];

type GeoRegionShape = FeatureCollection;

const geoJsonCountryShapes: Record<string, GeoRegionShape> = {
  프랑스: {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { name: "프랑스" },
      geometry: { type: "Polygon", coordinates: [[[-5.2, 41.2], [-4.8, 48.9], [0.5, 51.2], [7.9, 49.4], [9.3, 43.8], [7.2, 42.4], [1.7, 42.6], [-3.6, 43.5], [-5.2, 41.2]]] },
    }],
  } as GeoRegionShape,
  호주: {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { name: "호주" },
      geometry: { type: "Polygon", coordinates: [[[112.8, -10.5], [114.8, -22.5], [116.2, -34.7], [117.8, -38.5], [129.1, -42.7], [145.7, -42.5], [153.7, -28.0], [154.5, -13.5], [141.0, -12.0], [129.0, -14.0], [116.5, -15.0], [112.8, -10.5]]] },
    }],
  } as GeoRegionShape,
  미국: {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { name: "미국" },
      geometry: { type: "Polygon", coordinates: [[[-124.9, 24.4], [-124.2, 30.0], [-117.3, 32.8], [-109.0, 36.9], [-102.0, 41.0], [-96.4, 47.1], [-92.8, 49.1], [-86.8, 45.0], [-81.7, 28.4], [-79.7, 25.6], [-83.5, 24.1], [-95.3, 25.5], [-104.5, 24.5], [-117.0, 24.6], [-124.9, 24.4]]] },
    }],
  } as GeoRegionShape,
  이탈리아: {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { name: "이탈리아" },
      geometry: { type: "Polygon", coordinates: [[[7.5, 37.0], [8.7, 39.2], [11.2, 46.4], [13.7, 47.8], [17.8, 46.0], [18.3, 40.6], [15.1, 38.1], [11.4, 37.3], [7.5, 37.0]]] },
    }],
  } as GeoRegionShape,
  스페인: {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { name: "스페인" },
      geometry: { type: "Polygon", coordinates: [[[-9.5, 43.0], [-8.1, 43.8], [-3.8, 44.0], [1.2, 41.8], [4.6, 40.4], [3.9, 36.0], [1.4, 35.9], [-5.0, 36.1], [-9.5, 43.0]]] },
    }],
  } as GeoRegionShape,
  칠레: {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { name: "칠레" },
      geometry: { type: "Polygon", coordinates: [[[-75.0, -18.0], [-70.5, -18.8], [-68.0, -22.0], [-71.2, -27.5], [-71.9, -35.2], [-76.7, -38.8], [-77.0, -53.0], [-75.0, -18.0]]] },
    }],
  } as GeoRegionShape,
  아르헨티나: {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { name: "아르헨티나" },
      geometry: { type: "Polygon", coordinates: [[[-73.5, -22.0], [-67.4, -22.0], [-62.8, -26.5], [-58.5, -30.2], [-62.0, -46.2], [-69.5, -52.6], [-73.5, -22.0]]] },
    }],
  } as GeoRegionShape,
  뉴질랜드: {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { name: "뉴질랜드" },
      geometry: { type: "Polygon", coordinates: [[[165.0, -34.0], [176.0, -36.6], [178.6, -37.7], [174.5, -47.0], [169.0, -46.8], [165.0, -34.0]]] },
    }],
  } as GeoRegionShape,
};

const chinaProvinceGeoJson: Record<string, GeoRegionShape> = {
  안휘: { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "안휘" }, geometry: { type: "Polygon", coordinates: [[[116.8, 29.2], [118.5, 29.5], [119.3, 31.4], [118.8, 32.5], [117.4, 32.9], [116.2, 31.3], [116.8, 29.2]]] } }] } as GeoRegionShape,
  푸젠: { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "푸젠" }, geometry: { type: "Polygon", coordinates: [[[117.0, 24.8], [119.0, 25.0], [120.1, 27.7], [118.9, 28.7], [117.4, 27.7], [116.8, 25.8], [117.0, 24.8]]] } }] } as GeoRegionShape,
  윈난: { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "윈난" }, geometry: { type: "Polygon", coordinates: [[[97.5, 21.6], [101.2, 22.0], [105.0, 24.5], [106.1, 27.8], [104.1, 29.2], [100.9, 28.3], [98.1, 25.9], [97.5, 21.6]]] } }] } as GeoRegionShape,
  저장: { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "저장" }, geometry: { type: "Polygon", coordinates: [[[118.5, 28.2], [121.2, 28.6], [122.6, 30.5], [121.6, 31.9], [119.3, 31.2], [118.5, 28.2]]] } }] } as GeoRegionShape,
  쓰촨: { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "쓰촨" }, geometry: { type: "Polygon", coordinates: [[[102.0, 28.0], [106.0, 28.6], [108.9, 31.5], [107.4, 34.2], [103.4, 34.0], [101.0, 31.8], [102.0, 28.0]]] } }] } as GeoRegionShape,
  광둥: { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "광둥" }, geometry: { type: "Polygon", coordinates: [[[112.0, 22.7], [114.5, 22.9], [115.5, 24.8], [114.8, 25.8], [112.6, 25.1], [111.8, 23.5], [112.0, 22.7]]] } }] } as GeoRegionShape,
  후난: { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "후난" }, geometry: { type: "Polygon", coordinates: [[[108.6, 24.7], [112.4, 25.0], [113.6, 28.9], [111.5, 30.6], [109.2, 29.2], [108.6, 24.7]]] } }] } as GeoRegionShape,
  장시: { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "장시" }, geometry: { type: "Polygon", coordinates: [[[113.6, 24.5], [116.5, 24.8], [117.8, 27.3], [116.1, 29.5], [114.2, 28.9], [113.6, 24.5]]] } }] } as GeoRegionShape,
  구이저우: { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "구이저우" }, geometry: { type: "Polygon", coordinates: [[[103.8, 24.5], [107.2, 25.0], [108.8, 28.2], [107.0, 29.4], [104.2, 27.9], [103.8, 24.5]]] } }] } as GeoRegionShape,
  허난: { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "허난" }, geometry: { type: "Polygon", coordinates: [[[110.8, 31.5], [114.2, 31.9], [115.1, 35.2], [112.5, 36.0], [110.6, 33.8], [110.8, 31.5]]] } }] } as GeoRegionShape,
  후베이: { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "후베이" }, geometry: { type: "Polygon", coordinates: [[[108.8, 29.0], [112.8, 29.7], [114.7, 32.7], [112.8, 33.9], [109.5, 32.6], [108.8, 29.0]]] } }] } as GeoRegionShape,
  광시: { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "광시" }, geometry: { type: "Polygon", coordinates: [[[104.2, 21.8], [108.6, 22.1], [110.9, 25.2], [109.0, 26.8], [105.3, 25.8], [104.2, 21.8]]] } }] } as GeoRegionShape,
  대만: { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "대만" }, geometry: { type: "Polygon", coordinates: [[[120.8, 21.8], [121.8, 22.2], [122.2, 24.8], [121.7, 25.5], [120.8, 25.0], [120.2, 23.6], [120.8, 21.8]]] } }] } as GeoRegionShape,
  한국: { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "한국" }, geometry: { type: "Polygon", coordinates: [[[124.6, 33.2], [129.4, 35.1], [130.4, 38.6], [128.5, 39.5], [125.7, 38.8], [124.0, 36.2], [124.6, 33.2]]] } }] } as GeoRegionShape,
  일본: { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "일본" }, geometry: { type: "Polygon", coordinates: [[[129.2, 31.1], [145.8, 31.0], [146.4, 45.5], [130.2, 45.6], [129.2, 31.1]]] } }] } as GeoRegionShape,
};

const wineMapShapes: Record<string, string> = {
  프랑스: "M28 20L38 14L48 16L58 12L69 18L76 26L80 38L77 50L69 58L74 69L66 81L52 86L39 82L29 76L22 66L18 54L19 42L22 30Z",
  호주: "M28 18L40 12L51 15L64 14L74 24L82 35L78 49L82 62L75 75L62 82L50 86L38 78L24 70L20 54L22 39L18 28Z",
  미국: "M18 26L30 18L42 20L52 14L66 18L78 24L86 38L82 53L76 66L64 77L48 82L32 76L20 68L15 54L12 41Z",
  이탈리아: "M38 18L48 12L60 16L68 24L72 36L68 50L62 61L56 72L46 76L36 69L30 58L28 45L32 29Z",
  스페인: "M24 26L36 18L48 20L57 24L64 34L62 48L56 60L62 72L54 81L42 82L32 74L24 64L18 52L16 38Z",
  칠레: "M30 32L44 20L58 22L66 34L62 50L55 63L42 68L30 60L24 48Z",
  아르헨티나: "M24 20L38 18L52 24L64 34L68 48L62 64L48 74L34 70L26 58L20 40Z",
  뉴질랜드: "M34 22L46 18L58 22L62 34L58 46L50 56L40 60L32 52L28 38Z",
};

const chinaMapShape = "M16 18L28 12L42 16L56 10L74 16L86 26L94 38L90 52L94 68L84 80L72 90L64 94L48 88L36 82L22 70L14 58L10 44L12 28Z M69 14L74 12L82 14L86 20L80 24L72 22L69 14Z M72 22L78 20L84 24L84 30L76 32L70 28L72 22Z M59 10L64 8L70 12L69 18L61 18L56 14L59 10Z";

const wineCountryGroups = [
  { name: "프랑스", countries: ["프랑스"] },
  { name: "호주", countries: ["호주"] },
  { name: "미국", countries: ["미국"] },
  { name: "이탈리아", countries: ["이탈리아"] },
  { name: "기타", countries: ["스페인", "칠레", "아르헨티나", "뉴질랜드", "독일", "오스트리아", "포르투갈", "직접입력"] },
] as const;

const wineBlocksByCountry: Record<string, RegionBlock[]> = {
  독일: [
    { id: "de-rheinhessen", name: "라인헤센", x: 36, y: 26, w: 18, h: 14, center: [49.9, 8.0] },
    { id: "de-pfalz", name: "팔츠", x: 42, y: 18, w: 16, h: 12, center: [49.3, 8.2] },
    { id: "de-mosel", name: "모젤", x: 58, y: 20, w: 16, h: 12, center: [49.9, 6.9] },
    { id: "de-baden", name: "바덴", x: 48, y: 42, w: 18, h: 14, center: [48.3, 8.0] },
    { id: "de-franken", name: "프랑켄", x: 34, y: 42, w: 16, h: 12, center: [49.8, 10.2] },
  ],
  오스트리아: [
    { id: "at-wachau", name: "바흐라우", x: 42, y: 32, w: 18, h: 14, center: [48.4, 15.4] },
    { id: "at-kamptal", name: "캄프탈", x: 54, y: 30, w: 18, h: 12, center: [48.3, 15.7] },
    { id: "at-neusiedl", name: "노이시들", x: 46, y: 52, w: 18, h: 12, center: [47.9, 16.8] },
    { id: "at-styria", name: "슈타이어마르크", x: 62, y: 52, w: 20, h: 14, center: [47.1, 15.5] },
  ],
  포르투갈: [
    { id: "pt-douro", name: "도우루", x: 46, y: 42, w: 18, h: 16, center: [41.1, -7.8] },
    { id: "pt-vinhoverde", name: "비뉴베르데", x: 32, y: 28, w: 18, h: 12, center: [41.7, -8.6] },
    { id: "pt-alentejo", name: "알렌테주", x: 52, y: 60, w: 16, h: 12, center: [38.4, -7.9] },
    { id: "pt-beiras", name: "베이라스", x: 34, y: 62, w: 18, h: 14, center: [40.4, -8.0] },
  ],
  직접입력: [
    { id: "manual-custom", name: "직접입력", x: 50, y: 50, w: 18, h: 12, center: [0, 0] },
  ],
  프랑스: [
    { id: "fr-bordeaux", name: "보르도", x: 42, y: 38, w: 20, h: 16, center: [44.8, -0.6] },
    { id: "fr-burgundy", name: "부르고뉴", x: 52, y: 26, w: 16, h: 14, center: [47.2, 4.7] },
    { id: "fr-champagne", name: "샹파뉴", x: 46, y: 15, w: 18, h: 12, center: [49.1, 3.9] },
    { id: "fr-jura", name: "쥐라", x: 58, y: 24, w: 14, h: 12, center: [46.8, 5.9] },
    { id: "fr-chablis", name: "샤블리", x: 52, y: 18, w: 14, h: 10, center: [47.8, 3.8] },
    { id: "fr-beaujolais", name: "보졸레", x: 62, y: 42, w: 16, h: 12, center: [46.2, 4.7] },
    { id: "fr-loire", name: "루아르", x: 32, y: 54, w: 18, h: 14, center: [47.6, -0.6] },
    { id: "fr-rhone", name: "론", x: 58, y: 50, w: 16, h: 18, center: [45.0, 4.8] },
    { id: "fr-alsace", name: "알자스", x: 66, y: 18, w: 15, h: 12, center: [48.3, 7.3] },
    { id: "fr-provence", name: "프로방스", x: 68, y: 62, w: 16, h: 15, center: [43.6, 5.8] },
    { id: "fr-languedoc", name: "랑그도크", x: 58, y: 68, w: 18, h: 18, center: [43.4, 3.2] },
  ],
  호주: [
    { id: "au-barossa", name: "바로사", x: 40, y: 46, w: 18, h: 15, center: [-34.5, 139.0] },
    { id: "au-mclaren", name: "맥라렌밸리", x: 52, y: 36, w: 18, h: 14, center: [-35.1, 138.7] },
    { id: "au-yarra", name: "야라밸리", x: 56, y: 58, w: 18, h: 14, center: [-37.8, 145.0] },
    { id: "au-tasmania", name: "태즈메이니아", x: 26, y: 18, w: 16, h: 12, center: [-41.5, 146.7] },
    { id: "au-victoria", name: "빅토리아", x: 46, y: 60, w: 18, h: 14, center: [-36.9, 144.2] },
    { id: "au-hunter", name: "헌터밸리", x: 62, y: 46, w: 16, h: 12, center: [-32.1, 151.4] },
    { id: "au-adelaide", name: "애들레이드힐", x: 44, y: 52, w: 16, h: 12, center: [-34.9, 138.6] },
    { id: "au-margaret", name: "마가렛리버", x: 18, y: 58, w: 18, h: 12, center: [-16.3, 128.8] },
  ],
  미국: [
    { id: "us-napa", name: "나파", x: 24, y: 46, w: 18, h: 18, center: [38.3, -122.3] },
    { id: "us-sonoma", name: "소노마", x: 34, y: 30, w: 20, h: 14, center: [38.5, -122.8] },
    { id: "us-monterey", name: "몬트레이", x: 28, y: 22, w: 18, h: 12, center: [36.6, -121.9] },
    { id: "us-santabarbara", name: "산타바바라", x: 38, y: 24, w: 18, h: 12, center: [34.4, -119.7] },
    { id: "us-willamette", name: "윌라메트 밸리", x: 46, y: 20, w: 18, h: 12, center: [45.5, -123.1] },
    { id: "us-columbia", name: "컬럼비아 밸리", x: 56, y: 18, w: 18, h: 12, center: [46.2, -119.3] },
    { id: "us-walla", name: "왈라왈라 밸리", x: 64, y: 26, w: 18, h: 12, center: [46.1, -119.3] },
    { id: "us-finger", name: "핑거 레이커스", x: 62, y: 32, w: 18, h: 12, center: [42.8, -77.0] },
    { id: "us-texas", name: "텍사스", x: 44, y: 66, w: 18, h: 18, center: [30.3, -98.7] },
    { id: "us-newyork", name: "뉴욕", x: 56, y: 30, w: 16, h: 14, center: [42.9, -76.9] },
    { id: "us-oregon", name: "오리건", x: 40, y: 18, w: 18, h: 12, center: [45.5, -122.6] },
    { id: "us-washington", name: "워싱턴", x: 60, y: 18, w: 16, h: 12, center: [47.6, -120.5] },
    { id: "us-longisland", name: "롱아일랜드", x: 58, y: 40, w: 16, h: 12, center: [40.9, -72.9] },
  ],
  이탈리아: [
    { id: "it-piemonte", name: "피에몬테", x: 48, y: 24, w: 18, h: 16, center: [44.7, 7.8] },
    { id: "it-tuscany", name: "토스카나", x: 42, y: 42, w: 22, h: 18, center: [43.4, 11.2] },
    { id: "it-sicily", name: "시칠리아", x: 66, y: 62, w: 18, h: 16, center: [37.6, 14.3] },
    { id: "it-veneto", name: "베네토", x: 56, y: 34, w: 18, h: 16, center: [45.7, 11.8] },
    { id: "it-umbria", name: "움브리아", x: 36, y: 56, w: 16, h: 14, center: [42.9, 12.5] },
    { id: "it-lazio", name: "라치오", x: 46, y: 58, w: 16, h: 14, center: [41.9, 12.7] },
    { id: "it-puglia", name: "풀리아", x: 62, y: 72, w: 18, h: 14, center: [41.1, 16.9] },
    { id: "it-trentino", name: "트렌티노", x: 50, y: 18, w: 16, h: 12, center: [46.1, 11.1] },
  ],
  스페인: [
    { id: "es-rioja", name: "리오하", x: 36, y: 34, w: 18, h: 18, center: [42.4, -2.5] },
    { id: "es-ribera", name: "리베라 델 두에로", x: 54, y: 46, w: 22, h: 18, center: [41.4, -4.0] },
    { id: "es-cava", name: "카바", x: 62, y: 24, w: 18, h: 12, center: [41.4, 1.7] },
    { id: "es-penedes", name: "페네데스", x: 44, y: 64, w: 18, h: 16, center: [41.4, 1.7] },
    { id: "es-rueda", name: "루에다", x: 26, y: 52, w: 16, h: 14, center: [41.6, -5.5] },
    { id: "es-jerez", name: "헤레스", x: 22, y: 70, w: 18, h: 14, center: [36.7, -5.8] },
    { id: "es-navarra", name: "나바라", x: 38, y: 26, w: 16, h: 12, center: [42.8, -1.8] },
    { id: "es-castilla", name: "카스티야", x: 48, y: 58, w: 18, h: 14, center: [40.5, -3.7] },
  ],
  칠레: [
    { id: "cl-maipo", name: "마이포", x: 34, y: 42, w: 16, h: 16, center: [-33.6, -70.6] },
    { id: "cl-colchagua", name: "콜차구아", x: 50, y: 50, w: 18, h: 16, center: [-34.5, -71.4] },
    { id: "cl-casablanca", name: "카사블랑카", x: 28, y: 26, w: 18, h: 12, center: [-33.3, -71.4] },
    { id: "cl-maule", name: "마울레", x: 58, y: 38, w: 18, h: 16, center: [-35.4, -71.7] },
    { id: "cl-apalta", name: "아팔타", x: 40, y: 58, w: 16, h: 12, center: [-34.3, -70.8] },
    { id: "cl-rio", name: "리오클라로", x: 48, y: 30, w: 16, h: 12, center: [-34.2, -70.9] },
  ],
  아르헨티나: [
    { id: "ar-mendoza", name: "멘도사", x: 40, y: 42, w: 22, h: 18, center: [-32.9, -68.8] },
    { id: "ar-salta", name: "살타", x: 54, y: 30, w: 18, h: 14, center: [-24.8, -65.4] },
    { id: "ar-neuquen", name: "누에켄", x: 32, y: 58, w: 18, h: 16, center: [-39.0, -68.1] },
    { id: "ar-sanjuan", name: "산후안", x: 28, y: 34, w: 18, h: 14, center: [-31.5, -68.5] },
    { id: "ar-rioja", name: "리오하", x: 48, y: 58, w: 16, h: 12, center: [-29.4, -66.9] },
  ],
  뉴질랜드: [
    { id: "nz-marlborough", name: "말보로", x: 38, y: 34, w: 20, h: 16, center: [-41.5, 173.9] },
    { id: "nz-hawkes", name: "호크스베이", x: 54, y: 46, w: 18, h: 14, center: [-39.0, 177.9] },
    { id: "nz-central", name: "센트럴오타고", x: 46, y: 60, w: 22, h: 16, center: [-45.0, 169.4] },
    { id: "nz-west", name: "웨스트코스트", x: 30, y: 48, w: 16, h: 12, center: [-42.7, 171.3] },
    { id: "nz-canterbury", name: "캔터베리", x: 58, y: 32, w: 16, h: 12, center: [-43.7, 172.6] },
  ],
};

const teaBlocks: RegionBlock[] = [
  { id: "tea-anhui", name: "안휘", x: 30, y: 42, w: 18, h: 14, center: [31.8, 117.3] },
  { id: "tea-fujian", name: "푸젠", x: 46, y: 26, w: 18, h: 14, center: [26.1, 118.3] },
  { id: "tea-yunnan", name: "윈난", x: 60, y: 70, w: 20, h: 16, center: [24.9, 101.5] },
  { id: "tea-zhejiang", name: "저장", x: 62, y: 30, w: 18, h: 14, center: [29.3, 119.8] },
  { id: "tea-sichuan", name: "쓰촨", x: 28, y: 60, w: 18, h: 16, center: [30.6, 104.1] },
  { id: "tea-guangdong", name: "광둥", x: 72, y: 44, w: 16, h: 14, center: [23.1, 113.3] },
  { id: "tea-hunan", name: "후난", x: 48, y: 54, w: 18, h: 14, center: [27.6, 109.9] },
  { id: "tea-jiangxi", name: "장시", x: 54, y: 42, w: 16, h: 12, center: [27.6, 115.9] },
  { id: "tea-guizhou", name: "구이저우", x: 44, y: 68, w: 18, h: 14, center: [26.5, 106.6] },
  { id: "tea-henan", name: "허난", x: 38, y: 34, w: 16, h: 12, center: [34.3, 113.4] },
  { id: "tea-hubei", name: "후베이", x: 34, y: 52, w: 18, h: 14, center: [30.9, 111.8] },
  { id: "tea-guangxi", name: "광시", x: 74, y: 58, w: 16, h: 14, center: [23.8, 108.3] },
  { id: "tea-taiwan", name: "대만", x: 80, y: 24, w: 12, h: 10, center: [23.7, 120.9] },
  { id: "tea-korea", name: "한국", x: 68, y: 12, w: 12, h: 10, center: [36.5, 127.8] },
  { id: "tea-japan", name: "일본", x: 78, y: 8, w: 18, h: 12, center: [36.2, 138.3] },
];

const getDefaultForm = (category: Category = "whisky"): FormState => ({
  category,
  date: new Date().toISOString().slice(0, 10),
  place: "",
  people: "진욱",
  peopleCustom: "",
  type: category === "whisky" ? "싱글몰트" : category === "wine" ? "레드" : "녹차",
  name: "",
  photo: "",
  photoUrl: "",
  labelPhoto: "",
  labelPhotoUrl: "",
  selectedDistillery: null,
  distilleryName: "",
  regionName: "",
  teaVariety: "",
  teaLeafPhoto: "",
  teaLeafUrl: "",
  aroma: "",
  taste: "",
  finish: "",
  body: 3,
  acidity: 3,
  tannin: 3,
  alcohol: 3,
  sweetness: 3,
  complexity: 3,
  balance: 3,
  notes: "",
});

const formatDate = (date: string) => {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return `${parsed.getFullYear()}.${parsed.getMonth() + 1}.${parsed.getDate()}`;
};

const getTagOptions = (category: Category) => {
  if (category === "whisky") return whiskyTags;
  if (category === "wine") return wineTags;
  return teaTags;
};

const getSavedRegionLabel = (note: Pick<Note, "category" | "regionName" | "distilleryName">) => {
  if (note.category === "whisky") return note.distilleryName || note.regionName || "증류소 미선택";
  return note.regionName || "산지 미선택";
};

const getArchiveRegionMapProps = (note: Pick<Note, "category" | "regionName">) => {
  if (note.category === "wine") {
    const matchedCountry = Object.entries(wineBlocksByCountry).find(([, regions]) => regions.some((region) => region.name === note.regionName))?.[0];
    const country = matchedCountry ?? (Object.keys(wineMapShapes).includes(note.regionName) ? note.regionName : "프랑스");
    const items = wineBlocksByCountry[country] ?? wineBlocksByCountry["프랑스"];

    return {
      items,
      mapShape: wineMapShapes[country] ?? wineMapShapes["프랑스"],
      geoJson: geoJsonCountryShapes[country] ?? geoJsonCountryShapes["프랑스"],
      activeId: note.regionName,
    };
  }

  if (note.category === "tea") {
    return {
      items: teaBlocks,
      mapShape: chinaMapShape,
      geoJson: chinaProvinceGeoJson[note.regionName] ?? chinaProvinceGeoJson["안휘"],
      activeId: note.regionName,
    };
  }

  return null;
};

const postNotes = async (payload: { note: Note } | { deleteId: string }) => {
  try {
    const body = JSON.stringify(payload);
    if (new Blob([body]).size > 4 * 1024 * 1024) {
      return { ok: false as const, error: "첨부한 사진의 전체 용량이 너무 큽니다. 사진 수를 줄인 뒤 다시 시도해 주세요." };
    }

    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false as const,
        error: response.status === 413
          ? "첨부한 사진의 전체 용량이 너무 큽니다. 사진 수를 줄인 뒤 다시 시도해 주세요."
          : typeof result?.error === "string"
            ? result.error
            : `서버에서 저장 요청을 처리하지 못했습니다. (${response.status})`,
      };
    }

    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." };
  }
};

const uploadNoteMedia = async (note: Note): Promise<Note> => {
  const mediaFields = [
    ["photo", "photoUrl"],
    ["labelPhoto", "labelPhotoUrl"],
    ["teaLeafPhoto", "teaLeafUrl"],
  ] as const;
  let nextNote = { ...note };

  for (const [field, urlField] of mediaFields) {
    const dataUrl = nextNote[field];
    if (!dataUrl.startsWith("data:image/")) continue;

    const response = await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId: nextNote.id, field, dataUrl }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || typeof result?.url !== "string") {
      throw new Error(typeof result?.error === "string" ? result.error : `사진 저장에 실패했습니다. (${response.status})`);
    }

    nextNote = { ...nextNote, [field]: "", [urlField]: result.url };
  }

  return nextNote;
};

const imageFileToDataUrl = async (file: File) => {
  const image = await createImageBitmap(file);
  let compressed: Blob | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const maxDimension = 1400 * (0.82 ** attempt);
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext("2d");
    if (!context) {
      image.close();
      throw new Error("사진을 처리할 수 없습니다.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    compressed = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", Math.max(0.5, 0.84 - attempt * 0.08));
    });

    if (compressed && compressed.size <= 450 * 1024) break;
  }

  image.close();
  if (!compressed) throw new Error("사진을 처리할 수 없습니다.");

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("사진을 읽을 수 없습니다."));
    reader.readAsDataURL(compressed);
  });
};

export default function HomePage() {
  const [view, setView] = useState<"landing" | "tasting" | "archive" | "calendar">("landing");
  const [category, setCategory] = useState<Category>("whisky");
  const [form, setForm] = useState<FormState>(getDefaultForm("whisky"));
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [archiveFilter, setArchiveFilter] = useState<"all" | Category>("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [archiveViewMode, setArchiveViewMode] = useState<"card" | "list">("list");
  const [detailPanels, setDetailPanels] = useState({ region: false, teaLeaf: false, label: false });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("저장완료");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [distilleryQuery, setDistilleryQuery] = useState("");
  const [archiveDistilleryQuery, setArchiveDistilleryQuery] = useState("");
  const [selectedCountryGroup, setSelectedCountryGroup] = useState<(typeof wineCountryGroups)[number]["name"]>("프랑스");
  const [selectedCountry, setSelectedCountry] = useState("프랑스");
  const [archiveEditMode, setArchiveEditMode] = useState(false);
  const [archiveDraft, setArchiveDraft] = useState<Note | null>(null);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);
  const [calendarDetailDate, setCalendarDetailDate] = useState<string | null>(null);
  const [tagModal, setTagModal] = useState<{ field: TagField; value: string } | null>(null);
  const [customTags, setCustomTags] = useState<CustomTags>(createEmptyCustomTags);
  const [savingTags, setSavingTags] = useState(false);
  const [initialLoadState, setInitialLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadAttempt, setLoadAttempt] = useState(0);

  const refreshGitHubData = () => {
    setInitialLoadState("loading");
    setLoadAttempt((attempt) => attempt + 1);
  };

  const goHome = () => {
    setView("landing");
    setSelectedNote(null);
    setArchiveEditMode(false);
    setArchiveDraft(null);
    setCalendarDetailDate(null);
    setDeleteConfirm(null);
    setTagModal(null);
  };

  const startNewNote = () => {
    setView("tasting");
    setForm(getDefaultForm(category));
    setSelectedNote(null);
    setArchiveEditMode(false);
    setArchiveDraft(null);
    setCalendarDetailDate(null);
    setDeleteConfirm(null);
    setTagModal(null);
  };

  const wineCountryOptions = useMemo(
    () => wineCountryGroups.find((group) => group.name === selectedCountryGroup)?.countries ?? ["프랑스"],
    [selectedCountryGroup],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [notesResponse, tagsResponse] = await Promise.all([
          fetch("/api/notes", { cache: "no-store" }),
          fetch("/api/tags", { cache: "no-store" }),
        ]);

        if (!notesResponse.ok || !tagsResponse.ok) throw new Error("Initial data request failed");

        const [notesResult, tagsResult] = await Promise.all([
          notesResponse.json(),
          tagsResponse.json(),
        ]);
        if (cancelled) return;

        setNotes(Array.isArray(notesResult) ? notesResult : []);
        setCustomTags(tagsResult as CustomTags);
        setInitialLoadState("ready");
      } catch {
        if (!cancelled) setInitialLoadState("error");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  useEffect(() => {
    if (!showToast || saving) return;
    const timer = globalThis.setTimeout(() => setShowToast(false), 2000);
    return () => globalThis.clearTimeout(timer);
  }, [saving, showToast]);

  const stats = useMemo(
    () => ({
      whisky: notes.filter((n) => n.category === "whisky").length,
      wine: notes.filter((n) => n.category === "wine").length,
      tea: notes.filter((n) => n.category === "tea").length,
    }),
    [notes],
  );

  const filteredNotes = useMemo(() => {
    return notes
      .filter((note) => archiveFilter === "all" || note.category === archiveFilter)
      .filter((note) => {
        if (!searchTerm) return true;
        const haystack = `${note.name} ${note.place} ${note.notes} ${note.type} ${note.distilleryName || ""} ${note.regionName || ""}`.toLowerCase();
        return haystack.includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [archiveFilter, notes, searchTerm]);

  const monthNotes = useMemo(() => {
    const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
    return notes.filter((note) => note.date.startsWith(monthKey));
  }, [notes, selectedMonth, selectedYear]);

  const selectedDateNotes = useMemo(() => {
    if (!calendarSelectedDate) return [];
    return notes
      .filter((note) => note.date === calendarSelectedDate)
      .sort((a, b) => (a.name || a.type).localeCompare(b.name || b.type));
  }, [calendarSelectedDate, notes]);

  const calendarDays = useMemo(() => {
    const total = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    return [...Array(firstDay).fill(null), ...Array.from({ length: total }, (_, index) => index + 1)];
  }, [selectedMonth, selectedYear]);

  const filteredDistilleries = useMemo(() => {
    if (!distilleryQuery.trim()) return distilleries.slice(0, 14) as Distillery[];
    return distilleries.filter((item) => `${item.name} ${item.name_ko}`.toLowerCase().includes(distilleryQuery.toLowerCase())) as Distillery[];
  }, [distilleryQuery]);

  const archiveDistilleries = useMemo(() => {
    if (!archiveDistilleryQuery.trim()) return distilleries as Distillery[];
    return distilleries.filter((item) => `${item.name} ${item.name_ko}`.toLowerCase().includes(archiveDistilleryQuery.toLowerCase())) as Distillery[];
  }, [archiveDistilleryQuery]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addTag = (field: TagField, value: string) => {
    updateField(field, form[field] ? `${form[field]}, ${value}` : value);
  };

  const addCustomTags = async (field: TagField, rawValue: string) => {
    const parsedTags = rawValue
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (!parsedTags.length) return;

    const existingTags = new Set([...getTagOptions(category), ...customTags[category][field]]);
    const newTags = Array.from(new Set(parsedTags)).filter((tag) => !existingTags.has(tag));
    if (!newTags.length) {
      globalThis.alert("이미 등록된 칩입니다.");
      return;
    }

    setSavingTags(true);
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, field, tags: newTags }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        globalThis.alert(result?.error || `칩을 저장하지 못했습니다. (${response.status})`);
        return;
      }

      setCustomTags(result.all as CustomTags);
      setTagModal(null);
      setToastMessage("새 칩 저장 완료");
      setShowToast(true);
    } catch {
      globalThis.alert("칩 저장 서버에 연결할 수 없습니다.");
    } finally {
      setSavingTags(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, target: "photo" | "labelPhoto" | "teaLeafPhoto", urlKey: "photoUrl" | "labelPhotoUrl" | "teaLeafUrl") => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await imageFileToDataUrl(file);
      updateField(target, dataUrl);
      updateField(urlKey, "");
    } catch (error) {
      globalThis.alert(error instanceof Error ? error.message : "사진을 처리할 수 없습니다.");
    } finally {
      event.target.value = "";
    }
  };

  const handleArchiveImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    target: "photo" | "labelPhoto" | "teaLeafPhoto",
    urlKey: "photoUrl" | "labelPhotoUrl" | "teaLeafUrl",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    imageFileToDataUrl(file)
      .then((dataUrl) => {
        setArchiveDraft((prev) => (prev ? { ...prev, [target]: dataUrl, [urlKey]: "" } : prev));
      })
      .catch((error) => {
        globalThis.alert(error instanceof Error ? error.message : "사진을 처리할 수 없습니다.");
      });
    event.target.value = "";
  };

  const applyArchiveMediaUrl = (
    value: string,
    target: "photo" | "labelPhoto" | "teaLeafPhoto",
    urlKey: "photoUrl" | "labelPhotoUrl" | "teaLeafUrl",
  ) => {
    setArchiveDraft((prev) => (prev ? { ...prev, [target]: "", [urlKey]: value.trim() } : prev));
  };

  const saveNote = async () => {
    if (saving) return;

    setSaving(true);
    setToastMessage("GitHub에 저장 중");
    setShowToast(true);

    const regionLabel =
      category === "whisky"
        ? (form.selectedDistillery?.name_ko || form.distilleryName || form.regionName)
        : form.regionName;

    const record: Note = {
      ...form,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      category,
      people: resolvePeople(form.people, form.peopleCustom),
      distilleryName: form.selectedDistillery?.name_ko || form.distilleryName,
      regionName: regionLabel || "",
      type: form.type || (category === "whisky" ? "싱글몰트" : category === "wine" ? "레드" : "녹차"),
    };

    try {
      let recordWithMedia: Note;
      try {
        recordWithMedia = await uploadNoteMedia(record);
      } catch (error) {
        setShowToast(false);
        globalThis.alert(error instanceof Error ? error.message : "사진 저장에 실패했습니다.");
        return;
      }
      const result = await postNotes({ note: recordWithMedia });

      if (!result.ok) {
        setShowToast(false);
        if (typeof globalThis !== "undefined" && typeof globalThis.alert === "function") {
          globalThis.alert(`저장에 실패했습니다.\n${result.error}`);
        }
        return;
      }

      setNotes((prev) => [recordWithMedia, ...prev]);
      setView("archive");
      setArchiveFilter(category);
      setForm(getDefaultForm(category));
      setToastMessage("GitHub 저장 완료");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteNote = async () => {
    if (!deleteConfirm) return;

    const result = await postNotes({ deleteId: deleteConfirm.id });

    if (!result.ok) {
      if (typeof globalThis !== "undefined" && typeof globalThis.alert === "function") {
        globalThis.alert(`삭제에 실패했습니다.\n${result.error}`);
      }
      setDeleteConfirm(null);
      return;
    }

    setNotes((prev) => prev.filter((note) => note.id !== deleteConfirm.id));
    setSelectedNote(null);
    setArchiveEditMode(false);
    setArchiveDraft(null);
    setDeleteConfirm(null);
    setToastMessage("삭제 완료");
    setShowToast(true);
  };

  const deleteNote = (id: string) => {
    const target = notes.find((note) => note.id === id);
    setDeleteConfirm({ id, name: target?.name || "이 기록" });
  };

  const editNote = (note: Note) => {
    const peopleValues = getPeopleFormValues(note.people);
    setCategory(note.category);
    setForm({
      ...getDefaultForm(note.category),
      ...note,
      ...peopleValues,
      selectedDistillery: note.selectedDistillery || null,
    });
    setView("tasting");
  };

  const startArchiveEdit = (note: Note) => {
    setArchiveDraft({ ...note });
    setArchiveDistilleryQuery("");
    setArchiveEditMode(true);
  };

  const saveArchiveEdit = async () => {
    if (!archiveDraft) return;
    if (saving) return;

    setSaving(true);
    setToastMessage("GitHub에 저장 중");
    setShowToast(true);

    const draft: Note = {
      ...archiveDraft,
      people: archiveDraft.people === "직접입력" ? archiveDraft.people : archiveDraft.people,
      distilleryName: archiveDraft.selectedDistillery?.name_ko || archiveDraft.distilleryName,
    };

    try {
      let draftWithMedia: Note;
      try {
        draftWithMedia = await uploadNoteMedia(draft);
      } catch (error) {
        setShowToast(false);
        globalThis.alert(error instanceof Error ? error.message : "사진 저장에 실패했습니다.");
        return;
      }
      const result = await postNotes({ note: draftWithMedia });

      if (!result.ok) {
        setShowToast(false);
        if (typeof globalThis !== "undefined" && typeof globalThis.alert === "function") {
          globalThis.alert(`수정에 실패했습니다.\n${result.error}`);
        }
        return;
      }

      setNotes((prev) => [draftWithMedia, ...prev.filter((note) => note.id !== draftWithMedia.id)]);
      setSelectedNote(draftWithMedia);
      setArchiveEditMode(false);
      setArchiveDraft(null);
      setToastMessage("GitHub 저장 완료");
    } finally {
      setSaving(false);
    }
  };

  const cancelArchiveEdit = () => {
    setArchiveEditMode(false);
    setArchiveDraft(null);
    setArchiveDistilleryQuery("");
  };

  const isWhisky = category === "whisky";
  const isWine = category === "wine";
  const isTea = category === "tea";
  const detailDistillery = selectedNote?.selectedDistillery ?? null;
  const toggleDetailPanel = (key: "region" | "teaLeaf" | "label") => {
    setDetailPanels((prev) => {
      const next = { region: false, teaLeaf: false, label: false };
      next[key] = !prev[key];
      return next;
    });
  };

  const closeDetailPanels = () => {
    setDetailPanels({ region: false, teaLeaf: false, label: false });
  };

  useEffect(() => {
    closeDetailPanels();
  }, [selectedNote?.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedNote(null);
        setArchiveEditMode(false);
        setArchiveDraft(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <main
      className="min-h-screen pb-16 md:pb-0"
      style={
        view !== "landing"
          ? {
              backgroundImage: `url('/assets/bg${category === "whisky" ? "Whisky" : category === "wine" ? "Wine" : "Tea"}.jpg')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }
          : undefined
      }
    >
      {view === "landing" && (
        <div className="relative min-h-screen overflow-hidden bg-cover bg-center" style={{ backgroundImage: "url('/assets/bgOpen.jpg')" }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(125,82,60,0.24),rgba(48,26,16,0.7),rgba(24,12,8,0.9))]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,222,201,0.08),rgba(255,255,255,0.02))]" />
          <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-8 sm:px-6">
            <div className="w-full max-w-xl text-center text-white">
              <div className="mb-6 flex items-center justify-center gap-2 text-[9px] tracking-[0.38em] text-white/75 sm:text-[10px]">
                <span className="flex items-center gap-1.5">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full bg-[#f8d7c6] ${initialLoadState === "loading" ? "animate-[bounce_0.9s_ease-in-out_infinite]" : ""}`} />
                  <span className={`inline-block h-2.5 w-2.5 rounded-full bg-[#f5c7a9] ${initialLoadState === "loading" ? "animate-[bounce_0.9s_ease-in-out_0.15s_infinite]" : ""}`} />
                  <span className={`inline-block h-2.5 w-2.5 rounded-full bg-[#efb08a] ${initialLoadState === "loading" ? "animate-[bounce_0.9s_ease-in-out_0.3s_infinite]" : ""}`} />
                </span>
                <span className="ml-1">{initialLoadState === "loading" ? "LOADING" : initialLoadState === "ready" ? "READY" : "LOAD FAILED"}</span>
              </div>

              <h1 className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.05em] text-white sm:text-[3rem] md:text-[4rem]">
                향과 맛으로 삶을 풍족하게 하는 시간
              </h1>

              <div className="mt-8 flex items-center justify-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 rounded-full border border-[#f8d9c8]/30 bg-[rgba(255,255,255,0.08)] px-2.5 py-1.5 text-[10px] font-medium text-white/80 backdrop-blur-sm shadow-[0_8px_18px_rgba(93,70,54,0.18)] sm:px-3.5 sm:text-xs">
                  <span className="text-base">🥃</span>
                  <span>{initialLoadState === "ready" ? stats.whisky : "—"}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-[#f8d9c8]/30 bg-[rgba(255,255,255,0.08)] px-2.5 py-1.5 text-[10px] font-medium text-white/80 backdrop-blur-sm shadow-[0_8px_18px_rgba(93,70,54,0.18)] sm:px-3.5 sm:text-xs">
                  <span className="text-base">🍷</span>
                  <span>{initialLoadState === "ready" ? stats.wine : "—"}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-[#f8d9c8]/30 bg-[rgba(255,255,255,0.08)] px-2.5 py-1.5 text-[10px] font-medium text-white/80 backdrop-blur-sm shadow-[0_8px_18px_rgba(93,70,54,0.18)] sm:px-3.5 sm:text-xs">
                  <span className="text-base">🍵</span>
                  <span>{initialLoadState === "ready" ? stats.tea : "—"}</span>
                </div>
              </div>

              <div className="mt-8 flex min-h-[42px] justify-center">
                {initialLoadState === "ready" && <button type="button" onClick={() => setView("tasting")} className="rounded-full bg-[#f8d9c8] px-5 py-2.5 text-sm font-medium text-[#2d1d1a] shadow-[0_12px_26px_rgba(0,0,0,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f7cdb5] sm:px-6">입장하기</button>}
                {initialLoadState === "error" && (
                  <div className="flex flex-col items-center gap-2">
                    <button type="button" onClick={refreshGitHubData} className="rounded-full border border-white/35 bg-white/10 px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_26px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-all hover:bg-white/15 sm:px-6">다시 불러오기</button>
                    <button type="button" onClick={startNewNote} className="rounded-full border border-white/25 bg-transparent px-5 py-2 text-xs font-medium text-white/75 transition-all hover:border-white/45 hover:bg-white/10 hover:text-white sm:px-6">그냥 입장</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-4 z-10 text-center text-[10px] font-medium tracking-[0.16em] text-white/55">
            version {APP_VERSION}
          </div>
        </div>
      )}

      {view !== "landing" && (
        <div className="min-h-screen px-1 py-2.5 sm:px-1.5 md:px-6 md:py-5">
          <div className="mx-auto max-w-[1280px] overflow-hidden rounded-[28px] border border-white/30 shadow-[0_30px_60px_rgba(46,31,25,0.16)]" style={{ background: "transparent", border: "none", boxShadow: "none" }}>
            <div className="p-1.5 sm:p-2 md:p-5">
              <header className="relative overflow-hidden rounded-[22px] border border-[#d8bd91]/45 bg-[linear-gradient(135deg,rgba(35,27,27,0.62)_0%,rgba(77,42,48,0.58)_52%,rgba(36,57,49,0.6)_100%)] px-2.5 py-2.5 text-[#fff9f2] shadow-[0_18px_38px_rgba(35,23,24,0.12),inset_0_1px_0_rgba(255,244,224,0.16)] backdrop-blur-xl sm:px-3 sm:py-3 md:px-5 md:py-3.5">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(245,215,168,0.72),transparent)]" aria-hidden="true" />
                <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between md:gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dfc18e]/55 bg-[linear-gradient(180deg,rgba(245,218,174,0.18),rgba(245,218,174,0.06))] text-[#f1d39e] shadow-[0_7px_18px_rgba(16,10,11,0.28),inset_0_1px_0_rgba(255,247,232,0.16)]"><FontAwesomeIcon icon={faGlassCheers} className="text-sm" /></div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-medium tracking-[0.34em] text-[#e0c08c] sm:text-[10px]">TASTING NOTE</div>
                      <div className="brand-script mt-1 text-[2.1rem] leading-[0.9] tracking-[0.04em] text-[#fff8ef] [text-shadow:0_2px_12px_rgba(0,0,0,0.24)] md:text-[2.5rem]">A Slow, Lovely Pour</div>
                    </div>
                  </div>
                  <nav className="flex w-full flex-nowrap items-center justify-start gap-1 overflow-x-auto scrollbar-none md:w-auto md:justify-end md:gap-1.5">
                    {[
                      { key: "tasting", label: "Tasting Note", icon: faBookOpen },
                      { key: "archive", label: "Archive", icon: faSearch },
                      { key: "calendar", label: "Calendar", icon: faCalendarAlt },
                    ].map((item) => (
                      <button key={item.key} type="button" onClick={() => setView(item.key as "tasting" | "archive" | "calendar")} className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.25 py-1.75 text-[9.5px] font-medium transition-all duration-200 sm:px-3 sm:text-[10.5px] md:px-4 md:text-sm ${view === item.key ? "border-[#f0d6a8]/80 bg-[#f6e7cc] text-[#342723] shadow-[0_7px_16px_rgba(13,8,9,0.3)]" : "border-white/15 bg-white/[0.06] text-[#f7eee7]/85 hover:border-[#d9bd8d]/45 hover:bg-white/[0.11] hover:text-white"}`}>
                        <FontAwesomeIcon icon={item.icon} className="shrink-0 text-[9px] md:text-[12px]" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </header>

              <div className="mt-6 space-y-6">
                {view === "tasting" && (
                  <section className="rounded-[24px] border border-white/20 bg-white/35 p-2.5 shadow-[0_8px_18px_rgba(77,58,48,0.04)] backdrop-blur-sm sm:p-3 md:p-6">
                    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="hidden md:block" aria-hidden="true" />
                      <div className="flex flex-wrap gap-2">
                        {(["whisky", "wine", "tea"] as Category[]).map((item) => (
                          <button key={item} type="button" onClick={() => { setCategory(item); setForm((prev) => ({ ...prev, category: item, type: item === "whisky" ? "싱글몰트" : item === "wine" ? "레드" : "녹차" })); }} className={`premium-button rounded-full px-3 py-1.5 text-[11px] font-medium tracking-[-0.01em] shadow-[0_4px_10px_rgba(136,100,82,0.06)] sm:px-4 sm:py-2 sm:text-[12px] ${category === item ? "bg-[#f9d8c9] text-[#3d2c2a]" : "bg-[#fffaf7] text-[#3d2e2c]"}`}>{categoryLabels[item]}</button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="grid gap-2.5 md:grid-cols-2 md:gap-3">
                        <label className="form-label-row">
                          <span>마신날</span>
                          <input type="date" value={form.date} onChange={(e) => updateField("date", e.target.value)} className="form-label-input" />
                        </label>
                        <label className="form-label-row">
                          <span>장소</span>
                          <input value={form.place} onChange={(e) => updateField("place", e.target.value)} placeholder="예: 서울, 도쿄" className="form-label-input" />
                        </label>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="form-label-row">
                          <span>마신 사람</span>
                          <div className="min-w-0">
                            <CustomMultiSelect
                              label="마신 사람"
                              values={parsePeople(form.people) as (typeof peopleOptions)[number][]}
                              displayValues={parsePeople(form.people).flatMap((person) => {
                                if (person !== "직접입력") return person;
                                return form.peopleCustom.trim() || "직접입력";
                              })}
                              options={peopleOptions}
                              onChange={(values) => {
                                updateField("people", values.join(", "));
                                if (!values.includes("직접입력")) updateField("peopleCustom", "");
                              }}
                            />
                          </div>
                        </div>
                        {parsePeople(form.people).includes("직접입력") && (
                          <label className="form-label-row">
                            <span>직접 입력</span>
                            <input value={form.peopleCustom} onChange={(e) => updateField("peopleCustom", e.target.value)} placeholder="이름 입력" className="form-label-input" />
                          </label>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="form-label-row">
                          <span>종류</span>
                          <div className="min-w-0">
                            <CustomSelect
                              value={form.type}
                              options={isWhisky ? whiskyKinds : isWine ? wineKinds : teaKinds}
                              onChange={(value) => updateField("type", value)}
                            />
                          </div>
                        </label>
                        {isTea ? (
                          <label className="form-label-row">
                            <span>세부품종</span>
                            <input value={form.teaVariety} onChange={(e) => updateField("teaVariety", e.target.value)} placeholder="예: 대운본, 우전" className="form-label-input" />
                          </label>
                        ) : (
                          <label className="form-label-row">
                            <span>이름</span>
                            <input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder={isWhisky ? "예: Glenlivet 12" : "예: Châteauneuf-du-Pape"} className="form-label-input" />
                          </label>
                        )}
                      </div>

                      {isTea && (
                        <label className="form-label-row">
                          <span>이름</span>
                          <input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="예: 우전 2024" className="form-label-input" />
                        </label>
                      )}

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-[#d9cbb9] bg-white/80 p-4">
                          <div className="mb-2 text-sm font-medium text-[#3f312d]">사진</div>
                          <input value={form.photoUrl} onChange={(e) => updateField("photoUrl", e.target.value)} placeholder="인터넷 URL" className="w-full rounded-xl border border-[#e9dfd3] bg-white p-2 outline-none" />
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#584942]">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#efe1cf] px-3 py-2"><FontAwesomeIcon icon={faCamera} />카메라<input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e, "photo", "photoUrl")} /></label>
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#efe1cf] px-3 py-2"><FontAwesomeIcon icon={faUpload} />업로드<input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, "photo", "photoUrl")} /></label>
                          </div>
                          {(form.photo || form.photoUrl) && (
                            <div className="relative mt-3 h-40 w-full overflow-hidden rounded-2xl">
                              <Image src={form.photo || form.photoUrl} alt="main" fill unoptimized className="object-cover" />
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-[#d9cbb9] bg-white/80 p-4">
                          <div className="mb-2 text-sm font-medium text-[#3f312d]">{isTea ? "차엽" : "라벨사진"}</div>
                          <input value={isTea ? form.teaLeafUrl : form.labelPhotoUrl} onChange={(e) => updateField(isTea ? "teaLeafUrl" : "labelPhotoUrl", e.target.value)} placeholder="인터넷 URL" className="w-full rounded-xl border border-[#e9dfd3] bg-white p-2 outline-none" />
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#584942]">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#efe1cf] px-3 py-2"><FontAwesomeIcon icon={faCamera} />카메라<input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e, isTea ? "teaLeafPhoto" : "labelPhoto", isTea ? "teaLeafUrl" : "labelPhotoUrl")} /></label>
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#efe1cf] px-3 py-2"><FontAwesomeIcon icon={faUpload} />업로드<input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, isTea ? "teaLeafPhoto" : "labelPhoto", isTea ? "teaLeafUrl" : "labelPhotoUrl")} /></label>
                          </div>
                          {(isTea ? form.teaLeafPhoto || form.teaLeafUrl : form.labelPhoto || form.labelPhotoUrl) && (
                            <div className="relative mt-3 h-40 w-full overflow-hidden rounded-2xl">
                              <Image src={isTea ? form.teaLeafPhoto || form.teaLeafUrl : form.labelPhoto || form.labelPhotoUrl} alt="secondary" fill unoptimized className="object-cover" />
                            </div>
                          )}
                        </div>
                      </div>

                      {isWhisky && (
                        <div className="rounded-3xl border border-[#dbc6ae] bg-white/65 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-[#392d27]">증류소 선택</h3>
                            <span className="text-xs text-[#69564d]">{form.selectedDistillery?.name_ko || "검색 후 선택"}</span>
                          </div>
                          <input value={distilleryQuery} onChange={(e) => setDistilleryQuery(e.target.value)} placeholder="영문명 또는 한글명 검색" className="mt-3 w-full rounded-xl border border-[#e8dac9] bg-white p-3 outline-none" />
                          <div className="mt-3 max-h-52 space-y-2 overflow-auto">
                            {filteredDistilleries.map((item) => (
                              <button type="button" key={`${item.name}-${item.name_ko}`} onClick={() => { updateField("selectedDistillery", item); updateField("distilleryName", item.name_ko); }} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${form.selectedDistillery?.name === item.name ? "border-[#9a7658] bg-[#f7efe7]" : "border-[#efe3d4] bg-white/60"}`}>
                                <span>{item.name_ko}</span>
                                <span className="text-xs text-[#7b6258]">{item.name}</span>
                              </button>
                            ))}
                          </div>
                          {form.selectedDistillery && (
                            <div className="mt-4">
                              <WhiskyPinMap distillery={form.selectedDistillery} />
                            </div>
                          )}
                        </div>
                      )}

                      {isWine && (
                        <div className="rounded-3xl border border-[#dbc6ae] bg-white/65 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-[#392d27]">산지 선택</h3>
                            <div className="flex flex-wrap gap-2 text-xs text-[#5d4d44]">
                              {wineCountryGroups.map((group) => (
                                <button key={group.name} type="button" onClick={() => {
                                  setSelectedCountryGroup(group.name);
                                  const nextCountry = group.name === "기타" ? "스페인" : group.name;
                                  setSelectedCountry(nextCountry);
                                  updateField("regionName", nextCountry);
                                }} className={`rounded-full px-2 py-1 ${selectedCountryGroup === group.name ? "bg-[#d9b48a] text-[#2d1f18]" : "bg-[#f1e6dc]"}`}>{group.name}</button>
                              ))}
                            </div>
                          </div>
                          {selectedCountryGroup === "기타" && (
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#5d4d44]">
                              {wineCountryOptions.map((country) => (
                                <button key={country} type="button" onClick={() => {
                                  setSelectedCountry(country);
                                  updateField("regionName", country);
                                }} className={`rounded-full px-2 py-1 ${selectedCountry === country ? "bg-[#d9b48a] text-[#2d1f18]" : "bg-[#f1e6dc]"}`}>{country}</button>
                              ))}
                            </div>
                          )}
                          <div className="mb-3 mt-3 flex items-center justify-between rounded-full bg-[#f3e2d3] px-3 py-2 text-xs text-[#4a332d]">
                            <span>선택 국가</span>
                            <strong>{selectedCountry}</strong>
                          </div>
                          <div className="mt-4">
                            <RegionBlockMap
                              items={wineBlocksByCountry[selectedCountry] ?? wineBlocksByCountry["프랑스"]}
                              activeId={form.regionName}
                              showMap
                              mapShape={wineMapShapes[selectedCountry] ?? wineMapShapes["프랑스"]}
                              geoJson={geoJsonCountryShapes[selectedCountry] ?? geoJsonCountryShapes["프랑스"]}
                              onSelect={(name) => {
                                updateField("regionName", name);
                              }}
                            />
                          </div>
                          <input value={form.regionName} onChange={(e) => updateField("regionName", e.target.value)} placeholder="메인 산지 입력" className="mt-3 w-full rounded-xl border border-[#e8dac9] bg-white p-3 outline-none" />
                        </div>
                      )}

                      {isTea && (
                        <div className="rounded-3xl border border-[#dbc6ae] bg-white/65 p-4">
                          <div className="mb-2 font-semibold text-[#392d27]">중국 산지 선택</div>
                          <div className="mt-2">
                            <RegionBlockMap
                              items={teaBlocks}
                              activeId={form.regionName}
                              showMap
                              mapShape={chinaMapShape}
                              geoJson={chinaProvinceGeoJson[form.regionName] ?? Object.values(chinaProvinceGeoJson)[0]}
                              onSelect={(name) => {
                                updateField("regionName", name);
                              }}
                            />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {teaRegions.map((region) => (
                              <button key={region.name} type="button" onClick={() => updateField("regionName", region.name)} className={`rounded-full px-3 py-1.5 text-xs ${form.regionName === region.name ? "bg-[#d9b48a] text-[#2d1f18]" : "bg-[#f1e6dc] text-[#57453d]"}`}>{region.name}</button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid gap-4 md:grid-cols-3">
                        {(["aroma", "taste", "finish"] as const).map((field) => (
                          <div key={field} className="rounded-2xl border border-[#d9cbb9] bg-white/80 p-3">
                            <div className="mb-1.5 flex items-center justify-between text-sm font-semibold text-[#3a2d28] sm:text-[13px]">
                              <span>{field === "aroma" ? "향" : field === "taste" ? "맛" : "피니시"}</span>
                              <button type="button" onClick={() => setTagModal({ field, value: "" })} className="rounded-full border border-white/60 bg-white/25 px-1.5 py-0.5 text-[7px] font-medium tracking-[0.06em] text-[#64534d] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_7px_rgba(122,92,75,0.04)] backdrop-blur-sm transition-all duration-200 hover:bg-white/35">칩 추가</button>
                            </div>
                            <div className="mb-1 flex flex-wrap gap-[2px]">
                              {Array.from(new Set([...getTagOptions(category), ...customTags[category][field]])).map((tag) => <button key={tag} type="button" onClick={() => addTag(field, tag)} className="premium-tag rounded-full border border-[#f1cfba] bg-[#fff6f2]/90 px-[4px] py-[2px] text-[10px] font-medium text-[#493a34] leading-[1.1] tracking-[-0.02em] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#e0a986] hover:bg-[#fdeee5]">{tag}</button>)}
                            </div>
                            <textarea value={form[field]} onChange={(e) => updateField(field, e.target.value)} className="form-label-textarea" />
                          </div>
                        ))}
                      </div>

                      {isWine && (
                        <div className="rounded-2xl border border-[#d9cbb9] bg-white/80 p-4">
                          <div className="mb-3 font-semibold text-[#3d3028]">맛 프로필</div>
                          <div className="grid gap-4 md:grid-cols-2">
                            {[["body", "바디"], ["acidity", "산미"], ["tannin", "탄닌"], ["alcohol", "알코올"], ["sweetness", "당도"], ["complexity", "복합성"], ["balance", "밸런스"]].map(([key, label]) => (
                              <label key={String(key)} className="block text-sm font-medium text-[#3c2d26]">
                                <span className="mb-2 block">{label}</span>
                                <input type="range" min={1} max={5} value={Number(form[key as keyof FormState])} onChange={(e) => updateField(key as keyof FormState, Number(e.target.value) as never)} className="range-slider w-full" />
                                <div className="mt-1 text-right text-xs text-[#735f55]">{Number(form[key as keyof FormState])}/5</div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <label className="block text-sm font-medium text-[#3f312d]">
                        <span className="mb-2 block">기타 메모</span>
                        <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="기억하고 싶은 감상, 가격, 페어링, 분위기 등을 남기세요." className="form-label-textarea min-h-[120px]" />
                      </label>

                      <div className="flex justify-end gap-2.5">
                        <button type="button" onClick={() => setForm(getDefaultForm(category))} className="premium-button rounded-full border border-[#f1dccd] bg-[#fffaf7] px-4 py-2 text-[11.5px] font-medium text-[#4d372f] shadow-[0_4px_10px_rgba(136,100,82,0.05)]">초기화</button>
                        <button type="button" disabled={saving} onClick={saveNote} className="premium-button inline-flex items-center gap-1.5 rounded-full bg-[#f6c8b2] px-4 py-2 text-[11.5px] font-medium text-[#402c28] shadow-[0_8px_18px_rgba(216,170,145,0.24)] disabled:cursor-wait disabled:opacity-60"><FontAwesomeIcon icon={saving ? faSpinner : faUpload} className={saving ? "animate-spin" : ""} />{saving ? "저장 중" : "저장"}</button>
                      </div>
                    </div>
                  </section>
                )}

                {view === "archive" && (
                  <section className="archive-doc-shell rounded-[24px] border border-white/20 bg-white/30 p-2.5 shadow-[0_8px_18px_rgba(77,58,48,0.04)] backdrop-blur-sm sm:p-3 md:p-6">
                    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="hidden md:block" aria-hidden="true" />
                      <div className="ml-auto flex items-center justify-end gap-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button type="button" onClick={() => setArchiveFilter("all")} className={`archive-filter-button ${archiveFilter === "all" ? "bg-[#2a201d] text-white shadow-sm" : "bg-white/70 text-[#2a201d] border-[#eadfce]"}`}>전체</button>
                          {(["whisky", "wine", "tea"] as const).map((item) => <button key={item} type="button" onClick={() => setArchiveFilter(item)} className={`archive-filter-button ${archiveFilter === item ? "bg-[#2a201d] text-white shadow-sm" : "bg-white/70 text-[#2a201d] border-[#eadfce]"}`}>{categoryLabels[item]}</button>)}
                        </div>
                        <div className="flex items-center gap-1 rounded-full border border-[#e4d7c8] bg-gradient-to-r from-[#fffaf6] via-[#f7f0ea] to-[#f0e4db] p-1.5 shadow-[0_6px_18px_rgba(72,52,42,0.08)]">
                          <button type="button" onClick={() => setArchiveViewMode("card")} className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all ${archiveViewMode === "card" ? "bg-[#2a201d] text-white shadow-md shadow-[#2a201d]/20" : "text-[#42332d] hover:bg-white/70"}`} aria-label="카드 보기"><FontAwesomeIcon icon={faTableCellsLarge} className="text-sm" /></button>
                          <button type="button" onClick={() => setArchiveViewMode("list")} className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all ${archiveViewMode === "list" ? "bg-[#2a201d] text-white shadow-md shadow-[#2a201d]/20" : "text-[#42332d] hover:bg-white/70"}`} aria-label="목록 보기"><FontAwesomeIcon icon={faList} className="text-sm" /></button>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#e8d9c9] bg-white/70 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:mb-5 sm:px-3">
                      <FontAwesomeIcon icon={faSearch} className="text-[#695953]" />
                      <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="이름, 장소, 메모, 증류소 검색" className="w-full bg-transparent text-sm outline-none placeholder:text-[#8b766b]" />
                    </div>

                    {archiveViewMode === "card" ? (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2">
                        {filteredNotes.length ? filteredNotes.map((note) => (
                          <div key={note.id} className="archive-card w-full p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_22px_rgba(63,47,37,0.08)]">
                            <button type="button" onClick={() => setSelectedNote(note)} className="w-full text-left">
                              <div className="archive-card-meta">
                                <span>{categoryLabels[note.category]}</span>
                                <span>{formatDate(note.date)}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="h-14 w-14 overflow-hidden rounded-[16px] bg-[#efe3d4]">
                                  {note.photo || note.photoUrl ? (
                                    <div className="relative h-full w-full">
                                      <Image src={note.photo || note.photoUrl} alt={note.name} fill unoptimized className="object-cover" />
                                    </div>
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-lg text-[#9a7b5f]">{note.category === "whisky" ? "🥃" : note.category === "wine" ? "🍷" : "🍵"}</div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="archive-card-title truncate">{note.name || "미기록"}</span>
                                  <span className="archive-card-subtitle">{note.type || "종류 미기록"}</span>
                                </div>
                              </div>
                            </button>
                          </div>
                        )) : <div className="rounded-[22px] border border-dashed border-[#d7c5b3] bg-white/60 p-8 text-center text-[#5d4d47]">아직 저장된 기록이 없습니다.</div>}
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-[20px] border border-[#efe2d7] bg-white/60">
                        {filteredNotes.length ? filteredNotes.map((note) => (
                          <button key={note.id} type="button" onClick={() => setSelectedNote(note)} className="archive-row grid w-full grid-cols-[30px_minmax(0,1.7fr)_auto] items-center gap-2 text-left last:border-b-0 hover:bg-white/40 sm:grid-cols-[42px_minmax(0,1.7fr)_minmax(0,1.1fr)_minmax(0,1fr)_auto]">
                            <div className="h-8 w-8 overflow-hidden rounded-lg bg-[#efe3d4] sm:h-9 sm:w-9">
                              {note.photo || note.photoUrl ? (
                                <div className="relative h-full w-full">
                                  <Image src={note.photo || note.photoUrl} alt={note.name} fill unoptimized className="object-cover" />
                                </div>
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-[#9a7b5f] sm:text-sm">{note.category === "whisky" ? "🥃" : note.category === "wine" ? "🍷" : "🍵"}</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-[12.5px] font-medium tracking-[-0.01em] text-[#2a201d] sm:text-[13.5px]">{note.name || "미기록"}</div>
                              <div className="mt-0.5 truncate text-[9px] text-[#77655f] sm:hidden">{note.type || "종류 미기록"} · {formatDate(note.date)}</div>
                            </div>
                            <div className="hidden text-[11px] text-[#5f4d46] sm:block">{note.type || "종류 미기록"}</div>
                            <div className="hidden text-[11px] text-[#5f4d46] sm:block">{formatDate(note.date)}</div>
                            <div className="text-right text-[8px] font-medium uppercase tracking-[0.12em] text-[#73615d]">{categoryLabels[note.category]}</div>
                          </button>
                        )) : <div className="p-8 text-center text-[#5d4d47]">아직 저장된 기록이 없습니다.</div>}
                      </div>
                    )}
                  </section>
                )}

                {view === "calendar" && (
                  <section className="rounded-[24px] border border-white/20 bg-white/20 p-2.5 shadow-[0_8px_18px_rgba(77,58,48,0.04)] backdrop-blur-sm sm:p-3 md:p-6">
                    <div className="mb-3 overflow-hidden rounded-[18px] border border-[#e5d6ca] bg-[linear-gradient(135deg,rgba(255,252,249,0.9),rgba(244,232,224,0.78))] shadow-[0_12px_28px_rgba(73,53,43,0.07),inset_0_1px_0_rgba(255,255,255,0.8)] sm:mb-4 sm:rounded-[22px]">
                      <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
                        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dbc5b5] bg-[#2d211d] text-[#f8eee7] shadow-[0_5px_12px_rgba(45,33,29,0.18)] sm:h-10 sm:w-10">
                            <FontAwesomeIcon icon={faCalendarAlt} className="text-[13px] sm:text-sm" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-[8px] font-medium uppercase tracking-[0.22em] text-[#806b61] sm:text-[9px]">Tasting Calendar</div>
                            <div className="mt-0.5 flex items-baseline gap-2">
                              <h2 className="truncate text-[18px] font-semibold leading-none text-[#2d211d] sm:text-[22px]">{selectedYear}년 {selectedMonth + 1}월</h2>
                              <span className="shrink-0 text-[9px] text-[#806d64] sm:text-[10px]">기록 {monthNotes.length}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 rounded-full border border-[#ddcbbd] bg-white/60 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                          <button type="button" title="이전 달" aria-label="이전 달" onClick={() => { const next = new Date(selectedYear, selectedMonth - 1, 1); setSelectedYear(next.getFullYear()); setSelectedMonth(next.getMonth()); }} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#493730] transition-colors hover:bg-[#eee1d8]">
                            <FontAwesomeIcon icon={faChevronLeft} className="text-[11px]" />
                          </button>
                          <span className="h-4 w-px bg-[#ddcbbd]" aria-hidden="true" />
                          <button type="button" title="다음 달" aria-label="다음 달" onClick={() => { const next = new Date(selectedYear, selectedMonth + 1, 1); setSelectedYear(next.getFullYear()); setSelectedMonth(next.getMonth()); }} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#493730] transition-colors hover:bg-[#eee1d8]">
                            <FontAwesomeIcon icon={faChevronRight} className="text-[11px]" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 lg:grid-cols-[1.2fr_0.8fr] lg:gap-4">
                      <div className="overflow-hidden rounded-[18px] border border-[#e9dfd3] bg-white/70 p-0.5 sm:rounded-[22px] sm:p-1">
                        <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-medium leading-none text-[#685950] sm:text-[11px]">
                          {['일', '월', '화', '수', '목', '금', '토'].map((day) => <div key={day} className="py-1">{day}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-0.5">
                          {calendarDays.map((day, index) => {
                            const dateString = day ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
                            const dayNotes = day ? notes.filter((note) => note.date === dateString) : [];
                            const uniqueCategories = Array.from(new Set(dayNotes.map((note) => note.category)));
                            const iconCount = uniqueCategories.length;
                            const iconGroupClass = iconCount <= 1
                              ? ""
                              : iconCount === 2
                                ? "-space-x-[17px] min-[400px]:-space-x-2 sm:-space-x-1"
                                : "-space-x-[14px] min-[400px]:-space-x-[16px] sm:-space-x-[14px]";
                            const iconSizeClass = iconCount <= 1
                              ? "h-8 w-8 text-[15px] min-[400px]:h-9 min-[400px]:w-9 min-[400px]:text-[17px] sm:h-10 sm:w-10 sm:text-[19px]"
                              : iconCount === 2
                                ? "h-[26px] w-[26px] text-[12px] min-[400px]:h-[34px] min-[400px]:w-[34px] min-[400px]:text-[16px] sm:h-9 sm:w-9 sm:text-[17px]"
                                : "h-[21px] w-[21px] text-[10px] min-[400px]:h-[30px] min-[400px]:w-[30px] min-[400px]:text-[14px] sm:h-8 sm:w-8 sm:text-[15px]";

                            return (
                              <button
                                key={`${day ?? "empty"}-${index}`}
                                type="button"
                                onClick={() => {
                                  if (!dayNotes.length) return;
                                  setCalendarSelectedDate(dateString);
                                  setCalendarDetailDate(dateString);
                                }}
                                className={`relative min-h-[82px] overflow-hidden rounded-[7px] border p-0 text-left transition-all sm:min-h-[96px] sm:rounded-[10px] ${day ? (calendarSelectedDate === dateString ? "border-[#d29774] bg-[#fff6f1] shadow-[0_3px_8px_rgba(116,87,69,0.08)]" : "border-[#e9dccd] bg-[#fffaf7]") : "border-transparent bg-transparent"}`}
                              >
                                {day && (
                                  <div className="flex h-full min-w-0 flex-col items-stretch justify-start">
                                    <span className="block h-[18px] shrink-0 text-center text-[10px] font-semibold leading-[18px] text-[#392d28] sm:h-5 sm:text-[11px] sm:leading-5">{day}</span>
                                    <div className="flex min-w-0 flex-1 items-start justify-center pt-1 sm:pt-1.5">
                                      <div className={`flex ${iconGroupClass}`}>
                                        {uniqueCategories.map((category) => (
                                          <span
                                            key={`${dateString}-${category}`}
                                            title={categoryLabels[category]}
                                            className={`inline-flex shrink-0 items-center justify-center rounded-full border border-white/90 shadow-[0_2px_5px_rgba(65,46,37,0.14)] ${iconSizeClass} ${category === "whisky" ? "bg-[#e8d8bd] text-[#4b3b2f]" : category === "wine" ? "bg-[#f0dfe0] text-[#4d3535]" : "bg-[#dfead5] text-[#2f4631]"}`}
                                          >
                                            {category === "whisky" ? "🥃" : category === "wine" ? "🍷" : "🍵"}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-[28px] border border-[#e9dfd3] bg-white/70 p-4">
                          <div className="mb-3 text-sm font-semibold text-[#382d28]">통계 카드</div>
                          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                            <div className="rounded-2xl bg-[#f5ece3] p-3"><div className="text-[10px] uppercase tracking-[0.2em] text-[#7a655e]">total</div><div className="mt-2 text-2xl font-semibold text-[#261e1b]">{notes.length}</div></div>
                            <div className="rounded-2xl bg-[#f5ece3] p-3"><div className="text-[10px] uppercase tracking-[0.2em] text-[#7a655e]">whisky</div><div className="mt-2 text-2xl font-semibold text-[#261e1b]">{stats.whisky}</div></div>
                            <div className="rounded-2xl bg-[#f5ece3] p-3"><div className="text-[10px] uppercase tracking-[0.2em] text-[#7a655e]">wine + tea</div><div className="mt-2 text-2xl font-semibold text-[#261e1b]">{stats.wine + stats.tea}</div></div>
                          </div>
                        </div>

                        <div className="rounded-[28px] border border-[#e9dfd3] bg-white/70 p-4">
                          <div className="mb-3 text-sm font-semibold text-[#382d28]">{calendarSelectedDate ? `${calendarSelectedDate.replace(/-/g, ".")} 기록` : "이 달의 기록"}</div>
                          <div className="space-y-2">
                            {calendarSelectedDate && selectedDateNotes.length ? selectedDateNotes.map((note) => (
                              <button key={note.id} type="button" onClick={() => setSelectedNote(note)} className="flex w-full items-center justify-between gap-2 rounded-2xl bg-[#f9f4ef] px-2.5 py-2 text-left transition hover:bg-[#f3e8e1]">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#eedbc8] bg-white text-[11px]">{note.category === "whisky" ? "🥃" : note.category === "wine" ? "🍷" : "🍵"}</span>
                                  <div className="min-w-0">
                                    <div className="truncate text-[11px] font-medium text-[#3a2f2d]">{note.name || note.type || "기록"}</div>
                                    <div className="truncate text-[9px] text-[#7a645d]">{note.place || note.type || "기록"}</div>
                                  </div>
                                </div>
                                <span className="shrink-0 text-[8px] uppercase tracking-[0.12em] text-[#7a645d]">{categoryLabels[note.category]}</span>
                              </button>
                            )) : monthNotes.length ? monthNotes.slice(0, 6).map((note) => (
                              <button key={note.id} type="button" onClick={() => setSelectedNote(note)} className="flex w-full items-center justify-between rounded-2xl bg-[#f9f4ef] px-3 py-2 text-left">
                                <span className="text-sm text-[#3a2f2d]">{note.name || note.type}</span>
                                <span className="text-[10px] text-[#7a645d]">{categoryLabels[note.category]}</span>
                              </button>
                            )) : <div className="text-sm text-[#6d5d57]">이 달의 기록이 없습니다.</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {calendarDetailDate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1a130f]/55 p-4 backdrop-blur-[2px]" onClick={() => setCalendarDetailDate(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-[#ebddd0] bg-[#fffaf6] shadow-[0_26px_60px_rgba(72,52,42,0.16)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-[#f0e3d8] bg-[linear-gradient(180deg,#fffaf6,#f5ece5)] px-4 py-3">
              <div>
                <div className="text-[9px] tracking-[0.22em] text-[#7e665d] uppercase">Drinks</div>
                <div className="mt-1 text-sm font-semibold text-[#2b201d]">{calendarDetailDate.replace(/-/g, ".")} 기록</div>
              </div>
              <button type="button" onClick={() => setCalendarDetailDate(null)} className="document-button document-button--ghost h-8 min-h-0 px-2.5 py-1 text-[10px]">닫기</button>
            </div>
            <div className="max-h-[70vh] space-y-2 overflow-auto p-4">
              {selectedDateNotes.length ? selectedDateNotes.map((note) => (
                <button key={note.id} type="button" onClick={() => {
                  setSelectedNote(note);
                  setCalendarDetailDate(null);
                }} className="flex w-full items-center justify-between gap-2 rounded-2xl border border-[#f0e2d5] bg-[#f9f4ef] px-3 py-2.5 text-left transition hover:bg-[#f3e8e1]">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#eedbc8] bg-white text-[12px]">{note.category === "whisky" ? "🥃" : note.category === "wine" ? "🍷" : "🍵"}</span>
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-medium text-[#3a2f2d]">{note.name || note.type || "기록"}</div>
                      <div className="truncate text-[10px] text-[#7a645d]">{note.place || note.type || "기록"}</div>
                    </div>
                  </div>
                  <span className="shrink-0 text-[8px] uppercase tracking-[0.12em] text-[#7a645d]">{categoryLabels[note.category]}</span>
                </button>
              )) : <div className="rounded-2xl bg-[#f9f4ef] p-4 text-sm text-[#5d4d47]">이 날짜의 기록이 없습니다.</div>}
            </div>
          </div>
        </div>
      )}

      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-[#1a130f]/55 p-2 backdrop-blur-[2px] [touch-action:pan-y] [-webkit-overflow-scrolling:touch] sm:items-center sm:p-4" onClick={() => {
          setSelectedNote(null);
          setArchiveEditMode(false);
          setArchiveDraft(null);
        }}>
          <div className="my-2 w-full max-w-5xl overflow-visible rounded-[24px] border border-[#ebddd0] bg-[#fffaf6] p-3 pb-24 shadow-[0_26px_60px_rgba(72,52,42,0.16)] sm:my-0 sm:max-h-[90dvh] sm:overflow-y-auto sm:rounded-[30px] sm:p-5 sm:pb-5 sm:overscroll-contain sm:[-webkit-overflow-scrolling:touch]" onClick={(e) => e.stopPropagation()}>
            {Object.values(detailPanels).some(Boolean) && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1a130f]/55 p-4 backdrop-blur-[2px]" onClick={closeDetailPanels}>
                <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-[#ebddd0] bg-[#fffaf6] shadow-[0_26px_60px_rgba(72,52,42,0.16)]" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between gap-3 border-b border-[#f0e3d8] bg-[linear-gradient(180deg,#fffaf6,#f5ece5)] px-4 py-3">
                    <div className="text-[9px] tracking-[0.22em] text-[#7e665d] uppercase">
                      {detailPanels.label ? "Label" : detailPanels.region ? "Region" : "Tea Leaf"}
                    </div>
                    <button type="button" onClick={closeDetailPanels} className="document-button document-button--ghost h-8 min-h-0 px-2.5 py-1 text-[10px]">닫기</button>
                  </div>
                  <div className="p-4">
                    {detailPanels.label && (selectedNote.labelPhoto || selectedNote.labelPhotoUrl) && (
                      <div className="relative h-[420px] overflow-hidden rounded-[22px] border border-[#e6d7c6] bg-white/60">
                        <Image src={selectedNote.labelPhoto || selectedNote.labelPhotoUrl} alt="label" fill unoptimized className="object-contain p-4" />
                      </div>
                    )}
                    {detailPanels.teaLeaf && (selectedNote.teaLeafPhoto || selectedNote.teaLeafUrl) && (
                      <div className="relative h-[420px] overflow-hidden rounded-[22px] border border-[#e6d7c6] bg-white/60">
                        <Image src={selectedNote.teaLeafPhoto || selectedNote.teaLeafUrl} alt="tea leaf" fill unoptimized className="object-contain p-4" />
                      </div>
                    )}
                    {detailPanels.region && selectedNote.regionName && (() => {
                      const archiveMap = getArchiveRegionMapProps(selectedNote);
                      if (!archiveMap) return null;
                      return (
                        <div className="h-[420px] overflow-hidden rounded-[22px] border border-[#e6d7c6] bg-white/60">
                          <RegionBlockMap
                            items={archiveMap.items}
                            activeId={selectedNote.regionName}
                            showMap
                            hideUnselected
                            mapShape={archiveMap.mapShape}
                            geoJson={archiveMap.geoJson}
                            onSelect={() => undefined}
                          />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
            {archiveEditMode && archiveDraft ? (
              <div className="document-section-group mx-auto max-w-5xl pb-20 sm:pb-0">
                <div className="document-modal-shell p-3">
                  <div className="document-modal-header">
                    <div>
                      <div className="text-[10px] tracking-[0.26em] text-[#7e665d]">EDIT NOTE</div>
                      <h3 className="mt-1 text-2xl font-semibold text-[#2b201d]">{archiveDraft.name || "테이스팅 기록"}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={cancelArchiveEdit} className="document-button document-button--ghost">취소</button>
                      <button type="button" disabled={saving} onClick={saveArchiveEdit} className="document-button document-button--primary disabled:cursor-wait disabled:opacity-60"><FontAwesomeIcon icon={saving ? faSpinner : faUpload} className={saving ? "animate-spin" : ""} />{saving ? "저장 중" : "저장"}</button>
                    </div>
                  </div>
                </div>

                <div className="document-section-group">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="form-label-row">
                      <span>날짜</span>
                      <input
                        type="date"
                        value={archiveDraft.date}
                        onChange={(e) => setArchiveDraft((prev) => prev ? { ...prev, date: e.target.value } : prev)}
                        className="form-label-input"
                      />
                    </label>
                    <label className="form-label-row">
                      <span>장소</span>
                      <input
                        value={archiveDraft.place}
                        onChange={(e) => setArchiveDraft((prev) => prev ? { ...prev, place: e.target.value } : prev)}
                        className="form-label-input"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="form-label-row">
                      <span>마신 사람</span>
                      <input
                        value={archiveDraft.people}
                        onChange={(e) => setArchiveDraft((prev) => prev ? { ...prev, people: e.target.value } : prev)}
                        className="form-label-input"
                      />
                    </label>
                    {archiveDraft.category === "tea" ? (
                      <div className="form-label-row">
                        <span>종류</span>
                        <div className="min-w-0">
                          <CustomSelect
                            value={archiveDraft.type}
                            options={teaKinds}
                            onChange={(value) => setArchiveDraft((prev) => prev ? { ...prev, type: value } : prev)}
                          />
                        </div>
                      </div>
                    ) : (
                      <label className="form-label-row">
                        <span>종류</span>
                        <input
                          value={archiveDraft.type}
                          onChange={(e) => setArchiveDraft((prev) => prev ? { ...prev, type: e.target.value } : prev)}
                          className="form-label-input"
                        />
                      </label>
                    )}
                  </div>

                    <label className="form-label-row">
                    <span>이름</span>
                    <input
                      value={archiveDraft.name}
                      onChange={(e) => setArchiveDraft((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                      className="form-label-input"
                    />
                  </label>
                </div>

                <div className="document-section-group min-w-0 max-w-full overflow-hidden">
                  <div className="grid min-w-0 max-w-full gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                    <div className="document-section-surface min-w-0 max-w-full overflow-hidden p-3 sm:p-4">
                      <div className="document-section-label">이미지</div>
                      <div className="grid min-w-0 max-w-full gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="min-w-0 max-w-full overflow-hidden rounded-[18px] bg-[#fffdfb] p-3">
                        <div className="mb-2 text-[11px] font-medium text-[#5e4740]">메인 사진</div>
                        {archiveDraft.photo || archiveDraft.photoUrl ? (
                          <div className="relative h-32 overflow-hidden rounded-[14px] bg-[#f7efe8]">
                            <Image src={archiveDraft.photo || archiveDraft.photoUrl} alt="main" fill unoptimized className="object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-32 items-center justify-center rounded-[14px] border border-dashed border-[#d9c4b2] bg-[#faf3ee] text-xs text-[#8b736b]">사진 없음</div>
                        )}
                        <div className="mt-3 flex min-w-0 max-w-full flex-wrap items-center gap-2">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#eee2d6] px-3 py-1.5 text-[10px] font-medium text-[#41332d]">
                            <FontAwesomeIcon icon={faCamera} className="text-[10px]" />
                            카메라
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleArchiveImageUpload(event, "photo", "photoUrl")} />
                          </label>
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#f6efe9] px-3 py-1.5 text-[10px] font-medium text-[#41332d]">
                            <FontAwesomeIcon icon={faUpload} className="text-[10px]" />
                            업로드
                            <input type="file" accept="image/*" className="hidden" onChange={(event) => handleArchiveImageUpload(event, "photo", "photoUrl")} />
                          </label>
                          <input
                            value={archiveDraft.photoUrl}
                            onChange={(e) => applyArchiveMediaUrl(e.target.value, "photo", "photoUrl")}
                            placeholder="사진 URL"
                            className="min-w-0 basis-full rounded-full border border-[#e9d4c2] bg-white px-2.5 py-1.5 text-[10px] text-[#2d201d] outline-none placeholder:text-[#9a8a82] sm:basis-0 sm:flex-1"
                          />
                        </div>
                      </div>

                      {(archiveDraft.category === "whisky" || archiveDraft.category === "wine") && (
                        <div className="min-w-0 max-w-full overflow-hidden rounded-[18px] bg-[#fffdfb] p-3">
                          <div className="mb-2 text-[11px] font-medium text-[#5e4740]">라벨</div>
                          {archiveDraft.labelPhoto || archiveDraft.labelPhotoUrl ? (
                            <div className="relative h-32 overflow-hidden rounded-[14px] bg-[#f7efe8]">
                              <Image src={archiveDraft.labelPhoto || archiveDraft.labelPhotoUrl} alt="label" fill unoptimized className="object-contain p-2" />
                            </div>
                          ) : (
                            <div className="flex h-32 items-center justify-center rounded-[14px] border border-dashed border-[#d9c4b2] bg-[#faf3ee] text-xs text-[#8b736b]">라벨 없음</div>
                          )}
                          <div className="mt-3 flex min-w-0 max-w-full flex-wrap items-center gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#eee2d6] px-3 py-1.5 text-[10px] font-medium text-[#41332d]">
                              <FontAwesomeIcon icon={faCamera} className="text-[10px]" />
                              카메라
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleArchiveImageUpload(event, "labelPhoto", "labelPhotoUrl")} />
                            </label>
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#f6efe9] px-3 py-1.5 text-[10px] font-medium text-[#41332d]">
                              <FontAwesomeIcon icon={faUpload} className="text-[10px]" />
                              업로드
                              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleArchiveImageUpload(event, "labelPhoto", "labelPhotoUrl")} />
                            </label>
                            <input
                              value={archiveDraft.labelPhotoUrl}
                              onChange={(e) => applyArchiveMediaUrl(e.target.value, "labelPhoto", "labelPhotoUrl")}
                              placeholder="라벨 URL"
                              className="min-w-0 basis-full rounded-full border border-[#e9d4c2] bg-white px-2.5 py-1.5 text-[10px] text-[#2d201d] outline-none placeholder:text-[#9a8a82] sm:basis-0 sm:flex-1"
                            />
                          </div>
                        </div>
                      )}

                      {archiveDraft.category === "tea" && (
                        <div className="min-w-0 max-w-full overflow-hidden rounded-[18px] bg-[#fffdfb] p-3 md:col-span-2">
                          <div className="mb-2 text-[11px] font-medium text-[#5e4740]">차엽</div>
                          {archiveDraft.teaLeafPhoto || archiveDraft.teaLeafUrl ? (
                            <div className="relative h-32 overflow-hidden rounded-[14px] bg-[#f7efe8]">
                              <Image src={archiveDraft.teaLeafPhoto || archiveDraft.teaLeafUrl} alt="tea leaf" fill unoptimized className="object-contain p-2" />
                            </div>
                          ) : (
                            <div className="flex h-32 items-center justify-center rounded-[14px] border border-dashed border-[#d9c4b2] bg-[#faf3ee] text-xs text-[#8b736b]">차엽 없음</div>
                          )}
                          <div className="mt-3 flex min-w-0 max-w-full flex-wrap items-center gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#eee2d6] px-3 py-1.5 text-[10px] font-medium text-[#41332d]">
                              <FontAwesomeIcon icon={faCamera} className="text-[10px]" />
                              카메라
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleArchiveImageUpload(event, "teaLeafPhoto", "teaLeafUrl")} />
                            </label>
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#f6efe9] px-3 py-1.5 text-[10px] font-medium text-[#41332d]">
                              <FontAwesomeIcon icon={faUpload} className="text-[10px]" />
                              업로드
                              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleArchiveImageUpload(event, "teaLeafPhoto", "teaLeafUrl")} />
                            </label>
                            <input
                              value={archiveDraft.teaLeafUrl}
                              onChange={(e) => applyArchiveMediaUrl(e.target.value, "teaLeafPhoto", "teaLeafUrl")}
                              placeholder="차엽 URL"
                              className="min-w-0 basis-full rounded-full border border-[#e9d4c2] bg-white px-2.5 py-1.5 text-[10px] text-[#2d201d] outline-none placeholder:text-[#9a8a82] sm:basis-0 sm:flex-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                    <div className="document-section-surface min-w-0 max-w-full overflow-hidden p-3 sm:p-4">
                      {archiveDraft.category === "whisky" ? (
                        <>
                          <div className="document-section-label">증류소 수정</div>
                          <div className="mb-3 flex min-w-0 items-center justify-between gap-2 text-[11px] text-[#69564d]">
                            <span>지도 핀 또는 목록에서 선택</span>
                            <strong className="min-w-0 truncate text-right text-[#392d27]">{archiveDraft.selectedDistillery?.name_ko || archiveDraft.distilleryName || "미선택"}</strong>
                          </div>
                          <input
                            value={archiveDistilleryQuery}
                            onChange={(e) => setArchiveDistilleryQuery(e.target.value)}
                            placeholder="증류소 검색"
                            className="mb-3 min-w-0 w-full max-w-full rounded-2xl border border-[#f0d8c7] bg-white px-3 py-2 text-sm text-[#2d201d] outline-none transition hover:border-[#d8b59a] focus:border-[#c98d5e] focus:shadow-[0_0_0_4px_rgba(201,141,94,0.12)]"
                          />
                          <WhiskyDistillerySelectionMap
                            items={archiveDistilleries}
                            selected={archiveDraft.selectedDistillery}
                            onSelect={(item) => setArchiveDraft((prev) => prev ? {
                              ...prev,
                              selectedDistillery: item,
                              distilleryName: item.name_ko,
                              regionName: item.name_ko,
                            } : prev)}
                          />
                          <div className="custom-select-scroll mt-3 max-h-44 space-y-1 overflow-y-auto rounded-2xl border border-[#ead9ca] bg-white/55 p-1.5">
                            {archiveDistilleries.slice(0, 30).map((item) => (
                              <button
                                type="button"
                                key={`${item.name}-${item.name_ko}`}
                                onClick={() => setArchiveDraft((prev) => prev ? {
                                  ...prev,
                                  selectedDistillery: item,
                                  distilleryName: item.name_ko,
                                  regionName: item.name_ko,
                                } : prev)}
                                className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left ${archiveDraft.selectedDistillery?.name === item.name ? "border-[#9a7658] bg-[#f7efe7]" : "border-transparent bg-white/60"}`}
                              >
                                <span className="min-w-0 truncate text-[11px] font-medium text-[#3f302a]">{item.name_ko}</span>
                                <span className="min-w-0 truncate text-right text-[9px] text-[#7b6258]">{item.name}</span>
                              </button>
                            ))}
                            {!archiveDistilleries.length && <div className="px-3 py-4 text-center text-xs text-[#7b6258]">검색 결과가 없습니다.</div>}
                          </div>
                          <div className="my-3 text-center text-[9px] tracking-[0.14em] text-[#8a746a]">직접 입력</div>
                          <input
                            value={archiveDraft.distilleryName || archiveDraft.regionName || ""}
                            onChange={(e) => setArchiveDraft((prev) => prev ? { ...prev, selectedDistillery: null, distilleryName: e.target.value, regionName: e.target.value } : prev)}
                            placeholder="증류소명"
                            className="min-w-0 w-full max-w-full rounded-2xl border border-[#f0d8c7] bg-white px-3 py-2 text-sm text-[#2d201d] outline-none transition hover:border-[#d8b59a] focus:border-[#c98d5e] focus:shadow-[0_0_0_4px_rgba(201,141,94,0.12)]"
                          />
                        </>
                      ) : (
                        <>
                          <div className="document-section-label">산지 수정</div>
                          <div className="mb-3 h-64 overflow-hidden rounded-[22px] border border-[#e6d7c6] bg-white/60">
                            {archiveDraft.category === "wine" ? (() => {
                              const archiveMap = getArchiveRegionMapProps(archiveDraft);
                              if (!archiveMap) return null;
                              return (
                                <RegionBlockMap
                                  items={archiveMap.items}
                                  activeId={archiveDraft.regionName}
                                  showMap
                                  hideUnselected
                                  mapShape={archiveMap.mapShape}
                                  geoJson={archiveMap.geoJson}
                                  onSelect={(name) => setArchiveDraft((prev) => prev ? { ...prev, regionName: name } : prev)}
                                />
                              );
                            })() : (
                              <RegionBlockMap
                                items={teaBlocks}
                                activeId={archiveDraft.regionName}
                                showMap
                                hideUnselected
                                mapShape={chinaMapShape}
                                geoJson={chinaProvinceGeoJson[archiveDraft.regionName] ?? chinaProvinceGeoJson["안휘"]}
                                onSelect={(name) => setArchiveDraft((prev) => prev ? { ...prev, regionName: name } : prev)}
                              />
                            )}
                          </div>
                          <input
                            value={archiveDraft.regionName}
                            onChange={(e) => setArchiveDraft((prev) => prev ? { ...prev, regionName: e.target.value } : prev)}
                            placeholder="산지 이름"
                            className="min-w-0 w-full max-w-full rounded-2xl border border-[#f0d8c7] bg-white px-3 py-2 text-sm text-[#2d201d] outline-none transition hover:border-[#d8b59a] focus:border-[#c98d5e] focus:shadow-[0_0_0_4px_rgba(201,141,94,0.12)]"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="document-section-group">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="form-label-row">
                      <span>향</span>
                      <textarea
                        value={archiveDraft.aroma}
                        onChange={(e) => setArchiveDraft((prev) => prev ? { ...prev, aroma: e.target.value } : prev)}
                        className="form-label-textarea min-h-[100px]"
                      />
                    </label>
                    <label className="form-label-row">
                      <span>맛</span>
                      <textarea
                        value={archiveDraft.taste}
                        onChange={(e) => setArchiveDraft((prev) => prev ? { ...prev, taste: e.target.value } : prev)}
                        className="form-label-textarea min-h-[100px]"
                      />
                    </label>
                  </div>

                  <label className="form-label-row">
                    <span>피니시</span>
                    <textarea
                      value={archiveDraft.finish}
                      onChange={(e) => setArchiveDraft((prev) => prev ? { ...prev, finish: e.target.value } : prev)}
                      className="form-label-textarea min-h-[100px]"
                    />
                  </label>
                </div>

                {archiveDraft.category === "wine" && (
                  <div className="document-section-surface p-4">
                    <div className="mb-3 font-semibold text-[#3d3028]">맛 프로필</div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {([
                        ["body", "바디"],
                        ["acidity", "산미"],
                        ["tannin", "탄닌"],
                        ["alcohol", "알코올"],
                        ["sweetness", "당도"],
                        ["complexity", "복합성"],
                        ["balance", "밸런스"],
                      ] as const).map(([key, label]) => (
                        <label key={String(key)} className="block text-sm font-medium text-[#3c2d26]">
                          <span className="mb-2 block">{label}</span>
                          <input
                            type="range"
                            min={1}
                            max={5}
                            value={Number(archiveDraft[key as keyof Note] ?? 1)}
                            onChange={(e) => setArchiveDraft((prev) => prev ? { ...prev, [key]: Number(e.target.value) } : prev)}
                            className="range-slider w-full"
                          />
                          <div className="mt-1 text-right text-xs text-[#735f55]">{Number(archiveDraft[key as keyof Note] ?? 1)}/5</div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <label className="form-label-row">
                  <span>기타 메모</span>
                  <textarea
                    value={archiveDraft.notes}
                    onChange={(e) => setArchiveDraft((prev) => prev ? { ...prev, notes: e.target.value } : prev)}
                    className="form-label-textarea min-h-[120px]"
                  />
                </label>

                <div className="flex items-center justify-end gap-2 border-t border-[#f0e3d8] pt-4">
                  <button type="button" disabled={saving} onClick={saveArchiveEdit} className="document-button document-button--primary disabled:cursor-wait disabled:opacity-60"><FontAwesomeIcon icon={saving ? faSpinner : faUpload} className={saving ? "animate-spin" : ""} />{saving ? "저장 중" : "저장"}</button>
                  <button type="button" onClick={cancelArchiveEdit} className="document-button document-button--ghost">취소</button>
                  <button type="button" onClick={() => { cancelArchiveEdit(); setSelectedNote(null); }} className="document-button document-button--ghost">닫기</button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 px-2.5 pt-1 sm:px-3">
                  <div className="mb-1 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => startArchiveEdit(selectedNote)}
                      aria-label="기록 수정"
                      title="수정"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] text-[#7b655d] transition hover:bg-[#f1e2d9] hover:text-[#3b2b25]"
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNote(selectedNote.id)}
                      aria-label="기록 삭제"
                      title="삭제"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] text-[#9a5e55] transition hover:bg-[#f8e5e1] hover:text-[#612f28]"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedNote(null)}
                      aria-label="세부정보 창 닫기"
                      title="닫기"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] text-[#7b655d] transition hover:bg-[#f1e2d9] hover:text-[#3b2b25]"
                    >
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </div>
                  <h3 className="truncate text-[1.35rem] font-bold leading-tight text-[#2b201d] sm:text-[1.7rem]">{selectedNote.name || "테이스팅 기록"}</h3>
                </div>
                <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
                  <div className="space-y-4">
                    <div className="relative h-72 w-full overflow-hidden rounded-[22px] border border-[#eadfd4] bg-[linear-gradient(180deg,#f7efe9,#f2e7df)]">
                      {(selectedNote.photo || selectedNote.photoUrl) ? (
                        <Image src={selectedNote.photo || selectedNote.photoUrl} alt={selectedNote.name} fill unoptimized className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#7b655d]">
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/70 shadow-[0_8px_18px_rgba(89,64,51,0.08)]">
                              <FontAwesomeIcon icon={faGlassCheers} className="text-2xl" />
                            </div>
                            <span className="text-[10px] tracking-[0.2em] uppercase text-[#765f55]">No Photo</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {(selectedNote.category === "whisky" || selectedNote.category === "wine" || selectedNote.category === "tea") && (
                      <div className="mb-3 flex flex-row flex-wrap items-center gap-2">
                        {(selectedNote.category === "whisky" || selectedNote.category === "wine") && (selectedNote.labelPhoto || selectedNote.labelPhotoUrl) && (
                          <button type="button" onClick={() => toggleDetailPanel("label")} className="inline-flex items-center justify-center rounded-full border border-[#e8d9ca] bg-[linear-gradient(180deg,#fffaf6,#f4e7dd)] px-3 py-1.5 text-[10px] font-medium text-[#4d352f] shadow-[0_6px_14px_rgba(111,87,72,0.05)]">
                            {detailPanels.label ? "라벨 숨기기" : "라벨 보기"}
                          </button>
                        )}
                        {selectedNote.category === "wine" && selectedNote.regionName && (
                          <button type="button" onClick={() => toggleDetailPanel("region")} className="inline-flex items-center justify-center rounded-full border border-[#e8d9ca] bg-[linear-gradient(180deg,#fffaf6,#f4e7dd)] px-3 py-1.5 text-[10px] font-medium text-[#4d352f] shadow-[0_6px_14px_rgba(111,87,72,0.05)]">
                            {detailPanels.region ? "산지 숨기기" : "산지 보기"}
                          </button>
                        )}
                        {selectedNote.category === "tea" && selectedNote.regionName && (
                          <button type="button" onClick={() => toggleDetailPanel("region")} className="inline-flex items-center justify-center rounded-full border border-[#e8d9ca] bg-[linear-gradient(180deg,#fffaf6,#f4e7dd)] px-3 py-1.5 text-[10px] font-medium text-[#4d352f] shadow-[0_6px_14px_rgba(111,87,72,0.05)]">
                            {detailPanels.region ? "산지 숨기기" : "산지 보기"}
                          </button>
                        )}
                        {selectedNote.category === "tea" && (selectedNote.teaLeafPhoto || selectedNote.teaLeafUrl) && (
                          <button type="button" onClick={() => toggleDetailPanel("teaLeaf")} className="inline-flex items-center justify-center rounded-full border border-[#e8d9ca] bg-white/60 px-3 py-1.5 text-[10px] font-medium text-[#4d352f] shadow-[0_4px_10px_rgba(111,87,72,0.04)]">
                            {detailPanels.teaLeaf ? "차엽 숨기기" : "차엽 보기"}
                          </button>
                        )}
                        {selectedNote.category === "whisky" && detailDistillery && (
                          <button type="button" onClick={() => setSelectedNote((prev) => prev ? { ...prev, regionName: prev.regionName || detailDistillery.name_ko } : prev)} className="inline-flex items-center justify-center rounded-full border border-[#e8d9ca] bg-white/60 px-3 py-1.5 text-[10px] font-medium text-[#4d352f] shadow-[0_4px_10px_rgba(111,87,72,0.04)]">
                            증류소
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="user-serif space-y-4 text-sm text-[#3c2d26]">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-[#f5eee8] p-3"><div className="text-[10px] uppercase tracking-[0.2em] text-[#7a665f]">날짜</div><div className="mt-2 font-semibold">{formatDate(selectedNote.date)}</div></div>
                      <div className="rounded-2xl bg-[#f5eee8] p-3"><div className="text-[10px] uppercase tracking-[0.2em] text-[#7a665f]">장소</div><div className="mt-2 font-semibold">{selectedNote.place || "-"}</div></div>
                      <div className="rounded-2xl bg-[#f5eee8] p-3"><div className="text-[10px] uppercase tracking-[0.2em] text-[#7a665f]">마신 사람</div><div className="mt-2 font-semibold">{selectedNote.people || "-"}</div></div>
                      <div className="rounded-2xl bg-[#f5eee8] p-3"><div className="text-[10px] uppercase tracking-[0.2em] text-[#7a665f]">종류</div><div className="mt-2 font-semibold">{selectedNote.type || "-"}</div></div>
                      <div className="rounded-2xl bg-[#f5eee8] p-3 col-span-2"><div className="text-[10px] uppercase tracking-[0.2em] text-[#7a665f]">저장된 산지</div><div className="mt-2 font-semibold">{getSavedRegionLabel(selectedNote)}</div></div>
                    </div>
                    <div className="rounded-2xl bg-[#f8f2eb] p-4">
                      <div className="mb-2 font-semibold text-[#2d2320]">기본 정보</div>
                      <div className="space-y-2 text-[#5a4a43]">
                        <p>향: {selectedNote.aroma || "-"}</p>
                        <p>맛: {selectedNote.taste || "-"}</p>
                        <p>피니시: {selectedNote.finish || "-"}</p>
                        <p>산지: {getSavedRegionLabel(selectedNote)}</p>
                        <p className="whitespace-pre-wrap">메모: {selectedNote.notes || "-"}</p>
                      </div>
                    </div>
                    {selectedNote.category === "wine" && (
                      <div className="rounded-2xl bg-[#f8f2eb] p-4">
                        <div className="mb-3 font-semibold text-[#2d2320]">맛 프로필</div>
                        <div className="space-y-3">
                          {([
                            ["body", "바디"],
                            ["acidity", "산미"],
                            ["tannin", "탄닌"],
                            ["alcohol", "알코올"],
                            ["sweetness", "당도"],
                            ["complexity", "복합성"],
                            ["balance", "밸런스"],
                          ] as const).map(([key, label]) => {
                            const value = Number(selectedNote[key]) || 1;
                            const fill = (value / 5) * 100;
                            return (
                              <div key={key}>
                                <div className="mb-1 flex items-center justify-between text-[11px] text-[#6b554d]">
                                  <span>{label}</span>
                                  <span>{value}/5</span>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#eadbcd]">
                                  <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                      width: `${fill}%`,
                                      background: "linear-gradient(90deg, #be8660 0%, #9a5f3d 100%)",
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tagModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1a130f]/60 p-4 backdrop-blur-[2px]" onClick={() => setTagModal(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-[#ebddd0] bg-[#fffaf6] shadow-[0_26px_60px_rgba(72,52,42,0.16)]" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[#f0e3d8] bg-[linear-gradient(180deg,#fffaf6,#f5ece5)] px-4 py-3">
              <div className="text-[9px] tracking-[0.22em] text-[#7e665d] uppercase">Custom Tag</div>
              <div className="mt-1 text-base font-semibold text-[#2b201d]">{tagModal.field === "aroma" ? "향" : tagModal.field === "taste" ? "맛" : "피니시"} 태그 추가</div>
            </div>
            <div className="space-y-4 p-4">
              <label className="block text-sm text-[#4b3c35]">
                <span className="mb-2 block">콤마(,)로 여러 태그를 입력하세요</span>
                <textarea
                  value={tagModal.value}
                  onChange={(e) => setTagModal((prev) => prev ? { ...prev, value: e.target.value } : prev)}
                  placeholder="오크, 바닐라, 블랙체리"
                  className="form-label-textarea min-h-[120px]"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setTagModal(null)} className="document-button document-button--ghost min-h-0 px-3 py-1.75 text-[10px]">취소</button>
                <button type="button" disabled={savingTags} onClick={() => addCustomTags(tagModal.field, tagModal.value)} className="document-button document-button--primary min-h-0 px-3 py-1.75 text-[10px] disabled:cursor-wait disabled:opacity-60">{savingTags ? "저장 중" : "추가하기"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1a130f]/60 p-4 backdrop-blur-[2px]" onClick={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-[#efdacc] bg-[linear-gradient(180deg,#fffaf7,#f7eee8)] shadow-[0_30px_60px_rgba(39,28,22,0.18)]" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[#f1e3d8] px-5 py-4">
              <div className="text-[9px] tracking-[0.24em] text-[#7a655e] uppercase">Delete</div>
              <div className="mt-2 text-xl font-semibold text-[#2c211d]">기록을 삭제할까요?</div>
            </div>
            <div className="px-5 py-4 text-sm leading-7 text-[#5b473f]">
              <span className="font-semibold text-[#2c211d]">{deleteConfirm.name}</span> 항목을 삭제합니다.
              <br />
              삭제 후에는 복구할 수 없어요.
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[#f1e3d8] bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(248,239,233,0.9))] px-4 py-3">
              <button type="button" onClick={() => setDeleteConfirm(null)} className="document-button document-button--ghost min-h-0 px-3 py-1.75 text-[10px]">취소</button>
              <button type="button" onClick={confirmDeleteNote} className="document-button document-button--primary min-h-0 px-3 py-1.75 text-[10px]">삭제</button>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className={`${saving ? "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" : "fixed bottom-6 right-6"} z-[60] rounded-full border border-[#e9d9cc] bg-[linear-gradient(180deg,#231c1a,#140f0d)] px-5 py-3 text-sm font-medium text-[#f8f4f0] shadow-[0_20px_35px_rgba(26,19,15,0.22)]`} role="status" aria-live="polite">
          <div className="flex items-center gap-2"><FontAwesomeIcon icon={saving ? faSpinner : faCheck} className={saving ? "animate-spin text-[#f1d39e]" : "text-[#c8e3bb]"} />{toastMessage}</div>
        </div>
      )}

      {view !== "landing" && (
        <nav className="fixed inset-x-0 bottom-0 z-[55] flex justify-center bg-transparent px-4 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 md:hidden" aria-label="빠른 메뉴">
          <div className="flex items-center gap-5 rounded-full border border-white/45 bg-white/30 px-3.5 py-1 shadow-[0_8px_24px_rgba(72,52,42,0.12),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl">
        <button
          type="button"
          onClick={goHome}
          aria-label="홈"
          title="홈"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-[#3c2b25] transition hover:text-[#9b6048] active:scale-90"
        >
          <FontAwesomeIcon icon={faHouse} className="text-base" />
        </button>
        <button
          type="button"
          onClick={refreshGitHubData}
          aria-label="GitHub 데이터 새로고침"
          title="GitHub 데이터 새로고침"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-[#3c2b25] transition hover:text-[#9b6048] active:scale-90"
        >
          <FontAwesomeIcon icon={faArrowsRotate} className={`text-base ${initialLoadState === "loading" ? "animate-spin" : ""}`} />
        </button>
        <button
          type="button"
          onClick={startNewNote}
          aria-label="새 글쓰기"
          title="새 글쓰기"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-[#3c2b25] transition hover:text-[#9b6048] active:scale-90"
        >
          <FontAwesomeIcon icon={faPen} className="text-base" />
        </button>
          </div>
        </nav>
      )}
    </main>
  );
}
