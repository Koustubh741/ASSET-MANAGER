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
    Shield
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
    Badge
} from 'antd';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/components/common/Toast';

const { Content } = Layout;
const { Option } = Select;

export default function AutomationPage() {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [rules, setRules] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
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

    const handleCreateRule = async (values) => {
        setSubmitting(true);
        try {
            // Transform form values to backend JSON structure
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

            await apiClient.createAutomationRule(payload);
            toast.success("Automation rule created successfully");
            setIsModalOpen(false);
            form.resetFields();
            loadRules();
        } catch (err) {
            toast.error("Error creating rule: " + (err.response?.data?.detail || err.message));
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
            render: (val) => <span className="text-[10px] font-black font-mono opacity-50">{val}</span>
        },
        {
            title: 'RULE IDENTITY',
            key: 'identity',
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-100">{record.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">{record.description || 'No description provided'}</span>
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
                            <Tag key={f} className="!bg-indigo-500/10 !border-indigo-500/20 !text-indigo-400 !text-[9px] !font-black !uppercase !tracking-widest">
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
                            <Tag key={f} className="!bg-emerald-500/10 !border-emerald-500/20 !text-emerald-400 !text-[9px] !font-black !uppercase !tracking-widest">
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
                <div className="flex justify-end pr-4">
                    <Tooltip title="Delete Rule">
                        <button 
                            onClick={() => handleDeleteRule(record.id)}
                            className="p-2 text-slate-500 hover:text-rose-500 transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    </Tooltip>
                </div>
            )
        }
    ];

    return (
        <Layout className="min-h-screen bg-slate-50 dark:bg-[#07090D] font-['Inter'] transition-colors duration-300">
            <Head>
                <title>Automation Engine | Scylla Ticket Center</title>
            </Head>

            {/* --- TOP BAR --- */}
            <div className="bg-white/40 dark:bg-[#0D1117]/40 border-b border-slate-200 dark:border-white/5 px-8 py-5 flex items-center justify-between sticky top-0 z-50 backdrop-blur-2xl transition-all duration-500">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.push('/tickets')}
                        className="group p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-indigo-600 dark:hover:bg-indigo-600 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-all shadow-sm border border-slate-200 dark:border-white/5"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase font-['Outfit']">
                                Workflow <span className="text-indigo-600 dark:text-indigo-500 italic">Engine</span>
                            </h1>
                            <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Automation Matrix</span>
                            </div>
                        </div>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.3em] leading-none mt-1.5 flex items-center gap-2">
                             Deterministic Ticket Routing System
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button 
                        icon={<Plus size={16} />}
                        className="!h-12 !px-6 !bg-indigo-600 !border-none !text-white !font-black !text-[10px] !uppercase !tracking-[0.2em] !rounded-2xl shadow-xl shadow-indigo-600/20 hover:!bg-indigo-500 transition-all flex items-center gap-2"
                        onClick={() => setIsModalOpen(true)}
                    >
                        Initialize New Rule
                    </Button>
                </div>
            </div>

            <Content className="p-10">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'Active Rules', value: rules.filter(r => r.is_active).length, icon: Activity, color: 'indigo' },
                            { label: 'System Priority', value: 'High', icon: Shield, color: 'emerald' },
                            { label: 'Avg Latency', value: '< 2ms', icon: Zap, color: 'amber' }
                        ].map((stat, i) => (
                            <div key={i} className="glass-card p-6 flex items-center gap-6">
                                <div className={`p-4 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-400 border border-${stat.color}-500/20 shadow-lg shadow-${stat.color}-500/5`}>
                                    <stat.icon size={24} />
                                </div>
                                <div>
                                    <div className="text-xl font-black text-slate-900 dark:text-white leading-none">{stat.value}</div>
                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Rule Grid */}
                    <div className="glass-card overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
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
                                <Button 
                                    className="mt-4 !h-10 !bg-white/5 !border-white/10 !text-slate-400 !font-black !text-[9px] !uppercase !tracking-widest !rounded-xl"
                                    onClick={() => setIsModalOpen(true)}
                                >
                                    Define First Rule
                                </Button>
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
                title={<div className="text-lg font-black uppercase tracking-tighter text-white">Rule Configuration Utility</div>}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={600}
                className="scylla-modal"
                centered
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreateRule}
                    initialValues={{ is_active: true, priority_order: 0 }}
                >
                    <div className="space-y-6 pt-4">
                        <Form.Item 
                            label={<span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rule Name</span>}
                            name="name" 
                            rules={[{ required: true, message: 'Identity required' }]}
                        >
                            <Input placeholder="e.g. INFRASTRUCTURE_ROUTING_PRIMARY" className="scylla-input" />
                        </Form.Item>

                        <Form.Item 
                            label={<span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</span>}
                            name="description"
                        >
                            <Input.TextArea rows={2} placeholder="Define rule operational scope..." className="scylla-input" />
                        </Form.Item>

                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item 
                                label={<span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Priority Order</span>}
                                name="priority_order"
                            >
                                <Input type="number" className="scylla-input" />
                            </Form.Item>

                            <Form.Item 
                                label={<span className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Status</span>}
                                name="is_active" 
                                valuePropName="checked"
                            >
                                <Switch checkedChildren="ACTIVE" unCheckedChildren="OFF" />
                            </Form.Item>
                        </div>

                        <Divider className="!my-2 border-white/5">
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Logic Conditions</span>
                        </Divider>

                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item 
                                label={<span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Field</span>}
                                name="condition_field"
                                rules={[{ required: true }]}
                            >
                                <Select className="scylla-select" placeholder="Select Field">
                                    <Option value="category">Category</Option>
                                    <Option value="priority">Priority</Option>
                                    <Option value="subject">Subject Contains</Option>
                                    <Option value="requestor_department">Department</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item 
                                label={<span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Value</span>}
                                name="condition_value"
                                rules={[{ required: true }]}
                            >
                                <Input placeholder="e.g. Hardware" className="scylla-input" />
                            </Form.Item>
                        </div>

                        <Divider className="!my-2 border-white/5">
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Execution Actions</span>
                        </Divider>

                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item 
                                label={<span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Action Type</span>}
                                name="action_type"
                                rules={[{ required: true }]}
                            >
                                <Select className="scylla-select" placeholder="Select Action">
                                    <Option value="assign_to_role">Assign to Role</Option>
                                    <Option value="assign_to_id">Assign to Specific ID</Option>
                                    <Option value="set_priority">Override Priority</Option>
                                    <Option value="set_status">Override Status</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item 
                                label={<span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Value</span>}
                                name="action_value"
                                rules={[{ required: true }]}
                            >
                                <Input placeholder="e.g. IT_MANAGEMENT" className="scylla-input" />
                            </Form.Item>
                        </div>

                        <div className="pt-6">
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                block 
                                loading={submitting}
                                className="!h-14 !bg-indigo-600 !border-none !text-white !font-black !text-[11px] !uppercase !tracking-[0.2em] !rounded-2xl"
                            >
                                Synchronize Rule to Matrix
                            </Button>
                        </div>
                    </div>
                </Form>
            </Modal>

            <style jsx global>{`
                .glass-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 2rem;
                    backdrop-filter: blur(20px);
                }

                .scylla-table .ant-table {
                    background: transparent !important;
                    color: #fff !important;
                }

                .scylla-table .ant-table-thead > tr > th {
                    background: rgba(255, 255, 255, 0.02) !important;
                    color: rgba(255, 255, 255, 0.4) !important;
                    font-size: 10px !important;
                    font-weight: 900 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.15em !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
                    padding: 24px !important;
                }

                .scylla-table .ant-table-tbody > tr > td {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.02) !important;
                    padding: 24px !important;
                }

                .scylla-table .ant-table-tbody > tr:hover > td {
                    background: rgba(255, 255, 255, 0.01) !important;
                }

                .scylla-modal .ant-modal-content {
                    background: #0D1117 !important;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 2.5rem !important;
                    padding: 32px !important;
                    box-shadow: 0 40px 100px rgba(0,0,0,0.8) !important;
                }

                .scylla-modal .ant-modal-header {
                    background: transparent !important;
                    border-bottom: 1px solid rgba(255,255,255,0.05) !important;
                    padding-bottom: 24px !important;
                    margin-bottom: 24px !important;
                }

                .scylla-input {
                    background: #161B22 !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 12px !important;
                    color: #fff !important;
                    padding: 12px 16px !important;
                    font-weight: 600 !important;
                    font-size: 14px !important;
                }

                .scylla-input:focus {
                    border-color: #4f46e5 !important;
                    background: #1C2128 !important;
                    outline: none !important;
                    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2) !important;
                }

                .scylla-select .ant-select-selector {
                    background: rgba(255, 255, 255, 0.02) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 12px !important;
                    color: #fff !important;
                    height: 48px !important;
                    display: flex !important;
                    align-items: center !important;
                }

                .ant-select-dropdown {
                    background: #161B22 !important;
                    border: 1px solid rgba(255,255,255,0.05) !important;
                    border-radius: 12px !important;
                }

                .ant-select-item {
                    color: #8B949E !important;
                }

                .ant-select-item-option-selected {
                    background: rgba(79, 70, 229, 0.2) !important;
                    color: #fff !important;
                }
            `}</style>
        </Layout>
    );
}
