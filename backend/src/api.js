const dotenv = require('dotenv');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const writeFile = util.promisify(require('fs').writeFile);
const fileExists = util.promisify(require('fs').exists);
const fetch = require('node-fetch');
const yaml = require('yaml');
const { omit } = require('lodash');

dotenv.config();
process.env.GIT_SSH_COMMAND = `ssh -i ${path.resolve(__dirname, '..', '.ssh', 'id_ed25519')} -o IdentitiesOnly=yes`;

const projectId = '30142829';
const targetRepoDir = path.join(__dirname, 'pipeline-simulator-target');

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
    }).then(res => res.json());

const gitSetup = async () => {
    const alreadyExists = await fileExists(targetRepoDir);
    if (alreadyExists) {
        await exec(`git checkout main`, { cwd: targetRepoDir });
        return;
    }
    await exec('git clone git@gitlab.com:sfishel/pipeline-simulator-target.git', { cwd: __dirname });
    await exec('git config user.email "api@simonfishel.com"', { cwd: targetRepoDir });
    await exec('git config user.name "API User"', { cwd: targetRepoDir });
};

const waitForPipelineCreated = async (ref, pipelineId) => {
    let pipelines = [];
    while (!pipelines || !pipelines.some(pipeline => pipeline.id === pipelineId)) {
        pipelines = await gitlabRequest(`pipelines?ref=${ref}`);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
};

module.exports.createPipeline = async (yaml, overrides) => {
    const branchName = `branch-${Date.now()}`;
    await gitSetup();
    await exec(`git checkout -b ${branchName}`, { cwd: targetRepoDir });
    const processedYaml = preprocessYaml(yaml);
    await writeFile(`${targetRepoDir}/.gitlab-ci.yml`, processedYaml, { encoding: 'utf-8' });
    await exec('git add .gitlab-ci.yml', { cwd: targetRepoDir });
    await exec('git commit -m "create pipeline definition"', { cwd: targetRepoDir });
    await exec(`git push -u origin ${branchName} -o ci.skip`, { cwd: targetRepoDir });
    const { id: pipelineId } = await gitlabRequest(`trigger/pipeline?ref=${branchName}&token=${process.env.GITLAB_TRIGGER_TOKEN}`, { method: 'POST' });
    await waitForPipelineCreated(branchName, pipelineId);
    return branchName;
};

module.exports.updatePipeline = async (ref, yaml, overrides) => {
    await gitSetup();
    await exec(`git checkout ${ref}`, { cwd: targetRepoDir });
    const processedYaml = preprocessYaml(yaml);
    await writeFile(`${targetRepoDir}/.gitlab-ci.yml`, processedYaml, { encoding: 'utf-8' });
    // TODO: what if nothing changed?
    await exec('git add .gitlab-ci.yml', { cwd: targetRepoDir });
    await exec('git commit -m "update pipeline definition"', { cwd: targetRepoDir });
    await exec(`git push -u origin ${ref} -o ci.skip`, { cwd: targetRepoDir });
    const { id: pipelineId } = await gitlabRequest(`trigger/pipeline?ref=${ref}&token=${process.env.GITLAB_TRIGGER_TOKEN}`, { method: 'POST' });
    await waitForPipelineCreated(ref, pipelineId);
};

module.exports.getPipeline = async (ref) => {
    const pipelines = await gitlabRequest(`pipelines?ref=${ref}`);
    const jobs = await gitlabRequest(`pipelines/${pipelines[0].id}/jobs`);
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