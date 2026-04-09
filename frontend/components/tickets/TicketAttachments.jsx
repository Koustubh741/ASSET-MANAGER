import { useState, useEffect, useRef } from 'react';
import { Paperclip, X, Download, File, Trash2, Clock, Plus, RefreshCw } from 'lucide-react';
import apiClient from '@/lib/apiClient';

export default function TicketAttachments({ ticketId, currentUser }) {
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (ticketId) loadAttachments();
    }, [ticketId]);

    const loadAttachments = async () => {
        setLoading(true);
        try {
            const data = await apiClient.getTicketAttachments(ticketId);
            setAttachments(data || []);
        } catch (error) {
            console.error('Failed to load attachments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const res = await apiClient.uploadTicketAttachment(ticketId, file);
            setAttachments([...attachments, res]);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error('Failed to upload attachment:', error);
            alert('Upload failed: ' + (error.message || 'Unknown error'));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (attachmentId) => {
        if (!confirm('Are you sure you want to remove this attachment?')) return;
        
        try {
            await apiClient.deleteTicketAttachment(attachmentId);
            setAttachments(attachments.filter(a => a.id !== attachmentId));
        } catch (error) {
            console.error('Failed to delete attachment:', error);
            alert('Delete failed');
        }
    };

    const formatSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };


    const getFileIcon = (type) => {
        if (type?.includes('image')) return 'IMG';
        if (type?.includes('pdf')) return 'PDF';
        if (type?.includes('word') || type?.includes('officedocument')) return 'DOC';
        if (type?.includes('spreadsheet') || type?.includes('excel')) return 'XLS';
        if (type?.includes('zip') || type?.includes('compressed')) return 'ZIP';
        return 'DATA';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-app-text uppercase italic flex items-center gap-2 tracking-[0.2em]">
                    <Paperclip size={18} className="text-app-primary" /> Repository_Payload
                </h3>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="group relative flex items-center gap-2 px-6 py-2 bg-app-primary hover:bg-app-text text-app-void rounded-none shadow-xl shadow-app-primary/10 transition-all active:scale-95 disabled:opacity-20 border border-transparent"
                >
                    {uploading ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">Inject_Packet</span>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {attachments.length > 0 ? (
                    attachments.map(attachment => (
                        <div 
                            key={attachment.id}
                            className="group flex items-center justify-between p-5 bg-app-void border border-app-border rounded-none hover:border-app-primary/30 transition-all relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-app-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-5 min-w-0">
                                <div className="w-12 h-12 rounded-none bg-app-obsidian border border-app-border flex flex-col items-center justify-center text-[7px] font-black tracking-tighter shadow-inner group-hover:border-app-primary/20 transition-colors">
                                    <File size={20} className="text-app-primary/40 mb-1" />
                                    {getFileIcon(attachment.file_type)}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-black text-app-text uppercase tracking-tight truncate max-w-[150px] italic" title={attachment.file_name}>
                                        {attachment.file_name}
                                    </div>
                                    <div className="text-[9px] text-app-text-muted mt-1 font-black uppercase tracking-[0.2em] opacity-40">
                                        {formatSize(attachment.file_size)} // {new Date(attachment.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                <a
                                    href={`${apiClient.baseURL}/tickets/attachments/${attachment.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3 text-app-text-muted hover:text-app-primary hover:bg-app-primary/10 transition-all"
                                    title="Download"
                                >
                                    <Download size={18} />
                                </a>
                                {(currentUser?.role !== 'END_USER' || attachment.uploader_id === currentUser?.id) && (
                                    <button
                                        onClick={() => handleDelete(attachment.id)}
                                        className="p-3 text-app-text-muted hover:text-app-rose hover:bg-app-rose/10 transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : !loading && (
                    <div className="col-span-full py-16 text-center text-app-text-muted border border-dashed border-app-border rounded-none bg-app-void/40">
                        <Paperclip size={32} className="mx-auto mb-4 opacity-10" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 italic">No File Packets Detected</p>
                    </div>
                )}
                
                {loading && (
                    <div className="col-span-full py-12 text-center text-app-text-muted">
                        <Clock size={24} className="animate-spin mx-auto mb-3" />
                        <p className="text-sm italic">Scanning repository...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
