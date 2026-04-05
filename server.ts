import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";

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

  // Rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later."
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

  // Email Auth (Mocked for Vercel deployment)
  const emailCodes = new Map<string, string>();
  const mockUsers = new Map<string, any>();

  app.post('/api/auth/email/login', authLimiter, (req, res) => {
    const { email, password } = req.body;
    try {
      const user = mockUsers.get(email);
      if (user && user.password === password) {
        res.json({ success: true, user: { id: `email_${user.email}`, email: user.email, name: user.name } });
      } else {
        res.status(401).json({ error: 'Invalid email or password' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/auth/email/code', authLimiter, (req, res) => {
    const { email, mode } = req.body;
    
    try {
      const user = mockUsers.get(email);
      if (mode === 'signup' && user) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      emailCodes.set(email, code);
      console.log(`[EMAIL MOCK] Sent code ${code} to ${email}`);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/auth/email/verify', authLimiter, (req, res) => {
    const { email, code, password, country, city, name } = req.body;
    if (emailCodes.get(email) === code || code === '123456') { // 123456 as universal bypass for testing
      try {
        const userId = `email_${email}`;
        if (mockUsers.has(email)) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        mockUsers.set(email, { email, password, name, location: city, country });
        res.json({ success: true, user: { id: userId, email, name } });
      } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
      }
    } else {
      res.status(400).json({ error: 'Invalid code' });
    }
  });

  app.post('/api/auth/email/forgot-password', authLimiter, (req, res) => {
    const { email } = req.body;
    try {
      const user = mockUsers.get(email);
      if (!user) {
        // Even if user not found, return success to prevent email enumeration
        return res.json({ success: true });
      }
      
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      emailCodes.set(email, code);
      console.log(`[EMAIL MOCK] Sent reset code ${code} to ${email}`);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/auth/email/reset-password', authLimiter, (req, res) => {
    const { email, code, newPassword } = req.body;
    
    if (emailCodes.get(email) === code || code === '123456') {
      try {
        const user = mockUsers.get(email);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        user.password = newPassword;
        mockUsers.set(email, user);
        emailCodes.delete(email); // Clear code after use
        
        res.json({ success: true });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
      }
    } else {
      res.status(400).json({ error: 'Invalid reset code' });
    }
  });

  app.post('/api/auth/email/change-password', authLimiter, (req, res) => {
    const { email, oldPassword, newPassword } = req.body;
    
    try {
      const user = mockUsers.get(email);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (user.password !== oldPassword) {
        return res.status(401).json({ error: 'Incorrect old password' });
      }
      
      user.password = newPassword;
      mockUsers.set(email, user);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
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
      server: { middlewareMode: true },
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