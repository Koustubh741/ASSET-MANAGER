import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
    ArrowLeft, 
    Clock, 
    Plus, 
    Trash2, 
    Activity,
    Shield,
    BarChart3,
    Trophy
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
    Badge, 
    Space, 
    Tooltip,
    Divider,
    Empty,
    Spin,
    InputNumber
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
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

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
            await apiClient.createSLAPolicy(values);
            toast.success("SLA policy created successfully");
            setIsModalOpen(false);
            form.resetFields();
            loadPolicies();
        } catch (err) {
            toast.error("Error creating policy: " + (err.response?.data?.detail || err.message));
        } finally {
            setSubmitting(false);
        }
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

    const columns = [
        {
            title: 'POLICY IDENTITY',
            key: 'identity',
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{record.name}</span>
                    <div className="flex gap-2 mt-1">
                        {record.priority && (
                            <Tag className="!bg-rose-500/10 !border-rose-500/20 !text-rose-400 !text-[8px] !font-black !uppercase">
                                {record.priority}
                            </Tag>
                        )}
                        {record.category && (
                            <Tag className="!bg-blue-500/10 !border-blue-500/20 !text-blue-400 !text-[8px] !font-black !uppercase">
                                {record.category}
                            </Tag>
                        )}
                        {!record.priority && !record.category && (
                            <Tag className="!bg-slate-500/10 !border-slate-500/20 !text-slate-400 !text-[8px] !font-black !uppercase">
                                GLOBAL DEFAULT
                            </Tag>
                        )}
                    </div>
                </div>
            )
        },
        {
            title: 'RESPONSE TARGET',
            dataIndex: 'response_time_limit',
            render: (val) => (
                <div className="flex items-center gap-3">
                    <div className="w-24 bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full" style={{ width: '40%' }}></div>
                    </div>
                    <span className="text-xs font-bold text-slate-300">{val} <span className="opacity-50 font-normal">min</span></span>
                </div>
            )
        },
        {
            title: 'RESOLUTION TARGET',
            dataIndex: 'resolution_time_limit',
            render: (val) => (
                <div className="flex items-center gap-3">
                    <div className="w-24 bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: '60%' }}></div>
                    </div>
                    <span className="text-xs font-bold text-slate-300">{val} <span className="opacity-50 font-normal">min</span></span>
                </div>
            )
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
                    <Tooltip title="Retire Policy">
                        <button 
                            onClick={() => handleDeletePolicy(record.id)}
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
                <title>SLA Management | Scylla Ticket Center</title>
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
                                Service Level <span className="text-indigo-600 dark:text-indigo-500 italic">Mgmt</span>
                            </h1>
                            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Compliance Engine</span>
                            </div>
                        </div>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.3em] leading-none mt-1.5 flex items-center gap-2">
                             Deterministic Performance Standards
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button 
                        icon={<Plus size={16} />}
                        className="!h-12 !px-6 !bg-indigo-600 !border-none !text-white !font-black !text-[10px] !uppercase !tracking-[0.2em] !rounded-2xl shadow-xl shadow-indigo-600/20 hover:!bg-indigo-500 transition-all flex items-center gap-2"
                        onClick={() => setIsModalOpen(true)}
                    >
                        Provision Policy
                    </Button>
                </div>
            </div>

            <Content className="p-10">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'Avg Compliance', value: '98.2%', icon: Trophy, color: 'emerald' },
                            { label: 'Active Targets', value: policies.length, icon: BarChart3, color: 'indigo' },
                            { label: 'Breach Alerts', value: '0', icon: Clock, color: 'rose' }
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

                    {/* Policy Grid */}
                    <div className="glass-card overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <Activity size={16} className="text-emerald-500" />
                                Policy Compliance Matrix
                            </h3>
                        </div>

                        {loading ? (
                            <div className="p-20 text-center">
                                <Spin size="large" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Calibrating Performance Matrix...</p>
                            </div>
                        ) : policies.length === 0 ? (
                            <div className="p-20 text-center">
                                <Empty 
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={<span className="text-slate-500 font-black uppercase tracking-widest text-[10px]">No service policies defined</span>}
                                />
                                <Button 
                                    className="mt-4 !h-10 !bg-white/5 !border-white/10 !text-slate-400 !font-black !text-[9px] !uppercase !tracking-widest !rounded-xl"
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
                title={<div className="text-lg font-black uppercase tracking-tighter text-white">Policy Provisioning Utility</div>}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={500}
                className="scylla-modal"
                centered
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreatePolicy}
                    initialValues={{ res_min: 30, rem_min: 240 }}
                >
                    <div className="space-y-6 pt-4">
                        <Form.Item 
                            label={<span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Policy Name</span>}
                            name="name" 
                            rules={[{ required: true, message: 'Policy ID required' }]}
                        >
                            <Input placeholder="e.g. MISSION_CRITICAL_HIGH_SLA" className="scylla-input" />
                        </Form.Item>

                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item 
                                label={<span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Trigger Priority</span>}
                                name="priority"
                            >
                                <Select className="scylla-select" placeholder="Select Priority" allowClear>
                                    <Option value="High">High</Option>
                                    <Option value="Medium">Medium</Option>
                                    <Option value="Low">Low</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item 
                                label={<span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Trigger Category</span>}
                                name="category"
                            >
                                <Input placeholder="e.g. Hardware" className="scylla-input" />
                            </Form.Item>
                        </div>

                        <Divider className="!my-2 border-white/5">
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Temporal Limits</span>
                        </Divider>

                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item 
                                label={<span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Response (Min)</span>}
                                name="res_min"
                                rules={[{ required: true }]}
                            >
                                <InputNumber className="scylla-input !w-full" min={1} />
                            </Form.Item>
                            <Form.Item 
                                label={<span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Resolution (Min)</span>}
                                name="rem_min"
                                rules={[{ required: true }]}
                            >
                                <InputNumber className="scylla-input !w-full" min={1} />
                            </Form.Item>
                        </div>

                        <div className="pt-6">
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                block 
                                loading={submitting}
                                className="!h-14 !bg-indigo-600 !border-none !text-white !font-black !text-[11px] !uppercase !tracking-[0.2em] !rounded-2xl shadow-xl shadow-indigo-600/30"
                            >
                                Synchronize Policy to Core
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

                .scylla-input {
                    background: rgba(255, 255, 255, 0.02) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 12px !important;
                    color: #fff !important;
                    padding: 12px 16px !important;
                    font-weight: 600 !important;
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
            `}</style>
        </Layout>
    );
}
