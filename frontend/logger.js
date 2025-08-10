export async function sendErrorToServer(error, context = {}) {
  try {
    const payload = {
      message: error.message || String(error),
      stack: error.stack || null,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    await fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn("Error logging failed:", e);
  }
}