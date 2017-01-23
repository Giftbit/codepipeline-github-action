import "babel-polyfill";
import * as aws from "aws-sdk";
import * as awslambda from "aws-lambda";
import * as GitHub from "github";
import {CodePipelineEvent} from "./CodePipelineEvent";

// The github library uses dynamic loading which webpack hates.
// Just call out the files manually.
require("github/lib/error");
require("github/lib/util");
require("github/lib/promise");

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
    const github = new GitHub({
        debug: true,
        protocol: "https",
        followRedirects: false, // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
        timeout: 5000
    });
    github.authenticate({
        type: "oauth",
        token: await getGithubOauthToken()
    });

    const createResp = await github.pullRequests.create({
        owner: process.env["GITHUB_REPO_OWNER"],
        repo: process.env["GITHUB_REPO"],
        title: "Automatic pull request",
        head: process.env["GITHUB_SOURCE_BRANCH"],
        base: process.env["GITHUB_DEST_BRANCH"]
    });
    console.log("createResp", createResp);

    const mergeResp = await github.pullRequests.merge({
        owner: process.env["GITHUB_REPO_OWNER"],
        repo: process.env["GITHUB_REPO"],
        number: createResp.id,
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
