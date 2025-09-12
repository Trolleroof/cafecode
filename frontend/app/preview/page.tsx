"use client";

import React from "react";

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default function PreviewPage({ searchParams }: PageProps) {
  const raw = (searchParams?.url || "") as string;
  const url = Array.isArray(raw) ? raw[0] : raw;

  if (!url) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111', color: '#e5e7eb' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>No preview URL provided</h1>
          <p style={{ opacity: 0.8 }}>Return to the IDE and start a dev server to open the preview.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <iframe
        title="Preview"
        src={url}
        style={{ border: 'none', width: '100%', height: '100%', background: '#fff' }}
      />
    </div>
  );
}

