"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getAdminTest,
  getTestQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from "@/lib/adminApi";
import { getUserErrorMessage } from "@/lib/errorMessages";
import type { AdminQuestion, AdminTest } from "@/lib/types";
import { ADMIN_QUESTION_SUBJECTS } from "@/lib/adminTopicOptions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { PageErrorState } from "@/components/ui/PageErrorState";

type CorrectOpt = "A" | "B" | "C" | "D";

type QuestionForm = {
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: CorrectOpt;
  subject: string;
  hint: string;
  officialExplanation: string;
};

function emptyForm(): QuestionForm {
  return {
    prompt: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctOption: "A",
    subject: ADMIN_QUESTION_SUBJECTS[0],
    hint: "",
    officialExplanation: "",
  };
}

function questionToForm(q: AdminQuestion): QuestionForm {
  const co = q.correctOption.toUpperCase();
  const correctOption =
    co === "A" || co === "B" || co === "C" || co === "D" ? co : "A";
  return {
    prompt: q.prompt,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    correctOption,
    subject: q.subject,
    hint: q.hint ?? "",
    officialExplanation: q.officialExplanation ?? "",
  };
}

function sortByOrder(questions: AdminQuestion[]): AdminQuestion[] {
  return [...questions].sort((a, b) => a.orderIndex - b.orderIndex);
}

