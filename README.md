# CodePipeline GitHub Action

Trigger GitHub actions in AWS CodePipeline

## Usage

This is the source code for an [AWS Lambda](http://docs.aws.amazon.com/lambda/latest/dg/welcome.html) function that can be used as a [CodePipeline](http://docs.aws.amazon.com/codepipeline/latest/userguide/welcome.html) step to create and merge a[GitHub pull request](https://help.github.com/articles/about-pull-requests/) between branches.  This is most useful as part of a continuous integration flow between a staging pipeline and a production pipeline.

To use this in your own CodePipeline you can build the project and upload it to your own S3 bucket, or you can reference the latest build at s3://giftbit-public-resources/cloudformation/codepipeline-github-action
/2017-03-24.zip

This function uses the following environment variables:
- `GITHUB_REPO_OWNER`
  - The owner of the GitHub repo to create a pull request in.  eg: Giftbit in https://github.com/Giftbit/codepipeline-github-action
- `GITHUB_REPO`
  - The GitHub repo to create a pull request in.  eg: codepipeline-github-action in https://github.com/Giftbit/codepipeline-github-action
- `GITHUB_SOURCE_BRANCH`
  - The GitHub branch to pull from (compre).
- `GITHUB_DEST_BRANCH`
  - The GitHub branch to pull to (base).
- `GITHUB_OAUTH`
  - The [github oauth token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/) for the GitHub user to run the commands as.  This value *must* be KMS encrypted and the lambda function must have permission to decrypt.  See the example CloudFormation template linked below on how this is best configured.
- `AUTO_MERGE` *(optional)*
  - If `true` automatically merge the created pull request.

Check out [Giftbit/sam-scaffold](https://github.com/Giftbit/sam-scaffold/blob/master/typescript/infrastructure/ci.yaml) for an example CloudFormation template that uses this function. 

## Development

The only external dependency is [node](https://nodejs.org/en/).  The source code is written in [TypeScript](https://www.typescriptlang.org/).

From the command line `npm install && npm run build` to build the distribution zip file, which will be at `dist/dist.zip`.
