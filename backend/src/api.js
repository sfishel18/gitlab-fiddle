const dotenv = require('dotenv');
const fetch = require('node-fetch');
const yaml = require('yaml');
const { omit } = require('lodash');

dotenv.config();

const projectId = '30142829';

const jobIsComplete = job => job.status === 'success' || job.status === 'failed';

const topLevelKeys = ['include', 'stages', 'workflow', 'variables'];
const jobKeywordDenyList = ['before_script', 'script', 'after_script', 'image', 'tags', 'environment', 'cache', 'artifacts', 'dast_configuration', 'release', 'secrets', 'pages', 'trigger', 'dependencies', 'services'];

const preprocessYaml = (yamlString, overrides) => {
 const yamlObject = yaml.parse(yamlString);
 const parsedObject = Object.fromEntries(Object.entries(yamlObject).map(([key, config]) => {
  if (topLevelKeys.includes(key)) {
      return [key, config]
  }
  const parsedConfig = {
      ...omit(config, jobKeywordDenyList),
      image: 'dwdraju/alpine-curl-jq@sha256:5f6561fff50ab16cba4a9da5c72a2278082bcfdca0f72a9769d7e78bdc5eb954',
      script: ['jq -n env > job-variables.json'],
      artifacts: { paths: ['job-variables.json'] }
  }
  return [key, parsedConfig]
 }));
 return yaml.stringify(parsedObject)
}

const gitlabRequest = (uri, options = {}) => fetch(
    `https://gitlab.com/api/v4/projects/${projectId}/${uri}`, 
    { 
        ...options, 
        headers: {
            ...options.headers,
            'PRIVATE-TOKEN': process.env.GITLAB_API_TOKEN
        },
    }).then(res => { 

        return res.json();
    });

module.exports.createPipeline = async (yaml, overrides) => {
    const processedYaml = preprocessYaml(yaml);
    const formBody = new URLSearchParams();
    formBody.append('ref', 'main');
    formBody.append('token', process.env.GITLAB_TRIGGER_TOKEN);
    formBody.append('variables[YAML]', processedYaml);
    const { id: pipelineId } = await gitlabRequest('trigger/pipeline', { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formBody
     });
    return pipelineId;
};

module.exports.getPipeline = async (pipelineId) => {
    const bridges = await gitlabRequest(`pipelines/${pipelineId}/bridges`);
    if (bridges.length === 0 || !bridges[0].downstream_pipeline) {
        return { dummy: { status: 'created' } }
    }
    const jobs = await gitlabRequest(`pipelines/${bridges[0].downstream_pipeline.id}/jobs`);
    const jobsByName = {};
    const jobArtifactPromises = [];
    jobs.forEach(job => {
        jobsByName[job.name] = job;
        if (jobIsComplete(job)) {
            jobArtifactPromises.push(gitlabRequest(`jobs/${job.id}/artifacts/job-variables.json`).then(variables => jobsByName[job.name].variables = variables));
        }
    });
    await Promise.all(jobArtifactPromises);
    return jobsByName;
};