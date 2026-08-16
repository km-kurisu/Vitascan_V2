'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  User,
  Info,
  MapPin,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import {
  upsertPatientProfileToSupabase,
  fetchPatientProfileFromSupabase,
} from '@/lib/supabase';

export default function PatientDetailsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    gender: '',
    bloodGroup: '',
    phone: '',
    email: '',
    height: '',
    weight: '',
    occupation: '',
    maritalStatus: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: 'India',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.fullName || user.firstName || '',
        email: prev.email || user.primaryEmailAddress?.emailAddress || '',
      }));

      fetchPatientProfileFromSupabase(user.id).then((profile) => {
        if (profile) {
          setFormData((prev) => ({
            ...prev,
            fullName: profile.full_name || prev.fullName,
            gender: profile.gender || prev.gender,
          }));
          if (profile.patient_id) {
            localStorage.setItem('vitascan_patient_id', profile.patient_id);
          }
        }
      });
    }
  }, [isLoaded, user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculateAge = (dobString: string): number => {
    if (!dobString) return 28;
    const birthDate = new Date(dobString);
    const difference = Date.now() - birthDate.getTime();
    const ageDate = new Date(difference);
    return Math.abs(ageDate.getUTCFullYear() - 1970) || 28;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const patientId = user?.id
        ? `PAT-${user.id.replace(/^user_/, '').slice(0, 8).toUpperCase()}`
        : localStorage.getItem('vitascan_patient_id') || `PAT-${Date.now().toString().slice(-8)}`;

      await upsertPatientProfileToSupabase({
        clerk_user_id: user?.id,
        patient_id: patientId,
        full_name: formData.fullName,
        age: calculateAge(formData.dob),
        gender: formData.gender,
      });

      localStorage.setItem('vitascan_patient_id', patientId);
    } catch (err) {
      console.warn('Could not save patient profile to database, continuing locally', err);
    } finally {
      setSaving(false);
      router.push('/upload');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Basic Details
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Let’s start with some basic details
          </p>
        </div>

        {/* Security Badge */}
        <div className="bg-[#EFF6FF] border border-blue-200/80 px-4 py-2.5 rounded-2xl flex items-center space-x-2 text-xs font-semibold text-[#1D61E7]">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-[#1D61E7]" />
          <span>Your personal details are safe with us.</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Personal Details */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center space-x-3 text-[#1D61E7]">
            <User className="w-6 h-6" />
            <h2 className="text-xl font-bold text-[#1D61E7]">
              Personal Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter full name"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
                required
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Date of Birth
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  placeholder="dd/mm/yyyy"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Gender
              </label>
              <div className="relative">
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all appearance-none bg-white pr-10"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Blood Group */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Blood Group
              </label>
              <div className="relative">
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all appearance-none bg-white pr-10"
                >
                  <option value="">Select blood group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Phone Number
              </label>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <span className="bg-slate-50 text-slate-500 px-3.5 py-3 text-sm font-semibold border-r border-slate-200 flex items-center justify-center">
                  +91
                </span>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Additional Details */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center space-x-3 text-[#1D61E7]">
            <Info className="w-6 h-6" />
            <h2 className="text-xl font-bold text-[#1D61E7]">
              Additional Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Height */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Height
              </label>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  placeholder="Enter height"
                  className="w-full px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <span className="bg-slate-50 text-slate-500 px-3.5 py-3 text-sm font-semibold border-l border-slate-200 flex items-center justify-center">
                  cm
                </span>
              </div>
            </div>

            {/* Weight */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Weight
              </label>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="Enter weight"
                  className="w-full px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <span className="bg-slate-50 text-slate-500 px-3.5 py-3 text-sm font-semibold border-l border-slate-200 flex items-center justify-center">
                  kg
                </span>
              </div>
            </div>

            {/* Occupation */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Occupation
              </label>
              <input
                type="text"
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                placeholder="Enter occupation"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Marital Status */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Marital Status
              </label>
              <div className="relative">
                <select
                  name="maritalStatus"
                  value={formData.maritalStatus}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all appearance-none bg-white pr-10"
                >
                  <option value="">Select status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Address */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center space-x-3 text-[#1D61E7]">
            <MapPin className="w-6 h-6" />
            <h2 className="text-xl font-bold text-[#1D61E7]">Address</h2>
          </div>

          <div className="space-y-4 max-w-2xl">
            {/* Address Line 1 */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Address Line 1
              </label>
              <input
                type="text"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleChange}
                placeholder="House number, street name"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Address Line 2 */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Address Line 2 (Optional)
              </label>
              <input
                type="text"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleChange}
                placeholder="Apartment, suite, etc."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* City */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* State */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Enter state"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Country */}
            <div className="space-y-1.5 md:w-1/2">
              <label className="block text-xs font-bold text-slate-700">
                Country
              </label>
              <div className="relative">
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all appearance-none bg-white pr-10 font-medium"
                >
                  <option value="India">India</option>
                  <option value="USA">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 bg-[#1D61E7] hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center space-x-2 text-sm"
          >
            <span>{saving ? 'Saving Profile...' : 'Save and Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
