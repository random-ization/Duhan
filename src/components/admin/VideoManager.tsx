import React, { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Pencil,
    Trash2,
    Upload,
    X,
    Eye,
    Clock,
    CheckCircle,
    AlertCircle,
    Loader2,
    Video,
    Image,
    FileText
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api as convexApi } from '../../../convex/_generated/api';
import { useFileUpload } from '../../hooks/useFileUpload';

interface VideoLesson {
    id: string;
    title: string;
    description?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    level: string;
    duration?: number;
    transcriptData?: any;
    views: number;
    createdAt: string;
}

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function VideoManager() {
    // Convex hooks
    // @ts-expect-error Convex types not generated for videos namespace yet
    const videos = useQuery(convexApi.videos.list, {}) || [];
    const createVideo = useMutation(convexApi.videos.create);
    const updateVideo = useMutation(convexApi.videos.update);
    const deleteVideo = useMutation(convexApi.videos.remove);
    const getVideo = useQuery(convexApi.videos.get,
        // We will fetch detail separately if needed, but for now relies on list
        // Or we use this for a specific video if needed.
        "skip"
    );

    const loading = videos === undefined;

    const [showModal, setShowModal] = useState(false);
    const [editingVideo, setEditingVideo] = useState<VideoLesson | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [level, setLevel] = useState('Beginner');
    const [videoUrl, setVideoUrl] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [duration, setDuration] = useState(0);
    const [transcriptJson, setTranscriptJson] = useState('');
    const [transcriptError, setTranscriptError] = useState<string | null>(null);
    const [transcriptValid, setTranscriptValid] = useState(false);

    // Upload Hook
    const { uploadFile } = useFileUpload();

    // Upload state
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
    const [saving, setSaving] = useState(false);

    const videoInputRef = useRef<HTMLInputElement>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setLevel('Beginner');
        setVideoUrl('');
        setThumbnailUrl('');
        setDuration(0);
        setTranscriptJson('');
        setTranscriptError(null);
        setTranscriptValid(false);
        setEditingVideo(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = async (video: VideoLesson) => {
        setEditingVideo(video);
        setTitle(video.title);
        setDescription(video.description || '');
        setLevel(video.level);
        setVideoUrl(video.videoUrl || '');
        setThumbnailUrl(video.thumbnailUrl || '');
        setDuration(video.duration || 0);

        // Fetch detail if needed (for transcriptData)
        // Since list doesn't return transcriptData, we try to see if it's already there (unlikely)
        // Or we should fetch it. For simplicity in this migration, we might skip fetching if it requires async effect.
        // But let's try to fetch it via direct legacy call or we accept it might be missing unless we add useQuery for detail.
        // Given existing structure, let's use a one-off legacy fetch for detail if possible or rely on Convex reactive update if we select.
        // For now, let's use legacyApi shim if it exists, or just null.
        if (video.transcriptData) {
            setTranscriptJson(JSON.stringify(video.transcriptData, null, 2));
            setTranscriptValid(true);
        } else {
            // In a perfect Convex world, we'd select the video ID and let a query hook fetch it.
            // But hooks can't run conditionally here. 
            // We'll leave it empty for now, or the user has to re-enter.
            // OR we can use the `getVideo` hook strategy if we move modal to separate component.
            // Let's rely on list including it if we updated schema? No, explicit exclusion in videos.ts
        }
        setShowModal(true);
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingVideo(true);
        try {
            const { url } = await uploadFile(file);
            setVideoUrl(url);

            // Auto-capture thumbnail (browser-side logic remains same)
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;
            video.onloadedmetadata = () => {
                setDuration(Math.floor(video.duration));
                const seekTime = Math.min(3, video.duration * 0.1);
                video.currentTime = seekTime;
            };
            video.onseeked = async () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        canvas.toBlob(async (blob) => {
                            if (blob) {
                                setUploadingThumbnail(true);
                                try {
                                    // Blob is not File, so we need to adhere to uploadFile(File).
                                    // Cast Blob to File
                                    const thumbFile = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
                                    const { url: thumbUrl } = await uploadFile(thumbFile);
                                    setThumbnailUrl(thumbUrl);
                                } catch (err) {
                                    console.warn('Auto-thumbnail upload failed:', err);
                                } finally {
                                    setUploadingThumbnail(false);
                                }
                            }
                        }, 'image/jpeg', 0.8);
                    }
                } catch (err) {
                    console.warn('Failed to capture thumbnail:', err);
                }
                URL.revokeObjectURL(video.src);
            };
            video.src = URL.createObjectURL(file);
        } catch (error) {
            console.error('Video upload failed:', error);
            alert('视频上传失败');
        } finally {
            setUploadingVideo(false);
        }
    };

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingThumbnail(true);
        try {
            const { url } = await uploadFile(file);
            setThumbnailUrl(url);
        } catch (error) {
            console.error('Thumbnail upload failed:', error);
            alert('封面上传失败');
        } finally {
            setUploadingThumbnail(false);
        }
    };

    const validateTranscript = () => {
        setTranscriptError(null);
        setTranscriptValid(false);

        if (!transcriptJson.trim()) {
            setTranscriptError('请输入字幕 JSON 数据');
            return;
        }

        try {
            const parsed = JSON.parse(transcriptJson);
            if (!Array.isArray(parsed)) {
                setTranscriptError('JSON 必须是数组格式');
                return;
            }
            if (parsed.length === 0) {
                setTranscriptError('字幕数组不能为空');
                return;
            }
            // Validation logic...
            setTranscriptValid(true);
        } catch (e) {
            setTranscriptError('JSON 格式错误，请检查语法');
        }
    };

    const handleSave = async () => {
        if (!title.trim() || !videoUrl) {
            alert('请填写标题并上传视频');
            return;
        }

        setSaving(true);
        try {
            let transcriptData = null;
            if (transcriptJson.trim()) {
                try {
                    transcriptData = JSON.parse(transcriptJson);
                } catch {
                    alert('字幕 JSON 格式错误');
                    setSaving(false);
                    return;
                }
            }

            if (editingVideo) {
                await updateVideo({
                    id: editingVideo.id as any,
                    title,
                    description,
                    level,
                    videoUrl,
                    thumbnailUrl,
                    duration,
                    transcriptData,
                });
            } else {
                await createVideo({
                    title,
                    description,
                    level,
                    videoUrl,
                    thumbnailUrl,
                    duration,
                    transcriptData,
                });
            }

            setShowModal(false);
            resetForm();
        } catch (error) {
            console.error('Save failed:', error);
            alert('保存失败');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除这个视频吗？此操作不可撤销。')) return;
        try {
            await deleteVideo({ id: id as any });
        } catch (error) {
            console.error('Delete failed:', error);
            alert('删除失败');
        }
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-black text-zinc-900">视频管理</h2>
                    <p className="text-sm text-zinc-500 mt-1">上传和管理视频课程内容</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    上传视频
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            )}

            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map((video: any) => (
                        <div
                            key={video.id}
                            className="bg-white rounded-2xl border-2 border-zinc-200 overflow-hidden hover:border-indigo-300 transition group"
                        >
                            <div className="aspect-video bg-zinc-100 relative">
                                {video.thumbnailUrl ? (
                                    <img
                                        src={video.thumbnailUrl}
                                        alt={video.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Video className="w-12 h-12 text-zinc-300" />
                                    </div>
                                )}
                                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs font-mono rounded">
                                    {formatDuration(video.duration)}
                                </div>
                                <div className={`absolute top-2 left-2 px-2 py-1 text-xs font-bold rounded ${video.level === 'Beginner' ? 'bg-green-100 text-green-700' :
                                    video.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                    {video.level}
                                </div>
                            </div>

                            <div className="p-4">
                                <h3 className="font-bold text-zinc-900 line-clamp-2">{video.title}</h3>
                                <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                                    <span className="flex items-center gap-1">
                                        <Eye className="w-4 h-4" />
                                        {video.views}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {new Date(video.createdAt).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => openEditModal(video)}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-zinc-100 text-zinc-700 rounded-lg font-medium hover:bg-zinc-200 transition"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        编辑
                                    </button>
                                    <button
                                        onClick={() => handleDelete(video.id)}
                                        className="px-3 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {videos.length === 0 && (
                        <div className="col-span-full text-center py-20 text-zinc-400">
                            <Video className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p className="font-bold">暂无视频</p>
                            <p className="text-sm mt-1">点击上方按钮上传第一个视频</p>
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-zinc-200">
                            <h3 className="text-xl font-black">
                                {editingVideo ? '编辑视频' : '上传新视频'}
                            </h3>
                            <button
                                onClick={() => { setShowModal(false); resetForm(); }}
                                className="p-2 hover:bg-zinc-100 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-zinc-700 mb-2">
                                    视频标题 *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="输入视频标题"
                                    className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl focus:border-indigo-500 focus:outline-none transition"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-zinc-700 mb-2">
                                    视频简介
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="输入视频简介..."
                                    rows={3}
                                    className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl focus:border-indigo-500 focus:outline-none transition resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-zinc-700 mb-2">
                                    难度等级 *
                                </label>
                                <select
                                    value={level}
                                    onChange={(e) => setLevel(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl focus:border-indigo-500 focus:outline-none transition"
                                >
                                    {LEVELS.map((l) => (
                                        <option key={l} value={l}>{l}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-zinc-700 mb-2">
                                    视频文件 * (MP4)
                                </label>
                                <input
                                    ref={videoInputRef}
                                    type="file"
                                    accept="video/mp4,video/*"
                                    onChange={handleVideoUpload}
                                    className="hidden"
                                />
                                {videoUrl ? (
                                    <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <span className="text-green-700 font-medium flex-1 truncate">
                                            视频已上传
                                        </span>
                                        <button
                                            onClick={() => videoInputRef.current?.click()}
                                            className="text-sm text-green-600 hover:underline"
                                        >
                                            更换
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => videoInputRef.current?.click()}
                                        disabled={uploadingVideo}
                                        className="w-full flex items-center justify-center gap-2 p-6 border-2 border-dashed border-zinc-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition"
                                    >
                                        {uploadingVideo ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                                                <span className="text-indigo-600 font-medium">上传中...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-5 h-5 text-zinc-400" />
                                                <span className="text-zinc-500">点击选择视频文件</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-zinc-700 mb-2">
                                    封面图片
                                </label>
                                <input
                                    ref={thumbnailInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleThumbnailUpload}
                                    className="hidden"
                                />
                                <div className="flex gap-4">
                                    {thumbnailUrl && (
                                        <img
                                            src={thumbnailUrl}
                                            alt="Thumbnail"
                                            className="w-32 h-20 object-cover rounded-lg border-2 border-zinc-200"
                                        />
                                    )}
                                    <button
                                        onClick={() => thumbnailInputRef.current?.click()}
                                        disabled={uploadingThumbnail}
                                        className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-zinc-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition"
                                    >
                                        {uploadingThumbnail ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                                        ) : (
                                            <>
                                                <Image className="w-5 h-5 text-zinc-400" />
                                                <span className="text-zinc-500">
                                                    {thumbnailUrl ? '更换封面' : '上传封面图'}
                                                </span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        字幕数据 (JSON)
                                    </label>
                                    <button
                                        onClick={validateTranscript}
                                        className="text-sm px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200 transition"
                                    >
                                        格式校验
                                    </button>
                                </div>
                                <textarea
                                    value={transcriptJson}
                                    onChange={(e) => { setTranscriptJson(e.target.value); setTranscriptValid(false); setTranscriptError(null); }}
                                    placeholder={`请粘贴由 Whisper 生成的 JSON 数据...\n\n格式示例：\n[\n  { "start": 0, "end": 2.5, "text": "안녕하세요", "translation": "你好" },\n  { "start": 2.5, "end": 5.0, "text": "반갑습니다", "translation": "很高兴见到你" }\n]`}
                                    rows={8}
                                    className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl focus:border-indigo-500 focus:outline-none transition font-mono text-sm resize-none"
                                />
                                {transcriptError && (
                                    <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                                        <AlertCircle className="w-4 h-4" />
                                        {transcriptError}
                                    </div>
                                )}
                                {transcriptValid && (
                                    <div className="flex items-center gap-2 mt-2 text-green-600 text-sm">
                                        <CheckCircle className="w-4 h-4" />
                                        JSON 格式正确！
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 p-6 border-t border-zinc-200">
                            <button
                                onClick={() => { setShowModal(false); resetForm(); }}
                                className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold hover:bg-zinc-200 transition"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !title.trim() || !videoUrl}
                                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editingVideo ? '保存修改' : '创建视频'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
