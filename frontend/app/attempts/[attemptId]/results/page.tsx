import { redirect } from "next/navigation";

/** Legacy URL — Phase 9 analytics live at `/results/:attemptId`. */
export default function LegacyAttemptResultsRedirect({
  params,
}: {
  params: { attemptId: string };
}) {
  redirect(`/results/${params.attemptId}`);
}
