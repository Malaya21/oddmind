import { describe, it, expect } from "vitest";

describe("Quick Challenges API Integration", () => {
  it("fetches 50 public quick challenges successfully", async () => {
    const res = await fetch("http://localhost:3000/api/mindgrid/quick/challenges");
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.challenges).toHaveLength(50);

    // Verify solutions are stripped
    for (const c of json.data.challenges) {
      expect(c.solution).toBeUndefined();
    }
  });

  it(
    "handles single quick challenge and 5-challenge quick play gauntlet",
    async () => {
      // 1. Authenticate guest
      const guestRes = await fetch("http://localhost:3000/api/auth/guest", { method: "POST" });
      const guestJson = await guestRes.json();
      const token = guestJson.data.idToken;
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // 2. Start single challenge session (qc_cb_001)
      const sessionRes = await fetch("http://localhost:3000/api/mindgrid/quick/sessions", {
        method: "POST",
        headers,
        body: JSON.stringify({ challengeId: "qc_cb_001" }),
      });
      expect(sessionRes.status).toBe(201);
      const sessionJson = await sessionRes.json();
      const session = sessionJson.data.session;
      expect(session.sessionId).toBeTruthy();

      // 3. Submit correct answer
      const submitRes = await fetch(
        `http://localhost:3000/api/mindgrid/quick/sessions/${session.sessionId}/submit`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ answer: "042" }),
        },
      );
      expect(submitRes.status).toBe(200);
      const submitJson = await submitRes.json();
      expect(submitJson.data.session.isCorrect).toBe(true);
      expect(submitJson.data.session.score).toBeGreaterThanOrEqual(80);
      expect(submitJson.data.session.explanation).toBeTruthy();
      expect(submitJson.data.progress.completedChallengeIds).toContain("qc_cb_001");

      // 4. Start Quick Play (5 challenges)
      const playRes = await fetch("http://localhost:3000/api/mindgrid/quick/play", {
        method: "POST",
        headers,
      });
      expect(playRes.status).toBe(201);
      const playJson = await playRes.json();
      const playId = playJson.data.quickPlay.playId;
      expect(playJson.data.quickPlay.challengeIds).toHaveLength(5);

      // 5. Submit 5 steps
      for (let i = 0; i < 5; i++) {
        const stepRes = await fetch(
          `http://localhost:3000/api/mindgrid/quick/play/${playId}/submit-step`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ answer: "42" }),
          },
        );
        expect(stepRes.status).toBe(200);
        const stepJson = await stepRes.json();
        if (i === 4) {
          expect(stepJson.data.quickPlay.isCompleted).toBe(true);
          expect(stepJson.data.quickPlay.totalScore).toBeGreaterThanOrEqual(0);
        }
      }
    },
    35000,
  );
});
