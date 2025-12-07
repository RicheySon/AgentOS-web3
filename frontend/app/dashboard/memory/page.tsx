'use client';

import { Database, Search } from 'lucide-react';

export default function MemoryPage() {
    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Unibase Memory</h1>
                <p className="text-slate-400">Access and manage the persistent, decentralized memory of your agents.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Database className="w-8 h-8 text-slate-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Memory Explorer Coming Soon</h2>
                <p className="text-slate-400 max-w-lg mx-auto mb-8">
                    We are currently indexing your agent's decentralized memory on the Membase testnet. Full memory exploration will be available in the next update.
                </p>
                <button className="px-6 py-3 border border-slate-700 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors">
                    View Raw Data on Membase Hub
                </button>
            </div>
        </div>
    );
}
