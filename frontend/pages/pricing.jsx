import React, { useState } from 'react';
import { Check, Zap, Shield, Crown, DollarSign, Network } from 'lucide-react';
import Link from 'next/link';

const PricingPage = () => {
    const [billingCycle, setBillingCycle] = useState('monthly');

    const tiers = [
        {
            name: "Starter",
            monthlyPrice: "$49",
            yearlyPrice: "$490",
            period: billingCycle === 'monthly' ? "/month" : "/year",
            description: "Essential tools for small teams managing initial inventory.",
            icon: Zap,
            features: [
                "Up to 1,000 Assets",
                "Single Location Tracking",
                "Basic Discovery Agent",
                "Standard Dashboard",
                "Community Support"
            ],
            cta: "Get Started",
            color: "from-blue-500/20 to-cyan-500/20",
            borderColor: "border-blue-500/30",
            iconColor: "text-blue-400"
        },
        {
            name: "Professional",
            monthlyPrice: "$299",
            yearlyPrice: "$2,990",
            period: billingCycle === 'monthly' ? "/month" : "/year",
            description: "Advanced automation and analytics for high-growth companies.",
            icon: Shield,
            features: [
                "Up to 10,000 Assets",
                "Multi-location Support",
                "Advanced Discovery Agents",
                "Custom Workflows",
                "AI Assistant (3,000 queries/mo)",
                "Priority Email Support"
            ],
            cta: "Start Free Trial",
            color: "from-purple-500/20 to-indigo-500/20",
            borderColor: "border-purple-500/30",
            iconColor: "text-purple-400"
        },
        {
            name: "Business",
            monthlyPrice: "$899",
            yearlyPrice: "$8,990",
            period: billingCycle === 'monthly' ? "/month" : "/year",
            description: "Comprehensive governance and scaling for medium-sized enterprises.",
            icon: Crown,
            features: [
                "Up to 50,000 Assets",
                "Advanced Security Compliance",
                "CMDB Relationship Mapping",
                "AI Assistant (Unlimited)",
                "Full API Access",
                "24/7 Phone & Email Support"
            ],
            highlight: true,
            cta: "Request Demo",
            color: "from-amber-500/20 to-orange-500/20",
            borderColor: "border-amber-500/30",
            iconColor: "text-amber-400"
        },
        {
            name: "Enterprise",
            monthlyPrice: "Custom",
            yearlyPrice: "Custom",
            description: "Bespoke infrastructure solutions for global operations.",
            icon: Network,
            features: [
                "Unlimited Assets",
                "Global Location Mesh",
                "Dedicated Instance",
                "SLA-backed Uptime",
                "On-premise Options",
                "Dedicated Success Manager"
            ],
            cta: "Contact Sales",
            color: "from-rose-500/20 to-pink-500/20",
            borderColor: "border-rose-500/30",
            iconColor: "text-rose-400"
        }
    ];

    return (
        <div className="min-h-screen bg-transparent text-app-text p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <h1 className="text-2xl md:text-xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
                        Predictable Pricing, Enterprise Power
                    </h1>
                    <p className="text-app-text-muted text-lg max-w-2xl mx-auto mb-10">
                        Scale your asset management with precision. Choose the plan that fits your growth trajectory.
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4 mb-12">
                        <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-app-text' : 'text-app-text-muted'}`}>Monthly</span>
                        <button
                            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                            className="relative w-14 h-7 rounded-full bg-slate-50 dark:bg-slate-800 border border-app-border p-1 transition-colors duration-300 pointer-events-auto cursor-pointer"
                        >
                            <div className={`w-5 h-5 rounded-full bg-blue-500 transition-transform duration-300 shadow-lg shadow-blue-500/50 ${billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-0'}`} />
                        </button>
                        <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-app-text' : 'text-app-text-muted'}`}>
                            Yearly <span className="text-emerald-400 text-xs ml-1 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Save 20%</span>
                        </span>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {tiers.map((tier, idx) => {
                        const Icon = tier.icon;
                        const price = billingCycle === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice;
                        return (
                            <div
                                key={tier.name}
                                className={`relative group p-6 rounded-3xl bg-white dark:bg-slate-900/40 backdrop-blur-xl border-2 ${tier.borderColor} flex flex-col transition-all duration-500 hover:scale-[1.03] hover:bg-white dark:bg-slate-900/60 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700`}
                                style={{ animationDelay: `${idx * 150}ms` }}
                            >
                                {tier.highlight && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-xs font-bold tracking-widest uppercase shadow-lg shadow-indigo-500/40">
                                        Most Popular
                                    </div>
                                )}

                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tier.color} flex items-center justify-center mb-6 border border-app-border group-hover:rotate-12 transition-transform duration-500`}>
                                    <Icon size={24} className={tier.iconColor} />
                                </div>

                                <h2 className="text-xl font-bold mb-2">{tier.name}</h2>
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-xl font-bold">{price}</span>
                                    {tier.period && (
                                        <span className="text-app-text-muted text-xs font-medium uppercase tracking-wider">
                                            {tier.period}
                                        </span>
                                    )}
                                </div>
                                <p className="text-app-text-muted text-xs mb-8 leading-relaxed min-h-[40px]">
                                    {tier.description}
                                </p>

                                <div className="flex-1 space-y-3 mb-8">
                                    {tier.features.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-3 text-xs">
                                            <div className="shrink-0 w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                                <Check size={10} className="text-emerald-400" />
                                            </div>
                                            <span className="text-app-text-muted">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <button className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${tier.highlight
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-indigo-500/40'
                                    : 'bg-app-surface-soft border border-app-border hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface'
                                    }`}>
                                    {tier.cta}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <footer className="mt-16 p-8 rounded-3xl bg-white dark:bg-slate-900/20 border border-app-border text-center animate-in fade-in duration-1000 delay-500">
                    <p className="text-app-text-muted mb-6">Need a custom plan for your non-profit or educational institution?</p>
                    <Link href="/contact" className="text-blue-400 font-semibold hover:text-blue-300 hover:underline transition-all">
                        Talk to our experts today →
                    </Link>
                </footer>
            </div>
        </div>
    );
};

export default PricingPage;
