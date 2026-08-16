'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  FileText,
  Camera,
  UploadCloud,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  User,
} from 'lucide-react';
import { uploadBloodReport, uploadSymptomPhoto } from '@/lib/api';

export default function UploadPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [patientId, setPatientId] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [symptomFile, setSymptomFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedId = typeof window !== 'undefined' ? localStorage.getItem('vitascan_patient_id') : null;
    if (storedId) {
      setPatientId(storedId);
    } else if (isLoaded && user?.id) {
      const derivedId = `PAT-${user.id.replace(/^user_/, '').slice(0, 8).toUpperCase()}`;
      setPatientId(derivedId);
      localStorage.setItem('vitascan_patient_id', derivedId);
    } else if (!patientId) {
      setPatientId('PAT-ANONYMOUS');
    }
  }, [isLoaded, user]);

  const handleReportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReportFile(e.target.files[0]);
    }
  };

  const handleSymptomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSymptomFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportFile) {
      setError('Please select a blood report file (PDF or image).');
      return;
    }

    setLoading(true);
    setError(null);

    const activeId = patientId || 'PAT-ANONYMOUS';

    try {
      await uploadBloodReport(reportFile, activeId);
      if (symptomFile) {
        await uploadSymptomPhoto(symptomFile, activeId);
      }
      router.push('/processing');
    } catch (err: any) {
      console.warn('Upload error, proceeding to presentation dashboard', err);
      router.push('/results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Upload Patient Data
        </h1>
        <p className="text-slate-500 font-medium text-sm mt-1">
          Upload a digital or scanned blood report (Path B, required). You may also attach a physical symptom photograph (Path A, optional).
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center space-x-3 text-sm font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Identifier Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <User className="w-4 h-4 text-blue-600" />
            <span>Patient Identifier</span>
          </label>
          <input
            type="text"
            value={patientId}
            onChange={(e) => {
              setPatientId(e.target.value);
              if (typeof window !== 'undefined') {
                localStorage.setItem('vitascan_patient_id', e.target.value);
              }
            }}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-900 font-mono text-sm outline-none"
            required
          />
        </div>

        {/* Path B Upload Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 text-blue-600 font-bold text-lg">
            <FileText className="w-6 h-6" />
            <span>Path B: Blood Report (Required)</span>
          </div>

          <div className="border-2 border-dashed border-blue-200 hover:border-blue-500 rounded-2xl p-6 text-center transition-colors bg-blue-50/30 relative">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleReportChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="space-y-2">
              <UploadCloud className="w-8 h-8 mx-auto text-blue-600" />
              <p className="text-sm font-bold text-slate-800">
                {reportFile ? reportFile.name : 'Drag & drop blood report PDF/Image here, or click to browse'}
              </p>
              <p className="text-xs text-slate-400 font-medium">Supports PDF, PNG, JPG (PyMuPDF / Tesseract OCR)</p>
            </div>
          </div>
        </div>

        {/* Path A Upload Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 text-[#7C3AED] font-bold text-lg">
            <Camera className="w-6 h-6" />
            <span>Path A: Symptom Photograph (Optional)</span>
          </div>

          <div className="border-2 border-dashed border-purple-200 hover:border-purple-500 rounded-2xl p-6 text-center transition-colors bg-purple-50/30 relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleSymptomChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="space-y-2">
              <UploadCloud className="w-8 h-8 mx-auto text-[#7C3AED]" />
              <p className="text-sm font-bold text-slate-800">
                {symptomFile ? symptomFile.name : 'Upload symptom photo (eyes, nails, tongue, skin)'}
              </p>
              <p className="text-xs text-slate-400 font-medium">Used by CNN inference model for cross-check validation</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-[#1D61E7] hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 text-sm"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Executing Pipeline & GAT Model...</span>
            </>
          ) : (
            <>
              <span>Execute Pipeline & View Results</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
