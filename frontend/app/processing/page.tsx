'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, CheckCircle2, Clock, ArrowRight, Brain, FileText, Camera } from 'lucide-react';

export default function ProcessingPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => router.push('/results'), 500);
          return 100;
        }
        return prev + 25;
      });
    }, 400);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-4 bg-blue-100 text-[#1D61E7] rounded-3xl animate-pulse shadow-xs">
          <Activity className="w-9 h-9" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Processing Multi-Modal Pipeline
        </h1>
        <p className="text-slate-500 font-medium text-sm">
          Patient ID: <span className="font-mono font-bold text-slate-800">PAT-2026-8841</span>
        </p>
      </div>

      {/* Progress Cards */}
      <div className="space-y-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Path B: Blood Report Pipeline (GAT Joint Reasoning)</span>
          </div>

          <div className="space-y-3">
            <ModuleRow label="Mod B1: Text Extraction (PyMuPDF / OCR)" done={progress >= 25} />
            <ModuleRow label="Mod B2: Biomarker Normalization & Reference Calibration" done={progress >= 50} />
            <ModuleRow label="Mod B3: Biomarker Graph Builder & GAT Severity Grader" done={progress >= 75} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold">
            <Camera className="w-5 h-5 text-purple-600" />
            <span>Path A: Symptom Photo CNN Cross-check</span>
          </div>

          <div className="space-y-3">
            <ModuleRow label="Mod A1 & A2: CNN Symptom Manifestation Inference" done={progress >= 75} />
            <ModuleRow label="Mod A3: Anemia / Iron Cross-check Alignment Signal" done={progress >= 100} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold">
            <Brain className="w-5 h-5 text-emerald-600" />
            <span>Mod C: LLM Explanation & FSSAI Diet Check</span>
          </div>

          <div className="space-y-3">
            <ModuleRow label="LLM Explanation Synthesis & FSSAI Guideline Verification" done={progress >= 100} />
          </div>
        </div>
      </div>

      <div className="pt-4 text-center">
        <button
          onClick={() => router.push('/results')}
          className="px-8 py-3.5 bg-[#1D61E7] hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all inline-flex items-center space-x-2 text-sm"
        >
          <span>View Generated Dashboard Results</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ModuleRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs font-medium">
      <span className="text-slate-700">{label}</span>
      {done ? (
        <div className="flex items-center space-x-1.5 text-emerald-600 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Completed</span>
        </div>
      ) : (
        <div className="flex items-center space-x-1.5 text-slate-400 font-semibold">
          <Clock className="w-4 h-4 animate-spin text-slate-400" />
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}
