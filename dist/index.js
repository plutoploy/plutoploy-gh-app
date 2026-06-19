var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// app.ts
var app_exports = {};
__export(app_exports, {
  default: () => app_default
});
module.exports = __toCommonJS(app_exports);
var WEBHOOK_URL = process.env.WEBHOOK_URL;
var WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
async function broadcast(ghUsername, channel, payload) {
  try {
    const res = await fetch(`${WEBHOOK_URL}/${ghUsername}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...WEBHOOK_SECRET && { "X-PartyKit-Secret": WEBHOOK_SECRET }
      },
      body: JSON.stringify({
        channel,
        payload: {
          ...payload,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      })
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    console.log(`\u2705 Relayed event to room "${channel}"`);
  } catch (err) {
    console.error(`\u274C Relay failed for room "${channel}":`, err.message);
  }
}
async function fetchJobLogs(octokit, owner, repo, jobId) {
  try {
    const { data } = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
      owner,
      repo,
      job_id: jobId
    });
    if (!data?.url) return null;
    const logRes = await fetch(data.url);
    if (!logRes.ok) return null;
    return await logRes.text();
  } catch (err) {
    console.error(`Failed to fetch logs for job ${jobId}:`, err.message);
    return null;
  }
}
function room(owner, repo, ...suffixes) {
  const base = `${owner}/${repo}`;
  return suffixes.length ? `${base}/${suffixes.join("/")}` : base;
}
var app_default = (app) => {
  app.log.info("Plutoploy Webhook Relay started");
  app.on("push", async (context) => {
    const { repository, ref, pusher, head_commit } = context.payload;
    const owner = repository.owner.login;
    const repo = repository.name;
    await broadcast(owner, room(owner, repo), {
      event: "push",
      branch: ref.replace("refs/heads/", ""),
      pusher: pusher?.name,
      commitSha: head_commit?.id,
      commitMessage: head_commit?.message
    });
  });
  app.on("pull_request", async (context) => {
    const { repository, action, pull_request } = context.payload;
    const owner = repository.owner.login;
    const repo = repository.name;
    await broadcast(
      owner,
      room(owner, repo, `pr-${pull_request.number}`),
      {
        event: "pull_request",
        action,
        prNumber: pull_request.number,
        title: pull_request.title,
        author: pull_request.user?.login,
        branch: pull_request.head.ref
      }
    );
  });
  app.on("workflow_run", async (context) => {
    const { repository, workflow_run } = context.payload;
    const owner = repository.owner.login;
    const repo = repository.name;
    await broadcast(
      owner,
      room(owner, repo, `run-${workflow_run.id}`),
      {
        event: "workflow_run",
        action: context.payload.action,
        runId: workflow_run.id,
        workflowName: workflow_run.name,
        status: workflow_run.status,
        conclusion: workflow_run.conclusion,
        branch: workflow_run.head_branch,
        commitSha: workflow_run.head_sha,
        url: workflow_run.html_url
      }
    );
  });
  app.on("workflow_job", async (context) => {
    const { repository, workflow_job } = context.payload;
    const owner = repository.owner.login;
    const repo = repository.name;
    await broadcast(owner, room(owner, repo, `run-${workflow_job.run_id}`), {
      event: "workflow_job",
      action: context.payload.action,
      jobId: workflow_job.id,
      runId: workflow_job.run_id,
      jobName: workflow_job.name,
      status: workflow_job.status,
      conclusion: workflow_job.conclusion,
      url: workflow_job.html_url
    });
    if (workflow_job.status === "completed") {
      const logText = await fetchJobLogs(
        context.octokit,
        owner,
        repo,
        workflow_job.id
      );
      if (logText) {
        await broadcast(
          owner,
          room(owner, repo, `run-${workflow_job.run_id}`),
          {
            event: "job_logs",
            jobId: workflow_job.id,
            runId: workflow_job.run_id,
            jobName: workflow_job.name,
            conclusion: workflow_job.conclusion,
            logText
          }
        );
      }
    }
  });
  app.on("deployment", async (context) => {
    const { repository, deployment } = context.payload;
    const owner = repository.owner.login;
    const repo = repository.name;
    await broadcast(owner, room(owner, repo), {
      event: "deployment",
      action: context.payload.action,
      id: deployment.id,
      environment: deployment.environment,
      ref: deployment.ref,
      description: deployment.description
    });
  });
  app.on("deployment_status", async (context) => {
    const { repository, deployment, deployment_status } = context.payload;
    const owner = repository.owner.login;
    const repo = repository.name;
    await broadcast(owner, room(owner, repo), {
      event: "deployment_status",
      action: context.payload.action,
      state: deployment_status.state,
      environment: deployment.environment,
      description: deployment_status.description,
      logUrl: deployment_status.log_url,
      environmentUrl: deployment_status.environment_url
    });
  });
};
