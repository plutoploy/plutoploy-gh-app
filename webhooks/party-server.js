import { App } from "octokit";

export default class MyServer {
  constructor(room) {
    this.room = room;
  }

  onMessage(msg, sender) {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      data = { message: msg };
    }

    const targetChannel = data.channel;

    this.room.broadcast(
      JSON.stringify({
        type: "broadcast",
        channel: targetChannel,
        payload: data.payload || data,
        sender: sender.id,
        timestamp: Date.now()
      }),
      [sender.id]
    );
  }

  async onRequest(req) {
    const url = new URL(req.url);

    // ─── CHECK IF REPO IS CONNECTED ───
    const connectedMatch = url.pathname.match(/\/api\/repos\/([^/]+)\/([^/]+)\/connected/);
    if (req.method === "GET" && connectedMatch) {
      const owner = connectedMatch[1];
      const repo = connectedMatch[2];
      try {
        const app = new App({
          appId: this.room.env.APP_ID,
          privateKey: this.room.env.PRIVATE_KEY,
        });

        let installationId;
        for await (const { installation } of app.eachInstallation.iterator()) {
          if (installation.account.login === owner) {
            installationId = installation.id;
            break;
          }
        }

        if (!installationId) {
          return new Response(JSON.stringify({ connected: false, owner, repo }), { status: 404, headers: { "Content-Type": "application/json" } });
        }

        const octokit = await app.getInstallationOctokit(installationId);
        await octokit.rest.repos.get({ owner, repo });
        return new Response(JSON.stringify({ connected: true, owner, repo }), { headers: { "Content-Type": "application/json" } });
      } catch (err) {
        if (err.status === 404) {
          return new Response(JSON.stringify({ connected: false, owner, repo }), { headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    // ─── INJECT FILE TO REPO ───
    const injectMatch = url.pathname.match(/\/api\/repos\/([^/]+)\/([^/]+)\/inject/);
    if (req.method === "POST" && injectMatch) {
      const owner = injectMatch[1];
      const repo = injectMatch[2];
      try {
        const body = await req.json();
        const { path, content, message, branch } = body;
        if (!path || !content || !message) {
          return new Response(JSON.stringify({ error: "path, content, and message are required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const app = new App({
          appId: this.room.env.APP_ID,
          privateKey: this.room.env.PRIVATE_KEY,
        });

        let installationId;
        for await (const { installation } of app.eachInstallation.iterator()) {
          if (installation.account.login === owner) {
            installationId = installation.id;
            break;
          }
        }

        if (!installationId) {
          return new Response(JSON.stringify({ error: "No installation found for this owner" }), { status: 404, headers: { "Content-Type": "application/json" } });
        }

        const octokit = await app.getInstallationOctokit(installationId);
        const { data: existing } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path,
          ...(branch && { ref: branch }),
        }).catch(() => ({ data: null }));

        const bytes = new TextEncoder().encode(content);
        const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
        const encoded = btoa(binString);
        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message,
          content: encoded,
          ...(branch && { branch }),
          ...(existing && { sha: existing.sha }),
        });

        return new Response(JSON.stringify({ success: true, owner, repo, path }), { headers: { "Content-Type": "application/json" } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    // ─── LIST REPOS FOR USER/ORG ───
    const reposMatch = url.pathname.match(/\/api\/repos\/([^/]+)$/);
    if (req.method === "GET" && reposMatch) {
      const owner = reposMatch[1];
      try {
        const app = new App({
          appId: this.room.env.APP_ID,
          privateKey: this.room.env.PRIVATE_KEY,
        });

        let installationId;
        for await (const { installation } of app.eachInstallation.iterator()) {
          if (installation.account.login === owner) {
            installationId = installation.id;
            break;
          }
        }

        if (!installationId) {
          return new Response(JSON.stringify({ error: "No installation found for this owner" }), { status: 404, headers: { "Content-Type": "application/json" } });
        }

        const octokit = await app.getInstallationOctokit(installationId);
        const { data: repos } = await octokit.rest.apps.listReposAccessibleToInstallation();
        return new Response(
          JSON.stringify({
            owner,
            repos: repos.map((r) => ({
              name: r.name,
              full_name: r.full_name,
              private: r.private,
              default_branch: r.default_branch,
            })),
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    if (req.method === "POST") {
      try {
        const body = await req.json();
        const targetChannel = body.channel;
        this.room.broadcast(
          JSON.stringify({
            type: "webhook",
            channel: targetChannel,
            payload: body.payload || body,
            timestamp: Date.now()
          })
        );

        return new Response(
          JSON.stringify({ success: true, connections: [...this.room.getConnections()].length }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          room: this.room.id,
          connections: [...this.room.getConnections()].length
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("Method not allowed", { status: 405 });
  }

  onConnect(conn) {
    console.log(`Client connected: ${conn.id} to room: ${this.room.id}`);
  }

  onClose(conn) {
    console.log(`Client disconnected: ${conn.id}`);
  }
}