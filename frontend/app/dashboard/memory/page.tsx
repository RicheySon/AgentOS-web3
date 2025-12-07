'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Database, HardDrive, MessageSquare, TrendingUp, ExternalLink, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface MemoryStats {
    totalConversations: number;
    totalMessages: number;
    storageUsed: string;
    lastSync: string;
    hubUrl: string;
    isConnected: boolean;
}

interface Conversation {
    agentId: string;
    messageCount: number;
    lastMessage: string;
    timestamp: string;
}

export default function MemoryPage() {
    const { address, isConnected } = useAccount();
    const [stats, setStats] = useState<MemoryStats | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (isConnected && address) {
            loadMemoryData();
        }
    }, [address, isConnected]);

    const loadMemoryData = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

            // Load memory stats
            const statsRes = await axios.get(`${API_URL}/api/memory/stats`);
            if (statsRes.data.success) {
                setStats(statsRes.data.data);
            }

            // Load conversation history for this wallet
            const agentId = `user-${address}`;
            const convRes = await axios.get(`${API_URL}/api/memory/conversation/${agentId}`);
            if (convRes.data.success) {
                const messages = convRes.data.data.messages || [];
                setConversations([{
                    agentId,
                    messageCount: messages.length,
                    lastMessage: messages[messages.length - 1]?.content || 'No messages yet',
                    timestamp: messages[messages.length - 1]?.timestamp || new Date().toISOString()
                }]);
            }
        } catch (error) {
            console.error('Failed to load memory data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadMemoryData();
        setRefreshing(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Decentralized Memory</h1>
                    <p className="text-slate-400">Powered by Unibase Membase - Persistent, decentralized storage</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Connection Status */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg ${stats?.isConnected ? 'bg-emerald-600/20' : 'bg-red-600/20'} flex items-center justify-center`}>
                        <Database className={`w-5 h-5 ${stats?.isConnected ? 'text-emerald-400' : 'text-red-400'}`} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Membase Hub Status</h2>
                        <p className="text-sm text-slate-400">{stats?.hubUrl || 'https://testnet.hub.membase.io'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stats?.isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <span className={`text-sm font-medium ${stats?.isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stats?.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                    {stats?.lastSync && (
                        <span className="text-sm text-slate-500 ml-2">
                            Last sync: {new Date(stats.lastSync).toLocaleString()}
                        </span>
                    )}
                </div>
            </div>

            {/* Storage Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <MessageSquare className="w-5 h-5 text-purple-400" />
                        <span className="text-slate-400">Total Messages</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats?.totalMessages || 0}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                        <span className="text-slate-400">Conversations</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats?.totalConversations || 0}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <HardDrive className="w-5 h-5 text-emerald-400" />
                        <span className="text-slate-400">Storage Used</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats?.storageUsed || '0 KB'}</p>
                </div>
            </div>

            {/* Conversation History */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Your Conversations</h2>
                <div className="space-y-3">
                    {conversations.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">No conversations found</p>
                    ) : (
                        conversations.map((conv, i) => (
                            <div key={i} className="p-4 bg-slate-800/50 rounded-lg">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <div className="text-white font-medium font-mono text-sm">{conv.agentId}</div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            {conv.messageCount} messages
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        {new Date(conv.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-300 line-clamp-2">{conv.lastMessage}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Decentralized Storage Info */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Decentralized Storage Proof</h2>
                <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <Database className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-purple-300">
                            <strong>Persistent Storage:</strong> All conversations are stored on Membase Hub, ensuring data persistence across sessions
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <Database className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-300">
                            <strong>Cross-Agent Memory:</strong> Agents can share context and learnings through the decentralized memory layer
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <Database className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-emerald-300">
                            <strong>Wallet-Based Identity:</strong> Your conversations are tied to your wallet address for secure, portable identity
                        </div>
                    </div>
                </div>
                <a
                    href="https://testnet.hub.membase.io"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
                >
                    View on Membase Hub
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        </div>
    );
}
