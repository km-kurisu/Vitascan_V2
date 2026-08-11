'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, CheckCircle2, Clock, ArrowRight, BrainCircuit, FileText, Camera } from 'lucide-react';
import { fetchPipelineStatus, PipelineStatus } from '@/lib/api';

export default function ProcessingPage() {
  const router = useRouter();
  const [statusData, setStatusData] = useState<PipelineStatus | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await fetchPipelineStatus();
      setStatusData(data);

      if (data.status === 'completed') {
        clearInterval(interval);
        setTimeout(() => router.push('/results'), 800);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 bg-teal-100 text-teal-700 rounded-2xl animate-pulse">
          <Activity className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Processing Multi-Modal Pipeline</h1>
        <p className="text-slate-600 text-sm">
          Patient ID: <span className="font-mono font-bold">{statusData?.patient_id || 'PAT-2026-8841'}</span>
        </p>
      </div>

      {/* Progress Cards */}
      <div className="space-y-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold">
            <FileText className="w-5 h-5 text-teal-600" />
            <span>Path B: Blood Report Pipeline (GAT Joint Reasoning)</span>
          </div>

          <div className="space-y-3">
            <ModuleRow label="Mod B1: Text Extraction (PyMuPDF / OCR)" status="completed" />
            <ModuleRow label="Mod B2: Biomarker Normalization & Reference Calibration" status="completed" />
            <ModuleRow label="Mod B3: Biomarker Graph Builder & GAT Severity Grader" status="completed" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold">
            <Camera className="w-5 h-5 text-emerald-600" />
            <span>Path A: Symptom Photo CNN Cross-check</span>
          </div>

          <div className="space-y-3">
            <ModuleRow label="Mod A1 & A2: CNN Symptom Manifestation Inference" status="completed" />
            <ModuleRow label="Mod A3: Anemia / Iron Cross-check Alignment Signal" status="completed" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold">
            <BrainCircuit className="w-5 h-5 text-indigo-600" />
            <span>Mod C: LLM Explanation & FSSAI Diet Check</span>
          </div>

          <div className="space-y-3">
            <ModuleRow label="LLM Explanation Synthesis & FSSAI Guideline Verification" status="completed" />
          </div>
        </div>
      </div>

      <div className="pt-4 text-center">
        <button
          onClick={() => router.push('/results')}
          className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition-all inline-flex items-center space-x-2"
        >
          <span>View Generated Dashboard Results</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ModuleRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <div className="flex items-center space-x-2 text-teal-600 font-semibold">
        <CheckCircle2 className="w-4 h-4 text-teal-500" />
        <span className="capitalize">Completed</span>
      </div>
    </div>
  );
}
