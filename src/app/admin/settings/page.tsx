"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, Database, KeyRound, Radio, Settings, ShieldCheck, Image as ImageIcon } from "lucide-react";
import { useAdminSettingsStore } from "@/lib/store/adminSettingsStore";

const OPERATING_RULES = [
    {
        title: "라이브 제보 유지",
        value: "4시간",
        description: "새 현장 공유는 4시간 동안 라이브로 취급하고, 이후에는 최근 기록으로 전환합니다.",
        icon: Radio,
    },
    {
        title: "최근 기록 보존",
        value: "48시간",
        description: "홈과 지도는 48시간 내 기록까지 보여줘 화면이 비어 보이지 않게 합니다.",
        icon: Clock3,
    },
    {
        title: "공식 행사 정렬",
        value: "가까운 일정 우선",
        description: "TourAPI/저장 행사 모두 진행 중, 곧 시작, 날짜 불명, 종료 순으로 노출합니다.",
        icon: Database,
    },
];

const CHECKLIST = [
    "Supabase profiles 테이블에 is_admin 컬럼이 운영 계정 기준으로 세팅되어 있는지 확인",
    "TOURAPI_KEY 또는 TOURAPI_SERVICE_KEY 환경 변수가 배포 환경에 등록되어 있는지 확인",
    "live_status RLS 정책이 공개 읽기/쓰기 정책에 머물러 있지 않은지 운영 전 재검토",
    "관리자 하위 경로는 향후 middleware 또는 서버 세션 검증으로 라우팅 단계에서 차단",
];

export default function AdminSettingsPage() {
    const { imageUpload, setImageUploadSettings } = useAdminSettingsStore();

    return (
        <div className="p-8">
            <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Admin Settings</p>
                <h1 className="mt-1 text-2xl font-bold text-gray-900">운영 설정 점검</h1>
                <p className="mt-1 text-sm text-gray-500">
                    현재 코드에 적용된 운영 기준과 배포 전 확인해야 할 항목입니다.
                </p>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
                {OPERATING_RULES.map((rule) => {
                    const Icon = rule.icon;
                    return (
                        <div key={rule.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="rounded-lg bg-indigo-50 p-3 text-indigo-700">
                                    <Icon size={22} />
                                </div>
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">적용 중</span>
                            </div>
                            <h2 className="mt-4 text-base font-bold text-gray-900">{rule.title}</h2>
                            <p className="mt-1 text-2xl font-black tracking-tight text-indigo-700">{rule.value}</p>
                            <p className="mt-3 text-sm leading-relaxed text-gray-500">{rule.description}</p>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.8fr]">
                <div className="space-y-6">
                    <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700">
                                <ImageIcon size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">이미지 업로드 설정</h2>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    최대 해상도 (가로/세로 픽셀)
                                </label>
                                <select 
                                    value={imageUpload.maxWidth} 
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setImageUploadSettings({ maxWidth: val, maxHeight: val });
                                    }}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                >
                                    <option value={400}>400x400 (매우 가벼움)</option>
                                    <option value={600}>600x600 (현재 권장)</option>
                                    <option value={800}>800x800 (표준)</option>
                                    <option value={1200}>1200x1200 (고화질)</option>
                                </select>
                                <p className="mt-1.5 text-xs text-gray-500">사용자가 업로드하는 이미지가 이 크기를 넘으면 자동으로 축소됩니다.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    압축 품질 (Quality)
                                </label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="range" 
                                        min="0.1" max="1.0" step="0.1" 
                                        value={imageUpload.quality}
                                        onChange={(e) => setImageUploadSettings({ quality: Number(e.target.value) })}
                                        className="flex-1 accent-indigo-600"
                                    />
                                    <span className="w-12 text-right font-bold text-indigo-700">{Math.round(imageUpload.quality * 100)}%</span>
                                </div>
                                <p className="mt-1.5 text-xs text-gray-500">낮을수록 용량이 작아지지만 화질이 저하될 수 있습니다.</p>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-5 py-4">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                                <h2 className="text-base font-bold text-gray-900">배포 전 체크리스트</h2>
                            </div>
                            <p className="mt-1 text-xs font-medium text-gray-500">운영 안정성과 권한 관리를 위해 필요한 항목입니다.</p>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {CHECKLIST.map((item) => (
                                <div key={item} className="flex gap-3 px-5 py-4">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                                    <p className="text-sm font-medium leading-relaxed text-gray-700">{item}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="space-y-5">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                            <div>
                                <h3 className="text-sm font-bold text-amber-900">권한 주의</h3>
                                <p className="mt-2 text-sm leading-relaxed text-amber-800">
                                    현재 관리자 진입은 클라이언트 가드 기반입니다. 운영 배포 전에는 서버 세션 또는 middleware 기반 차단을 추가하는 것이 좋습니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-gray-600" />
                            <h3 className="text-sm font-bold text-gray-900">연동 키</h3>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-gray-500">
                            TourAPI는 서버 라우트에서 환경 변수를 읽습니다. 키가 없으면 공식 행사 연동이 비어 보일 수 있습니다.
                        </p>
                    </div>

                    <Link
                        href="/admin"
                        className="flex items-center justify-center rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-gray-800"
                    >
                        <Settings size={16} className="mr-2" />
                        대시보드로 돌아가기
                    </Link>
                </aside>
            </div>
        </div>
    );
}
