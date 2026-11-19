// Gerçek zamanlı olaylar: WebSocket (/api/ws).
// İlk mesaj {"type":"auth","token":...} olmalı. Her olay, kullanıcının o kaydı
// okuma yetkisine (RLS) göre süzülür.
import { WebSocket, WebSocketServer } from "ws";

import { userFromToken } from "./auth.js";
import { ruleQuery } from "./entities.js";
import { matches } from "./query.js";

const AUTH_TIMEOUT_MS = 10_000;

class Hub {
  constructor() {
    this.clients = new Map(); // ws → user
    this.wss = null;
  }

  attach(httpServer) {
    this.wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

    httpServer.on("upgrade", (request, socket, head) => {
      const { pathname } = new URL(request.url || "/", "http://localhost");

      if (pathname !== "/api/ws") {
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit("connection", ws, request);
      });
    });

    this.wss.on("connection", (ws) => this.handle(ws));
  }

  handle(ws) {
    const timer = setTimeout(() => ws.close(4401, "auth timeout"), AUTH_TIMEOUT_MS);

    const onFirstMessage = async (raw) => {
      clearTimeout(timer);
      ws.off("message", onFirstMessage);

      let user = null;
      try {
        const message = JSON.parse(raw.toString());
        if (message?.type === "auth") user = await userFromToken(message.token);
      } catch {
        user = null;
      }

      if (!user) {
        ws.close(4401, "unauthorized");
        return;
      }

      this.clients.set(ws, user);
      ws.on("message", () => {}); // istemci ping gönderir; içeriği önemsiz
      ws.on("close", () => this.clients.delete(ws));
      ws.on("error", () => this.clients.delete(ws));
      ws.send(JSON.stringify({ type: "ready" }));
    };

    ws.on("message", onFirstMessage);
    ws.on("error", () => clearTimeout(timer));
    ws.on("close", () => {
      clearTimeout(timer);
      this.clients.delete(ws);
    });
  }

  publish(entity, kind, doc) {
    if (this.clients.size === 0) return;

    const payload = JSON.stringify({ entity, type: kind, id: doc.id, data: doc });

    for (const [ws, user] of this.clients) {
      if (ws.readyState !== WebSocket.OPEN) {
        this.clients.delete(ws);
        continue;
      }
      if (!matches(doc, ruleQuery(entity, "read", user))) continue;
      ws.send(payload, (error) => {
        if (error) this.clients.delete(ws);
      });
    }
  }

  close() {
    for (const ws of this.clients.keys()) ws.terminate();
    this.clients.clear();
    this.wss?.close();
  }
}

export const hub = new Hub();
