"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import axios from "axios";

import API from "@/lib/api";
import { ImportResponse } from "@/lib/types";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [response, setResponse] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canUpload = useMemo(() => file !== null && !uploading, [file, uploading]);

  const handleUpload = async () => {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setProgress(0);
    setResponse(null);
    setError(null);

    try {
      const { data } = await API.post<ImportResponse>("/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (!event.total) {
            return;
          }

          const percent = Math.min(100, Math.round((event.loaded * 100) / event.total));
          setProgress(percent);
        },
      });

      setResponse(data);
      setProgress(100);
    } catch (unknownError: unknown) {
      const detail = axios.isAxiosError(unknownError)
        ? (unknownError.response?.data as { detail?: string } | undefined)?.detail
        : undefined;
      setError(typeof detail === "string" ? detail : "Failed to import file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="screen-shell">
      <section className="panel panel-compact upload-panel">
        <h1 className="heading-xl">Import Election File</h1>
        <p className="muted">
          Upload a text file with one constituency per line. Party values update only for parties present in
          each row.
        </p>

        <label className="upload-input">
          <span>Select Results File</span>
          <input
            type="file"
            accept=".txt,.csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <button className="primary-btn" disabled={!canUpload} onClick={handleUpload}>
          {uploading ? "Importing..." : "Start Import"}
        </button>

        {uploading && (
          <div className="progress-block">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="muted">{progress}% uploaded</p>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        {response && (
          <div className="import-summary">
            <h2>Import Summary</h2>
            <p>{response.message}</p>
            <p>Lines read: {response.total_lines}</p>
            <p>Lines processed: {response.processed_lines}</p>
            <p>Lines skipped: {response.skipped_lines}</p>
            <p>Result upserts: {response.upserted_results}</p>
            {response.errors.length > 0 && (
              <p className="muted">Warnings captured: {response.errors.length} (see API response for details)</p>
            )}
            <button className="secondary-btn" onClick={() => router.push("/dashboard")}>
              Open Dashboard
            </button>
          </div>
        )}

        <Link className="text-link" href="/dashboard">
          Skip import and view dashboard
        </Link>
      </section>
    </main>
  );
}
