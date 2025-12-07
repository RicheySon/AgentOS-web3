import { ChatInterface } from '@/components/dashboard/ChatInterface';

export default function ChatPage() {
    return (
        <div className="max-w-6xl mx-auto h-full flex flex-col">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">AI Agent Chat</h1>
                <p className="text-slate-400">Interact with your autonomous agents directly. Ask questions, request tasks, or generate contracts.</p>
            </div>

            <div className="flex-1 min-h-0">
                <ChatInterface />
            </div>
        </div>
    );
}
