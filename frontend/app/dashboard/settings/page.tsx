'use client';

import { Settings } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">Settings</h1>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-white mb-4">General Settings</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                            <div>
                                <p className="text-white font-medium">Dark Mode</p>
                                <p className="text-sm text-slate-400">Enable dark theme for the dashboard</p>
                            </div>
                            <div className="w-12 h-6 bg-purple-600 rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-white mb-4">API Configuration</h3>
                    <div className="p-4 bg-slate-800/50 rounded-lg space-y-2">
                        <p className="text-sm text-slate-400">Backend API URL</p>
                        <input
                            type="text"
                            value="http://localhost:3000"
                            disabled
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-300"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
