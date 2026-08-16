'use client';

import React from 'react';
import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-[75vh] py-8">
      <div className="flex justify-center w-full">
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/register"
          fallbackRedirectUrl="/"
        />
      </div>
    </div>
  );
}
