import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import { Save, Eye, Send, Globe, Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Undo, Redo, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const contentTypeLabels = {
    BREED_INFO: 'Giống chó',
    TRAINING_GUIDE: 'Huấn luyện',
    HEALTH_INFO: 'Sức khỏe',
    NUTRITION_GUIDE: 'Dinh dưỡng',
    FIRST_AID: 'Sơ cứu',
};

const categories = {
    BREED_INFO: ['Chăm sóc', 'Giới thiệu', 'Dinh dưỡng'],
    TRAINING_GUIDE: ['Cơ bản', 'Nâng cao', 'Tác chiến'],
    HEALTH_INFO: ['Truyền nhiễm', 'Mãn tính', 'Sơ cứu'],
    NUTRITION_GUIDE: ['Khẩu phần', 'Dinh dưỡng', 'Thực phẩm'],
    FIRST_AID: ['Ngộ độc', 'Chấn thương', 'Say nắng'],
};

const ContentCreatePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [contentType, setContentType] = useState('');
    const [category, setCategory] = useState('');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [tags, setTags] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async (status) => {
        if (!title || !contentType) {
            alert('Vui lòng nhập tiêu đề và chọn loại nội dung');
            return;
        }
        setSaving(true);
        try {
            await api.post('/contents', {
                title,
                contentType,
                body,
                tags,
                status,
            });
            navigate('/content');
        } catch (err) {
            console.error('Save error:', err);
            alert('Lỗi khi lưu nội dung');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Tạo nội dung mới"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Nội dung', href: '/content' },
                    { label: 'Tạo mới' },
                ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <div className="bg-card rounded-xl border border-border/60 p-6 space-y-5">
                            {/* Type + Category */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Loại nội dung *</label>
                                    <select
                                        value={contentType}
                                        onChange={(e) => { setContentType(e.target.value); setCategory(''); }}
                                        className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-card outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors cursor-pointer text-foreground"
                                    >
                                        <option value="">Chọn loại</option>
                                        {Object.entries(contentTypeLabels).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Danh mục</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-card outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors cursor-pointer text-foreground"
                                        disabled={!contentType}
                                    >
                                        <option value="">Chọn danh mục</option>
                                        {(categories[contentType] || []).map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Title */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Tiêu đề *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Nhập tiêu đề nội dung"
                                    maxLength={200}
                                    className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-card outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors text-foreground"
                                />
                                <p className="text-xs text-muted-foreground text-right">{title.length}/200</p>
                            </div>

                            {/* Rich Text Editor Area */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Nội dung chính</label>
                                <div className="border border-border rounded-lg overflow-hidden">
                                    {/* Toolbar */}
                                    <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/30 flex-wrap">
                                        {[
                                            { icon: Bold, title: 'Bold' },
                                            { icon: Italic, title: 'Italic' },
                                            { icon: Heading1, title: 'H1' },
                                            { icon: Heading2, title: 'H2' },
                                            { icon: Heading3, title: 'H3' },
                                            { icon: List, title: 'Bullet List' },
                                            { icon: ListOrdered, title: 'Numbered List' },
                                            { icon: Quote, title: 'Quote' },
                                        ].map((tool, i) => (
                                            <button
                                                key={i}
                                                className="p-1.5 rounded hover:bg-muted transition-colors"
                                                title={tool.title}
                                                type="button"
                                            >
                                                <tool.icon className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                        ))}
                                        <div className="w-px h-5 bg-border mx-1" />
                                        <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Undo" type="button">
                                            <Undo className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                        <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Redo" type="button">
                                            <Redo className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                    </div>
                                    {/* Editor area */}
                                    <textarea
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        placeholder="Nhập nội dung bài viết..."
                                        rows={10}
                                        className="w-full px-4 py-3 text-sm bg-card outline-none resize-none text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Tags</label>
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder="Nhập tags, phân cách bằng dấu phẩy"
                                    className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-card outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors text-foreground"
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Media Upload */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
                        <div className="bg-card rounded-xl border border-border/60 p-6">
                            <label className="text-sm font-medium text-foreground block mb-3">Media</label>
                            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm text-foreground font-medium">Kéo thả file vào đây hoặc nhấp để chọn</p>
                                <p className="text-xs text-accent mt-1">Hỗ trợ ảnh và video. Tối đa 10 file.</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Sidebar actions */}
                <div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
                        <div className="bg-card rounded-xl border border-border/60 p-6 space-y-3">
                            <h3 className="font-semibold text-sm text-foreground">Hành động</h3>
                            <button
                                onClick={() => handleSave('DRAFT')}
                                disabled={saving}
                                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors text-foreground cursor-pointer bg-card disabled:opacity-50"
                            >
                                <Save className="h-4 w-4" /> Lưu nháp
                            </button>
                            <button
                                type="button"
                                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors text-foreground cursor-pointer bg-card"
                            >
                                <Eye className="h-4 w-4" /> Xem trước
                            </button>
                            <button
                                onClick={() => handleSave('PENDING')}
                                disabled={saving}
                                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                            >
                                <Send className="h-4 w-4" /> Gửi duyệt
                            </button>
                            <button
                                onClick={() => handleSave('PUBLISHED')}
                                disabled={saving}
                                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 disabled:opacity-50"
                            >
                                <Globe className="h-4 w-4" /> Xuất bản
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default ContentCreatePage;
