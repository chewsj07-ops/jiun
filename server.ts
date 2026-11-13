import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { GoogleGenAI } from "@google/genai";

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const PORT = 3000;

  // Security Middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development/Vite compatibility
  }));
  app.use(cors());
  app.use(express.json());

  // Server-side Gemini AI endpoints
  app.post("/api/ai/chat", async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: "GEMINI_API_KEY_NOT_CONFIGURED" });
    }

    const { message, history, systemInstruction } = req.body || {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "INVALID_MESSAGE" });
    }

    try {
      const rawHistory = Array.isArray(history)
        ? history
            .slice(-12)
            .filter(
              (item: any) =>
                item &&
                (item.role === "user" || item.role === "model") &&
                typeof item.text === "string" &&
                item.text.trim()
            )
            .map((item: any) => ({
              role: item.role as "user" | "model",
              parts: [{ text: item.text }],
            }))
        : [];

      const safeHistory: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
      for (const turn of rawHistory) {
        if (safeHistory.length === 0 && turn.role === "model") continue;
        if (safeHistory.length > 0 && safeHistory[safeHistory.length - 1].role === turn.role) {
          safeHistory[safeHistory.length - 1] = turn;
        } else {
          safeHistory.push(turn);
        }
      }
      if (safeHistory.length > 0 && safeHistory[safeHistory.length - 1].role === "user") {
        safeHistory.pop();
      }

      const chat = ai.chats.create({
        model: "gemini-4-hydrogen",
        config: {
          ...(typeof systemInstruction === "string" && systemInstruction.trim()
            ? { systemInstruction }
            : {}),
        },
        history: safeHistory,
      });

      const response = await chat.sendMessage({ message: message.trim() });
      res.json({ text: response.text ?? "" });
    } catch (error: any) {
      console.error("Gemini /api/ai/chat error:", error);
      res.status(502).json({
        error: error?.message || "GEMINI_CHAT_ERROR",
      });
    }
  });

  app.post("/api/ai/generate", async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: "GEMINI_API_KEY_NOT_CONFIGURED" });
    }

    const { contents, systemInstruction, responseMimeType } = req.body || {};
    if (typeof contents !== "string" || !contents.trim()) {
      return res.status(400).json({ error: "INVALID_CONTENTS" });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: contents.trim(),
        config: {
          ...(typeof systemInstruction === "string" && systemInstruction.trim()
            ? { systemInstruction }
            : {}),
          ...(typeof responseMimeType === "string" && responseMimeType.trim()
            ? { responseMimeType }
            : {}),
        },
      });

      res.json({ text: response.text ?? "" });
    } catch (error: any) {
      console.error("Gemini /api/ai/generate error:", error);
      res.status(502).json({
        error: error?.message || "GEMINI_GENERATE_ERROR",
      });
    }
  });

  // In-memory state for demonstration
  let globalMerit = { today: 0, week: 0, total: 0 };
  
  // In-memory DB for sync demonstration
  const db = {
    practiceLogs: new Map<string, any>() // id -> log
  };

  // LWW Sync Endpoint
  app.post("/api/v1/sync", (req, res) => {
    const { logs } = req.body;
    if (!Array.isArray(logs)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const updates: any[] = [];
    const conflicts: any[] = [];

    for (const localLog of logs) {
      const serverLog = db.practiceLogs.get(localLog.id.toString());
      
      if (!serverLog) {
        // New record
        const newLog = { ...localLog, record_version: localLog.record_version || 1 };
        db.practiceLogs.set(localLog.id.toString(), newLog);
        updates.push(newLog);
      } else {
        // Conflict resolution (LWW)
        if (localLog.record_version > serverLog.record_version) {
          // Local wins
          db.practiceLogs.set(localLog.id.toString(), localLog);
          updates.push(localLog);
        } else if (localLog.record_version < serverLog.record_version) {
          // Server wins
          conflicts.push(serverLog);
        } else {
          // Same version, assume synced
        }
      }
    }

    res.status(201).json({
      synced: updates.length,
      server_updates: conflicts
    });
  });

  // Auth Routes
  app.get('/api/auth/google/url', (req, res) => {
    const redirectUri = (req.query.redirect_uri as string) || `${req.protocol}://${req.get('host')}/auth/callback`;
    
    // If no real Google Client ID is provided, mock the login for development
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'dummy_client_id') {
      res.json({ mock: true });
      return;
    }

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  });

  app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
    // In a real app, exchange code for token here
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: { id: 'google_user_' + Math.random().toString(36).substr(2, 9), name: 'Google User' } }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Send initial state
    socket.emit("merit:update", globalMerit);

    socket.on("merit:add", (points: number) => {
      console.log("Received merit:add:", points);
      globalMerit.today += points;
      globalMerit.week += points;
      globalMerit.total += points;
      console.log("Broadcasting merit:update:", globalMerit);
      io.emit("merit:update", globalMerit);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();