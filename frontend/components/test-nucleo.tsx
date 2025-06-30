'use client';

import React from 'react';


// Test component to verify Nucleo icons are working
export default function TestNucleo() {
  return (
    <div className="p-8 bg-gray-100 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Nucleo Icons Test</h2>
      <div className="grid grid-cols-4 gap-4">
        <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow">
          <NucleoCode className="h-8 w-8 text-blue-600 mb-2" />
          <span className="text-sm">Code</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow">
          <NucleoPlay className="h-8 w-8 text-green-600 mb-2" />
          <span className="text-sm">Play</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow">
          <NucleoChat className="h-8 w-8 text-purple-600 mb-2" />
          <span className="text-sm">Chat</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow">
          <NucleoSend className="h-8 w-8 text-orange-600 mb-2" />
          <span className="text-sm">Send</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow">
          <NucleoBulb className="h-8 w-8 text-yellow-600 mb-2" />
          <span className="text-sm">Bulb</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow">
          <NucleoMagic className="h-8 w-8 text-pink-600 mb-2" />
          <span className="text-sm">Magic</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow">
          <NucleoRocket className="h-8 w-8 text-indigo-600 mb-2" />
          <span className="text-sm">Rocket</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow">
          <NucleoHeart className="h-8 w-8 text-red-600 mb-2" />
          <span className="text-sm">Heart</span>
        </div>
      </div>
    </div>
  );
}