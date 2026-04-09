import { useState, useEffect } from 'react';
import { MessageSquare, Send, User, Clock, Lock, RefreshCw } from 'lucide-react';
import apiClient from '@/lib/apiClient';

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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-app-text uppercase italic flex items-center gap-2">
                    <MessageSquare size={20} className="text-indigo-400" /> Discussion
                </h3>
                <span className="text-[10px] font-black uppercase text-app-text-muted px-2 py-0.5 bg-white/5 rounded-none border border-white/10">
                    {comments.length} Comments
                </span>
            </div>

            {/* Comment List */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-12 text-app-text-muted font-black uppercase tracking-widest text-[10px]">
                        <RefreshCw size={20} className="animate-spin mr-2" /> Neural Stream Loading...
                    </div>
                ) : comments.length > 0 ? (
                    comments.map(comment => (
                        <div 
                            key={comment.id} 
                            className={`p-6 rounded-none border transition-all relative overflow-hidden group ${
                                comment.is_internal 
                                    ? 'bg-app-gold/5 border-app-gold/20' 
                                    : 'bg-white/5 border-white/10'
                            }`}
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-app-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-none bg-app-void flex items-center justify-center text-app-primary border border-app-border">
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                                            {comment.author_name}
                                            {comment.is_internal && (
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-app-gold bg-app-gold/10 px-2 py-0.5 border border-app-gold/20 flex items-center gap-1">
                                                    <Lock size={8} /> Internal_Audit
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-app-text-muted font-black uppercase tracking-widest opacity-40 flex items-center gap-1.5 mt-1">
                                            <Clock size={10} /> {new Date(comment.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm leading-relaxed text-app-text-muted font-medium uppercase tracking-tight px-1 border-l border-app-primary/20 ml-2">
                                {comment.content}
                            </p>
                        </div>
                    ))
                ) : (
                    <div className="py-16 text-center text-app-text-muted border border-dashed border-app-border rounded-none bg-app-void/40">
                        <MessageSquare size={32} className="mx-auto mb-4 opacity-10" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 italic">No Discussion Packets Logged</p>
                    </div>
                )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative group">
                    <textarea
                        required
                        className="w-full bg-app-void border border-app-border rounded-none p-6 text-sm text-app-text focus:border-app-primary focus:bg-app-primary/[0.02] outline-none transition-all resize-none min-h-[140px] uppercase tracking-tight font-medium"
                        placeholder="APPEND COMMUNICATION PAYLOAD..."
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                    />
                    
                    {/* Internal Toggle for Staff */}
                    {(currentUser?.role !== 'END_USER' || currentUser?.position === 'MANAGER') && (
                        <div className="absolute bottom-6 left-6 flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsInternal(!isInternal)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-none text-[9px] font-black uppercase tracking-[0.15em] transition-all border ${
                                    isInternal 
                                        ? 'bg-app-gold text-app-void border-transparent shadow-lg shadow-app-gold/20' 
                                        : 'bg-app-obsidian border-app-border text-app-text-muted hover:text-app-text hover:border-app-primary/30'
                                }`}
                            >
                                <Lock size={12} /> {isInternal ? 'Internal_Restricted' : 'Public_Uplink'}
                            </button>
                        </div>
                    )}

                    <div className="absolute bottom-6 right-6">
                        <button
                            type="submit"
                            disabled={submitting || !newComment.trim()}
                            className="bg-app-primary hover:bg-app-text text-app-void px-6 py-3 rounded-none shadow-xl shadow-app-primary/20 transition-all active:scale-95 disabled:opacity-20 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 group/btn"
                        >
                            {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} className="group-hover/btn:translate-x-1 transition-transform" />}
                            Commit_Stream
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
