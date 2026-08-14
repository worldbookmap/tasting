"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookOpen,
  faCalendarAlt,
  faCamera,
  faCheck,
  faGlassCheers,
  faPen,
  faSearch,
  faTrash,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import type { LatLngExpression } from "leaflet";
import distilleries from "@/assets/distillery.json";

const DynamicMap = dynamic(
  async () => {
    const { MapContainer, Marker, Popup, TileLayer } = await import("react-leaflet");

    return function MapRenderer({
      center,
      zoom = 5,
      markers,
      selectedName,
      fallbackLabel,
    }: {
      center: LatLngExpression;
      zoom?: number;
      markers?: { name: string; center: [number, number] }[];
      selectedName?: string;
      fallbackLabel?: string;
    }) {
      return (
        <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {(markers ?? []).map((marker) => (
            <Marker key={marker.name} position={marker.center as LatLngExpression}>
              <Popup>{marker.name}</Popup>
            </Marker>
          ))}
          {selectedName && (
            <Marker position={center as LatLngExpression}>
              <Popup>{selectedName}</Popup>
            </Marker>
          )}
          {!selectedName && fallbackLabel && (
            <Marker position={center as LatLngExpression}>
              <Popup>{fallbackLabel}</Popup>
            </Marker>
          )}
        </MapContainer>
      );
    };
  },
  { ssr: false },
);

const categoryLabels = { whisky: "위스키", wine: "와인", tea: "차" } as const;
type Category = keyof typeof categoryLabels;

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
const teaKinds = ["녹차", "백차", "황차", "청차", "흑차"];
const peopleOptions = ["진욱", "지선", "함께", "직접입력"];
type RegionPoint = {
  name: string;
  center: [number, number];
};

