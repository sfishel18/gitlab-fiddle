export type PipelineJob = { name: string, status: string, stage: string, variables: Record<string, string> };

export type PipelineInfo = Record<string, PipelineJob>