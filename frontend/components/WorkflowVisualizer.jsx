import React from 'react';
import { UserPlus, FileCheck, ShoppingCart, Truck, UserCheck, ArrowRight, ClipboardCheck } from 'lucide-react';

const WorkflowVisualizer = () => {
    const steps = [
        {
            id: 1,
            title: "Onboarding",
            description: "Asset Request Initiated",
            icon: UserPlus,
            color: "blue",
            assigned: "Requester"
        },
        {
            id: 2,
            title: "Approval",
            description: "Manager/IT Validation",
            icon: FileCheck,
            color: "purple",
            assigned: "Manager"
        },
        {
            id: 3,
            title: "Procurement",
            description: "PO Generation & Order",
            icon: ShoppingCart,
            color: "amber",
            assigned: "Finance/Procurement"
        },
        {
            id: 4,
            title: "Receiving",
            description: "Asset Arrival & Tagging",
            icon: Truck,
            color: "indigo",
            assigned: "IT Admin"
        },
        {
            id: 5,
            title: "Assignment",
            description: "Handover to User",
            icon: UserCheck,
            color: "emerald",
            assigned: "IT Support"
        }
    ];

    const getColorClasses = (color) => {
        const colors = {
            blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
            purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
            amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
            indigo: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
            emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
            teal: "bg-teal-500/20 text-teal-400 border-teal-500/30",
        };
        return colors[color] || colors.blue;
    };

    return (
        <div className="glass-panel p-8 w-full overflow-x-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-xl font-bold text-white">Asset Management Lifecycle Steps</h3>
                    <p className="text-slate-400 text-sm">Standard operational workflow for new assets</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                    Active Workflow
                </div>
            </div>

            <div className="flex gap-6 items-start justify-between min-w-[800px] relative">

                {/* Flowing Line Animation */}
                <div className="absolute top-[82px] left-10 right-10 h-1 bg-slate-800 z-0 rounded-full overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-flow-beam opacity-75"></div>
                </div>

                <style jsx>{`
                    @keyframes flow-beam {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                    .animate-flow-beam {
                        animation: flow-beam 3s linear infinite;
                    }
                `}</style>

                {steps.map((step, index) => (
                    <div key={step.id} className="relative z-10 flex flex-col items-center flex-1 group">

                        {/* Step Label */}
                        <span className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-3 bg-slate-800/50 px-3 py-1 rounded-full border border-white/5">
                            Step {index + 1}
                        </span>

                        {/* Circle (Enlarged) */}
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border-2 backdrop-blur-md transition-all duration-300 transform group-hover:scale-105 shadow-xl ${getColorClasses(step.color)} mb-5`}>
                            <step.icon size={32} strokeWidth={1.5} />
                        </div>

                        {/* Text Content */}
                        <div className="text-center space-y-2">
                            <h4 className="text-white font-bold text-lg">{step.title}</h4>
                            <p className="text-slate-500 text-[11px] uppercase font-bold tracking-wider">{step.assigned}</p>
                            <p className="text-slate-400 text-xs max-w-[140px] leading-relaxed mx-auto">{step.description}</p>
                        </div>
                    </div>
                ))}
                {
                    /* Added User Acceptance Step */
                }
                <div key={6} className="relative z-10 flex flex-col items-center flex-1 group">
                    <span className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-3 bg-slate-800/50 px-3 py-1 rounded-full border border-white/5">
                        Step 6
                    </span>
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border-2 backdrop-blur-md transition-all duration-300 transform group-hover:scale-105 shadow-xl ${getColorClasses("teal")} mb-5`}>
                        <ClipboardCheck size={32} strokeWidth={1.5} />
                    </div>
                    <div className="text-center space-y-2">
                        <h4 className="text-white font-bold text-lg">Acceptance</h4>
                        <p className="text-slate-500 text-[11px] uppercase font-bold tracking-wider">End User</p>
                        <p className="text-slate-400 text-xs max-w-[140px] leading-relaxed mx-auto">Digital Receipt & Confirmation</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowVisualizer;
