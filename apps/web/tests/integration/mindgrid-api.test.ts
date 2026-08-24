import { describe, it, expect } from "vitest";

describe("MindGrid API Route Handlers Integration", () => {
  it("fetches public cases successfully from GET /api/mindgrid/cases", async () => {
    const res = await fetch("http://localhost:3000/api/mindgrid/cases");
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.cases).toHaveLength(12);

    // Verify secret solutions are not in the response
    for (const c of json.data.cases) {
      expect(c.solution).toBeUndefined();
      expect(c.evidenceCatalog).toBeDefined();
    }
  });

  it(
    "handles complete investigation lifecycle through API endpoints",
    async () => {
    // 1. Authenticate guest user
    const guestRes = await fetch("http://localhost:3000/api/auth/guest", { method: "POST" });
    const guestJson = await guestRes.json();
    const token = guestJson.data.idToken;
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // 2. Start session for Case 001
    const startRes = await fetch("http://localhost:3000/api/mindgrid/sessions", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ caseId: "case_001" }),
    });
    expect(startRes.status).toBe(201);
    const startJson = await startRes.json();
    const session = startJson.data.session;
    const publicCase = startJson.data.publicCase;

    expect(session.sessionId).toBeTruthy();
    expect(session.investigationPointsRemaining).toBe(8);

    // 3. Unlock CCTV Evidence
    const unlockRes = await fetch(
      `http://localhost:3000/api/mindgrid/sessions/${session.sessionId}/unlock`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ evidenceId: "ev_1_cctv" }),
      },
    );
    expect(unlockRes.status).toBe(200);
    const unlockJson = await unlockRes.json();
    expect(unlockJson.data.session.investigationPointsRemaining).toBe(6); // 8 - 2 = 6
    expect(unlockJson.data.unlockedEvidence.description).toBeTruthy();

    // 4. Save Timeline Ordering
    const timelineRes = await fetch(
      `http://localhost:3000/api/mindgrid/sessions/${session.sessionId}/timeline`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ timelineOrder: ["tl_1_1", "tl_1_2", "tl_1_3", "tl_1_4"] }),
      },
    );
    expect(timelineRes.status).toBe(200);

    // 5. Submit Accusation
    const submitRes = await fetch(
      `http://localhost:3000/api/mindgrid/sessions/${session.sessionId}/submit`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          suspectId: "suspect_brian",
          reasoningEvidenceIds: ["ev_1_cctv"],
          timelineOrder: ["tl_1_1", "tl_1_2", "tl_1_3", "tl_1_4"],
        }),
      },
    );
    expect(submitRes.status).toBe(200);
    const submitJson = await submitRes.json();

    expect(submitJson.data.result.isSolved).toBe(true);
    expect(submitJson.data.result.correctCulpritName).toBe("Brian Vance");
    expect(submitJson.data.result.score.overallScore).toBeGreaterThanOrEqual(70);
    expect(submitJson.data.progress.completedCaseIds).toContain("case_001");

    // 6. Fetch Progress Endpoint
    const progressRes = await fetch("http://localhost:3000/api/mindgrid/progress", {
      headers: authHeaders,
    });
    expect(progressRes.status).toBe(200);
    const progressJson = await progressRes.json();
    expect(progressJson.data.progress.totalSolved).toBe(1);
    expect(progressJson.data.progress.aggregateThinkingProfile.totalCasesCompleted).toBe(1);
  }, 30000);
});
