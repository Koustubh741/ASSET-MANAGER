import React from 'react';
import { UserPlus, FileCheck, ShoppingCart, Truck, UserCheck, ArrowRight, ClipboardCheck, Cpu, CheckSquare, Package, Banknote } from 'lucide-react';

const WorkflowVisualizer = () => {
    const steps = [
        {
            id: 1,
            title: "Request",
            description: "Asset Request Initiated",
            icon: UserPlus,
            color: "blue",
            assigned: "Requester"
        },
        {
            id: 2,
            title: "Manager Approval",
            description: "Initial Justification",
            icon: FileCheck,
            color: "purple",
            assigned: "Manager"
        },
        {
            id: 3,
            title: "IT Review",
            description: "Technical Specification",
            icon: Cpu,
            color: "indigo",
            assigned: "IT Management"
        },
        {
            id: 4,
            title: "Final Approval",
            description: "Budget/Source Confirmation",
            icon: CheckSquare,
            color: "blue",
            assigned: "Manager"
        },
        {
            id: 5,
            title: "Stock Check",
            description: "Allocation or Purchase?",
            icon: Package,
            color: "amber",
            assigned: "Inventory"
        },
        {
            id: 6,
            title: "Procurement",
            description: "PO Creation & Ordering",
            icon: ShoppingCart,
            color: "orange",
            assigned: "Procurement"
        },
        {
            id: 7,
            title: "Finance",
            description: "Budget Validation",
            icon: Banknote,
            color: "emerald",
            assigned: "Finance"
        },
        {
            id: 8,
            title: "Delivery",
            description: "Logistic & Receiving",
            icon: Truck,
            color: "sky",
            assigned: "Procurement"
        },
        {
            id: 9,
            title: "Quality",
            description: "QC & Tagging",
            icon: ClipboardCheck,
            color: "teal",
            assigned: "Inventory"
        },
        {
            id: 10,
            title: "Acceptance",
            description: "Digital Receipt",
            icon: UserCheck,
            color: "cyan",
            assigned: "End User"
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
            orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
            sky: "bg-sky-500/20 text-sky-400 border-sky-500/30",
            cyan: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
        };
        return colors[color] || colors.blue;
    };

    return (
        <div className="glass-panel p-8 w-full overflow-x-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-xl font-bold text-app-text">Asset Management Lifecycle Steps</h3>
                    <p className="text-app-text-muted text-sm">Standard operational workflow for new assets</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                    Active Workflow
                </div>
            </div>

            <div className="flex gap-6 items-start justify-between min-w-[1200px] relative">

                {/* Flowing Line Animation */}
                <div className="absolute top-[82px] left-10 right-10 h-1 bg-slate-50 dark:bg-slate-800 z-0 rounded-full overflow-hidden">
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
                        <span className="text-app-text-muted text-xs font-bold tracking-widest uppercase mb-3 bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-app-border">
                            Step {index + 1}
                        </span>

                        {/* Circle (Enlarged) */}
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border-2 backdrop-blur-md transition-all duration-300 transform group-hover:scale-105 shadow-xl ${getColorClasses(step.color)} mb-5`}>
                            <step.icon size={32} strokeWidth={1.5} />
                        </div>

                        {/* Text Content */}
                        <div className="text-center space-y-2">
                            <h4 className="text-app-text font-bold text-lg">{step.title}</h4>
                            <p className="text-app-text-muted text-[11px] uppercase font-bold tracking-wider">{step.assigned}</p>
                            <p className="text-app-text-muted text-xs max-w-[140px] leading-relaxed mx-auto">{step.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WorkflowVisualizer;
