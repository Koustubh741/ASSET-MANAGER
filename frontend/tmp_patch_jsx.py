import re

with open(r'd:\ASSET-MANAGER\frontend\pages\tickets\[id].jsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """                    {/* --- TACTICAL SIDEBAR --- */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* SLA STATUS MODULE - Root Fix for Visibility */}
                        {(ticket.sla_response_deadline || ticket.sla_resolution_deadline) && (
                            <div className={`glass-panel p-6 rounded-[2rem] border shadow-xl relative overflow-hidden transition-all duration-700 group hover:scale-[1.02] ${
                                ticket.sla_response_status === 'BREACHED' || ticket.sla_resolution_status === 'BREACHED' 
                                    ? 'bg-rose-500/5 border-rose-500/40 shadow-rose-500/10' 
                                    : 'bg-indigo-600/[0.03] border-indigo-500/20 shadow-indigo-500/10'
                            }`}>
                                <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[80px] transition-colors duration-1000 ${
                                    ticket.sla_response_status === 'BREACHED' || ticket.sla_resolution_status === 'BREACHED' ? 'bg-rose-500/20' : 'bg-indigo-500/10'
                                }`} />
                                
                                <div className="flex items-center justify-between mb-6 relative z-10">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                        <Clock size={16} className={ticket.sla_response_status === 'BREACHED' || ticket.sla_resolution_status === 'BREACHED' ? 'text-rose-500' : 'text-indigo-500'} /> 
                                        SLA Protocol
                                    </h3>
                                    {(ticket.sla_response_status === 'BREACHED' || ticket.sla_resolution_status === 'BREACHED') && (
                                        <span className="px-3 py-1 rounded-lg bg-rose-500 text-[10px] font-black text-white uppercase tracking-widest animate-pulse flex items-center gap-1.5 shadow-lg shadow-rose-500/20">
                                            <AlertTriangle size={12} /> Breach
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-6 relative z-10">
                                    {/* Response SLA */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-slate-400">Response Target</span>
                                            <span className={ticket.sla_response_status === 'BREACHED' ? 'text-rose-500 text-xs' : ticket.sla_response_status === 'MET' ? 'text-emerald-500' : 'text-amber-500'}>
                                                {ticket.sla_response_status?.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${ticket.sla_response_status === 'BREACHED' ? 'bg-rose-500' : ticket.sla_response_status === 'MET' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                style={{ width: ticket.sla_response_status === 'BREACHED' || ticket.sla_response_status === 'MET' ? '100%' : '50%' }}
                                            />
                                        </div>
                                        {ticket.sla_response_deadline && (
                                            <p className="text-[10px] text-slate-500 font-mono tracking-tighter">
                                                Target: <span className="font-bold text-slate-700 dark:text-indigo-200">{new Date(ticket.sla_response_deadline).toLocaleString()}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Resolution SLA */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-slate-400">Resolution Target</span>
                                            <span className={ticket.sla_resolution_status === 'BREACHED' ? 'text-rose-500 text-xs' : ticket.sla_resolution_status === 'MET' ? 'text-emerald-500' : 'text-indigo-400'}>
                                                {ticket.sla_resolution_status?.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${ticket.sla_resolution_status === 'BREACHED' ? 'bg-rose-500' : ticket.sla_resolution_status === 'MET' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                style={{ width: ticket.sla_resolution_status === 'BREACHED' || ticket.sla_resolution_status === 'MET' ? '100%' : '30%' }}
                                            />
                                        </div>
                                        {ticket.sla_resolution_deadline && (
                                            <p className="text-[10px] text-slate-500 font-mono tracking-tighter">
                                                Target: <span className="font-bold text-slate-700 dark:text-indigo-200">{new Date(ticket.sla_resolution_deadline).toLocaleString()}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TICKET DETAILS CARD */}
                        <div className="glass-panel p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xl group hover:border-indigo-500/20 transition-all">"""

target = """                    {/* --- TACTICAL SIDEBAR --- */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* TICKET DETAILS CARD */}
                        <div className="glass-panel p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xl group hover:border-indigo-500/20 transition-all">"""

content = content.replace(target, replacement)

with open(r'd:\ASSET-MANAGER\frontend\pages\tickets\[id].jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
