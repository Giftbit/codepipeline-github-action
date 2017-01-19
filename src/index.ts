import "babel-polyfill";
import * as awslambda from "aws-lambda";
import * as aws from "aws-sdk";
import * as github from "github";
import {CodePipelineEvent} from "./CodePipelineEvent";

export function handler(evt: CodePipelineEvent, ctx: awslambda.Context, callback: awslambda.Callback): void {
    handlerAsync(evt, ctx)
        .then(res => {
            callback(undefined, res);
        }, err => {
            console.error(JSON.stringify(err, null, 2));
            callback(err);
        });
}

async function handlerAsync(evt: CodePipelineEvent, ctx: awslambda.Context): Promise<void> {

}
