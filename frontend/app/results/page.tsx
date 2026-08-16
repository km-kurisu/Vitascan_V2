'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  Utensils,
  Pill,
  Activity,
  Sun,
  Lightbulb,
  Ban,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
} from 'lucide-react';
import { fetchResults, ModCFrontendOutput, DeficiencyItem } from '@/lib/api';
import { saveScanToSupabase } from '@/lib/supabase';

export default function ResultsPage() {
  const [data, setData] = useState<ModCFrontendOutput | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    b12: true,
    vitamin_d: true,
    iron: true,
  });

  useEffect(() => {
    fetchResults().then((res) => {
      setData(res);
      if (res && res.patient?.patient_id) {
        saveScanToSupabase({
          scan_id: `SCAN-${Date.now()}`,
          patient_id: res.patient.patient_id,
          overall_risk_band: res.summary?.overall_risk_band || 'moderate',
          flagged_count: res.summary?.flagged_deficiency_count || 0,
          mod_c_output: res,
          deficiencies: res.deficiencies,
        }).catch((e) => console.warn('Scan auto-save to Supabase failed:', e));
      }
    });
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Activity className="w-10 h-10 text-[#1D61E7] animate-spin" />
        <p className="text-slate-600 font-semibold text-[#1D61E7]">
          Evaluating GAT Models & Formulating Recommendations...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 py-4 max-w-6xl mx-auto">
      {/* Top Hero Status Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="relative">
            <div className="w-16 h-16 bg-purple-100 text-[#7C3AED] rounded-2xl flex items-center justify-center shadow-xs">
              <ClipboardCheck className="w-9 h-9" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs border-2 border-white">
              ✓
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Your Blood Report Analysis is Ready!
            </h1>
            <p className="text-slate-500 font-medium text-sm">
              Here are your results and health insights.
            </p>
          </div>
        </div>

        {/* Uploaded Report Meta Box */}
        <div className="bg-slate-50/80 border border-slate-200/80 p-4 rounded-2xl flex items-center space-x-4 min-w-[260px]">
          <div className="w-10 h-10 bg-purple-100/80 text-[#7C3AED] rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Uploaded Report
            </p>
            <p className="text-xs font-semibold text-slate-600 font-mono">
              {data.uploaded_report?.filename || 'CBC_Blood_Report.pdf'}
            </p>
            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{data.uploaded_report?.uploaded_at || 'Recently processed'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Detected Deficiencies and Severity */}
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Detected Deficiencies and Severity
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.deficiencies.map((item) => {
            const isSevere = item.severity.band === 'Severe';
            const isModerate = item.severity.band === 'Moderate';
            const isMild = item.severity.band === 'Mild';

            return (
              <div
                key={item.id}
                className={`bg-white p-6 rounded-2xl border shadow-xs space-y-4 relative overflow-hidden transition-all ${
                  isSevere
                    ? 'border-red-200 hover:border-red-300'
                    : isModerate
                    ? 'border-orange-200 hover:border-orange-300'
                    : 'border-amber-200 hover:border-amber-300'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3
                      className={`text-lg font-bold ${
                        isSevere
                          ? 'text-red-600'
                          : isModerate
                          ? 'text-orange-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {item.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500">Deficient</p>
                  </div>

                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-full ${
                      isSevere
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : isModerate
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {item.severity.band}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSevere
                          ? 'bg-red-500'
                          : isModerate
                          ? 'bg-orange-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: item.severity.score_pct }}
                    />
                  </div>
                </div>

                {/* Link to detail GAT reasoning */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  <Link
                    href={`/results/${item.id}`}
                    className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 group"
                  >
                    <span>View GAT Reasoning</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Key Blood Parameters Table */}
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Key Blood Parameters
        </h2>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-xs uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-4">
                    Parameter
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Your Value
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Normal Range
                  </th>
                  <th scope="col" className="px-6 py-4 text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {(data.blood_parameters || []).map((param, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {param.name}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 font-mono">
                      {param.value}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono">
                      {param.normal_range}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                          param.status === 'Low'
                            ? 'bg-red-100 text-red-600 border border-red-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {param.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 3: Detailed Recommendations */}
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Detailed Recommendations
        </h2>

        <div className="space-y-4">
          {/* Recommendation 1: Vitamin B12 */}
          {data.deficiencies.map((item) => {
            const cardKey = item.id || item.type;
            const isB12 = cardKey === 'b12';
            const isVitD = cardKey === 'vitamin_d';
            const isIron = cardKey === 'iron';
            const isExpanded = expandedCards[cardKey] ?? true;

            return (
              <div
                key={cardKey}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all"
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleExpand(cardKey)}
                  className="p-6 cursor-pointer flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shadow-xs ${
                        isB12
                          ? 'bg-red-100 text-red-600'
                          : isVitD
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {isB12 ? (
                        <span className="font-extrabold text-sm">B12</span>
                      ) : isVitD ? (
                        <Sun className="w-6 h-6" />
                      ) : (
                        <span className="font-extrabold text-sm">Fe</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {item.title} ({item.severity.band} Deficiency)
                      </h3>
                      <p className="text-xs text-slate-500 max-w-xl line-clamp-1">
                        {item.explanation}
                      </p>
                    </div>
                  </div>

                  <button className="text-slate-400 hover:text-slate-600">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Expanded Grid details matching design layout */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-[#FAFCFF] grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
                    {/* Column 1: Explanation */}
                    <div className="space-y-2 md:col-span-1 border-r border-slate-100 pr-4">
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {item.explanation}
                      </p>
                    </div>

                    {/* Column 2: Foods */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 font-bold text-slate-800">
                        <Utensils className="w-4 h-4 text-amber-600" />
                        <span>Foods</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-medium">
                        {item.recommendations?.foods || item.diet_recommendations[0]?.suggestion || 'Increase consumption of nutrient-dense foods.'}
                      </p>
                    </div>

                    {/* Column 3: Supplements / Sunlight / Tips */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 font-bold text-slate-800">
                        {isVitD ? (
                          <>
                            <Sun className="w-4 h-4 text-amber-500" />
                            <span>Sunlight</span>
                          </>
                        ) : isIron ? (
                          <>
                            <Lightbulb className="w-4 h-4 text-yellow-600" />
                            <span>Tips</span>
                          </>
                        ) : (
                          <>
                            <Pill className="w-4 h-4 text-red-500" />
                            <span>Supplements</span>
                          </>
                        )}
                      </div>
                      <p className="text-slate-600 leading-relaxed font-medium">
                        {isVitD
                          ? item.recommendations?.sunlight || 'Get 15-20 mins daily sunlight.'
                          : isIron
                          ? item.recommendations?.tips || item.diet_recommendations[1]?.suggestion || 'Pair with Vitamin C.'
                          : item.recommendations?.supplements || item.diet_recommendations[1]?.suggestion || 'Consider oral supplementation if recommended.'}
                      </p>
                    </div>

                    {/* Column 4: Lifestyle / Supplements / Avoid */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 font-bold text-slate-800">
                        {isB12 ? (
                          <>
                            <Activity className="w-4 h-4 text-blue-600" />
                            <span>Lifestyle</span>
                          </>
                        ) : isVitD ? (
                          <>
                            <Pill className="w-4 h-4 text-[#7C3AED]" />
                            <span>Supplements</span>
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4 text-red-500" />
                            <span>Avoid</span>
                          </>
                        )}
                      </div>
                      <p className="text-slate-600 leading-relaxed font-medium">
                        {isB12
                          ? item.recommendations?.lifestyle || 'Maintain balanced diet.'
                          : isVitD
                          ? item.recommendations?.supplements || 'Vitamin D3 2000 IU daily.'
                          : item.recommendations?.avoid || item.diet_recommendations[2]?.suggestion || 'Avoid tea/coffee immediately after meals.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: Bottom Recheck Banner Callout */}
      <div className="bg-[#EFF6FF] border border-blue-200/80 p-6 sm:p-8 rounded-3xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-14 h-14 bg-white text-[#1D61E7] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900">
              Recheck in 8–10 weeks
            </h3>
            <p className="text-sm text-slate-600 font-medium">
              to track improvement and make necessary adjustments.
            </p>
          </div>
        </div>

        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#1D61E7] shadow-sm">
            <Info className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
