import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { X, Send, Bot, Sparkles, Lock, Zap } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useRole } from '@/contexts/RoleContext';
import { useAssetContext } from '@/contexts/AssetContext';

export default function AIAssistantSidebar({ isOpen, onClose }) {
    const { user } = useRole();
    const { assets: contextAssets } = useAssetContext();
    const plan = user?.plan || 'STARTER';
    const [aiUsage, setAiUsage] = useState(null);
    const [usageLoading, setUsageLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const welcomeMessage = { role: 'assistant', text: 'Hello! I am your AI Asset Assistant. I can help you find assets, check warranties, or analyze spending. How can I help you today?' };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    useEffect(() => {
        if (isOpen) {
            // Load Usage
            setUsageLoading(true);
            apiClient.getAIUsage()
                .then((data) => setAiUsage(data))
                .catch(() => setAiUsage({ plan: plan, queriesUsed: 0, queriesLimit: null }))
                .finally(() => setUsageLoading(false));

            // Load Chat History
            setHistoryLoading(true);
            apiClient.getChatHistory()
                .then((history) => {
                    const mappedHistory = history.map(h => ({ role: h.role, text: h.content || h.text }));
                    setMessages(mappedHistory.length > 0 ? mappedHistory : [welcomeMessage]);
                })
                .catch((err) => {
                    console.error("Failed to load chat history", err);
                    setMessages([welcomeMessage]);
                })
                .finally(() => setHistoryLoading(false));
        }
    }, [isOpen, plan]);

    // Root Fix: Plan/usage check - STARTER blocked; Professional quota enforced
    const canUseAI = plan !== 'STARTER' && !(plan === 'PROFESSIONAL' && aiUsage && aiUsage.queriesLimit != null && aiUsage.queriesUsed >= aiUsage.queriesLimit);

    const getFallbackResponse = (userMsg, assets) => {
        const lowerInput = userMsg.toLowerCase();
        let response = "I'm not sure about that. Try asking about 'total count', 'warranties', or 'spending'.";
        const isCountQuery = lowerInput.includes('count') || lowerInput.includes('how many') || lowerInput.includes('number of') || lowerInput.includes('total') || lowerInput.includes('list');

        if (isCountQuery) {
            const total = assets.length;
            if (lowerInput.includes('it assets') || lowerInput.includes('it segment')) {
                response = `You have ${assets.filter(a => a.segment === 'IT').length} IT assets in your inventory.`;
            } else if (lowerInput.includes('non-it') || lowerInput.includes('furniture')) {
                response = `You have ${assets.filter(a => a.segment === 'NON-IT').length} Non-IT assets in your inventory.`;
            } else if (lowerInput.includes('laptop')) {
                response = `You have ${assets.filter(a => a.type?.toLowerCase().includes('laptop')).length} laptops in your inventory.`;
            } else if (lowerInput.includes('desktop') || lowerInput.includes('computer')) {
                response = `You have ${assets.filter(a => a.type?.toLowerCase().includes('desktop')).length} desktop computers in your inventory.`;
            } else if (lowerInput.includes('monitor')) {
                response = `You have ${assets.filter(a => a.type?.toLowerCase().includes('monitor')).length} monitors in your inventory.`;
            } else if (lowerInput.includes('printer')) {
                response = `You have ${assets.filter(a => a.type?.toLowerCase().includes('printer')).length} printers in your inventory.`;
            } else {
                response = `You have a total of ${total} assets in the system.`;
            }
        } else if (lowerInput.includes('warranty') || lowerInput.includes('expir')) {
            const today = new Date();
            const expiring = assets.filter(a => {
                if (!a.warranty_expiry) return false;
                const d = new Date(a.warranty_expiry);
                return d > today && d < new Date(today.getFullYear(), today.getMonth() + 2, 1);
            });
            response = `I found ${expiring.length} assets with warranties expiring soon (in the next 60 days).`;
        } else if (lowerInput.includes('cost') || lowerInput.includes('value') || lowerInput.includes('spend') || lowerInput.includes('worth')) {
            const totalValue = assets.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);
            response = `The total value of your asset inventory is ₹${totalValue.toLocaleString()}.`;
        } else if (lowerInput.includes('user') || lowerInput.includes('assigned') || lowerInput.includes('people')) {
            const assignedCount = assets.filter(a => a.assigned_to && a.assigned_to !== 'Unassigned').length;
            response = `${assignedCount} out of ${assets.length} assets are currently assigned to users.`;
        } else if (lowerInput.includes('repair') || lowerInput.includes('broken') || lowerInput.includes('damage')) {
            response = `There are currently ${assets.filter(a => a.status === 'Repair').length} assets marked for Repair.`;
        }
        return response;
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        
        // Optimistic UI update
        const newUserMessage = { role: 'user', text: userMsg };
        setMessages(prev => [...prev, newUserMessage]);
        setInput('');
        setIsTyping(true);

        try {
            // Persist User Message
            await apiClient.saveChatMessage('user', userMsg);

            // Get AI response
            const data = await apiClient.postAIChat(userMsg);
            const assistantMsg = data.response || 'No response received.';
            
            // Persist AI Response
            await apiClient.saveChatMessage('assistant', assistantMsg);

            setMessages(prev => [...prev, { role: 'assistant', text: assistantMsg }]);
            
            if (aiUsage && aiUsage.queriesLimit != null) {
                setAiUsage(prev => ({ ...prev, queriesUsed: (prev?.queriesUsed || 0) + 1 }));
            }
        } catch (err) {
            const msg = err?.message || '';
            if (msg.includes('403') || msg.toLowerCase().includes('upgrade')) {
                setMessages(prev => [...prev, { role: 'assistant', text: 'Upgrade to Professional or higher to use the AI Assistant. Visit the Pricing page to learn more.' }]);
            } else if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
                setMessages(prev => [...prev, { role: 'assistant', text: 'Your monthly AI query limit has been reached. Upgrade to Business for unlimited access.' }]);
            } else {
                const useFallback = msg.includes('503') || msg.toLowerCase().includes('temporarily unavailable');
                if (useFallback) {
                    const assets = contextAssets && contextAssets.length ? contextAssets : [];
                    const fallback = getFallbackResponse(userMsg, assets);
                    const fallbackMsg = `AI is temporarily unavailable. ${fallback}`;
                    
                    // Optional: Save fallback message too? 
                    // No, usually better to keep it ephemeral or just save it. Let's save it.
                    apiClient.saveChatMessage('assistant', fallbackMsg).catch(() => {});
                    
                    setMessages(prev => [...prev, { role: 'assistant', text: fallbackMsg }]);
                } else {
                    setMessages(prev => [...prev, { role: 'assistant', text: `Sorry, I couldn't process that. ${msg || 'Please try again.'}` }]);
                }
            }
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />
            <div className={`fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l border-app-border shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Header */}
                <div className="p-4 border-b border-app-border bg-gradient-to-r from-blue-900/20 to-purple-900/20 from-blue-50 to-purple-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-none border border-blue-200 dark:border-blue-500/30">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-app-text">AI Assistant</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs text-app-text-muted text-app-text-muted">Online</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-app-text-muted text-app-text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft hover:bg-slate-100 rounded-none">
                        <X size={20} />
                    </button>
                </div>

                {/* Loading state */}
                {usageLoading && (
                    <div className="flex-1 flex items-center justify-center p-6">
                        <div className="flex gap-1">
                            <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                {/* Upgrade / Quota modal content */}
                {!usageLoading && !canUseAI && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        {plan === 'STARTER' ? (
                            <>
                                <div className="p-4 rounded-full bg-amber-500/20 border border-amber-500/30 mb-4">
                                    <Lock size={32} className="text-amber-400" />
                                </div>
                                <h4 className="text-lg font-bold text-app-text mb-2">AI Assistant</h4>
                                <p className="text-sm text-app-text-muted mb-6 max-w-[240px]">
                                    Upgrade to Professional or Business to unlock the AI Assistant.
                                </p>
                                <Link
                                    href="/pricing"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-none bg-gradient-to-r from-blue-600 to-cyan-600 text-app-text font-semibold text-sm hover:opacity-90 transition-opacity"
                                >
                                    <Zap size={16} /> View Plans
                                </Link>
                            </>
                        ) : (
                            <>
                                <div className="p-4 rounded-full bg-rose-500/20 border border-rose-500/30 mb-4">
                                    <Lock size={32} className="text-rose-400" />
                                </div>
                                <h4 className="text-lg font-bold text-app-text mb-2">Quota Exceeded</h4>
                                <p className="text-sm text-app-text-muted text-app-text-muted mb-6 max-w-[240px]">
                                    You have used all {aiUsage?.queriesLimit ?? 3000} AI queries this month. Upgrade to Business for unlimited access.
                                </p>
                                <Link
                                    href="/pricing"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-none bg-gradient-to-r from-blue-600 to-cyan-600 text-app-text font-semibold text-sm hover:opacity-90 transition-opacity"
                                >
                                    <Zap size={16} /> Upgrade
                                </Link>
                            </>
                        )}
                    </div>
                )}

                {/* Chat Area */}
                {canUseAI && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-none p-4 ${m.role === 'user'
                                ? 'bg-blue-600 text-app-text rounded-br-none'
                                : 'bg-app-surface-soft border border-app-border bg-slate-100 border-slate-200 text-slate-900 dark:text-slate-200 rounded-bl-none'
                                }`}>
                                <p className="text-sm leading-relaxed">{m.text}</p>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-app-surface-soft border border-app-border bg-slate-100 border-slate-200 rounded-none rounded-bl-none p-4 flex gap-1">
                                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                )}

                {/* Input */}
                {canUseAI && (
                <div className="p-4 border-t border-app-border bg-slate-100 dark:bg-slate-900/50">
                    <form onSubmit={handleSend} className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about assets, warranties..."
                            className="w-full bg-slate-100 dark:bg-slate-950 border border-app-border bg-white border-slate-300 text-slate-900 rounded-none pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-app-text shadow-sm dark:shadow-inner"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isTyping}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-app-text rounded-none hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                    <div className="mt-2 text-center">
                        <span className="text-[10px] text-app-text-muted flex items-center justify-center gap-1">
                            <Sparkles size={8} /> Powered by Enterprise AI
                            {aiUsage?.queriesLimit != null && (
                                <span className="ml-1">({aiUsage.queriesUsed}/{aiUsage.queriesLimit} this month)</span>
                            )}
                        </span>
                    </div>
                </div>
                )}
            </div>
        </>
    );
}
