import { Trophy, CheckCircle2, User } from 'lucide-react';
import { Card, Typography, Avatar, Tag } from 'antd';

const { Title, Text } = Typography;

export default function TopSolvers({ solvers, loading }) {
    if (loading) {
        return (
            <Card className="rounded-none border-slate-100 border-app-border shadow-sm" loading />
        );
    }

    if (!solvers || solvers.length === 0) {
        return (
            <Card className="rounded-none border-slate-100 border-app-border shadow-sm p-8 text-center">
                <Text className="text-app-text-muted italic">No resolution data available yet.</Text>
            </Card>
        );
    }

    return (
        <Card
            className="rounded-none border-slate-100 border-app-border shadow-sm overflow-hidden"
            styles={{ body: { padding: '0' } }}
        >
            <div className="p-6 border-b border-slate-50 border-app-border bg-slate-50/50 bg-app-surface-soft">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-none bg-amber-500/10 text-amber-500">
                        <Trophy size={20} />
                    </div>
                    <div>
                        <Title level={5} className="!m-0 !text-sm font-bold text-app-text">Top Solvers</Title>
                        <Text className="text-[10px] text-app-text-muted font-medium uppercase tracking-wider">Historical Performance</Text>
                    </div>
                </div>
            </div>

            <div className="flex flex-col">
                {solvers.map((solver, index) => (
                    <div key={solver.id || index} className="flex px-6 py-4 border-b border-slate-50 border-app-border last:border-0 hover:bg-slate-50/50 dark:hover:bg-app-surface-soft transition-colors">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Avatar
                                        icon={<User size={16} />}
                                        className="bg-indigo-500/10 text-indigo-500 border-none"
                                    />
                                    {index === 0 && (
                                        <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900">
                                            <div className="w-2 h-2"></div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-app-text">
                                        {solver.name}
                                    </div>
                                    <div className="text-xs text-app-text-muted">Systems Technician</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Tag className="bg-emerald-500/10 text-emerald-600 border-none rounded-full px-3 py-0.5 font-bold flex items-center gap-1.5 m-0">
                                    <CheckCircle2 size={12} />
                                    {solver.count} Solved
                                </Tag>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
