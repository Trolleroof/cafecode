"use client";

// Thin wrapper to keep the UI intact while switching to WebContainer FS later if needed.
// Re-exports the existing FileExplorer with same props to minimize changes.
import FileExplorer, { getLanguageFromFileName } from '@/components/FileExplorer';

export { getLanguageFromFileName };
export default FileExplorer;