const wineRegions: RegionPoint[] = [
  { name: "프랑스", center: [46.6, 2.5] },
  { name: "호주", center: [-25.3, 133.8] },
  { name: "미국", center: [37.1, -95.7] },
  { name: "이탈리아", center: [42.8, 12.5] },
  { name: "스페인", center: [40.2, -3.7] },
];
const teaRegions: RegionPoint[] = [
  { name: "안휘", center: [30.9, 117.8] },
  { name: "푸젠", center: [26.1, 118.3] },
  { name: "윈난", center: [25.0, 101.0] },
  { name: "저장", center: [29.3, 119.8] },
  { name: "쓰촨", center: [30.7, 104.1] },
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
  const [showToast, setShowToast] = useState(false);
  const [distilleryQuery, setDistilleryQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("프랑스");

  const tagOptions = useMemo(() => getTagOptions(category), [category]);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/notes");
      if (!response.ok) return;
      const result = await response.json();
      setNotes(Array.isArray(result) ? result : []);
    };
    load();
  }, []);

  useEffect(() => {
    if (!showToast) return;
    const timer = globalThis.setTimeout(() => setShowToast(false), 2000);
    return () => globalThis.clearTimeout(timer);
  }, [showToast]);

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

  const calendarDays = useMemo(() => {
    const total = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    return [...Array(firstDay).fill(null), ...Array.from({ length: total }, (_, index) => index + 1)];
  }, [selectedMonth, selectedYear]);

  const filteredDistilleries = useMemo(() => {
    if (!distilleryQuery.trim()) return distilleries.slice(0, 14) as Distillery[];
    return distilleries.filter((item) => `${item.name} ${item.name_ko}`.toLowerCase().includes(distilleryQuery.toLowerCase())) as Distillery[];
  }, [distilleryQuery]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addTag = (field: "aroma" | "taste" | "finish", value: string) => {
    updateField(field, form[field] ? `${form[field]}, ${value}` : value);
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>, target: "photo" | "labelPhoto" | "teaLeafPhoto", urlKey: "photoUrl" | "labelPhotoUrl" | "teaLeafUrl") => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateField(target, String(reader.result));
      updateField(urlKey, "");
    };
    reader.readAsDataURL(file);
  };

  const saveNote = async () => {
    const record: Note = {
      ...form,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      category,
      people: form.people === "직접입력" ? form.peopleCustom || "직접입력" : form.people,
      distilleryName: form.selectedDistillery?.name_ko || form.distilleryName,
      type: form.type || (category === "whisky" ? "싱글몰트" : category === "wine" ? "레드" : "녹차"),
    };

    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: record }),
    });

    if (!response.ok) {
      if (typeof globalThis !== "undefined" && typeof globalThis.alert === "function") {
        globalThis.alert("저장에 실패했습니다.");
      }
      return;
    }

    setNotes((prev) => [record, ...prev]);
    setView("archive");
    setArchiveFilter(category);
    setForm(getDefaultForm(category));
    setShowToast(true);
  };

  const deleteNote = async (id: string) => {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteId: id }),
    });
    if (response.ok) {
      setNotes((prev) => prev.filter((note) => note.id !== id));
      setSelectedNote(null);
    }
  };

  const editNote = (note: Note) => {
    setCategory(note.category);
    setForm({
      ...getDefaultForm(note.category),
      ...note,
      people: ["진욱", "지선", "함께"].includes(note.people) ? note.people : "직접입력",
      peopleCustom: ["진욱", "지선", "함께"].includes(note.people) ? "" : note.people,
      selectedDistillery: note.selectedDistillery || null,
    });
    setView("tasting");
  };

  const isWhisky = category === "whisky";
  const isWine = category === "wine";
  const isTea = category === "tea";
  const detailDistillery = selectedNote?.selectedDistillery ?? null;

  return (
    <main className="min-h-screen">
      {view === "landing" && (
        <div className="relative min-h-screen overflow-hidden bg-cover bg-center" style={{ backgroundImage: "url('/assets/bgOpen.jpg')" }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(17,10,7,0.34),rgba(17,10,7,0.74))]" />
          <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10">
            <div className="grid w-full items-center gap-8 md:grid-cols-[1.2fr_0.8fr]">
              <div className="text-white text-shadow-soft">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs tracking-[0.2em] text-white/80 backdrop-blur-sm">
                  <FontAwesomeIcon icon={faBookOpen} />
                  tasting journal
                </div>
                <h1 className="text-5xl font-semibold leading-none md:text-7xl">기억을 따뜻하게 남기는 노트</h1>
                <p className="mt-6 max-w-lg text-base leading-8 text-white/80 md:text-lg">
                  위스키, 와인, 차를 마실 때마다 풍경과 감정, 향을 남기고 통계로 오래 기억합니다.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setView("tasting")} className="rounded-full bg-[#f3e3d3] px-6 py-3 font-medium text-[#2b1e1a] shadow-lg shadow-black/20">테이스팅 기록하기</button>
                  <button type="button" onClick={() => setView("archive")} className="rounded-full border border-white/30 bg-white/10 px-6 py-3 font-medium text-white backdrop-blur-sm">아카이브 보기</button>
                </div>
              </div>

              <div className="dark-panel rounded-[32px] p-5 text-white">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-white/8 p-4">
                    <div className="mb-2 text-3xl">🥃</div>
                    <div className="text-xl font-semibold">{stats.whisky}</div>
                    <div className="text-xs text-white/70">Whisky</div>
                  </div>
                  <div className="rounded-2xl bg-white/8 p-4">
                    <div className="mb-2 text-3xl">🍷</div>
                    <div className="text-xl font-semibold">{stats.wine}</div>
                    <div className="text-xs text-white/70">Wine</div>
                  </div>
                  <div className="rounded-2xl bg-white/8 p-4">
                    <div className="mb-2 text-3xl">🍵</div>
                    <div className="text-xl font-semibold">{stats.tea}</div>
                    <div className="text-xs text-white/70">Tea</div>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl bg-white/8 p-4 text-sm leading-7 text-white/80">
                  <div className="font-semibold text-white">오늘의 감상</div>
                  잔을 비우는 순간을 기록해 두면, 다음 한 모금의 기준이 됩니다.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view !== "landing" && (
        <div className="min-h-screen px-4 py-6 md:px-8">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-white/30 shadow-[0_30px_60px_rgba(46,31,25,0.16)]" style={{ backgroundImage: `url('/assets/bg${view === "tasting" ? (category === "whisky" ? "Whisky" : category === "wine" ? "Wine" : "Tea") : "Whisky"}.jpg')`, backgroundSize: "cover", backgroundPosition: "center" }}>
            <div className="bg-[linear-gradient(180deg,rgba(14,10,9,0.18),rgba(14,10,9,0.6))] p-4 md:p-6">
              <header className="glass-panel rounded-[24px] px-4 py-3 text-[#281d18] md:px-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-[#f1e6dc] p-2 text-[#533d32]"><FontAwesomeIcon icon={faGlassCheers} /></div>
                    <div>
                      <div className="text-[10px] tracking-[0.3em] text-[#715d55]">TASTING NOTE</div>
                      <div className="text-xl font-semibold">Tasting Journal</div>
                    </div>
                  </div>
                  <nav className="flex flex-wrap gap-2">
                    {[
                      { key: "tasting", label: "Tasting Note", icon: faBookOpen },
                      { key: "archive", label: "Archive", icon: faSearch },
                      { key: "calendar", label: "Calendar", icon: faCalendarAlt },
                    ].map((item) => (
                      <button key={item.key} type="button" onClick={() => setView(item.key as "tasting" | "archive" | "calendar")} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${view === item.key ? "bg-[#2a201d] text-[#f4efe9]" : "bg-white/60 text-[#2a201d]"}`}>
                        <FontAwesomeIcon icon={item.icon} />{item.label}
                      </button>
                    ))}
                  </nav>
                </div>
              </header>

              <div className="mt-6 space-y-6">
                {view === "tasting" && (
                  <section className="glass-panel rounded-[28px] p-4 md:p-6">
                    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-[10px] tracking-[0.3em] text-[#6c594f]">CATEGORY</div>
                        <h2 className="mt-1 text-3xl font-semibold text-[#221d1b]">테이스팅 노트</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(["whisky", "wine", "tea"] as Category[]).map((item) => (
                          <button key={item} type="button" onClick={() => { setCategory(item); setForm((prev) => ({ ...prev, category: item, type: item === "whisky" ? "싱글몰트" : item === "wine" ? "레드" : "녹차" })); }} className={`rounded-full px-4 py-2 text-sm font-medium ${category === item ? "bg-[#2a201d] text-[#f3efe9]" : "bg-white/70 text-[#2d2522]"}`}>{categoryLabels[item]}</button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-sm font-medium text-[#3f312d]">
                          <span className="mb-2 block">마신날</span>
                          <input type="date" value={form.date} onChange={(e) => updateField("date", e.target.value)} className="w-full rounded-2xl border border-[#d9cbb9] bg-white/80 p-3 outline-none" />
                        </label>
                        <label className="block text-sm font-medium text-[#3f312d]">
                          <span className="mb-2 block">장소</span>
                          <input value={form.place} onChange={(e) => updateField("place", e.target.value)} placeholder="예: 서울, 도쿄" className="w-full rounded-2xl border border-[#d9cbb9] bg-white/80 p-3 outline-none" />
                        </label>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-sm font-medium text-[#3f312d]">
                          <span className="mb-2 block">마신 사람</span>
                          <select value={form.people === "직접입력" ? "직접입력" : form.people} onChange={(e) => { const value = e.target.value; updateField("people", value); if (value !== "직접입력") updateField("peopleCustom", ""); }} className="w-full rounded-2xl border border-[#d9cbb9] bg-white/80 p-3 outline-none">
                            {peopleOptions.map((person) => <option key={person} value={person}>{person}</option>)}
                          </select>
                        </label>
                        {form.people === "직접입력" && (
                          <label className="block text-sm font-medium text-[#3f312d]">
                            <span className="mb-2 block">직접 입력</span>
                            <input value={form.peopleCustom} onChange={(e) => updateField("peopleCustom", e.target.value)} placeholder="이름 입력" className="w-full rounded-2xl border border-[#d9cbb9] bg-white/80 p-3 outline-none" />
                          </label>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-sm font-medium text-[#3f312d]">
                          <span className="mb-2 block">종류</span>
                          <select value={form.type} onChange={(e) => updateField("type", e.target.value)} className="w-full rounded-2xl border border-[#d9cbb9] bg-white/80 p-3 outline-none">
                            {(isWhisky ? whiskyKinds : isWine ? wineKinds : teaKinds).map((item) => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </label>
                        {isTea ? (
                          <label className="block text-sm font-medium text-[#3f312d]">
                            <span className="mb-2 block">세부품종</span>
                            <input value={form.teaVariety} onChange={(e) => updateField("teaVariety", e.target.value)} placeholder="예: 대운본, 우전" className="w-full rounded-2xl border border-[#d9cbb9] bg-white/80 p-3 outline-none" />
                          </label>
                        ) : (
                          <label className="block text-sm font-medium text-[#3f312d]">
                            <span className="mb-2 block">이름</span>
                            <input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder={isWhisky ? "예: Glenlivet 12" : "예: Châteauneuf-du-Pape"} className="w-full rounded-2xl border border-[#d9cbb9] bg-white/80 p-3 outline-none" />
                          </label>
                        )}
                      </div>

                      {isTea && (
                        <label className="block text-sm font-medium text-[#3f312d]">
                          <span className="mb-2 block">이름</span>
                          <input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="예: 우전 2024" className="w-full rounded-2xl border border-[#d9cbb9] bg-white/80 p-3 outline-none" />
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
                            <div className="mt-4 h-64 overflow-hidden rounded-2xl border border-[#d5c2a5]">
                              <DynamicMap
                                center={[form.selectedDistillery.latitude, form.selectedDistillery.longitude] as LatLngExpression}
                                zoom={7}
                                selectedName={form.selectedDistillery.name_ko}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {isWine && (
                        <div className="rounded-3xl border border-[#dbc6ae] bg-white/65 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-[#392d27]">산지 선택</h3>
                            <div className="flex flex-wrap gap-2 text-xs text-[#5d4d44]">
                              {wineRegions.map((region) => (
                                <button key={region.name} type="button" onClick={() => setSelectedRegion(region.name)} className={`rounded-full px-2 py-1 ${selectedRegion === region.name ? "bg-[#d9b48a] text-[#2d1f18]" : "bg-[#f1e6dc]"}`}>{region.name}</button>
                              ))}
                            </div>
                          </div>
                          <div className="mt-4 h-64 overflow-hidden rounded-2xl border border-[#d5c2a5]">
                            <DynamicMap
                              center={(wineRegions.find((region) => region.name === selectedRegion)?.center ?? [46.6, 2.5]) as LatLngExpression}
                              zoom={selectedRegion === "프랑스" ? 5 : 3}
                              markers={wineRegions}
                            />
                          </div>
                          <input value={form.regionName} onChange={(e) => { updateField("regionName", e.target.value); setSelectedRegion(e.target.value || selectedRegion); }} placeholder="다른 국가 입력" className="mt-3 w-full rounded-xl border border-[#e8dac9] bg-white p-3 outline-none" />
                        </div>
                      )}

                      {isTea && (
                        <div className="rounded-3xl border border-[#dbc6ae] bg-white/65 p-4">
                          <div className="mb-2 font-semibold text-[#392d27]">중국 산지 선택</div>
                          <div className="h-64 overflow-hidden rounded-2xl border border-[#d5c2a5]">
                            <DynamicMap
                              center={[32.3, 110.0] as LatLngExpression}
                              zoom={4}
                              markers={teaRegions}
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
                            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-[#3a2d28]">
                              <span>{field === "aroma" ? "향" : field === "taste" ? "맛" : "피니시"}</span>
                              <span className="text-[10px] text-[#736159]">칩 추가</span>
                            </div>
                            <div className="mb-2 flex flex-wrap gap-2">
                              {tagOptions.map((tag) => <button key={tag} type="button" onClick={() => addTag(field, tag)} className="rounded-full border border-[#d9b894] bg-[#f7efe8] px-2 py-1 text-[10px] text-[#493a34]">+ {tag}</button>)}
                            </div>
                            <textarea value={form[field]} onChange={(e) => updateField(field, e.target.value)} className="min-h-24 w-full rounded-xl border border-[#e8dac9] bg-white p-2 outline-none" />
                          </div>
                        ))}
                      </div>

                      {(isWine || isTea) && (
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
                        <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="기억하고 싶은 감상, 가격, 페어링, 분위기 등을 남기세요." className="min-h-28 w-full rounded-2xl border border-[#d9cbb9] bg-white/80 p-3 outline-none" />
                      </label>

                      <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setForm(getDefaultForm(category))} className="rounded-full border border-[#d3bda5] bg-white/80 px-5 py-2.5 text-sm font-medium text-[#442f29]">초기화</button>
                        <button type="button" onClick={saveNote} className="rounded-full bg-[#2b1f1a] px-5 py-2.5 text-sm font-medium text-[#f8f4f0] shadow-lg shadow-[#47352e]/20">저장</button>
                      </div>
                    </div>
                  </section>
                )}

                {view === "archive" && (
                  <section className="glass-panel rounded-[28px] p-4 md:p-6">
                    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-[10px] tracking-[0.3em] text-[#6c594f]">ARCHIVE</div>
                        <h2 className="mt-1 text-3xl font-semibold text-[#221d1b]">기록 아카이브</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setArchiveFilter("all")} className={`rounded-full px-3 py-2 text-sm ${archiveFilter === "all" ? "bg-[#2a201d] text-white" : "bg-white/70 text-[#2a201d]"}`}>전체</button>
                        {(["whisky", "wine", "tea"] as const).map((item) => <button key={item} type="button" onClick={() => setArchiveFilter(item)} className={`rounded-full px-3 py-2 text-sm ${archiveFilter === item ? "bg-[#2a201d] text-white" : "bg-white/70 text-[#2a201d]"}`}>{categoryLabels[item]}</button>)}
                      </div>
                    </div>

                    <div className="mb-5 flex items-center gap-2 rounded-2xl border border-[#e8d9c9] bg-white/70 px-3 py-2">
                      <FontAwesomeIcon icon={faSearch} className="text-[#695953]" />
                      <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="이름, 장소, 메모, 증류소 검색" className="w-full bg-transparent text-sm outline-none placeholder:text-[#8b766b]" />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      {filteredNotes.length ? filteredNotes.map((note) => (
                        <button key={note.id} type="button" onClick={() => setSelectedNote(note)} className="w-full rounded-[28px] border border-[#e4d8ca] bg-white/80 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                          <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#7a655d]">
                            <span>{formatDate(note.date)}</span>
                            <span>{categoryLabels[note.category]}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-16 w-16 overflow-hidden rounded-2xl bg-[#efe3d4]">
                              {note.photo || note.photoUrl ? (
                                <div className="relative h-full w-full">
                                  <Image src={note.photo || note.photoUrl} alt={note.name} fill unoptimized className="object-cover" />
                                </div>
                              ) : (
                                <div className="flex h-full items-center justify-center text-2xl text-[#9a7b5f]">{note.category === "whisky" ? "🥃" : note.category === "wine" ? "🍷" : "🍵"}</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-lg font-semibold text-[#2a201d]">{note.name || "미기록"}</div>
                              <div className="mt-1 text-sm text-[#6d5d57]">{note.place || "장소 미기록"}</div>
                              <div className="mt-2 flex flex-wrap gap-1"><span className="rounded-full bg-[#f1e6dc] px-2 py-1 text-[10px] text-[#513f39]">{`${note.type || "-"} ${note.regionName || note.distilleryName || ""}`.trim()}</span></div>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex gap-2">
                              <button type="button" onClick={(e) => { e.stopPropagation(); editNote(note); }} className="rounded-full bg-[#efe1cf] px-3 py-1.5 text-xs text-[#3d2d25]"><FontAwesomeIcon icon={faPen} className="mr-1" />수정</button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} className="rounded-full bg-[#f7d8d2] px-3 py-1.5 text-xs text-[#612f28]"><FontAwesomeIcon icon={faTrash} className="mr-1" />삭제</button>
                            </div>
                            <span className="text-xs text-[#7e665d]">상세보기</span>
                          </div>
                        </button>
                      )) : <div className="rounded-3xl border border-dashed border-[#d7c5b3] bg-white/60 p-10 text-center text-[#5d4d47]">아직 저장된 기록이 없습니다.</div>}
                    </div>
                  </section>
                )}

                {view === "calendar" && (
                  <section className="glass-panel rounded-[28px] p-4 md:p-6">
                    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-[10px] tracking-[0.3em] text-[#6c594f]">CALENDAR</div>
                        <h2 className="mt-1 text-3xl font-semibold text-[#221d1b]">마신 기록 달력</h2>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { const next = new Date(selectedYear, selectedMonth - 1, 1); setSelectedYear(next.getFullYear()); setSelectedMonth(next.getMonth()); }} className="rounded-full bg-white/70 px-3 py-2 text-sm">이전</button>
                        <div className="rounded-full bg-white/70 px-4 py-2 text-sm font-medium">{selectedYear}.{selectedMonth + 1}</div>
                        <button type="button" onClick={() => { const next = new Date(selectedYear, selectedMonth + 1, 1); setSelectedYear(next.getFullYear()); setSelectedMonth(next.getMonth()); }} className="rounded-full bg-white/70 px-3 py-2 text-sm">다음</button>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                      <div className="rounded-[28px] border border-[#e9dfd3] bg-white/70 p-4">
                        <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-[#685950]">
                          {['일', '월', '화', '수', '목', '금', '토'].map((day) => <div key={day} className="py-2">{day}</div>)}
                        </div>
                        <div className="mt-2 grid grid-cols-7 gap-2">
                          {calendarDays.map((day, index) => {
                            const dateString = day ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
                            const dayNotes = day ? notes.filter((note) => note.date === dateString) : [];
                            return (
                              <button key={`${day ?? "empty"}-${index}`} type="button" onClick={() => { if (!dayNotes.length) return; setView("archive"); setArchiveFilter("all"); setSearchTerm(dateString); }} className={`relative min-h-24 rounded-2xl border p-2 text-left ${day ? "border-[#e9dccd] bg-[#fffaf7]" : "border-transparent bg-transparent"}`}>
                                {day && <>
                                  <div className="text-xs font-semibold text-[#392d28]">{day}</div>
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {dayNotes.slice(0, 2).map((note) => <span key={note.id} className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] ${note.category === "whisky" ? "bg-[#d8c0a0]" : note.category === "wine" ? "bg-[#e9d2d4]" : "bg-[#d4e0c8]"}`}>{note.category === "whisky" ? "W" : note.category === "wine" ? "V" : "T"}</span>)}
                                  </div>
                                </>}
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
                          <div className="mb-3 text-sm font-semibold text-[#382d28]">이 달의 기록</div>
                          <div className="space-y-2">
                            {monthNotes.length ? monthNotes.slice(0, 6).map((note) => (
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

      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a130f]/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-[30px] border border-[#ebddd0] bg-[#fffaf6] p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-[10px] tracking-[0.25em] text-[#7e665d]">DETAIL</div>
                <h3 className="mt-1 text-2xl font-semibold text-[#2b201d]">{selectedNote.name || "테이스팅 기록"}</h3>
              </div>
              <button type="button" onClick={() => setSelectedNote(null)} className="rounded-full bg-[#f1e6dc] px-3 py-1.5 text-sm text-[#3d2c25]">닫기</button>
            </div>
            <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-4">
                <div className="relative h-72 w-full overflow-hidden rounded-[22px]">
                  <Image src={selectedNote.photo || selectedNote.photoUrl} alt={selectedNote.name} fill unoptimized className="object-cover" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedNote.category === "whisky" && (selectedNote.labelPhoto || selectedNote.labelPhotoUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof globalThis !== "undefined" && typeof globalThis.alert === "function") {
                          globalThis.alert(selectedNote.labelPhoto || selectedNote.labelPhotoUrl || "라벨 이미지 없음");
                        }
                      }}
                      className="rounded-full bg-[#efe1cf] px-3 py-2 text-xs text-[#472f2a]"
                    >
                      라벨보기
                    </button>
                  )}
                  {selectedNote.category === "whisky" && detailDistillery && (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof globalThis !== "undefined" && typeof globalThis.alert === "function") {
                          globalThis.alert(`${detailDistillery.name_ko}\n${detailDistillery.latitude}, ${detailDistillery.longitude}`);
                        }
                      }}
                      className="rounded-full bg-[#efe1cf] px-3 py-2 text-xs text-[#472f2a]"
                    >
                      증류소
                    </button>
                  )}
                  {selectedNote.category === "wine" && selectedNote.regionName && (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof globalThis !== "undefined" && typeof globalThis.alert === "function") {
                          globalThis.alert(`산지: ${selectedNote.regionName}`);
                        }
                      }}
                      className="rounded-full bg-[#efe1cf] px-3 py-2 text-xs text-[#472f2a]"
                    >
                      산지
                    </button>
                  )}
                  {selectedNote.category === "tea" && selectedNote.regionName && (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof globalThis !== "undefined" && typeof globalThis.alert === "function") {
                          globalThis.alert(`산지: ${selectedNote.regionName}`);
                        }
                      }}
                      className="rounded-full bg-[#efe1cf] px-3 py-2 text-xs text-[#472f2a]"
                    >
                      산지
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-4 text-sm text-[#3c2d26]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#f5eee8] p-3"><div className="text-[10px] uppercase tracking-[0.2em] text-[#7a665f]">날짜</div><div className="mt-2 font-semibold">{formatDate(selectedNote.date)}</div></div>
                  <div className="rounded-2xl bg-[#f5eee8] p-3"><div className="text-[10px] uppercase tracking-[0.2em] text-[#7a665f]">장소</div><div className="mt-2 font-semibold">{selectedNote.place || "-"}</div></div>
                  <div className="rounded-2xl bg-[#f5eee8] p-3"><div className="text-[10px] uppercase tracking-[0.2em] text-[#7a665f]">마신 사람</div><div className="mt-2 font-semibold">{selectedNote.people || "-"}</div></div>
                  <div className="rounded-2xl bg-[#f5eee8] p-3"><div className="text-[10px] uppercase tracking-[0.2em] text-[#7a665f]">종류</div><div className="mt-2 font-semibold">{selectedNote.type || "-"}</div></div>
                </div>
                <div className="rounded-2xl bg-[#f8f2eb] p-4">
                  <div className="mb-2 font-semibold text-[#2d2320]">기본 정보</div>
                  <div className="space-y-2 text-[#5a4a43]">
                    <p>향: {selectedNote.aroma || "-"}</p>
                    <p>맛: {selectedNote.taste || "-"}</p>
                    <p>피니시: {selectedNote.finish || "-"}</p>
                    <p>메모: {selectedNote.notes || "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-6 right-6 z-[60] rounded-full bg-[#1f1915] px-5 py-3 text-sm font-medium text-[#f8f4f0] shadow-2xl shadow-[#2c221e]/20">
          <div className="flex items-center gap-2"><FontAwesomeIcon icon={faCheck} className="text-[#c8e3bb]" />저장완료</div>
        </div>
      )}
    </main>
  );
}
