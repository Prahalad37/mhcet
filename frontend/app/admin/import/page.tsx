"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getAdminTests, importQuestionsCSV, getCSVTemplate } from "@/lib/adminApi";
import { getUserErrorMessage } from "@/lib/errorMessages";
import { groupTestsBySection } from "@/lib/testGroups";
import { ADMIN_TOPIC_OPTIONS } from "@/lib/adminTopicOptions";
import type { AdminTest, ImportResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { PageLoadingState } from "@/components/ui/PageLoadingState";

function AdminImportForm() {
  const searchParams = useSearchParams();
  const testIdFromQuery = searchParams.get("testId");

  const [selectedTest, setSelectedTest] = useState<string>("");
  const [tests, setTests] = useState<AdminTest[] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groupedTests = useMemo(() => {
    if (!tests?.length) return [];
    return groupTestsBySection(tests);
  }, [tests]);

  const loadTests = async () => {
    try {
      const data = await getAdminTests();
      setTests(data);
    } catch (e) {
      setError(getUserErrorMessage(e, { fallback: "Could not load tests." }));
    }
  };

  const downloadTemplate = async () => {
    try {
      const blob = await getCSVTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'question-import-template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(getUserErrorMessage(e, { fallback: "Could not download template." }));
    }
  };

  const handleImport = async () => {
    if (!file || !selectedTest || importing) return;
    
    setImporting(true);
    setError(null);
    setResult(null);
    
    try {
      const importResult = await importQuestionsCSV(selectedTest, file);
      setResult(importResult);
      setFile(null);
      
      // Reset form
      const fileInput = document.getElementById('csvFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (e) {
      setError(getUserErrorMessage(e, { fallback: "Import failed." }));
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    if (!tests || !testIdFromQuery) return;
    if (tests.some((t) => t.id === testIdFromQuery)) {
      setSelectedTest(testIdFromQuery);
    }
  }, [tests, testIdFromQuery]);

  useEffect(() => {
    void loadTests();
  }, []);

  if (tests === null) {
    return <PageLoadingState label="Loading tests" />;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Import Questions
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Upload your CSV into the <strong className="font-medium text-zinc-800 dark:text-zinc-200">mock test</strong> whose topic matches your intended syllabus section (e.g., UPSC, General Studies, Current Affairs, Legal Aptitude).
        </p>
      </div>

      {/* Template Download */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          CSV Template
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Ensure each row has a valid <code className="rounded bg-zinc-200/80 px-1 text-xs dark:bg-zinc-700">subject</code> corresponding to our topics (e.g., UPSC, General Studies, Current Affairs, Legal Aptitude).
        </p>
        <Button
          variant="secondary"
          className="mt-3"
          onClick={downloadTemplate}
        >
          Download Template
        </Button>
      </div>

      {/* Import Form */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Import Questions
        </h2>
        
        <div className="mt-4 space-y-4">
          {/* Test Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Target mock (UPSC/Law sections)
            </label>
            <select
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">Select a test…</option>
              {groupedTests.map(({ section, tests: group }) => (
                <optgroup key={section} label={section}>
                  {group.map((test) => (
                    <option key={test.id} value={test.id}>
                      {test.title} · {test.questionCount} Q · topic: {test.topic}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {tests.length === 0 ? (
              <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                Koi mock abhi nahi hai.{" "}
                <Link
                  href="/admin/tests/new"
                  className="font-medium text-sky-700 underline dark:text-sky-300"
                >
                  Naya test banao
                </Link>{" "}
                and pick topics matching the syllabus:{" "}
                <span className="whitespace-normal break-words">
                  {ADMIN_TOPIC_OPTIONS.slice(0, 6).join(" · ")}
                  …
                </span>
              </p>
            ) : (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Grouping = exam-style sections. CSV ke andhar har question ka{" "}
                <code className="rounded bg-zinc-200/80 px-0.5 dark:bg-zinc-700">subject</code>{" "}
                inhi areas se ho.
              </p>
            )}
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              CSV File
            </label>
            <input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm text-zinc-500 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-sky-700 hover:file:bg-sky-100 dark:text-zinc-400 dark:file:bg-sky-950/50 dark:file:text-sky-300 dark:hover:file:bg-sky-950/70"
            />
          </div>

          {/* Import Button */}
          <Button
            disabled={!file || !selectedTest || importing}
            onClick={handleImport}
            className="w-full"
          >
            {importing ? "Importing..." : "Import Questions"}
          </Button>
        </div>
      </div>

      {/* Results */}
      {error && <Alert message={error} />}
      
      {result && (
        <div className={`rounded-2xl border p-5 ${
          result.success
            ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30"
            : "border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/30"
        }`}>
          <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
            Import Complete
          </h3>
          <div className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
            <p>
              Successfully imported {result.imported} of {result.total} questions to{" "}
              <span className="font-medium">{result.testTitle}</span>
            </p>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-3">
                <p className="font-medium">Validation errors (skipped rows):</p>
                <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
                  {result.errors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>... and {result.errors.length - 5} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminImportPage() {
  return (
    <Suspense fallback={<PageLoadingState label="Loading" />}>
      <AdminImportForm />
    </Suspense>
  );
}