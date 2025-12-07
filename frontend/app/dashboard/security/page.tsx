'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Shield, DollarSign, CheckCircle, XCircle, Plus, Trash2, AlertTriangle } from 'lucide-react';
import axios from 'axios';

interface SpendCap {
    id: string;
    type: 'daily' | 'weekly' | 'per-action';
    limit: string;
    current: string;
}

interface AllowDenyList {
    id: string;
    address: string;
    type: 'allow' | 'deny';
    reason: string;
}

export default function SecurityPage() {
    const { address, isConnected } = useAccount();
    const [spendCaps, setSpendCaps] = useState<SpendCap[]>([]);
    const [allowDenyList, setAllowDenyList] = useState<AllowDenyList[]>([]);
    const [newCap, setNewCap] = useState({ type: 'daily', limit: '' });
    const [newListEntry, setNewListEntry] = useState({ address: '', type: 'allow', reason: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isConnected && address) {
            loadSecuritySettings();
        }
    }, [address, isConnected]);

    const loadSecuritySettings = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

            // Load spend caps
            const capsRes = await axios.get(`${API_URL}/api/security/spend-caps?wallet=${address}`);
            if (capsRes.data.success) {
                setSpendCaps(capsRes.data.caps || []);
            }

            // Load allow/deny lists
            const listsRes = await axios.get(`${API_URL}/api/security/allow-deny-lists?wallet=${address}`);
            if (listsRes.data.success) {
                setAllowDenyList(listsRes.data.lists || []);
            }
        } catch (error) {
            console.error('Failed to load security settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const addSpendCap = async () => {
        if (!newCap.limit || !address) return;

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const response = await axios.post(`${API_URL}/api/security/spend-caps`, {
                wallet: address,
                type: newCap.type,
                limit: newCap.limit
            });

            if (response.data.success) {
                setSpendCaps([...spendCaps, response.data.cap]);
                setNewCap({ type: 'daily', limit: '' });
            }
        } catch (error) {
            console.error('Failed to add spend cap:', error);
        }
    };

    const removeSpendCap = async (id: string) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            await axios.delete(`${API_URL}/api/security/spend-caps/${id}`);
            setSpendCaps(spendCaps.filter(cap => cap.id !== id));
        } catch (error) {
            console.error('Failed to remove spend cap:', error);
        }
    };

    const addToList = async () => {
        if (!newListEntry.address || !address) return;

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const response = await axios.post(`${API_URL}/api/security/allow-deny-lists`, {
                wallet: address,
                address: newListEntry.address,
                type: newListEntry.type,
                reason: newListEntry.reason
            });

            if (response.data.success) {
                setAllowDenyList([...allowDenyList, response.data.entry]);
                setNewListEntry({ address: '', type: 'allow', reason: '' });
            }
        } catch (error) {
            console.error('Failed to add to list:', error);
        }
    };

    const removeFromList = async (id: string) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            await axios.delete(`${API_URL}/api/security/allow-deny-lists/${id}`);
            setAllowDenyList(allowDenyList.filter(entry => entry.id !== id));
        } catch (error) {
            console.error('Failed to remove from list:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Security Settings</h1>
                <p className="text-slate-400">Manage spend caps, allow/deny lists, and transaction policies</p>
            </div>

            {/* Spend Caps */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Spend Caps</h2>
                        <p className="text-sm text-slate-400">Set maximum spending limits</p>
                    </div>
                </div>

                {/* Add New Cap */}
                <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <select
                            value={newCap.type}
                            onChange={(e) => setNewCap({ ...newCap, type: e.target.value as any })}
                            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="per-action">Per Action</option>
                        </select>
                        <input
                            type="text"
                            value={newCap.limit}
                            onChange={(e) => setNewCap({ ...newCap, limit: e.target.value })}
                            placeholder="Limit (USDC)"
                            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                            onClick={addSpendCap}
                            disabled={!newCap.limit}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Cap
                        </button>
                    </div>
                </div>

                {/* Caps List */}
                <div className="space-y-3">
                    {spendCaps.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">No spend caps configured</p>
                    ) : (
                        spendCaps.map((cap) => (
                            <div key={cap.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-white font-medium capitalize">{cap.type} Limit</span>
                                        <span className="text-sm text-slate-400">
                                            {cap.current} / {cap.limit} USDC
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-2">
                                        <div
                                            className="bg-purple-500 h-2 rounded-full"
                                            style={{ width: `${(parseFloat(cap.current) / parseFloat(cap.limit)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeSpendCap(cap.id)}
                                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Allow/Deny Lists */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Allow/Deny Lists</h2>
                        <p className="text-sm text-slate-400">Control which addresses can interact</p>
                    </div>
                </div>

                {/* Add New Entry */}
                <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            type="text"
                            value={newListEntry.address}
                            onChange={(e) => setNewListEntry({ ...newListEntry, address: e.target.value })}
                            placeholder="0x..."
                            className="md:col-span-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                        />
                        <select
                            value={newListEntry.type}
                            onChange={(e) => setNewListEntry({ ...newListEntry, type: e.target.value as any })}
                            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="allow">Allow</option>
                            <option value="deny">Deny</option>
                        </select>
                        <button
                            onClick={addToList}
                            disabled={!newListEntry.address}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </button>
                    </div>
                </div>

                {/* Lists */}
                <div className="space-y-3">
                    {allowDenyList.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">No addresses in lists</p>
                    ) : (
                        allowDenyList.map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                                <div className="flex items-center gap-3 flex-1">
                                    {entry.type === 'allow' ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-400" />
                                    )}
                                    <div>
                                        <div className="text-white font-mono text-sm">{entry.address}</div>
                                        {entry.reason && (
                                            <div className="text-xs text-slate-400 mt-1">{entry.reason}</div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFromList(entry.id)}
                                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Transaction Preview Info */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Transaction Preview & Risk Warnings</h2>
                        <p className="text-sm text-slate-400">Automatic security checks before execution</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-300">
                            <strong>Spend Cap Verification:</strong> All transactions are checked against your configured limits
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-300">
                            <strong>Address Filtering:</strong> Transactions to denied addresses are automatically blocked
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-300">
                            <strong>Risk Analysis:</strong> ChainGPT Security API analyzes contract interactions for vulnerabilities
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-300">
                            <strong>Transaction Log:</strong> All actions are logged to Membase for audit trail
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
