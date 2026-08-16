'use client';

import React from 'react';
import { SignUp } from '@clerk/nextjs';

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-[75vh] py-8">
      <div className="flex justify-center w-full">
        <SignUp
          routing="path"
          path="/register"
          signInUrl="/login"
          fallbackRedirectUrl="/patient-details"
        />
      </div>
    </div>
  );
}
