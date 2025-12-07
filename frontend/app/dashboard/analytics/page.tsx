'use client';

import { BarChart } from 'lucide-react';

export default function AnalyticsPage() {
    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <BarChart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
                <p className="text-slate-400 mt-2">Detailed agent performance metrics coming soon.</p>
            </div>
        </div>
    );
}
