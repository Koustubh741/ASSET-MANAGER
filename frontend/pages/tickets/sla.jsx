import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Edit2, Save, Search, Trash2, Plus, ArrowLeft, ArrowRight, Share2, Filter, Settings, ShieldCheck, Clock, Zap, MoreHorizontal, Activity, CheckCircle, Info, HelpCircle, Trophy, BarChart3, Shield } from 'lucide-react';
import SLAGuideModal from '../../components/SLAGuideModal';
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
    Badge,
    Space,
    Tooltip,
    Divider,
    Empty,
    Spin,
    InputNumber,
    Switch
} from 'antd';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/components/common/Toast';

const { Content } = Layout;
const { Option } = Select;

export default function SLAPage() {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [policies, setPolicies] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState(null);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    const resMin = Form.useWatch('res_min', form);
    const remMin = Form.useWatch('rem_min', form);

    useEffect(() => {
        loadPolicies();
    }, []);

    const loadPolicies = async () => {
        setLoading(true);
        try {
            const data = await apiClient.getSLAPolicies();
            setPolicies(data);
        } catch (err) {
            console.error("Failed to load policies:", err);
            toast.error("Failed to load SLA policies");
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePolicy = async (values) => {
        setSubmitting(true);
        try {
            if (editingPolicy) {
                await apiClient.updateSLAPolicy(editingPolicy.id, values);
                toast.success("SLA policy updated successfully");
            } else {
                await apiClient.createSLAPolicy(values);
                toast.success("SLA policy created successfully");
            }
            setIsModalOpen(false);
            setEditingPolicy(null);
            form.resetFields();
            loadPolicies();
        } catch (err) {
            toast.error(`Error ${editingPolicy ? 'updating' : 'creating'} policy: ` + (err.response?.data?.detail || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditPolicy = (record) => {
        setEditingPolicy(record);
        form.setFieldsValue({
            name: record.name,
            priority: record.priority,
            category: record.category,
            res_min: record.response_time_limit,
            rem_min: record.resolution_time_limit,
            is_active: record.is_active ?? true
        });
        setIsModalOpen(true);
    };

    const handleDeletePolicy = async (id) => {
        Modal.confirm({
            title: 'Delete SLA Policy',
            content: 'Are you sure you want to delete this policy? Tickets currently using this policy will retain their current deadlines.',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await apiClient.deleteSLAPolicy(id);
                    toast.success("Policy deleted");
                    loadPolicies();
                } catch (err) {
                    toast.error("Failed to delete policy");
                }
            }
        });
    };

    const getPriorityColor = (priority) => {
        const p = priority?.toLowerCase();
        if (p === 'critical') return 'rose';
        if (p === 'high') return 'gold';
        if (p === 'medium') return 'primary';
        if (p === 'low') return 'secondary';
        return 'muted';
    };

    const calcWidth = (minutes) => {
        // Normalize against 24 hours (1440 mins) for visual representation
        const percentage = Math.min(100, Math.max(5, (minutes / 1440) * 100));
        return `${percentage}%`;
    };

    const formatDuration = (mins) => {
        if (!mins || mins <= 0) return '';
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        if (hours < 24) {
            return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
        }
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        let res = `${days}d`;
        if (remainingHours > 0) res += ` ${remainingHours}h`;
        return res;
    };

    const columns = [
        {
            title: 'POLICY IDENTITY',
            key: 'identity',
            render: (_, record) => {
                const color = getPriorityColor(record.priority);
                return (
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-app-text">{record.name}</span>
                        <div className="flex gap-2 mt-1">
                            {record.priority && (
                                <Tag className={`!bg-app-${color}/10 !border-app-${color}/20 !text-app-${color} !text-[8px] !font-black !uppercase !rounded-none`}>
                                    {record.priority}
                                </Tag>
                            )}
                            {record.category && (
                                <Tag className="!bg-app-primary/10 !border-app-primary/20 !text-app-primary !text-[8px] !font-black !uppercase !rounded-none">
                                    {record.category}
                                </Tag>
                            )}
                            {!record.priority && !record.category && (
                                <Tag className="!bg-app-void !border-app-border !text-app-text-muted !text-[8px] !font-black !uppercase !rounded-none">
                                    GLOBAL DEFAULT
                                </Tag>
                            )}
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'RESPONSE TARGET',
            dataIndex: 'response_time_limit',
            render: (val) => (
                <div className="flex items-center gap-3">
                    <div className="w-24 bg-app-surface-soft h-1.5 rounded-none overflow-hidden">
                        <div className="bg-app-primary h-full transition-all duration-1000" style={{ width: calcWidth(val) }}></div>
                    </div>
                    <span className="text-xs font-bold text-app-text-muted">{val} <span className="opacity-50 font-normal">min</span></span>
                </div>
            )
        },
        {
            title: 'RESOLUTION TARGET',
            dataIndex: 'resolution_time_limit',
            render: (val) => (
                <div className="flex items-center gap-3">
                    <div className="w-24 bg-app-surface-soft h-1.5 rounded-none overflow-hidden">
                        <div className="bg-app-secondary h-full transition-all duration-1000" style={{ width: calcWidth(val) }}></div>
                    </div>
                    <span className="text-xs font-bold text-app-text-muted">{val} <span className="opacity-50 font-normal">min</span></span>
                </div>
            )
        },
        {
            title: 'STATUS',
            dataIndex: 'is_active',
            render: (active) => (
                <Badge
                    status={active ? "processing" : "default"}
                    text={<span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-app-secondary' : 'text-app-text-muted'}`}>{active ? 'ACTIVE' : 'DISABLED'}</span>}
                />
            )
        },
        {
            title: '',
            key: 'ops',
            width: 120,
            render: (_, record) => (
                <div className="flex justify-end pr-4 gap-2">
                    <Tooltip title="Edit Policy">
                        <button
                            onClick={() => handleEditPolicy(record)}
                            className="p-2 text-app-text-muted hover:text-app-primary transition-colors"
                        >
                            <Edit2 size={16} />
                        </button>
                    </Tooltip>
                    <Tooltip title="Retire Policy">
                        <button
                            onClick={() => handleDeletePolicy(record.id)}
                            className="p-2 text-app-text-muted hover:text-app-rose transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    </Tooltip>
                </div>
            )
        }
    ];

    return (
        <Layout className="min-h-screen bg-app-bg font-sans transition-colors duration-300">
            <Head>
                <title>SLA Management | Scylla Ticket Center</title>
            </Head>

            {/* --- TOP BAR --- */}
            <div className="bg-app-surface/40 border-b border-app-border px-8 py-5 flex items-center justify-between sticky top-0 z-50 backdrop-blur-2xl transition-all duration-500">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.push('/tickets')}
                        className="group p-2.5 bg-app-surface-soft hover:bg-app-primary rounded-none text-app-text-muted hover:text-app-void transition-all shadow-sm border border-app-border"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-app-text tracking-tighter uppercase italic">
                                Service Level <span className="text-app-primary">Mgmt</span>
                            </h1>
                            <div className="px-3 py-1 bg-app-secondary/10 border border-app-secondary/30 rounded-none">
                                <span className="text-[10px] font-black text-app-secondary uppercase tracking-widest">Compliance Engine</span>
                            </div>
                        </div>
                        <p className="text-[9px] text-app-text-muted font-black uppercase tracking-[0.3em] leading-none mt-1.5 flex items-center gap-2">
                             Deterministic Performance Standards
                        </p>
                    </div>
                </div>

                <div className="flex items-center">
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsGuideOpen(true)}
                                    className="px-6 py-3.5 bg-app-surface-soft text-app-text-muted font-black text-[10px] uppercase tracking-widest rounded-none border border-app-border transition-all flex items-center gap-2"
                                >
                                    <HelpCircle size={16} />
                                    View Guide
                                </button>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="px-6 py-3.5 bg-app-primary hover:bg-app-text text-app-void font-black text-[10px] uppercase tracking-widest rounded-none border border-app-primary/20 shadow-lg shadow-app-primary/20 transition-all flex items-center gap-2"
                                >
                                    <Plus size={16} />
                                    Provision Policy
                                </button>
                            </div>
                </div>
            </div>

            <Content className="p-10">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'Avg Compliance', value: '98.2%', icon: Trophy, color: 'secondary' },
                            { label: 'Active Targets', value: policies.length, icon: BarChart3, color: 'primary' },
                            { label: 'Breach Alerts', value: '0', icon: Clock, color: 'rose' }
                        ].map((stat, i) => (
                            <div key={i} className="glass-card p-6 flex items-center gap-6">
                                <div className={`p-4 rounded-none bg-app-${stat.color}/10 text-app-${stat.color} border border-app-${stat.color}/20 shadow-lg shadow-app-${stat.color}/5`}>
                                    <stat.icon size={24} />
                                </div>
                                <div>
                                    <div className="text-xl font-black text-app-text leading-none">{stat.value}</div>
                                    <div className="text-[10px] text-app-text-muted font-black uppercase tracking-widest mt-2">{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Policy Grid */}
                    <div className="glass-card overflow-hidden">
                        <div className="px-8 py-6 border-b border-app-border flex items-center justify-between">
                            <h3 className="text-sm font-black text-app-text uppercase tracking-widest flex items-center gap-2">
                                <Activity size={16} className="text-app-secondary" />
                                Policy Compliance Matrix
                            </h3>
                        </div>

                        {loading ? (
                            <div className="p-20 text-center">
                                <Spin size="large" />
                                <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mt-4">Calibrating Performance Matrix...</p>
                            </div>
                        ) : policies.length === 0 ? (
                            <div className="p-20 text-center">
                                <Empty 
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={<span className="text-app-text-muted font-black uppercase tracking-widest text-[10px]">No service policies defined</span>}
                                />
                                <Button 
                                    className="mt-4 !h-10 !bg-app-surface-soft !border-app-border !text-app-text-muted !font-black !text-[9px] !uppercase !tracking-widest !rounded-none"
                                    onClick={() => setIsModalOpen(true)}
                                >
                                    Define Base Policy
                                </Button>
                            </div>
                        ) : (
                            <Table 
                                dataSource={policies} 
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
                title={<div className="text-lg font-black uppercase tracking-tighter text-app-text font-['Space_Grotesk']">{editingPolicy ? 'Policy Modification Utility' : 'Policy Provisioning Utility'}</div>}
                open={isModalOpen}
                onCancel={() => {
                    setIsModalOpen(false);
                    setEditingPolicy(null);
                    form.resetFields();
                }}
                footer={null}
                width={500}
                className="scylla-modal"
                centered
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreatePolicy}
                    initialValues={{ res_min: 30, rem_min: 240, is_active: true }}
                >
                    <div className="space-y-6 pt-4">
                        <Form.Item 
                            label={<span className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">Policy Name</span>}
                            name="name" 
                            rules={[{ required: true, message: 'Policy ID required' }]}
                        >
                            <Input prefix={<Tag size={14} className="text-app-text-muted mr-2" />} placeholder="e.g. MISSION_CRITICAL_HIGH_SLA" className="scylla-input" />
                        </Form.Item>

                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item 
                                label={<span className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">Trigger Priority</span>}
                                name="priority"
                            >
                                <Select 
                                    className="scylla-select" 
                                    placeholder="Select Priority" 
                                    allowClear
                                    suffixIcon={<Shield size={14} className="text-app-text-muted" />}
                                >
                                    <Option value="High"><span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-none bg-app-rose" /> High</span></Option>
                                    <Option value="Medium"><span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-none bg-app-gold" /> Medium</span></Option>
                                    <Option value="Low"><span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-none bg-app-secondary" /> Low</span></Option>
                                </Select>
                            </Form.Item>
                            <Form.Item 
                                label={<span className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">Trigger Category</span>}
                                name="category"
                            >
                                <Input prefix={<Filter size={14} className="text-app-text-muted mr-2" />} placeholder="e.g. Hardware" className="scylla-input" />
                            </Form.Item>
                        </div>

                        <Divider className="!my-2 border-app-primary/10">
                            <span className="text-[9px] font-black text-app-primary uppercase tracking-widest font-mono">Temporal Limits</span>
                        </Divider>

                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item 
                                label={(
                                    <div className="flex justify-between items-center w-full">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">Response</span>
                                        <span className="text-[10px] font-black text-app-primary bg-app-primary/10 px-2 py-0.5 rounded-none italic">{formatDuration(resMin) || 'N/A'}</span>
                                    </div>
                                )}
                                name="res_min"
                                rules={[{ required: true }]}
                            >
                                <InputNumber prefix={<Clock size={14} className="text-app-text-muted mr-2" />} className="scylla-input !w-full" min={1} placeholder="Min" />
                            </Form.Item>
                            <Form.Item 
                                label={(
                                    <div className="flex justify-between items-center w-full">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">Resolution</span>
                                        <span className="text-[10px] font-black text-app-secondary bg-app-secondary/10 px-2 py-0.5 rounded-none italic">{formatDuration(remMin) || 'N/A'}</span>
                                    </div>
                                )}
                                name="rem_min"
                                rules={[{ required: true }]}
                            >
                                <InputNumber prefix={<Zap size={14} className="text-app-text-muted mr-2" />} className="scylla-input !w-full" min={1} placeholder="Min" />
                            </Form.Item>
                        </div>

                        <div className="bg-app-surface-soft p-4 rounded-none border border-app-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Activity size={18} className="text-app-primary" />
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-app-text">Policy Enforcement</div>
                                    <div className="text-[8px] font-bold text-app-text-muted uppercase tracking-tighter">Toggle activation status globally</div>
                                </div>
                            </div>
                            <Form.Item name="is_active" valuePropName="checked" className="!mb-0">
                                <Switch className="bg-app-surface" />
                            </Form.Item>
                        </div>

                        <div className="pt-6">
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                block 
                                loading={submitting}
                                className="!h-14 !bg-app-primary hover:!bg-app-text !border-none !text-app-void !font-black !text-[11px] !uppercase !tracking-[0.2em] !rounded-none shadow-xl shadow-app-primary/30"
                            >
                                {editingPolicy ? 'Update Compliance Parameters' : 'Synchronize Policy to Core'}
                            </Button>
                        </div>
                    </div>
                </Form>
            </Modal>

            <style jsx global>{`
                .glass-card {
                    background: var(--bg-surface-obsidian) !important;
                    border: 1px solid var(--border-main) !important;
                    border-radius: 0px !important;
                    backdrop-filter: blur(20px);
                }

                .scylla-table .ant-table {
                    background: transparent !important;
                    color: var(--text-main) !important;
                }

                .scylla-table .ant-table-thead > tr > th {
                    background: var(--bg-app-void) !important;
                    color: var(--text-muted) !important;
                    font-size: 10px !important;
                    font-weight: 900 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.15em !important;
                    border-bottom: 2px solid var(--border-main) !important;
                    padding: 24px !important;
                }

                .scylla-table .ant-table-tbody > tr > td {
                    border-bottom: 1px solid var(--border-soft) !important;
                    padding: 24px !important;
                    color: var(--text-main) !important;
                }

                .scylla-table .ant-table-tbody > tr:hover > td {
                    background: var(--bg-app-obsidian) !important;
                }

                .scylla-modal .ant-modal-content {
                    background: var(--bg-surface-obsidian) !important;
                    border: 1px solid var(--border-main) !important;
                    border-radius: 0px !important;
                    padding: 32px !important;
                    box-shadow: 0 40px 100px rgba(0,0,0,0.8) !important;
                }

                .scylla-input {
                    background: var(--bg-app-void) !important;
                    border: 1px solid var(--border-soft) !important;
                    border-radius: 0px !important;
                    color: var(--text-main) !important;
                    padding: 12px 16px !important;
                    font-weight: 600 !important;
                }

                .scylla-select .ant-select-selector {
                    background: var(--bg-app-void) !important;
                    border: 1px solid var(--border-soft) !important;
                    border-radius: 0px !important;
                    color: var(--text-main) !important;
                    height: 48px !important;
                    display: flex !important;
                    align-items: center !important;
                }
            `}</style>
            <SLAGuideModal 
                isOpen={isGuideOpen} 
                onClose={() => setIsGuideOpen(false)} 
            />
        </Layout>
    );
}
