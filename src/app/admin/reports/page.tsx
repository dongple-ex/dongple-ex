import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

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

export default async function AdminReportsPage() {
    const reports = await getReports();

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">제보 및 현황 검수</h1>
                <p className="mt-1 text-sm text-gray-500">최근에 사용자들이 제보한 라이브 상태 목록입니다. (최대 50건)</p>
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
                                        <span
                                            className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                            style={{
                                                backgroundColor: `${report.status_color}20`,
                                                color: report.status_color
                                            }}
                                        >
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {report.message || "-"}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center text-gray-500">
                                        {report.category}
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
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
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
