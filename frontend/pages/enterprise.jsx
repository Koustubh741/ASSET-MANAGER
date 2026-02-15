import Link from 'next/link';
import {
    Search, Eye, Split, Calendar, ClipboardCheck,
    Ticket, Network, Users, DollarSign, Bot, FileText
} from 'lucide-react';
import React, { useState } from 'react';
import AIAssistantSidebar from '@/components/AIAssistantSidebar';

export default function EnterpriseFeatures() {
    const [isAIStillOpen, setIsAIStillOpen] = useState(false);

    const features = [
        {
            title: "Smart Filters & Search",
            description: "Advanced asset filtering with category, department, and warranty status.",
            icon: Search,
            href: "/assets/search",
            color: "text-blue-400",
            bg: "bg-blue-400/10",
            border: "border-blue-400/20"
        },
        {
            title: "Saved Views",
            description: "Access and manage your custom saved views for asset lists.",
            icon: Eye,
            href: "/saved-views",
            color: "text-purple-400",
            bg: "bg-purple-400/10",
            border: "border-purple-400/20"
        },
        {
            title: "Asset Comparison",
            description: "Compare two assets side-by-side to analyze specifications.",
            icon: Split,
            href: "/assets/compare",
            color: "text-indigo-400",
            bg: "bg-indigo-400/10",
            border: "border-indigo-400/20"
        },
        {
            title: "Renewals Calendar",
            description: "Visual calendar view for upcoming asset and contract renewals.",
            icon: Calendar,
            href: "/renewals/calendar",
            color: "text-emerald-400",
            bg: "bg-emerald-400/10",
            border: "border-emerald-400/20"
        },

        {
            title: "Ticketing System",
            description: "Manage support tickets and service requests.",
            icon: Ticket,
            href: "/tickets",
            color: "text-rose-400",
            bg: "bg-rose-400/10",
            border: "border-rose-400/20"
        },
        {
            title: "User Inventory",
            description: "View assets and software assigned to specific users.",
            icon: Users,
            href: "/users",
            color: "text-cyan-400",
            bg: "bg-cyan-400/10",
            border: "border-cyan-400/20"
        },
        {
            title: "Asset Audit Hub",
            description: "Monitor external discovery and ingestion trails.",
            icon: ClipboardCheck,
            href: "/audit/overview",
            color: "text-amber-400",
            bg: "bg-amber-400/10",
            border: "border-amber-400/20"
        },
        {
            title: "CMDB Visualizer",
            description: "Deep relationship visualization and impact analysis for any infrastructure asset.",
            icon: Network,
            href: "/assets/cmdb-overview",
            color: "text-pink-400",
            bg: "bg-pink-400/10",
            border: "border-pink-400/20"
        },

        {
            title: "Asset Requests",
            description: "Centralized hub for approvals, procurement, and BYOD compliance.",
            icon: FileText,
            href: "/asset-requests",
            color: "text-orange-400",
            bg: "bg-orange-400/10",
            border: "border-orange-400/20"
        },
        {
            title: "AI Assistant",
            description: "Intelligent sidekick for asset queries.",
            icon: Bot,
            href: "#",
            isAction: true,
            color: "text-sky-400",
            bg: "bg-sky-400/10",
            border: "border-sky-400/20"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8 relative">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12 flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                            Enterprise Features Portal
                        </h1>
                        <p className="text-slate-400 text-lg">
                            Access the new enterprise-grade modules and tools.

                        </p>
                    </div>
                    <button
                        onClick={() => setIsAIStillOpen(true)}
                        className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all hover:scale-105"
                    >
                        <Bot size={20} className="text-white" />
                        <span>AI Assistant</span>
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {features.map((feature, idx) => (
                        feature.isAction ? (
                            <div key={idx} onClick={() => setIsAIStillOpen(true)} className={`h-full p-6 rounded-2xl border ${feature.border} ${feature.bg} hover:bg-opacity-20 transition-all duration-300 hover:scale-[1.02] cursor-pointer backdrop-blur-sm group`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-xl bg-slate-950/50 ${feature.color}`}>
                                        <feature.icon size={24} />
                                    </div>
                                </div>
                                <h3 className="text-xl font-semibold mb-2 text-slate-100 group-hover:text-white">
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ) : (
                            <Link key={idx} href={feature.href} className="group">
                                <div className={`h-full p-6 rounded-2xl border ${feature.border} ${feature.bg} hover:bg-opacity-20 transition-all duration-300 hover:scale-[1.02] cursor-pointer backdrop-blur-sm`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`p-3 rounded-xl bg-slate-950/50 ${feature.color}`}>
                                            <feature.icon size={24} />
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-xs font-mono text-slate-500">OPEN</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2 text-slate-100 group-hover:text-white">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </Link>
                        )
                    ))}
                </div>

                <div className="mt-12 p-6 rounded-2xl bg-slate-900/50 border border-white/5">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                        Implementation Status
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {features.map((f, i) => (
                            <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {f.title}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Sidebar */}
            <AIAssistantSidebar isOpen={isAIStillOpen} onClose={() => setIsAIStillOpen(false)} />
        </div>
    );
}
