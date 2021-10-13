import React, { useCallback } from 'react';
import useViewModel from '../hooks/useViewModel';

export default () => {
    const { isEmpty, isRunnable, isRunning, yaml, pipelineInfo, setYaml, run, cancel, jobsByStage } = useViewModel();
    const onFileChange = useCallback(e => {
        const { target } = e;
        if (target.files?.length > 0) {
            target.files[0].text().then(setYaml)
        }
    }, [setYaml]);

    return (
        <>
            <header>
                {isEmpty && <input type="file" accept=".yml,.yaml" onChange={onFileChange} />}
                {isRunnable && <>
                    <button onClick={run}>Run</button>
                    <button onClick={cancel}>Cancel</button>
                </>}
                {isRunning && <>
                    Running...
                    <button onClick={cancel}>Cancel</button>
                </>}
            </header>
            <section>
                {!isEmpty && <>
                    <table>
                        <thead>
                            <tr>{jobsByStage?.map(({ stage }) => <th key={stage}>{stage}</th>)}</tr>
                        </thead>
                        <tbody>
                            <tr>
                                {jobsByStage?.map(({ stage, jobs }) => <td key={stage} style={{ verticalAlign: 'top' }}>
                                    <ul>{jobs.map(job => <li key={job.name}>{job.name}{job.status ? `(${job.status})` : null}</li>)}</ul>
                                </td>)}
                            </tr>
                        </tbody>
                    </table>
                </>}
            </section>
            
        </>
    );
}