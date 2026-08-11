'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ShieldAlert, CheckCircle2, ChevronRight, AlertTriangle, Eye, Sparkles, FileText } from 'lucide-react';
import { fetchResults, ModCFrontendOutput } from '@/lib/api';

export default function ResultsPage() {
  const [data, setData] = useState<ModCFrontendOutput | null>(null);

  useEffect(() => {
    fetchResults().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="text-center py-20">
        <Activity className="w-10 h-10 text-teal-600 animate-spin mx-auto" />
        <p className="mt-4 text-slate-600 font-medium">Loading VitaScan Results...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-2">
      {/* Header Summary Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold px-2.5 py-1 bg-teal-500/20 text-teal-300 rounded-full border border-teal-500/30">
              GAT Output Schema v{data.schema_version}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Patient ID: {data.patient.patient_id} ({data.patient.age} y/o {data.patient.gender})
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight">
            Nutritional Severity Dashboard
          </h1>

          <p className="text-sm text-slate-400">
            Generated at {new Date(data.generated_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center space-x-4 bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
          <div className="text-center px-2">
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Flagged</div>
            <div className="text-2xl font-black text-amber-400">{data.summary.flagged_deficiency_count}</div>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="text-center px-2">
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Risk Level</div>
            <div className="text-xl font-bold uppercase text-amber-400 tracking-wide">
              {data.summary.overall_risk_band}
            </div>
          </div>
        </div>
      </div>

      {/* Deficiency Cards Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          <span>Evaluated Deficiency Severity Profiles</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.deficiencies.map((item) => (
            <Link
              key={item.type}
              href={`/results/${item.type}`}
              className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-teal-500 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900 capitalize flex items-center space-x-2">
                    <span>{item.type} Deficiency</span>
                  </h3>
                  <span
                    className="px-3 py-1 text-xs font-bold uppercase rounded-full text-white shadow-sm"
                    style={{ backgroundColor: item.severity.badge_color }}
                  >
                    {item.severity.band} ({item.severity.score_pct})
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {item.explanation}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                {/* Crosscheck badge */}
                <div className="flex items-center justify-between text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Eye className="w-3.5 h-3.5 text-teal-600" />
                    <span>Path A Cross-check:</span>
                  </span>
                  <span className="font-semibold text-slate-800">
                    {item.crosscheck.available
                      ? item.crosscheck.source
                      : 'N/A'}
                  </span>
                </div>

                {/* Key Contributors count */}
                <div className="flex items-center justify-between text-slate-500">
                  <span>GAT Key Contributors:</span>
                  <span className="font-semibold text-slate-800">
                    {item.key_contributors.length} Biomarkers
                  </span>
                </div>

                <div className="pt-2 text-teal-600 font-bold group-hover:translate-x-1 transition-transform flex items-center justify-end space-x-1">
                  <span>View Detailed Reasoning</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
