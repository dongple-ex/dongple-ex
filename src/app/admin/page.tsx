import Link from "next/link";
import {
    Activity,
    AlertCircle,
    ArrowRight,
    CalendarDays,
    Clock3,
    EyeOff,
    HelpCircle,
    MapPin,
    Radio,
    RefreshCw,
    ShieldAlert,
    Users,
} from "lucide-react";

import { sortEventsByClosestDate } from "@/lib/eventSort";
import { supabase } from "@/lib/supabase";

export const revalidate = 0;

type AdminStatusRow = {
    id: string;
    place_name: string;
    category: string;
    status: string;
    is_request: boolean;
    verified_count: number | null;
    is_hidden: boolean | null;
    message: string | null;
    created_at: string;
    expires_at: string;
};

type AdminEventRow = {
    id: number | string;
    title: string;
    address: string | null;
    event_start_date: string | null;
    event_end_date: string | null;
};

async function getCount(query: PromiseLike<{ count: number | null; error?: unknown }>) {
    const { count, error } = await query;
    if (error) return 0;
    return count || 0;
}

async function getDashboardStats() {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const [
        users,
        totalStatuses,
        todayStatuses,
        activeStatuses,
        pendingRequests,
        hiddenStatuses,
        totalEvents,
        recentStatusesResult,
        eventsResult,
    ] = await Promise.all([
        getCount(supabase.from("profiles").select("*", { count: "exact", head: true })),
        getCount(supabase.from("live_status").select("*", { count: "exact", head: true })),
        getCount(supabase.from("live_status").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString())),
        getCount(
            supabase
                .from("live_status")
                .select("*", { count: "exact", head: true })
                .eq("is_hidden", false)
                .gt("expires_at", now.toISOString()),
        ),
        getCount(
            supabase
                .from("live_status")
                .select("*", { count: "exact", head: true })
                .eq("is_request", true)
                .eq("is_hidden", false),
        ),
        getCount(supabase.from("live_status").select("*", { count: "exact", head: true }).eq("is_hidden", true)),
        getCount(supabase.from("events").select("*", { count: "exact", head: true })),
        supabase
            .from("live_status")
            .select("id,place_name,category,status,is_request,verified_count,is_hidden,message,created_at,expires_at")
            .order("created_at", { ascending: false })
            .limit(6),
        supabase
            .from("events")
            .select("id,title,address,event_start_date,event_end_date")
            .order("event_start_date", { ascending: true })
            .limit(30),
    ]);

    return {
        activeStatuses,
        hiddenStatuses,
        pendingRequests,
        recentStatuses: ((recentStatusesResult.data || []) as AdminStatusRow[]).slice(0, 6),
        todayStatuses,
        totalEvents,
        totalStatuses,
        upcomingEvents: sortEventsByClosestDate((eventsResult.data || []) as AdminEventRow[]).slice(0, 5),
        users,
    };
}

function formatRelative(value: string) {
    const diffMs = Date.now() - new Date(value).getTime();
    const diffMin = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    return `${Math.floor(diffHour / 24)}일 전`;
}