export default function TestQuestionsPage() {
  const params = useParams<{ id: string | string[] }>();
  const rawId = params?.id;
  const testId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [test, setTest] = useState<AdminTest | null>(null);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<QuestionForm>(() => emptyForm());
  const [editForm, setEditForm] = useState<QuestionForm>(() => emptyForm());
  const [savingAdd, setSavingAdd] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!testId || typeof testId !== "string") {
      setError("Invalid test link.");
      setLoading(false);
      return;
    }
    try {
      const [t, qs] = await Promise.all([
        getAdminTest(testId),
        getTestQuestions(testId),
      ]);
      setTest(t);
      setQuestions(sortByOrder(qs));
    } catch (e) {
      setError(getUserErrorMessage(e, { fallback: "Could not load test or questions." }));
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => sortByOrder(questions), [questions]);

  const subjectOptionsFor = useCallback((current: string) => {
    const set = new Set<string>(ADMIN_QUESTION_SUBJECTS);
    if (current && !set.has(current)) {
      return [current, ...ADMIN_QUESTION_SUBJECTS];
    }
    return [...ADMIN_QUESTION_SUBJECTS];
  }, []);

  function startEdit(q: AdminQuestion) {
    setEditingId(q.id);
    setEditForm(questionToForm(q));
    setShowAdd(false);
    setActionError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm());
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (savingAdd) return;
    setSavingAdd(true);
    setActionError(null);
    try {
      await createQuestion(testId, {
        prompt: addForm.prompt,
        optionA: addForm.optionA,
        optionB: addForm.optionB,
        optionC: addForm.optionC,
        optionD: addForm.optionD,
        correctOption: addForm.correctOption,
        subject: addForm.subject,
        hint: addForm.hint.trim() || undefined,
        officialExplanation: addForm.officialExplanation.trim() || undefined,
      });
      setAddForm(emptyForm());
      setShowAdd(false);
      await load();
    } catch (e) {
      setActionError(getUserErrorMessage(e, { fallback: "Could not create question." }));
    } finally {
      setSavingAdd(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || savingEdit) return;
    setSavingEdit(true);
    setActionError(null);
    try {
      await updateQuestion(editingId, {
        prompt: editForm.prompt,
        optionA: editForm.optionA,
        optionB: editForm.optionB,
        optionC: editForm.optionC,
        optionD: editForm.optionD,
        correctOption: editForm.correctOption,
        subject: editForm.subject,
        hint: editForm.hint.trim(),
        officialExplanation: editForm.officialExplanation.trim(),
      });
      cancelEdit();
      await load();
    } catch (e) {
      setActionError(getUserErrorMessage(e, { fallback: "Could not update question." }));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(q: AdminQuestion) {
    if (actionKey) return;
    if (
      !confirm(
        `Delete this question? (${q.prompt.slice(0, 80)}${q.prompt.length > 80 ? "…" : ""})`
      )
    ) {
      return;
    }
    setActionKey(q.id);
    setActionError(null);
    try {
      await deleteQuestion(q.id);
      if (editingId === q.id) cancelEdit();
      await load();
    } catch (e) {
      setActionError(getUserErrorMessage(e, { fallback: "Could not delete question." }));
    } finally {
      setActionKey(null);
    }
  }

  async function moveQuestion(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= sorted.length) return;
    const ids = sorted.map((q) => q.id);
    const tmp = ids[index];
    ids[index] = ids[next];
    ids[next] = tmp;
    setActionKey("reorder");
    setActionError(null);
    try {
      await reorderQuestions(testId, ids);
      await load();
    } catch (e) {
      setActionError(getUserErrorMessage(e, { fallback: "Could not reorder questions." }));
    } finally {
      setActionKey(null);
    }
  }

  if (loading) return <PageLoadingState label="Loading questions" />;

  if (error || !test) {
    return (
      <PageErrorState
        message={error || "Test not found."}
        onRetry={load}
        backHref="/admin/tests"
        backLabel="Back to tests"
      />
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/tests"
          className="text-sm text-sky-600 hover:underline dark:text-sky-400"
        >
          ← Tests
        </Link>
        <span className="text-zinc-300 dark:text-zinc-600">/</span>
        <Link
          href={`/admin/tests/${testId}/edit`}
          className="text-sm text-sky-600 hover:underline dark:text-sky-400"
        >
          Edit test
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Questions
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {test.title} · {sorted.length} question{sorted.length === 1 ? "" : "s"}
        </p>
      </div>

      {actionError ? <Alert message={actionError} /> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setShowAdd((v) => !v);
            cancelEdit();
            setActionError(null);
          }}
        >
          {showAdd ? "Cancel add" : "Add question"}
        </Button>
        <Link href={`/admin/import?testId=${testId}`}>
          <Button type="button" variant="secondary">
            CSV import
          </Button>
        </Link>
      </div>

      {showAdd ? (
        <form
          onSubmit={handleAdd}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            New question
          </h2>
          <QuestionFields
            form={addForm}
            setForm={setAddForm}
            subjectOptions={subjectOptionsFor(addForm.subject)}
          />
          <div className="mt-4 flex gap-2">
            <Button type="submit" disabled={savingAdd}>
              {savingAdd ? "Saving…" : "Create question"}
            </Button>
          </div>
        </form>
      ) : null}

      <ul className="space-y-4">
        {sorted.map((q, index) => (
          <li
            key={q.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            {editingId === q.id ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase text-zinc-500">
                    Edit #{index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                    disabled={savingEdit}
                  >
                    Cancel
                  </Button>
                </div>
                <QuestionFields
                  form={editForm}
                  setForm={setEditForm}
                  subjectOptions={subjectOptionsFor(editForm.subject)}
                />
                <Button type="submit" disabled={savingEdit}>
                  {savingEdit ? "Saving…" : "Save changes"}
                </Button>
              </form>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-500">
                      #{index + 1} · {q.subject}
                    </p>
                    <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                      {q.prompt}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Answer: {q.correctOption}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={index === 0 || actionKey !== null}
                      onClick={() => moveQuestion(index, -1)}
                    >
                      Up
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={
                        index === sorted.length - 1 || actionKey !== null
                      }
                      onClick={() => moveQuestion(index, 1)}
                    >
                      Down
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => startEdit(q)}
                      disabled={actionKey !== null}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:bg-rose-50 dark:text-rose-400"
                      disabled={actionKey === q.id}
                      onClick={() => handleDelete(q)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {sorted.length === 0 && !showAdd ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No questions yet. Add one above or use CSV import.
        </p>
      ) : null}
    </div>
  );
}

function QuestionFields({
  form,
  setForm,
  subjectOptions,
}: {
  form: QuestionForm;
  setForm: React.Dispatch<React.SetStateAction<QuestionForm>>;
  subjectOptions: string[];
}) {
  return (
    <div className="mt-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Prompt *
        </label>
        <textarea
          required
          rows={4}
          value={form.prompt}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, prompt: e.target.value }))
          }
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["optionA", "optionB", "optionC", "optionD"] as const).map((key) => (
          <div key={key}>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {key.replace("option", "Option ")} *
            </label>
            <Input
              required
              value={form[key]}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, [key]: e.target.value }))
              }
              className="mt-1"
            />
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Correct option *
          </label>
          <select
            value={form.correctOption}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                correctOption: e.target.value as CorrectOpt,
              }))
            }
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {(["A", "B", "C", "D"] as const).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Subject *
          </label>
          <select
            required
            value={
              subjectOptions.includes(form.subject) ? form.subject : subjectOptions[0]
            }
            onChange={(e) =>
              setForm((prev) => ({ ...prev, subject: e.target.value }))
            }
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {subjectOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Hint (optional)
        </label>
        <Input
          value={form.hint}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, hint: e.target.value }))
          }
          className="mt-1"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Official explanation (optional)
        </label>
        <textarea
          rows={3}
          value={form.officialExplanation}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              officialExplanation: e.target.value,
            }))
          }
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
    </div>
  );
}
