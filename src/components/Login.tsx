
"use client";
import React from 'react';

// Define the props interface
interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <p className="text-muted-foreground mb-8">Please log in to continue</p>
      {/* This button will trigger the state change in the parent component */}
      <button 
        onClick={onLogin} 
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Log In
      </button>
    </div>
  );
}
