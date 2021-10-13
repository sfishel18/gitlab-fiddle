import { useInterpret, useSelector } from '@xstate/react';
import { isEqual, mapValues, memoize, pick } from 'lodash';
import { useCallback } from 'react';
import { interval, switchMap, map, distinctUntilChanged } from 'rxjs';
import { ajax } from 'rxjs/ajax';
import { createMachine, assign, StateFrom } from 'xstate';
import getJobsByStage from '../utils/getJobsByStage';

const apiUrl = 'http://localhost:3000';

type PipelineContext = {
    yaml: string | null,
    pipelineInfo: any,
    error: any,
};

type EmptyContext = {
    yaml: null,
    pipelineInfo: null,
    error: null,
};

type PipelineEvent = { type: 'SET_YAML', yaml: string } 
    | { type: 'RUN'} 
    | { type: 'CANCEL' } 
    | { type: 'ERROR' } 
    | { type: 'COMPLETE' } 
    | { type: 'SET_PIPELINE_INFO', pipelineInfo: any };

type PipelineTypestate = { value: 'empty', context: EmptyContext } 
    | { value: 'runnable', context: EmptyContext & Pick<PipelineContext, 'yaml'> }
    | { value: 'running', context: PipelineContext } 
    | { value: 'finished', context: PipelineContext & { error: null } }
    | { value: 'error', context: PipelineContext & { pipelineInfo: null } }

const pipelineMachine = createMachine<PipelineContext, PipelineEvent, PipelineTypestate>({
    id: 'pipeline',
    initial: 'empty',
    context: {
        yaml: null,
        pipelineInfo: null,
        error: null
    },
    states: {
        empty: {
            on: { SET_YAML: 'runnable' }
        },
        runnable: {
            on: { 
                CANCEL: 'empty',
                RUN: 'running',
            },
            entry: 'receiveYaml',
        },
        running: {
            on: { 
                CANCEL: 'empty',
                COMPLETE: 'finished',
                ERROR: 'error',
                SET_PIPELINE_INFO: { actions: 'receivePipelineInfo' }
            },
            invoke: {
                id: 'pipelineObserver',
                src: 'createPipelineObservable',
                onDone: {
                    target: 'finished',
                },
                onError: {
                    target: 'error',
                }
            }
        },
        finished: {
            on: {
                CANCEL: 'empty',
                SET_YAML: 'running'
            }
        },
        error: {
            on: {
                CANCEL: 'empty',
                SET_YAML: 'running'
            }
        }
    }
}, {
    actions: {
        receiveYaml: assign({ yaml: (_, event) => { 
            if (event.type !== 'SET_YAML') {
                return null;
            }
            return event.yaml; 
        }}),
        receivePipelineInfo: assign({ pipelineInfo: (_, event) => { 
            if (event.type !== 'SET_PIPELINE_INFO') {
                return null;
            }
            return event.pipelineInfo; 
        }}),
    },
    services: {
        createPipelineObservable: (context) => ajax<{ id: string }>({
            url: `${apiUrl}/pipeline`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              yaml: context.yaml
            }
          }).pipe(
              switchMap(({ response }) => interval(2000).pipe(
                  switchMap(() => ajax<object>(`${apiUrl}/pipeline/${response.id}`)),
                  map(({ response: pipelineInfo }) => mapValues(pipelineInfo, val => pick(val, 'name', 'stage', 'status', 'variables'))),
                  distinctUntilChanged(isEqual),
                  map((pipelineInfo) => ({ type: 'SET_PIPELINE_INFO', pipelineInfo }))
              ))
          )
    }
});

type PipelineState = StateFrom<typeof pipelineMachine>;

const selectIsEmpty = (state: PipelineState) => state.value === 'empty';
const selectIsRunnable = (state: PipelineState) => state.value === 'runnable';
const selectIsRunning = (state: PipelineState) => state.value === 'running';

const selectYaml = (state: PipelineState) => state.context.yaml;
const memoizedGetJobsByStage = memoize(getJobsByStage);
const selectJobsByStage = (state: PipelineState) => memoizedGetJobsByStage(state.context.yaml);
const selectPipelineInfo = (state: PipelineState) => state.context.pipelineInfo;

export default () => {
    const service = useInterpret(pipelineMachine);
    const { send } = service;

    return {
        isEmpty: useSelector(service, selectIsEmpty),
        isRunnable: useSelector(service, selectIsRunnable),
        isRunning: useSelector(service, selectIsRunning),

        yaml: useSelector(service, selectYaml),
        jobsByStage: useSelector(service, selectJobsByStage),
        pipelineInfo: useSelector(service, selectPipelineInfo),

        setYaml: useCallback((yaml: string) => send({ type: 'SET_YAML', yaml }), [send]),
        run: useCallback(() => send('RUN'), [send]),
        cancel: useCallback(() => send('CANCEL'), [send]),
    };
};