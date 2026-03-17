
{/* Agent Details Modal */ }
{
    selectedAgentDetails && AGENT_DETAILS[selectedAgentDetails.id] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white dark:bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-blue-500/20 shadow-blue-500/10">
                <div className="p-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-500/10 to-transparent from-blue-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{selectedAgentDetails.name}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">{selectedAgentDetails.role} • Technical Documentation</p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedAgentDetails(null)} className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-100 dark:bg-white/5 hover:bg-slate-100 text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-6">
                    {/* Purpose */}
                    <div className="p-5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <Target className="text-blue-400" size={18} />
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Purpose</h4>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{AGENT_DETAILS[selectedAgentDetails.id].purpose}</p>
                    </div>

                    {/* Discovery Methods */}
                    <div className="p-5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <Layers className="text-emerald-400" size={18} />
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Discovery Methods</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {AGENT_DETAILS[selectedAgentDetails.id].discoveryMethods.map((method, idx) => (
                                <span key={idx} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                                    {method}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Data Sources */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <Database className="text-purple-600 dark:text-purple-400" size={18} />
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Data Sources</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {AGENT_DETAILS[selectedAgentDetails.id].dataSources.map((source, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-700">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                                    <span>{source}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Capabilities */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <Zap className="text-amber-600 dark:text-amber-400" size={18} />
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Capabilities</h4>
                        </div>
                        <div className="space-y-2">
                            {AGENT_DETAILS[selectedAgentDetails.id].capabilities.map((capability, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-700">
                                    <Check className="text-amber-400 flex-shrink-0 mt-0.5" size={14} />
                                    <span>{capability}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Schedule */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar className="text-cyan-600 dark:text-cyan-400" size={18} />
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Execution Schedule</h4>
                        </div>
                        <p className="text-slate-700 dark:text-slate-700 text-sm">{AGENT_DETAILS[selectedAgentDetails.id].schedule}</p>
                    </div>

                    {/* Output */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <FileText className="text-indigo-600 dark:text-indigo-400" size={18} />
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Output Format</h4>
                        </div>
                        <p className="text-slate-700 dark:text-slate-700 text-sm">{AGENT_DETAILS[selectedAgentDetails.id].output}</p>
                    </div>
                </div>

                <div className="p-6 bg-slate-100 dark:bg-slate-800/20 border-t border-slate-200 dark:border-white/5">
                    <button
                        onClick={() => setSelectedAgentDetails(null)}
                        className="w-full py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-900 dark:text-white rounded-xl font-bold transition-all active:scale-95 text-sm"
                    >
                        Close Documentation
                    </button>
                </div>
            </div>
        </div>
    )
}
