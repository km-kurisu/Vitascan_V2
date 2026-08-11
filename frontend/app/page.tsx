import React from 'react';
import Link from 'next/link';
import { Activity, FileText, Camera, BrainCircuit, ShieldAlert, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-12 py-6">
      {/* Hero Banner */}
      <section className="text-center space-y-6 max-w-4xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-semibold border border-teal-200">
          <BrainCircuit className="w-4 h-4 text-teal-600" />
          <span>Graph Attention Network (GAT) Joint Reasoning Engine</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Precision Multi-Modal <br />
          <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Nutritional Deficiency Severity Grading
          </span>
        </h1>

        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          VitaScan combines blood report OCR biomarker normalization, Graph Attention Networks, and optional physical symptom image cross-checking to provide actionable, India-calibrated clinical severity reads.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/upload"
            className="w-full sm:w-auto px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center space-x-2 group"
          >
            <FileText className="w-5 h-5" />
            <span>Upload Blood Report</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/results"
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <Activity className="w-5 h-5 text-teal-400" />
            <span>View Demo Results</span>
          </Link>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
          <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Path B: Blood Report Pipeline</h3>
          <p className="text-sm text-slate-600">
            PDF text extraction and Tesseract OCR mapped to standard Indian reference ranges, constructing a biomarker graph for GAT joint severity evaluation.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Path A: Symptom Photo Cross-check</h3>
          <p className="text-sm text-slate-600">
            Optional physical symptom photo upload (eyes, nails, tongue, skin) evaluated by CNN to cross-validate biomarker signals.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Mod C: LLM & FSSAI Layer</h3>
          <p className="text-sm text-slate-600">
            Generates plain-English diagnostic explanations from GAT attention weights and validates dietary suggestions against FSSAI guidelines.
          </p>
        </div>
      </section>
    </div>
  );
}
