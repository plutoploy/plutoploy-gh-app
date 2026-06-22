const { Octokit } = require("octokit");
const octokit = new Octokit();
async function test() {
	try {
		const res = await octokit.request(
			"GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs",
			{
				owner: "microsoft",
				repo: "TypeScript",
				job_id: 30062029571, // some public job id? Wait, I need a real job id. Let's find one.
			},
		);
		console.log(typeof res.data, res.data.substring(0, 100));
	} catch (e) {
		console.log(e.status);
	}
}
test();
