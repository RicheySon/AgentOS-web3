'use client';

import { Home, Bot, Users, CreditCard, Database, BarChart, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { icon: Home, label: 'Overview', href: '/dashboard' },
    { icon: Bot, label: 'AI Chat', href: '/dashboard/chat' },
    { icon: Users, label: 'Agents', href: '/dashboard/agents' },
    { icon: CreditCard, label: 'Payments', href: '/dashboard/payments' },
    { icon: Database, label: 'Memory', href: '/dashboard/memory' },
    { icon: BarChart, label: 'Analytics', href: '/dashboard/analytics' },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col transition-colors duration-300">
            {/* Logo */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <Link href="/">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        AgentOS
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">Web3 AI Platform</p>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6">
                <div className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${isActive
                                        ? 'bg-purple-600 text-white'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-white hover:bg-purple-50 dark:hover:bg-slate-800'
                                    }
                `}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Settings */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-white hover:bg-purple-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                >
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">Settings</span>
                </Link>
                <div className="px-4 text-[10px] text-slate-500 font-mono">
                    <p className="mb-1 opacity-70">Contract Active:</p>
                    <p className="break-all text-purple-600 dark:text-purple-400">
                        {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x...'}
                    </p>
                </div>
            </div>
        </div>
    );
}
