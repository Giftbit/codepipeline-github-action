export interface CodePipelineEvent {
    "CodePipeline.job": {
        id: string;
        accountId: string;
        data: {
            actionConfiguration: {
                configuration: {
                    FunctionName: string;
                    UserParameters: string;
                }
            },
            inputArtifacts: any[];
            outputArtifacts: any[];
            artifactCredentials: {
                secretAccessKey: string;
                sessionToken: string;
                accessKeyId: string;
            }
        }
    };
}
