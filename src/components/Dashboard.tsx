
"use client";
import React from 'react';

// Define the props interface
interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-muted-foreground mb-8">Welcome to your dashboard!</p>
      <button 
        onClick={onLogout} 
        className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
      >
        Log Out
      </button>
    </div>
  );
}
