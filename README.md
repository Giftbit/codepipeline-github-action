# lambda-github-pusher

Push GitHub branches in a CodePipeline. 

## Usage

This is the source code for an [AWS Lambda](http://docs.aws.amazon.com/lambda/latest/dg/welcome.html) function that can be used as a [CodePipeline](http://docs.aws.amazon.com/codepipeline/latest/userguide/welcome.html) step to create and merge a[GitHub pull request](https://help.github.com/articles/about-pull-requests/) between branches.  This is most useful as part of a continuous integration flow between a staging pipeline and a production pipeline.

To use this in your own CodePipeline you can build the project and upload it to your own S3 bucket, or you can reference the latest build at [s3://giftbit-public-resources/cloudformation/lambda-github-pusher/2017-01-23.zip](s3://giftbit-public-resources/cloudformation/lambda-github-pusher/2017-01-23.zip)

This function uses the following environment variables:
- `GITHUB_REPO_OWNER`
  - The owner of the github repo to create a pull request in.  eg: Giftbit in https://github.com/Giftbit/lambda-github-pusher
- `GITHUB_REPO`
  - The github repo to create a pull request in.  eg: lambda-github-pusher in https://github.com/Giftbit/lambda-github-pusher
- `GITHUB_SOURCE_BRANCH`
  - The github branch to pull from.
- `GITHUB_DEST_BRANCH`
  - The github branch to merge into.
- `GITHUB_OAUTH`
  - The [github oauth token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/) for the GitHub user to run the commands as.  This value *must* be KMS encrypted.  See the example CloudFormation template linked below for how the token can be encrypted automatically.

Check out *TODO* for an example CloudFormation template that uses this function. 

## Development

The only external dependency is [node](https://nodejs.org/en/).  The source code is written in [TypeScript](https://www.typescriptlang.org/).

From the command line `npm install; npm run build` to build the distribution zip file, which will be at `dist/dist.zip`.