function formatDday(value?: string | null) {
    if (!value) return "일정 확인";
    const normalized = value.replace(/\./g, "-").replace(/\//g, "-");
    const target = new Date(normalized).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    if (Number.isNaN(target)) return "일정 확인";
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    if (diff > 0) return `D-${diff}`;
    if (diff === 0) return "오늘";
    return "진행/종료 확인";
}

function getStatusBadge(status: AdminStatusRow) {
    if (status.is_hidden) return "bg-red-50 text-red-700 ring-red-600/10";
    if (status.is_request) return "bg-sky-50 text-sky-700 ring-sky-600/10";
    if (new Date(status.expires_at).getTime() < Date.now()) return "bg-amber-50 text-amber-700 ring-amber-600/10";
    if (status.status === "혼잡") return "bg-rose-50 text-rose-700 ring-rose-600/10";
    if (status.status === "여유") return "bg-emerald-50 text-emerald-700 ring-emerald-600/10";
    return "bg-yellow-50 text-yellow-700 ring-yellow-600/10";
}

export default async function AdminDashboardPage() {
    const stats = await getDashboardStats();

    const attentionItems = [
        {
            label: "확인 요청",
            value: stats.pendingRequests,
            tone: "bg-sky-50 text-sky-700",
            hint: "응답이 필요한 현장 요청",
        },
        {
            label: "숨김 처리",
            value: stats.hiddenStatuses,
            tone: "bg-red-50 text-red-700",
            hint: "관리자가 다시 검토할 항목",
        },
        {
            label: "활성 라이브",
            value: stats.activeStatuses,
            tone: stats.activeStatuses > 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
            hint: "현재 지도와 홈에서 살아있는 제보",
        },
    ];

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Operations</p>
                    <h1 className="mt-1 text-2xl font-bold text-gray-900">대시보드</h1>
                    <p className="mt-1 text-sm text-gray-500">내발문자 전체 운영 지표와 지금 확인해야 할 큐입니다.</p>
                </div>
                <Link
                    href="/admin/reports"
                    className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-gray-800"
                >
                    제보 검수
                    <ArrowRight size={16} className="ml-2" />
                </Link>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={Users} label="총 누적 사용자" value={`${stats.users.toLocaleString()}명`} tone="text-indigo-600" />
                <StatCard icon={Activity} label="총 누적 제보" value={`${stats.totalStatuses.toLocaleString()}건`} tone="text-blue-600" />
                <StatCard icon={RefreshCw} label="오늘 올라온 제보" value={`${stats.todayStatuses.toLocaleString()}건`} tone="text-emerald-600" />
                <StatCard icon={CalendarDays} label="공식 행사 데이터" value={`${stats.totalEvents.toLocaleString()}건`} tone="text-purple-600" />
            </div>

            <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
                {attentionItems.map((item) => (
                    <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-semibold text-gray-500">{item.label}</p>
                                <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{item.value.toLocaleString()}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.tone}`}>운영 큐</span>
                        </div>
                        <p className="mt-3 text-sm text-gray-500">{item.hint}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">최근 라이브 제보</h2>
                            <p className="mt-0.5 text-xs font-medium text-gray-500">만료/요청/숨김 상태를 빠르게 구분합니다.</p>
                        </div>
                        <Link href="/admin/reports" className="text-sm font-bold text-indigo-600 hover:underline">
                            전체 보기
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {stats.recentStatuses.length > 0 ? (
                            stats.recentStatuses.map((status) => (
                                <div key={status.id} className="flex items-center gap-4 px-5 py-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
                                        {status.is_request ? <HelpCircle size={18} /> : status.is_hidden ? <EyeOff size={18} /> : <Radio size={18} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate text-sm font-bold text-gray-900">{status.place_name}</p>
                                            <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${getStatusBadge(status)}`}>
                                                {status.is_hidden ? "숨김" : status.is_request ? "요청" : status.status}
                                            </span>
                                        </div>
                                        <p className="mt-1 truncate text-xs font-medium text-gray-500">
                                            {status.message || status.category || "메시지 없음"}
                                        </p>
                                    </div>
                                    <div className="text-right text-xs font-semibold text-gray-400">
                                        <div className="flex items-center justify-end">
                                            <Clock3 size={12} className="mr-1" />
                                            {formatRelative(status.created_at)}
                                        </div>
                                        <div className="mt-1">{status.verified_count || 0}명 확인</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="px-5 py-10 text-center text-sm font-medium text-gray-400">최근 제보가 없습니다.</div>
                        )}
                    </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-5 py-4">
                        <h2 className="text-base font-bold text-gray-900">가까운 공식 일정</h2>
                        <p className="mt-0.5 text-xs font-medium text-gray-500">TourAPI/저장 행사 중 운영 노출 우선순위입니다.</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {stats.upcomingEvents.length > 0 ? (
                            stats.upcomingEvents.map((event) => (
                                <div key={event.id} className="px-5 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="line-clamp-1 text-sm font-bold text-gray-900">{event.title}</p>
                                            <p className="mt-1 flex items-center truncate text-xs font-medium text-gray-500">
                                                <MapPin size={12} className="mr-1 shrink-0" />
                                                {event.address || "주소 정보 없음"}
                                            </p>
                                        </div>
                                        <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                                            {formatDday(event.event_start_date)}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-xs font-medium text-gray-400">
                                        {event.event_start_date || "-"} ~ {event.event_end_date || "-"}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="px-5 py-10 text-center text-sm font-medium text-gray-400">공식 행사 데이터가 없습니다.</div>
                        )}
                    </div>
                </section>
            </div>

            <h2 className="mb-4 mt-8 text-lg font-bold text-gray-900">바로가기</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <AdminLink href="/admin/reports" icon={AlertCircle} title="제보 및 현황 검수" description="사용자가 올린 장소 현황과 제보 내역을 확인합니다." />
                <AdminLink href="/admin/users" icon={Users} title="사용자 활동 관리" description="가입 사용자, 인증 상태, 신뢰도와 활동 지표를 봅니다." />
                <AdminLink href="/admin/settings" icon={ShieldAlert} title="운영 설정 점검" description="운영 정책과 연동 상태를 체크리스트로 관리합니다." />
            </div>
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: typeof Users;
    label: string;
    value: string;
    tone: string;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center p-5">
                <Icon className={`h-6 w-6 shrink-0 ${tone}`} />
                <dl className="ml-5 min-w-0 flex-1">
                    <dt className="truncate text-sm font-medium text-gray-500">{label}</dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{value}</dd>
                </dl>
            </div>
        </div>
    );
}

function AdminLink({
    href,
    icon: Icon,
    title,
    description,
}: {
    href: string;
    icon: typeof Users;
    title: string;
    description: string;
}) {
    return (
        <Link href={href} className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="inline-flex rounded-lg bg-indigo-50 p-3 text-indigo-700 ring-4 ring-white">
                <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-500">{description}</p>
        </Link>
    );
}
