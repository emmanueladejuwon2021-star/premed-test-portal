/**
 * Lightweight in-memory proctoring snapshot cache to handle high-frequency
 * sub-second framing without overloading the main database disk.
 */
export const latestProctorSnapshots = new Map<string, any>();

// Self-cleaning mechanism to prevent memory leaks under massive traffic
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    try {
      const now = Date.now();
      const expiry = 1800000; // 30 minutes TTL for active exam sessions
      for (const [sessionId, data] of latestProctorSnapshots.entries()) {
        const timestamp = data && typeof data === 'object' ? data.timestamp : null;
        if (timestamp && (now - timestamp > expiry)) {
          latestProctorSnapshots.delete(sessionId);
        }
      }
    } catch (e) {
      console.error("Proctor cache cleanup failed:", e);
    }
  }, 300000); // Clean every 5 minutes
}

