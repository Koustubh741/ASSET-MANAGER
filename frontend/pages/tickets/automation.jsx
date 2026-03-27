import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
    ArrowLeft, 
    Zap, 
    Plus, 
    Trash2, 
    Save, 
    AlertCircle, 
    Settings,
    Activity,
    Shield,
    HelpCircle,
    Box,
    FileText,
    Building2,
    User,
    TrendingUp,
    Check
} from 'lucide-react';
import { 
    Layout, 
    Card, 
    Button, 
    Input, 
    Table, 
    Tag, 
    Modal, 
    Form, 
    Select, 
    Switch, 
    Space, 
    Tooltip,
    Divider,
    Empty,
    Spin,
    Badge,
    Typography
} from 'antd';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/components/common/Toast';
import { useRole } from '@/contexts/RoleContext';

import WorkflowEngineGuide from '@/components/automation/WorkflowEngineGuide';

const { Content, Header: AntHeader } = Layout;
const { Option } = Select;
const { Title, Text } = Typography;

export default function AutomationPage() {
    const router = useRouter();
    const toast = useToast();
    const { currentRole, user, canManageAutomation } = useRole();
    const [loading, setLoading] = useState(true);
    const [rules, setRules] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [form] = Form.useForm();
    const [editingRule, setEditingRule] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        setLoading(true);
        try {
            const data = await apiClient.getAutomationRules();
            setRules(data);
        } catch (err) {
            console.error("Failed to load rules:", err);
            toast.error("Failed to load automation rules");
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingRule(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEditRule = (record) => {
        setEditingRule(record);
        // Map conditions/actions to flat form fields
        const conditionField = Object.keys(record.conditions || {})[0] || '';
        const conditionValue = record.conditions[conditionField] || '';
        const actionType = Object.keys(record.actions || {})[0] || '';
        const actionValue = record.actions[actionType] || '';

        form.setFieldsValue({
            name: record.name,
            description: record.description,
            priority_order: record.priority_order,
            is_active: record.is_active,
            condition_field: conditionField,
            condition_value: conditionValue,
            action_type: actionType,
            action_value: actionValue
        });
        setIsModalOpen(true);
    };

    const handleSubmitRule = async (values) => {
        setSubmitting(true);
        try {
            const payload = {
                name: values.name,
                description: values.description,
                priority_order: values.priority_order || 0,
                is_active: values.is_active !== false,
                conditions: {
                    [values.condition_field]: values.condition_value
                },
                actions: {
                    [values.action_type]: values.action_value
                }
            };

            if (editingRule) {
                await apiClient.updateAutomationRule(editingRule.id, payload);
                toast.success("Automation rule updated successfully");
            } else {
                await apiClient.createAutomationRule(payload);
                toast.success("Automation rule created successfully");
            }
            
            setIsModalOpen(false);
            setEditingRule(null);
            form.resetFields();
            loadRules();
        } catch (err) {
            toast.error(`Error ${editingRule ? 'updating' : 'creating'} rule: ` + (err.response?.data?.detail || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteRule = async (id) => {
        Modal.confirm({
            title: 'Delete Rule',
            content: 'Are you sure you want to delete this automation rule? This action cannot be undone.',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await apiClient.deleteAutomationRule(id);
                    toast.success("Rule deleted");
                    loadRules();
                } catch (err) {
                    toast.error("Failed to delete rule");
                }
            }
        });
    };

    const columns = [
        {
            title: 'PRIORITY',
            dataIndex: 'priority_order',
            width: 100,
            render: (val) => <span className="text-[10px] font-black font-mono text-slate-900/10 text-app-text/10">{val}</span>
        },
        {
            title: 'RULE IDENTITY',
            key: 'identity',
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-app-text">{record.name}</span>
                    <span className="text-[10px] text-app-text-muted uppercase tracking-widest">{record.description || 'No description provided'}</span>
                </div>
            )
        },
        {
            title: 'CONDITION',
            key: 'conditions',
            render: (_, record) => {
                const entries = Object.entries(record.conditions || {});
                return (
                    <div className="flex gap-2">
                        {entries.map(([f, v]) => (
                            <Tag key={f} className="!bg-indigo-50 dark:!bg-indigo-500/10 !border-indigo-100 dark:!border-indigo-500/20 !text-indigo-600 dark:!text-indigo-400 !text-[9px] !font-black !uppercase !tracking-widest">
                                {f}: {v}
                            </Tag>
                        ))}
                    </div>
                );
            }
        },
        {
            title: 'ACTION',
            key: 'actions',
            render: (_, record) => {
                const entries = Object.entries(record.actions || {});
                return (
                    <div className="flex gap-2">
                        {entries.map(([f, v]) => (
                            <Tag key={f} className="!bg-emerald-50 dark:!bg-emerald-500/10 !border-emerald-100 dark:!border-emerald-500/20 !text-emerald-700 dark:!text-emerald-400 !text-[9px] !font-black !uppercase !tracking-widest">
                                {f.replace(/_/g, ' ')} → {v}
                            </Tag>
                        ))}
                    </div>
                );
            }
        },
        {
            title: 'STATUS',
            dataIndex: 'is_active',
            render: (active) => (
                <Badge 
                    status={active ? "processing" : "default"} 
                    text={<span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-emerald-500' : 'text-slate-500'}`}>{active ? 'ACTIVE' : 'DISABLED'}</span>} 
                />
            )
        },
        {
            title: '',
            key: 'ops',
            width: 80,
            render: (_, record) => (
                <div className="flex justify-end gap-2 pr-4">
                    <Tooltip title="View/Edit Rule">
                        <button 
                            onClick={() => handleEditRule(record)}
                            className="p-2 text-slate-500 hover:text-indigo-500 transition-colors"
                        >
                            <Settings size={16} />
                        </button>
                    </Tooltip>
                    {canManageAutomation && (
                        <Tooltip title="Delete Rule">
                            <button 
                                onClick={() => handleDeleteRule(record.id)}
                                className="p-2 text-slate-500 hover:text-rose-500 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </Tooltip>
                    )}
                </div>
            )
        }
    ];

    // --- CONSTANTS FOR SELECTS ---
    const CONDITION_FIELDS = [
        { label: 'Ticket Category', value: 'category', icon: <Box size={14} /> },
        { label: 'Ticket Priority', value: 'priority', icon: <AlertCircle size={14} /> },
        { label: 'Subject Contains', value: 'subject', icon: <FileText size={14} /> },
        { label: 'Requestor Department', value: 'requestor_department', icon: <Building2 size={14} /> }
    ];

    const ACTION_TYPES = [
        { label: 'Assign to Role', value: 'assign_to_role', icon: <Shield size={14} /> },
        { label: 'Assign to Specific ID', value: 'assign_to_id', icon: <User size={14} /> },
        { label: 'Override Priority', value: 'set_priority', icon: <TrendingUp size={14} /> },
        { label: 'Override Status', value: 'set_status', icon: <Activity size={14} /> }
    ];

    const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];
    const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const DEPARTMENT_OPTIONS = ['IT', 'Finance', 'HR', 'Engineering', 'Operations', 'Legal', 'Procurement', 'Executive'];
    const CATEGORY_OPTIONS = ['Hardware', 'Software', 'Access', 'Network', 'Infrastructure', 'Security', 'General'];

    const actionType = Form.useWatch('action_type', form);
    const conditionField = Form.useWatch('condition_field', form);

    const renderActionValueInput = () => {
        if (actionType === 'set_priority') {
            return (
                <Select className="scylla-select" placeholder="Select Priority">
                    {PRIORITY_OPTIONS.map(p => <Option key={p} value={p}>{p}</Option>)}
                </Select>
            );
        }
        if (actionType === 'set_status') {
            return (
                <Select className="scylla-select" placeholder="Select Status">
                    {STATUS_OPTIONS.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
            );
        }
        if (actionType === 'assign_to_role') {
            return (
                <Select className="scylla-select" placeholder="Select Role">
                    {ROLES.map(r => <Option key={r.slug} value={r.slug}>{r.label}</Option>)}
                </Select>
            );
        }
        return <Input placeholder="e.g. IT_MANAGEMENT" className="scylla-input" />;
    };

    const renderConditionValueInput = () => {
        if (conditionField === 'priority') {
            return (
                <Select className="scylla-select" placeholder="Select Priority">
                    {PRIORITY_OPTIONS.map(p => <Option key={p} value={p}>{p}</Option>)}
                </Select>
            );
        }
        if (conditionField === 'requestor_department') {
            return (
                <Select className="scylla-select" placeholder="Select Department">
                    {DEPARTMENT_OPTIONS.map(d => <Option key={d} value={d}>{d}</Option>)}
                </Select>
            );
        }
        if (conditionField === 'category') {
            return (
                <Select className="scylla-select" placeholder="Select Category">
                    {CATEGORY_OPTIONS.map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
            );
        }
        return <Input placeholder="e.g. Hardware" className="scylla-input" />;
    };

    return (
        <Layout className="min-h-screen bg-app-bg font-['Inter'] transition-colors duration-300">
            <Head>
                <title>Automation Engine | Scylla Ticket Center</title>
            </Head>

            {/* --- TOP BAR --- */}
            <div className="bg-app-surface/40 border-b border-app-border px-8 py-5 flex items-center justify-between sticky top-0 z-50 backdrop-blur-2xl transition-all duration-500">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.push('/tickets')}
                        className="group p-2.5 bg-app-surface-soft hover:bg-indigo-600 dark:hover:bg-indigo-600 rounded-2xl text-app-text-muted hover:text-slate-900 dark:hover:text-white transition-all shadow-sm border border-app-border z-[60]"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-app-text tracking-tighter uppercase font-['Outfit']">
                                Workflow <span className="text-indigo-600 dark:text-indigo-505 italic">Engine</span>
                            </h1>
                            <div className="px-3 py-1 bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 rounded-full">
                                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Automation Matrix</span>
                            </div>
                        </div>
                        <p className="text-[9px] text-app-text-muted font-black uppercase tracking-[0.3em] leading-none mt-1.5 flex items-center gap-2">
                             Deterministic Ticket Routing System
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button 
                        icon={<HelpCircle size={16} />}
                        className="!h-10 !px-5 !bg-slate-100 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-500 hover:!text-indigo-500 !font-black !text-[9px] !uppercase !tracking-widest !rounded-xl transition-all flex items-center gap-2 group"
                        onClick={() => setIsGuideOpen(true)}
                    >
                        How it Works
                    </Button>
                    {canManageAutomation && (
                        <Button 
                            icon={<Plus size={16} />}
                            className="!h-12 !px-6 !bg-indigo-600 !border-none !text-white !font-black !text-[10px] !uppercase !tracking-[0.2em] !rounded-2xl shadow-xl shadow-indigo-600/20 hover:!bg-indigo-500 transition-all flex items-center gap-2"
                            onClick={openCreateModal}
                        >
                            Initialize New Rule
                        </Button>
                    )}
                </div>
            </div>

            <Content className="px-8 pb-12 overflow-y-auto">
                <div className="max-w-full mx-auto space-y-8">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Active Rules', value: rules.filter(r => r.is_active).length, icon: Activity, color: 'indigo' },
                            { label: 'System Priority', value: 'High', icon: Shield, color: 'emerald' },
                            { label: 'Avg Latency', value: '< 2ms', icon: Zap, color: 'amber' }
                        ].map((stat, i) => (
                            <div key={i} className="glass-card p-8 flex items-center gap-6 group hover:translate-y-[-4px] transition-all duration-300">
                                <div className={`p-4 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-400 border border-${stat.color}-500/20 shadow-lg shadow-${stat.color}-500/5`}>
                                    <stat.icon size={24} />
                                </div>
                                <div>
                                    <div className="text-xl font-black text-app-text leading-none">{stat.value}</div>
                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Rule Grid */}
                    <div className="glass-card overflow-hidden">
                        <div className="px-8 py-6 border-b border-app-border flex items-center justify-between">
                            <h3 className="text-sm font-black text-app-text uppercase tracking-widest flex items-center gap-2">
                                <Settings size={16} className="text-indigo-500" />
                                Rule Execution Matrix
                            </h3>
                        </div>

                        {loading ? (
                            <div className="p-20 text-center">
                                <Spin size="large" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Synthesizing Automation Data...</p>
                            </div>
                        ) : rules.length === 0 ? (
                            <div className="p-20 text-center">
                                <Empty 
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={<span className="text-slate-500 font-black uppercase tracking-widest text-[10px]">No active rules found in core</span>}
                                />
                                {canManageAutomation && (
                                    <Button 
                                        className="mt-4 !h-10 !bg-white/5 !border-white/10 !text-slate-400 !font-black !text-[9px] !uppercase !tracking-widest !rounded-xl"
                                        onClick={openCreateModal}
                                    >
                                        Define First Rule
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <Table 
                                dataSource={rules} 
                                columns={columns} 
                                pagination={false}
                                rowKey="id"
                                className="scylla-table"
                            />
                        )}
                    </div>
                </div>
            </Content>
            {/* Create Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-3 px-2 py-4">
                        <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                            <Zap size={24} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="text-lg font-black uppercase tracking-tighter text-app-text">
                                {editingRule ? 'Modify Automation Protocol' : 'Rule Configuration Utility'}
                            </div>
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Version 2.4 Distributed Logic</div>
                        </div>
                    </div>
                }
                open={isModalOpen}
                onCancel={() => {
                    setIsModalOpen(false);
                    setEditingRule(null);
                }}
                footer={null}
                width={650}
                className="scylla-modal"
                centered
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmitRule}
                    initialValues={{ is_active: true, priority_order: 1 }}
                >
                    <div className="space-y-8 pt-4">
                        <div className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-[2rem] border border-app-border space-y-6">
                            <Form.Item 
                                label={
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <FileText size={12} className="text-indigo-400" /> Rule Name
                                    </span>
                                }
                                name="name" 
                                rules={[{ required: true, message: 'Identity required' }]}
                                className="mb-0"
                            >
                                <Input placeholder="e.g. INFRASTRUCTURE_ROUTING_PRIMARY" className="scylla-input h-14" />
                            </Form.Item>

                            <Form.Item 
                                label={
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <HelpCircle size={12} className="text-indigo-400" /> Description
                                    </span>
                                }
                                name="description"
                                className="mb-0"
                            >
                                <Input.TextArea rows={2} placeholder="Define rule operational scope..." className="scylla-input" />
                            </Form.Item>

                            <div className="grid grid-cols-2 gap-6">
                                <Form.Item 
                                    label={
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                            <TrendingUp size={12} className="text-indigo-400" /> Priority Order
                                        </span>
                                    }
                                    name="priority_order"
                                    className="mb-0"
                                >
                                    <Input type="number" className="scylla-input h-14" />
                                </Form.Item>

                                <Form.Item 
                                    label={
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                            <Activity size={12} className="text-indigo-400" /> System Status
                                        </span>
                                    }
                                    name="is_active" 
                                    valuePropName="checked"
                                    className="mb-0"
                                >
                                    <div className="h-14 flex items-center px-4 bg-white dark:bg-slate-950/50 border border-app-border rounded-2xl">
                                        <Switch 
                                            checkedChildren="ACTIVE" 
                                            unCheckedChildren="OFF" 
                                            className="bg-app-surface"
                                        />
                                        <span className="ml-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Online State</span>
                                    </div>
                                </Form.Item>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-app-border"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-4 bg-app-surface text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">Logic Conditions</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 bg-indigo-500/5 p-6 rounded-[2rem] border border-indigo-500/10">
                            <Form.Item 
                                label={
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                                        <Zap size={12} /> Field
                                    </span>
                                }
                                name="condition_field"
                                rules={[{ required: true }]}
                                className="mb-0"
                            >
                                <Select className="scylla-select" placeholder="Select Field">
                                    {CONDITION_FIELDS.map(f => (
                                        <Option key={f.value} value={f.value}>
                                            <div className="flex items-center gap-2">
                                                {f.icon} {f.label}
                                            </div>
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item 
                                label={
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                                        <Plus size={12} /> Value
                                    </span>
                                }
                                name="condition_value"
                                rules={[{ required: true }]}
                                className="mb-0"
                            >
                                {renderConditionValueInput()}
                            </Form.Item>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-app-border"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-4 bg-white dark:bg-[#141517] text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">Execution Actions</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 bg-emerald-500/5 p-6 rounded-[2rem] border border-emerald-500/10">
                            <Form.Item 
                                label={
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                                        <Settings size={12} /> Action Type
                                    </span>
                                }
                                name="action_type"
                                rules={[{ required: true }]}
                                className="mb-0"
                            >
                                <Select className="scylla-select" placeholder="Select Action">
                                    {ACTION_TYPES.map(a => (
                                        <Option key={a.value} value={a.value}>
                                            <div className="flex items-center gap-2">
                                                {a.icon} {a.label}
                                            </div>
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item 
                                label={
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                                        <Check size={12} /> Target Value
                                    </span>
                                }
                                name="action_value"
                                rules={[{ required: true }]}
                                className="mb-0"
                            >
                                {renderActionValueInput()}
                            </Form.Item>
                        </div>

                        <div className="pt-4">
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                block 
                                loading={submitting}
                                className="!h-16 !bg-gradient-to-r !from-indigo-600 !to-indigo-500 hover:!from-indigo-500 hover:!to-indigo-400 !border-none !text-white !font-black !text-[12px] !uppercase !tracking-[0.3em] !rounded-[1.5rem] shadow-2xl shadow-indigo-500/40 transform active:scale-[0.98] transition-all"
                            >
                                {editingRule ? 'Synchronize Updates to Matrix' : 'Initialize Rule to Matrix'}
                            </Button>
                        </div>
                    </div>
                </Form>
            </Modal>

            <WorkflowEngineGuide 
                isOpen={isGuideOpen} 
                onClose={() => setIsGuideOpen(false)} 
            />

            <style jsx global>{`
                .glass-card {
                    background: rgba(255, 255, 255, 0.7);
                    border: 1px solid rgba(0, 0, 0, 0.05);
                    border-radius: 2rem;
                    backdrop-filter: blur(20px);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
                }

                :global(.dark) .glass-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    box-shadow: none;
                }

                .scylla-table .ant-table {
                    background: transparent !important;
                    color: #1e293b !important;
                }

                :global(.dark) .scylla-table .ant-table {
                    color: #fff !important;
                }

                .scylla-table .ant-table-thead > tr > th {
                    background: rgba(0, 0, 0, 0.02) !important;
                    color: #64748b !important;
                    font-size: 10px !important;
                    font-weight: 900 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.15em !important;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
                    padding: 24px !important;
                }

                :global(.dark) .scylla-table .ant-table-thead > tr > th {
                    background: rgba(255, 255, 255, 0.02) !important;
                    color: rgba(255, 255, 255, 0.4) !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
                }

                .scylla-table .ant-table-tbody > tr > td {
                    border-bottom: 1px solid rgba(0, 0, 0, 0.02) !important;
                    padding: 24px !important;
                }

                :global(.dark) .scylla-table .ant-table-tbody > tr > td {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.02) !important;
                }

                .scylla-table .ant-table-tbody > tr:hover > td {
                    background: rgba(0, 0, 0, 0.01) !important;
                }

                :global(.dark) .scylla-table .ant-table-tbody > tr:hover > td {
                    background: rgba(255, 255, 255, 0.01) !important;
                }

                .scylla-modal .ant-modal-content {
                    background: #ffffff !important;
                    border: 1px solid rgba(0, 0, 0, 0.05);
                    border-radius: 2.5rem !important;
                    padding: 32px !important;
                    box-shadow: 0 40px 100px rgba(0,0,0,0.1) !important;
                }

                :global(.dark) .scylla-modal .ant-modal-content {
                    background: #0D1117 !important;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    box-shadow: 0 40px 100px rgba(0,0,0,0.8) !important;
                }

                .scylla-modal .ant-modal-header {
                    background: transparent !important;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
                    padding-bottom: 24px !important;
                    margin-bottom: 24px !important;
                }

                :global(.dark) .scylla-modal .ant-modal-header {
                    border-bottom: 1px solid rgba(255,255,255,0.05) !important;
                }

                .scylla-input {
                    background: #f8fafc !important;
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 12px !important;
                    color: #0f172a !important;
                    padding: 12px 16px !important;
                    font-weight: 600 !important;
                    font-size: 14px !important;
                }

                :global(.dark) .scylla-input {
                    background: #161B22 !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    color: #fff !important;
                }

                .scylla-input:focus {
                    border-color: #4f46e5 !important;
                    background: #ffffff !important;
                    outline: none !important;
                    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2) !important;
                }

                :global(.dark) .scylla-input:focus {
                    background: #1C2128 !important;
                }

                .scylla-select .ant-select-selector {
                    background: #f8fafc !important;
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 12px !important;
                    color: #0f172a !important;
                    height: 48px !important;
                    display: flex !important;
                    align-items: center !important;
                }

                :global(.dark) .scylla-select .ant-select-selector {
                    background: rgba(255, 255, 255, 0.02) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    color: #fff !important;
                }

                .ant-select-dropdown {
                    background: #ffffff !important;
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 12px !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important;
                }

                :global(.dark) .ant-select-dropdown {
                    background: #161B22 !important;
                    border: 1px solid rgba(255,255,255,0.05) !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
                }

                .ant-select-item {
                    color: #64748b !important;
                }

                :global(.dark) .ant-select-item {
                    color: #8B949E !important;
                }

                .ant-select-item-option-selected {
                    background: rgba(79, 70, 229, 0.1) !important;
                    color: #4f46e5 !important;
                }

                :global(.dark) .ant-select-item-option-selected {
                    background: rgba(79, 70, 229, 0.2) !important;
                    color: #fff !important;
                }
            `}</style>
        </Layout>
    );
}
