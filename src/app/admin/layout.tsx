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
            <div className="flex h-screen w-full bg-gray-50 font-sans text-gray-900">
                {/* Sidebar */}
                <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-white lg:w-24">
                    <div className="flex h-16 items-center justify-center border-b border-gray-100 px-3">
                        <Link
                            href="/admin"
                            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-black text-white shadow-lg shadow-indigo-600/20"
                            aria-label="내발문자 Admin"
                            title="내발문자 Admin"
                        >
                            Admin
                        </Link>
                    </div>

                    <div className="flex flex-col h-[calc(100vh-4rem)] justify-between">
                        <nav className="flex-1 space-y-2 px-3 py-4">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        title={item.name}
                                        aria-label={item.name}
                                        className={`group flex h-12 w-full items-center justify-center rounded-2xl transition-colors ${
                                            isActive
                                                ? "bg-indigo-50 text-indigo-700"
                                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                                    >
                                        <Icon
                                            className={`h-5 w-5 flex-shrink-0 ${
                                                isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-500"
                                            }`}
                                        />
                                        <span className="sr-only">{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="border-t border-gray-200 p-3">
                            <div className="mb-3 flex justify-center" title={profile?.nickname || "관리자"}>
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                    {profile?.nickname?.charAt(0) || "A"}
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex h-12 w-full items-center justify-center rounded-2xl text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700"
                                aria-label="로그아웃"
                                title="로그아웃"
                            >
                                <LogOut className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <main className="min-w-0 flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </AdminGuard>
    );
}
