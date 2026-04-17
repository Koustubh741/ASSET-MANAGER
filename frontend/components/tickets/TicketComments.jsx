import { useState, useEffect } from 'react';
import { MessageSquare, Send, User, Clock, Lock, RefreshCw, Zap } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { ZenithBadge, ZenithButton, ZenithCard } from '../common/ZenithUI';

export default function TicketComments({ ticketId, currentUser }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (ticketId) loadComments();
    }, [ticketId]);

    const loadComments = async () => {
        setLoading(true);
        try {
            const data = await apiClient.get(`/tickets/${ticketId}/comments`);
            setComments(data || []);
        } catch (error) {
            console.error('Failed to load comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        
        setSubmitting(true);
        try {
            const res = await apiClient.post(`/tickets/${ticketId}/comments`, {
                content: newComment,
                is_internal: isInternal
            });
            setComments([...comments, res]);
            setNewComment('');
            setIsInternal(false);
        } catch (error) {
            console.error('Failed to post comment:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 page-zenith-entry">
            <div className="flex items-center justify-between border-b border-app-border/40 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 text-primary border border-primary/20">
                        <MessageSquare size={22} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-app-text tracking-tighter uppercase italic">
                            Collaborative Stream
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-app-text-muted opacity-60">
                            Neural Communication Hub
                        </p>
                    </div>
                </div>
                <ZenithBadge active>{comments.length} Signals</ZenithBadge>
            </div>

            {/* Comment List */}
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-app-text-muted">
                        <RefreshCw size={32} className="animate-spin mb-4 opacity-40 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Synchronizing Stream...</span>
                    </div>
                ) : comments.length > 0 ? (
                    comments.map(comment => (
                        <div 
                            key={comment.id} 
                            className={`p-8 glass-zenith border transition-all relative overflow-hidden group ${
                                comment.is_internal 
                                    ? 'border-amber-500/20 bg-amber-500/5' 
                                    : 'border-app-border/40 hover:bg-white/5'
                            }`}
                        >
                            <div className={`absolute top-0 left-0 w-1 h-full transition-all duration-500 ${
                                comment.is_internal ? 'bg-amber-500' : 'bg-primary'
                            } opacity-0 group-hover:opacity-100`} />
                            
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-5">
                                    <div className={`w-12 h-12 flex items-center justify-center font-black text-xs border ${
                                        comment.is_internal ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-primary/10 border-primary/30 text-primary'
                                    }`}>
                                        {(comment.author_name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-black uppercase tracking-tight text-app-text">
                                                {comment.author_name}
                                            </span>
                                            {comment.is_internal && (
                                                <ZenithBadge active className="text-[8px] border-amber-500/40 text-amber-500 bg-amber-500/10">
                                                    INTERNAL GATEWAY
                                                </ZenithBadge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5 opacity-40">
                                            <Clock size={12} className="text-app-text-muted" />
                                            <span className="text-[10px] text-app-text-muted font-black uppercase tracking-widest">
                                                {new Date(comment.created_at).toLocaleString([], {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="relative pl-6 py-2">
                                <div className={`absolute left-0 top-0 bottom-0 w-[2px] opacity-20 ${
                                    comment.is_internal ? 'bg-amber-500' : 'bg-primary'
                                }`} />
                                <p className="text-sm leading-relaxed text-app-text-muted font-medium uppercase tracking-tight italic">
                                    {comment.content}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-24 text-center glass-zenith border-dashed border-app-border/40 opacity-40">
                        <MessageSquare size={40} className="mx-auto mb-6 opacity-20" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.5em]">Static Transmission</h4>
                        <p className="text-[9px] font-black uppercase tracking-widest mt-2 opacity-60">No collaborative logs found in current sector</p>
                    </div>
                )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleSubmit} className="space-y-6 pt-6 border-t border-app-border/40">
                <div className="relative group glass-zenith overflow-hidden border-app-border/40 focus-within:border-primary/40 transition-all">
                    <textarea
                        required
                        className="w-full bg-transparent border-none p-8 text-sm text-app-text focus:bg-primary/[0.02] outline-none transition-all resize-none min-h-[160px] uppercase tracking-wide font-bold placeholder:opacity-20"
                        placeholder="APPEND NEURAL UPLINK PACKET..."
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                    />
                    
                    <div className="p-6 bg-app-surface/40 flex items-center justify-between border-t border-app-border/20">
                        <div className="flex items-center gap-4">
                             {(currentUser?.role !== 'END_USER' || currentUser?.position === 'MANAGER') && (
                                <button
                                    type="button"
                                    onClick={() => setIsInternal(!isInternal)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-none text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                                        isInternal 
                                            ? 'bg-amber-500 text-app-bg border-transparent shadow-[0_0_20px_rgba(245,158,11,0.3)]' 
                                            : 'bg-app-bg/50 border-app-border/40 text-app-text-muted hover:text-white'
                                    }`}
                                >
                                    <Lock size={12} /> {isInternal ? 'RESTRICTED_ACCESS' : 'PUBLIC_BROADCAST'}
                                </button>
                            )}
                        </div>

                        <ZenithButton
                            type="submit"
                            disabled={submitting || !newComment.trim()}
                            icon={submitting ? RefreshCw : Send}
                            className="px-10 py-3 shadow-[0_0_30px_var(--primary-glow)]"
                        >
                            {submitting ? 'PROCESSING...' : 'TRANSMIT_PACKET'}
                        </ZenithButton>
                    </div>
                </div>
            </form>
        </div>
    );
}
