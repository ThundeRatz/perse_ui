import { deepSignal } from '@preact-signals/utils';

interface Config {
  savePaths: {
    node: string;
    path: string;
  }[];
  ignoredParameters: (string | RegExp)[];
  fastFetchTimeout: number;
  slowFetchTimeout: number;
  waitTimeout: number;
  websocketPort: string;
}

export const config = deepSignal<Config>({
  savePaths: [{ node: '/decision_node', path: '~/perse_ws/test.yaml' }],
  ignoredParameters: [/qos_overrides/],
  fastFetchTimeout: 500,
  slowFetchTimeout: 1000,
  waitTimeout: 2000,
  websocketPort: '9090',
});
