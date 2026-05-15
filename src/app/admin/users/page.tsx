import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { BadgeCheck, Clock3, ShieldCheck, Star, Users } from "lucide-react";

export const revalidate = 0;

async function getUsers() {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error fetching profiles for admin:", error);
        return [];
    }
    return data;
}

function getUserSummary(users: Awaited<ReturnType<typeof getUsers>>) {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const verified = users.filter((user) => user.is_verified).length;
    const admins = users.filter((user) => user.is_admin).length;
    const activeThisWeek = users.filter((user) => {
        if (!user.last_active_at) return false;
        return new Date(user.last_active_at).getTime() >= weekAgo;
    }).length;
    const averageTrust = users.length
        ? users.reduce((sum, user) => sum + Number(user.trust_score || 0), 0) / users.length
        : 0;

    return { activeThisWeek, admins, averageTrust, verified };
}

export default async function AdminUsersPage() {
    const users = await getUsers();
    const summary = getUserSummary(users);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">사용자 활동 관리</h1>
                <p className="mt-1 text-sm text-gray-500">가입된 전체 사용자 목록 및 신뢰도 정보입니다. (최근 가입순 50명)</p>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard icon={Users} label="표시 사용자" value={`${users.length.toLocaleString()}명`} tone="text-indigo-600" />
                <SummaryCard icon={BadgeCheck} label="인증 사용자" value={`${summary.verified.toLocaleString()}명`} tone="text-blue-600" />
                <SummaryCard icon={Clock3} label="7일 내 활동" value={`${summary.activeThisWeek.toLocaleString()}명`} tone="text-emerald-600" />
                <SummaryCard icon={Star} label="평균 신뢰도" value={summary.averageTrust.toFixed(1)} tone="text-amber-600" />
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left font-semibold text-gray-900">가입일</th>
                                <th className="px-6 py-3 text-left font-semibold text-gray-900">닉네임</th>
                                <th className="px-6 py-3 text-left font-semibold text-gray-900">Public ID</th>
                                <th className="px-6 py-3 text-center font-semibold text-gray-900">소셜 계정</th>
                                <th className="px-6 py-3 text-center font-semibold text-gray-900">인증여부</th>
                                <th className="px-6 py-3 text-center font-semibold text-gray-900">신뢰도</th>
                                <th className="px-6 py-3 text-center font-semibold text-gray-900">활동</th>
                                <th className="px-6 py-3 text-center font-semibold text-gray-900">최근 접속</th>
                                <th className="px-6 py-3 text-center font-semibold text-gray-900">관리자</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {users.map((user) => (
                                <tr key={user.user_id} className="hover:bg-gray-50">
                                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                                        {user.created_at ? format(new Date(user.created_at), "yyyy-MM-dd") : "-"}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 flex items-center">
                                        {user.avatar_url && (
                                            <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full mr-2 bg-gray-200" />
                                        )}
                                        {user.nickname || "이름없음"}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 font-mono text-xs">
                                        {user.public_id || "-"}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center text-gray-500 uppercase text-xs font-bold">
                                        {user.provider || "-"}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center">
                                        {user.is_verified ? (
                                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                인증됨
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                                미인증
                                            </span>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center font-semibold text-indigo-600">
                                        {user.trust_score ? user.trust_score.toFixed(1) : "0.0"}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center text-xs font-semibold text-gray-500">
                                        제보 {user.status_count || 0} · 글 {user.posts_count || 0} · 확인 {user.verified_count || 0}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center text-gray-500">
                                        {user.last_active_at ? format(new Date(user.last_active_at), "MM-dd HH:mm") : "-"}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center">
                                        {user.is_admin ? (
                                            <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-bold text-purple-700 ring-1 ring-inset ring-purple-600/20">
                                                ADMIN
                                            </span>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                                        사용자 내역이 없습니다.
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
    icon: typeof ShieldCheck;
    label: string;
    value: string;
    tone: string;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-500">{label}</span>
                <Icon className={`h-5 w-5 ${tone}`} />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
        </div>
    );
}
