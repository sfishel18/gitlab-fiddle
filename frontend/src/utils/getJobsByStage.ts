import { uniq } from 'lodash';
import yaml, { Document } from 'yaml';
import { PipelineJob } from '../type';

const parseStagesOrdered = (yamlDoc: Document.Parsed, yamlObject: ReturnType<typeof yaml.parse>) => {
    if (!yamlDoc.contents || yamlDoc.contents.type !== 'MAP') {
        return [];
    }
    return uniq(yamlDoc.contents.items.map(item => {
        const jobName = item.key.value;
        return yamlObject[jobName]?.stage || 'test';
    }));
}

export default (yamlString: string | null): { stage: string, jobs: Partial<PipelineJob>[] }[] | null => {
    if (!yamlString) {
        return null;
    }
    const yamlObject = yaml.parse(yamlString);
    let stages: string[] = yamlObject.stages;
    if (!Array.isArray(stages)) {
        const yamlDoc = yaml.parseDocument(yamlString);
        stages = parseStagesOrdered(yamlDoc, yamlObject);
    }
    const stagesWithJobs = stages.map((stage: string) => ({
        stage,
        jobs: Object.entries(yamlObject).reduce((carry, [key, value]) => {
            if (((value as any).stage || 'test') === stage) {
                return carry.concat({ name: key });
            }
            return carry;
        }, [] as Partial<PipelineJob>[])
    }));
    return stagesWithJobs.filter(({ jobs }) => jobs.length > 0)
}