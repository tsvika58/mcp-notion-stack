import express from "express";

const app = express();

// Simple health endpoint
app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Test endpoint
app.get("/test", (_req, res) => {
  res.json({ message: "Test endpoint working" });
});

const port = 3032;
app.listen(port, "0.0.0.0", () => {
  console.log(`Test router listening on :${port}`);
});
