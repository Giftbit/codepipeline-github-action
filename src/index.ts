import "babel-polyfill";
import * as aws from "aws-sdk";
import * as awslambda from "aws-lambda";
import * as https from "https";
import {CodePipelineEvent} from "./CodePipelineEvent";

const creds = new aws.EnvironmentCredentials("AWS");
const codepipeline = new aws.CodePipeline({
    apiVersion: "2015-07-09",
    credentials: creds
});
const kms = new aws.KMS({
    apiVersion: "2014-11-01",
    credentials: creds
});

//noinspection JSUnusedGlobalSymbols
export function handler(evt: CodePipelineEvent, ctx: awslambda.Context, callback: awslambda.Callback): void {
    console.log("event", JSON.stringify(evt, null, 2));
    handlerAsync(evt, ctx)
        .then(res => {
            callback(undefined, res);
        }, err => {
            console.error(JSON.stringify(err, null, 2));
            callback(err);
        });
}

async function handlerAsync(evt: CodePipelineEvent, ctx: awslambda.Context): Promise<any> {
    const jobId = evt["CodePipeline.job"].id;

    try {
        checkConfig();
    } catch (err) {
        console.error(err);
        await codepipeline.putJobFailureResult({
            jobId: jobId,
            failureDetails: {
                type: "ConfigurationError",
                message: err.message,
                externalExecutionId: ctx.awsRequestId
            }
        }).promise();
        return;
    }

    try {
        const prNumber = await createPullRequest();
        if (process.env["AUTO_MERGE"] === "true" && prNumber) {
            await mergePullRequest(prNumber);
        }
        await codepipeline.putJobSuccessResult({
            jobId: jobId
        }).promise();
    } catch (err) {
        console.error(err);
        await codepipeline.putJobFailureResult({
            jobId: jobId,
            failureDetails: {
                type: "JobFailed",
                message: err.message,
                externalExecutionId: ctx.awsRequestId
            }
        }).promise();
    }
    return {};
}

async function createPullRequest(): Promise<string> {
    try {
        const createPath = `/repos/${process.env["GITHUB_REPO_OWNER"]}/${process.env["GITHUB_REPO"]}/pulls`;
        const createBody = {
            title: process.env["PULL_REQUEST_MESSAGE"] || "Automatic pull request by CI",
            head: process.env["GITHUB_SOURCE_BRANCH"],  // src
            base: process.env["GITHUB_DEST_BRANCH"]     // dest
        };
        console.log("create pull request", createPath, createBody);
        const createResp = await request(createPath, "POST", createBody);
        console.log("createResp", createResp);

        return createResp.number;
    } catch (err) {
        if (err && Array.isArray(err.errors) && err.errors.length === 1) {
            if (err.errors[0].code === "custom" && err.errors[0].message === "No commits between master and staging") {
                // Nothing changed so no pull request.  This is fine.
                return null;
            }
            if (err.errors[0].code === "custom" && /^A pull request already exists for /.test(err.errors[0].message)) {
                // There's already a pull request for this.  This is fine.
                return null;
            }
        }

        throw err;
    }
}

async function mergePullRequest(prNumber: string): Promise<void> {
    const mergePath = `/repos/${process.env["GITHUB_REPO_OWNER"]}/${process.env["GITHUB_REPO"]}/pulls/${prNumber}/merge`;
    const mergeBody = {
        "commit_message": process.env["MERGE_MESSAGE"] || "Automatic merge by CI"
    };
    console.log("merge pull request", mergePath, mergeBody);
    const mergeResp = await request(mergePath, "PUT", mergeBody);
    console.log("mergeResp", mergeResp);
}

let cachedOauthToken: string = null;
async function getGithubOauthToken(): Promise<string> {
    if (!cachedOauthToken) {
        const response = await kms.decrypt({
            CiphertextBlob: new Buffer(process.env["GITHUB_OAUTH"], "base64")
        }).promise();
        cachedOauthToken = (response.Plaintext as Buffer).toString("ascii");
    }
    return cachedOauthToken;
}

/**
 * All the libaries suck.  Make this github api request manually.
 */
async function request(path: string, method: string, body?: Object): Promise<any> {
    const oauthToken = await getGithubOauthToken();

    const bodyJson = JSON.stringify(body);
    const options: https.RequestOptions = {
        hostname: "api.github.com",
        port: 443,
        path: path,
        method: method,
        headers: {
            "Authorization": `token ${oauthToken}`,
            "Accept": "application/json",
            "User-Agent": "Giftbit/lambda-github-pusher"
        }
    };

    if (body) {
        options.headers["Content-Length"] = bodyJson.length;
        options.headers["Content-Type"] = "application/json";
    }

    return await new Promise((resolve, reject) => {
        const request = https.request(options, (response) => {
            console.log(`response.statusCode ${response.statusCode}`);
            console.log(`response.headers ${JSON.stringify(response.headers)}`);

            const responseBody: string[] = [];
            response.setEncoding("utf8");
            response.on("data", d => {
                responseBody.push(d as string);
            });
            response.on("end", () => {
                if (response.statusCode >= 400) {
                    try {
                        console.log("response error", responseBody.join(""));
                        reject(JSON.parse(responseBody.join("")));
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    try {
                        const responseJson = JSON.parse(responseBody.join(""));
                        resolve(responseJson);
                    } catch (e) {
                        reject(e);
                    }
                }
            });
        });

        request.on("error", error => {
            console.log("request error", error);
            reject(error);
        });

        if (body) {
            request.write(bodyJson);
        }
        request.end();
    });
}

function checkConfig(): void {
    if (!process.env["GITHUB_REPO_OWNER"]) {
        throw new Error("Missing environment variable GITHUB_REPO_OWNER");
    }
    if (!process.env["GITHUB_REPO"]) {
        throw new Error("Missing environment variable GITHUB_REPO");
    }
    if (!process.env["GITHUB_SOURCE_BRANCH"]) {
        throw new Error("Missing environment variable GITHUB_SOURCE_BRANCH");
    }
    if (!process.env["GITHUB_DEST_BRANCH"]) {
        throw new Error("Missing environment variable GITHUB_DEST_BRANCH");
    }
}
