import type { Probot } from "probot";

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

async function broadcast(
	ghUsername: string,
	channel: string,
	payload: Record<string, any>,
) {
	try {
		const res = await fetch(`${WEBHOOK_URL}/${ghUsername}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(WEBHOOK_SECRET && { "X-PartyKit-Secret": WEBHOOK_SECRET }),
			},
			body: JSON.stringify({
				channel,
				payload: {
					...payload,
					timestamp: new Date().toISOString(),
				},
			}),
		});

		if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
		console.log(`✅ Relayed event to room "${channel}"`);
	} catch (err) {
		console.error(`❌ Relay failed for room "${channel}":`, err.message);
	}
}

async function fetchJobLogs(
	octokit: any,
	owner: string,
	repo: string,
	jobId: number,
): Promise<string | null> {
	try {
		// Use .request directly to avoid method name issues across octokit versions
		const { data } = await octokit.request(
			"GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs",
			{
				owner,
				repo,
				job_id: jobId,
			},
		);

		return typeof data === "string" ? data : null;
	} catch (err: any) {
		// If the library throws on a manual redirect, we can extract the url
		if (err.status === 302 && err.response?.headers?.location) {
			const logRes = await fetch(err.response.headers.location);
			if (!logRes.ok) return null;
			return await logRes.text();
		}
		console.error(`Failed to fetch logs for job ${jobId}:`, err.message);
		return null;
	}
}

function room(owner: string, repo: string, ...suffixes: string[]): string {
	const base = `${owner}/${repo}`;
	return suffixes.length ? `${base}/${suffixes.join("/")}` : base;
}

export default (app: Probot) => {
	app.log.info("Plutoploy Webhook Relay started");
	app.on("push", async (context) => {
		const { repository, ref, pusher, head_commit } = context.payload;
		const owner = repository.owner.login; // ✅ fix
		const repo = repository.name;

		await broadcast(owner, room(owner, repo), {
			event: "push",
			branch: ref.replace("refs/heads/", ""),
			pusher: pusher?.name,
			commitSha: head_commit?.id,
			commitMessage: head_commit?.message,
		});
	});

	app.on("pull_request", async (context) => {
		const { repository, action, pull_request } = context.payload;
		const owner = repository.owner.login; // ✅ fix
		const repo = repository.name;

		await broadcast(owner, room(owner, repo, `pr-${pull_request.number}`), {
			event: "pull_request",
			action,
			prNumber: pull_request.number,
			title: pull_request.title,
			author: pull_request.user?.login,
			branch: pull_request.head.ref,
		});
	});

	app.on("workflow_run", async (context) => {
		const { repository, workflow_run } = context.payload;
		const owner = repository.owner.login;
		const repo = repository.name;

		await broadcast(owner, room(owner, repo, `run-${workflow_run.id}`), {
			event: "workflow_run",
			action: context.payload.action,
			runId: workflow_run.id,
			workflowName: workflow_run.name,
			status: workflow_run.status,
			conclusion: workflow_run.conclusion,
			branch: workflow_run.head_branch,
			commitSha: workflow_run.head_sha,
			url: workflow_run.html_url,
		});
	});
	app.on("workflow_job", async (context) => {
		const { repository, workflow_job } = context.payload;
		const owner = repository.owner.login;
		const repo = repository.name;

		if (workflow_job.conclusion === "failed") {
			await context.octokit.rest.issues.create({
				owner,
				repo,
				title: `Workflow job "${workflow_job.name}" failed`,
				body: [
					`**Job:** ${workflow_job.name}`,
					`**Run ID:** ${workflow_job.run_id}`,
					`**Status:** ${workflow_job.status}`,
					`**Conclusion:** ${workflow_job.conclusion}`,
					`**URL:** ${workflow_job.html_url}`,
				].join("\n"),
			});
		}

		await broadcast(owner, room(owner, repo, `run-${workflow_job.run_id}`), {
			event: "workflow_job",
			action: context.payload.action,
			jobId: workflow_job.id,
			runId: workflow_job.run_id,
			jobName: workflow_job.name,
			status: workflow_job.status,
			conclusion: workflow_job.conclusion,
			url: workflow_job.html_url,
		});

		if (workflow_job.status === "completed") {
			const logText = await fetchJobLogs(
				context.octokit,
				owner,
				repo,
				workflow_job.id,
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
						logText,
					},
				);

				const res = await fetch(`${WEBHOOK_URL}/${owner}`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(WEBHOOK_SECRET && { "X-PartyKit-Secret": WEBHOOK_SECRET }),
					},
					body: JSON.stringify({
						channel: room(owner, repo, `logs-${workflow_job.run_id}`),
						payload: {
							event: "raw_logs",
							jobId: workflow_job.id,
							runId: workflow_job.run_id,
							jobName: workflow_job.name,
							conclusion: workflow_job.conclusion,
							logText,
						},
					}),
				});

				if (!res.ok) console.error(`❌ Raw logs relay failed: ${res.status}`);
			}
		}
	});
	app.on("deployment", async (context) => {
		const { repository, deployment } = context.payload;
		const owner = repository.owner.login; // ✅ already correct
		const repo = repository.name;

		await broadcast(owner, room(owner, repo), {
			event: "deployment",
			action: context.payload.action,
			id: deployment.id,
			environment: deployment.environment,
			ref: deployment.ref,
			description: deployment.description,
		});
	});

	// ─── DEPLOYMENT STATUS ───
	app.on("deployment_status", async (context) => {
		const { repository, deployment, deployment_status } = context.payload;
		const owner = repository.owner.login; // ✅ already correct
		const repo = repository.name;

		await broadcast(owner, room(owner, repo), {
			event: "deployment_status",
			action: context.payload.action,
			state: deployment_status.state,
			environment: deployment.environment,
			description: deployment_status.description,
			logUrl: deployment_status.log_url,
			environmentUrl: deployment_status.environment_url,
		});
	});
};
