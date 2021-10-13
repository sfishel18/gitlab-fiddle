import { PipelineInfo } from "../type";

export default (pipelineInfo: PipelineInfo) => Object.values(pipelineInfo).some(({ status }) => ['created', 'running'].includes(status));