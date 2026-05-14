import { supabase } from "@/lib/supabase";
import { Users, Activity, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export const revalidate = 0; // Disable static caching for admin dashboard

async function getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const [
        { count: userCount },
        { count: statusCount },
        { count: todayStatusCount }
    ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("live_status").select("*", { count: "exact", head: true }),
        supabase.from("live_status").select("*", { count: "exact", head: true }).gte("created_at", todayIso),
    ]);

    return {
        users: userCount || 0,
        totalStatuses: statusCount || 0,
        todayStatuses: todayStatusCount || 0,
    };
}

export default async function AdminDashboardPage() {
    const stats = await getDashboardStats();

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
                    <p className="mt-1 text-sm text-gray-500">내발문자 전체 운영 지표 및 현황</p>
                </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {/* Total Users */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Users className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="truncate text-sm font-medium text-gray-500">총 누적 사용자</dt>
                                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{stats.users.toLocaleString()}명</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Total Live Status */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Activity className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="truncate text-sm font-medium text-gray-500">총 누적 제보 (Live Status)</dt>
                                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{stats.totalStatuses.toLocaleString()}건</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Today's Live Status */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <RefreshCw className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="truncate text-sm font-medium text-gray-500">오늘 올라온 제보</dt>
                                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{stats.todayStatuses.toLocaleString()}건</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Links Section */}
            <h2 className="mb-4 text-lg font-bold text-gray-900">바로가기</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Link href="/admin/reports" className="group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                    <div>
                        <div className="inline-flex rounded-lg bg-indigo-50 p-3 text-indigo-700 ring-4 ring-white">
                            <AlertCircle className="h-6 w-6" aria-hidden="true" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-lg font-medium text-gray-900">
                            제보 및 현황 검수
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">
                            사용자가 올린 장소 현황과 제보 내역을 확인하고, 문제가 있는 내역을 검수합니다.
                        </p>
                    </div>
                </Link>

                <Link href="/admin/users" className="group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                    <div>
                        <div className="inline-flex rounded-lg bg-blue-50 p-3 text-blue-700 ring-4 ring-white">
                            <Users className="h-6 w-6" aria-hidden="true" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-lg font-medium text-gray-900">
                            사용자 활동 관리
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">
                            가입된 사용자 목록을 조회하고, 신뢰도 및 활동 이력을 확인합니다.
                        </p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
