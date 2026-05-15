import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Clock3, EyeOff, HelpCircle, Radio, ShieldCheck } from "lucide-react";

export const revalidate = 0;

async function getReports() {
    const { data, error } = await supabase
        .from("live_status")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error fetching live_status for admin:", error);
        return [];
    }
    return data;
}

function getReportTone(report: Awaited<ReturnType<typeof getReports>>[number]) {
    if (report.is_hidden) return "bg-red-50 text-red-700 ring-red-600/10";
    if (report.is_request) return "bg-sky-50 text-sky-700 ring-sky-600/10";
    if (new Date(report.expires_at).getTime() < Date.now()) return "bg-amber-50 text-amber-700 ring-amber-600/10";
    if (report.status === "혼잡") return "bg-rose-50 text-rose-700 ring-rose-600/10";
    if (report.status === "여유") return "bg-emerald-50 text-emerald-700 ring-emerald-600/10";
    return "bg-yellow-50 text-yellow-700 ring-yellow-600/10";
}

function getReportLabel(report: Awaited<ReturnType<typeof getReports>>[number]) {
    if (report.is_hidden) return "숨김";
    if (report.is_request) return "확인 요청";
    if (new Date(report.expires_at).getTime() < Date.now()) return `${report.status} 기록`;
    return `${report.status} 상태`;
}

function getSummary(reports: Awaited<ReturnType<typeof getReports>>) {
    const now = Date.now();
    return {
        active: reports.filter((report) => !report.is_hidden && new Date(report.expires_at).getTime() >= now).length,
        expired: reports.filter((report) => !report.is_hidden && new Date(report.expires_at).getTime() < now).length,
        hidden: reports.filter((report) => report.is_hidden).length,
        requests: reports.filter((report) => report.is_request && !report.is_hidden).length,
        total: reports.length,
    };
}

export default async function AdminReportsPage() {
    const reports = await getReports();
    const summary = getSummary(reports);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">제보 및 현황 검수</h1>
                <p className="mt-1 text-sm text-gray-500">최근에 사용자들이 제보한 라이브 상태 목록입니다. (최대 50건)</p>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryCard icon={Radio} label="표시 항목" value={summary.total} tone="text-gray-700" />
                <SummaryCard icon={ShieldCheck} label="활성 상태" value={summary.active} tone="text-emerald-600" />
                <SummaryCard icon={HelpCircle} label="확인 요청" value={summary.requests} tone="text-sky-600" />
                <SummaryCard icon={Clock3} label="최근 기록" value={summary.expired} tone="text-amber-600" />
                <SummaryCard icon={EyeOff} label="숨김" value={summary.hidden} tone="text-red-600" />
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left font-semibold text-gray-900">제보 시간</th>
                                <th className="px-6 py-3 text-left font-semibold text-gray-900">장소/행사명</th>
                                <th className="px-6 py-3 text-left font-semibold text-gray-900">상태 (레벨)</th>
                                <th className="px-6 py-3 text-left font-semibold text-gray-900">내용 (메시지)</th>
                                <th className="px-6 py-3 text-center font-semibold text-gray-900">카테고리</th>
                                <th className="px-6 py-3 text-center font-semibold text-gray-900">확인</th>
                                <th className="px-6 py-3 text-center font-semibold text-gray-900">만료</th>
                                <th className="px-6 py-3 text-center font-semibold text-gray-900">숨김 여부</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {reports.map((report) => (
                                <tr key={report.id} className="hover:bg-gray-50">
                                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                                        {format(new Date(report.created_at), "yyyy-MM-dd HH:mm")}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {report.place_name}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getReportTone(report)}`}>
                                            {getReportLabel(report)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {report.message || "-"}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center text-gray-500">
                                        {report.category}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center font-semibold text-indigo-600">
                                        {report.verified_count || 0}명
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center text-gray-500">
                                        {report.expires_at ? format(new Date(report.expires_at), "MM-dd HH:mm") : "-"}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center">
                                        {report.is_hidden ? (
                                            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                                                숨김
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                정상
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {reports.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                                        제보 내역이 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: typeof Radio;
    label: string;
    value: number;
    tone: string;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-500">{label}</span>
                <Icon className={`h-5 w-5 ${tone}`} />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
    );
}
