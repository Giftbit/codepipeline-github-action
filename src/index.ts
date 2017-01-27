import "babel-polyfill";
import * as aws from "aws-sdk";
import * as awslambda from "aws-lambda";
import {CodePipelineEvent} from "./CodePipelineEvent";

// I'm too lazy to make a type file.
// see: http://github-tools.github.io/github/docs/3.1.0/index.html
const GitHub: any = require("github-api/dist/GitHub.bundle.min.js");

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
        await pushGithub();
        console.log("job success");
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

async function pushGithub(): Promise<void> {
    const oauthToken = await getGithubOauthToken();
    const github = new GitHub({
        token: oauthToken
    });

    const repo = github.getRepo(process.env["GITHUB_REPO_OWNER"], process.env["GITHUB_REPO"]);

    const createResp = await repo.createPullRequest({
        title: "Automatic pull request",
        head: process.env["GITHUB_SOURCE_BRANCH"],  // src
        base: process.env["GITHUB_DEST_BRANCH"]     // dest
    });
    console.log("createResp", createResp);

    const mergeResp = await repo.mergePullRequest(createResp.id, {
        commit_title: "Automatic merge"
    });
    console.log("mergeResp", mergeResp);
}

async function getGithubOauthToken(): Promise<string> {
    const response = await kms.decrypt({
        CiphertextBlob: new Buffer(process.env["GITHUB_OAUTH"], "base64")
    }).promise();
    return (response.Plaintext as Buffer).toString("ascii");
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
