import React, { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import TopikModule from '../components/topik';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Target, Clock, Users, ArrowRight, Archive } from 'lucide-react';
import { clsx } from 'clsx';
import BackButton from '../components/ui/BackButton';

interface TopikPageProps {
  canAccessContent: (content: any) => boolean;
  onShowUpgradePrompt: () => void;
}

const TopikPage: React.FC<TopikPageProps> = ({ canAccessContent, onShowUpgradePrompt }) => {
  const { user, language, saveExamAttempt, saveAnnotation, deleteExamAttempt } = useAuth();
  const { topikExams } = useData();
  const navigate = useNavigate();
  // We can't use useParams readily because existing routing might not rely on it
  // But usually /topik/:examId implies params. 
  // Let's assume if there is an examId passed via some mechanism or we add local state management
  // Actually, usually TopikModule handles the selection.
  // But for this Lobby, we want to SHOW the lobby if no exam is active.
  // Since we don't have deeply nested routes setup in this file, let's assume this page REPLACES the default view.
  // If the user selects an exam, we probably navigate to `/topik/:id`.
  // Current app likely uses TopikModule to list exams?
  // Let's check: "TopikModule" takes "exams" prop. It likely has a list view.
  // BUT the user wants THIS specific design.

  // Let's just implement the UI. If the user clicks "Start", we can navigate or set state.
  // Assuming the route `/topik/:examId` exists and maps to this page, we can read it.
  const { examId } = useParams();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If examId is present, show the actual exam module (or if TopikModule handles it)
  // For now, let's assume TopikModule handles the actual taking of the exam.
  // We will wrap it.
  if (examId) {
    return (
      <TopikModule
        exams={topikExams}
        language={language}
        history={user.examHistory || []}
        onSaveHistory={saveExamAttempt}
        annotations={user.annotations || []}
        onSaveAnnotation={saveAnnotation}
        canAccessContent={canAccessContent}
        onShowUpgradePrompt={onShowUpgradePrompt}
        onDeleteHistory={deleteExamAttempt}
      />
    );
  }

  // Lobby View
  return (
    <div className="min-h-screen bg-[#F0F4F8] p-6 md:p-12 font-sans pb-32" style={{ backgroundImage: "radial-gradient(#cbd5e1 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }}>
      <div className="max-w-7xl mx-auto space-y-12">

        <div className="flex items-center gap-4 mb-4">
          <BackButton onClick={() => navigate('/dashboard')} />
          <div>
            <h2 className="text-4xl font-black font-display text-slate-900 tracking-tight">考试中心</h2>
            <p className="text-slate-500 font-bold">真题实战模拟</p>
          </div>
          <img src="/emojis/Trophy.png" className="w-14 h-14 animate-bounce-slow" alt="trophy" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Main Exam Card */}
          <div className="md:col-span-2 space-y-6">
            <h3 className="font-black text-xl flex items-center gap-2 text-slate-900"><Target size={20} /> 推荐实战</h3>

            {/* Featured Exam Card */}
            <div
              onClick={() => navigate('/topik/35')} // Example ID
              className="bg-white rounded-[2rem] p-0 border-2 border-slate-900 shadow-pop hover:-translate-y-1 transition cursor-pointer group overflow-hidden flex flex-col md:flex-row"
            >
              <div className="bg-slate-900 p-6 flex flex-col items-center justify-center text-white w-full md:w-48 shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 2px, transparent 2px, transparent 10px)" }}></div>
                <div className="text-5xl font-black text-yellow-400 font-display z-10">35</div>
                <div className="text-xs font-bold tracking-widest uppercase z-10 mt-1">TOPIK I</div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-black text-2xl text-slate-900 group-hover:text-indigo-600 transition">第 35 届 TOPIK I 实战真题</h4>
                    <span className="bg-green-100 text-green-700 text-xs font-black px-2 py-1 rounded border border-green-200">初级</span>
                  </div>
                  <p className="text-slate-500 text-sm font-bold">包含：听力 (30题) + 阅读 (40题)</p>
                  <div className="flex gap-4 mt-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                      <Clock size={14} /> 100 分钟
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                      <Users size={14} /> 1,204 人已参加
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-between items-center border-t border-slate-100 pt-4">
                  <span className="text-xs font-bold text-slate-400">上次挑战: 未开始</span>
                  <button className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg group-hover:scale-105 transition flex items-center gap-2">
                    立即开考 <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar: Archive */}
          <div className="bg-white rounded-[2rem] border-2 border-slate-900 p-6 shadow-pop h-fit">
            <div className="flex items-center gap-3 mb-6 border-b-2 border-slate-100 pb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                <Archive size={20} />
              </div>
              <h3 className="font-black text-xl text-slate-900">考试档案</h3>
            </div>
            <div className="space-y-4">
              {/* Archive Item */}
              <div className="relative bg-slate-50 p-4 rounded-xl border border-slate-200 group cursor-pointer hover:bg-white hover:border-slate-900 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-slate-900">第 34 届 TOPIK I</h5>
                    <p className="text-xs text-slate-500 font-bold mt-1">2023.10.12</p>
                  </div>
                  <span className="font-black text-lg text-slate-900">182<span className="text-xs text-slate-400">/200</span></span>
                </div>
                <div
                  className="absolute top-2 right-12 border-2 border-green-600 text-green-600 text-xs font-black px-1 py-0.5 rounded rotate-[-15deg] opacity-80"
                  style={{
                    maskImage: "url('https://s3-us-west-2.amazonaws.com/s.cdpn.io/8399/grunge.png')",
                    maskSize: "944px 604px",
                    mixBlendMode: "multiply"
                  }}
                >
                  PASS
                </div>
              </div>
            </div>
            <button className="w-full mt-6 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-500 hover:border-slate-900 hover:text-slate-900 transition">
              查看全部历史
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopikPage;

