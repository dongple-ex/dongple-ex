"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminGuard } from "@/components/layout/AdminGuard";
import { LayoutDashboard, Users, FileText, Settings, LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { profile, signOut } = useAuthStore();
    const router = useRouter();

    const navigation = [
        { name: "대시보드", href: "/admin", icon: LayoutDashboard },
        { name: "제보 및 현황", href: "/admin/reports", icon: FileText },
        { name: "사용자 관리", href: "/admin/users", icon: Users },
        { name: "설정", href: "/admin/settings", icon: Settings },
    ];

    const handleLogout = async () => {
        await signOut();
        router.replace("/");
    };

    return (
        <AdminGuard>
            <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
                {/* Sidebar */}
                <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white">
                    <div className="flex h-16 flex-col justify-center px-6 border-b border-gray-100">
                        <Link href="/admin" className="text-xl font-black text-indigo-600">
                            내발문자 Admin
                        </Link>
                    </div>

                    <div className="flex flex-col h-[calc(100vh-4rem)] justify-between">
                        <nav className="flex-1 space-y-1 px-3 py-4">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                                            isActive
                                                ? "bg-indigo-50 text-indigo-700"
                                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                                    >
                                        <Icon
                                            className={`mr-3 h-5 w-5 flex-shrink-0 ${
                                                isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-500"
                                            }`}
                                        />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="border-t border-gray-200 p-4">
                            <div className="flex items-center mb-4">
                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                    {profile?.nickname?.charAt(0) || "A"}
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-semibold text-gray-700">{profile?.nickname}</p>
                                    <p className="text-xs font-medium text-gray-500">관리자</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700"
                            >
                                <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-500" />
                                로그아웃
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </AdminGuard>
    );
}
