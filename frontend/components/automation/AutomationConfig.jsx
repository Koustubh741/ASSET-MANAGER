import React, { useState, useEffect } from 'react';
import { Settings, Play, Shield, Clock, Plus, Trash2, Edit3, CheckCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const AutomationConfig = () => {
  const [activeTab, setActiveTab] = useState('routing'); // routing | sla | approvals
  const [rules, setRules] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'routing' ? '/api/support/workflow-rules' : '/api/support/sla-policies';
      // Note: These endpoints need to be implemented in the backend. 
      // I will implement basic placeholders in the frontend for now.
      // const res = await axios.get(endpoint);
      // activeTab === 'routing' ? setRules(res.data) : setPolicies(res.data);
      
      // Mock data for initial UI design
      if (activeTab === 'routing') {
        setRules([
          { id: 1, name: 'Assign Hardware to IT Lead', conditions: { category: 'Hardware' }, actions: { assign_to_role: 'IT_MANAGEMENT' }, is_active: true },
          { id: 2, name: 'High Priority Network Alerts', conditions: { category: 'Network', priority: 'High' }, actions: { assign_to_role: 'ADMIN', set_priority: 'Critical' }, is_active: true }
        ]);
      } else {
        setPolicies([
          { id: 1, name: 'SLA Gold - Critical', priority: 'Critical', response_time_limit: 30, resolution_time_limit: 240, is_active: true },
          { id: 2, name: 'SLA Silver - High', priority: 'High', response_time_limit: 60, resolution_time_limit: 480, is_active: true }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-500" />
          Powerful Workflow Automation
        </h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Create New {activeTab === 'routing' ? 'Rule' : 'Policy'}
        </button>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('routing')}
          className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'routing' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Routing Rules
          {activeTab === 'routing' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
        </button>
        <button 
          onClick={() => setActiveTab('sla')}
          className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'sla' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          SLA Policies
          {activeTab === 'sla' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
        </button>
      </div>

      <div className="grid gap-4">
        {activeTab === 'routing' ? (
          rules.map(rule => (
            <div key={rule.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-200 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Play className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{rule.name}</h3>
                    <p className="text-xs text-slate-500">Evaluated on ticket creation</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${rule.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {rule.is_active ? 'Active' : 'Paused'}
                  </span>
                  <button className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-50">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Conditions</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(rule.conditions).map(([k, v]) => (
                      <span key={k} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700">
                        {k}: <span className="font-semibold text-indigo-600">{v}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase block mb-1">Actions</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(rule.actions).map(([k, v]) => (
                      <span key={k} className="px-2 py-0.5 bg-white border border-indigo-200 rounded text-indigo-700">
                        {k.replace('_', ' ')}: <span className="font-semibold">{v}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          policies.map(policy => (
            <div key={policy.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-emerald-200 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{policy.name}</h3>
                    <p className="text-xs text-slate-500">Applies to {policy.priority} tickets</p>
                  </div>
                </div>
                <button className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md">
                   <Edit3 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-slate-600">Response: <span className="font-bold text-slate-800">{policy.response_time_limit}m</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-slate-600">Resolution: <span className="font-bold text-slate-800">{policy.resolution_time_limit}m</span></span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AutomationConfig;
