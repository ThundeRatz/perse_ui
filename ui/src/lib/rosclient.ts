import * as ROSLIB from 'roslib';
import { Ros, Service } from 'roslib';
import { zip, withTimeout, compareListOfObjects } from './utils';
import { batch, signal, Signal } from '@preact-signals/safe-react';
import { config } from './config';
import {
  valueFromParameterValue,
  type GetVariantMsg,
  type ListParametersResultMsg,
  type NodeStateMsg,
  type Parameter,
  type ParameterMsg,
  type ParameterValue,
  type ReactiveDescription,
  type ResultMsg,
  type ROSTopic,
  type SubscribedParameter,
} from './ros_utils';

let fastFetchInterval: ReturnType<typeof setInterval>;
let slowFetchInterval: ReturnType<typeof setInterval>;

export class RosClient {
  readonly ros: Ros;
  readonly port: string;
  isConnected: Signal<boolean> = signal(false);
  topics: Signal<ROSTopic[]> = signal([]);
  nodes: Signal<string[]> = signal([]);
  services: Signal<string[]> = signal([]);
  modified: Signal<boolean> = signal(false);
  reactiveDescriptions: ReactiveDescription[] = [];
  node_states: Signal<NodeStateMsg[]> = signal([]);
  private subscribedParameters: SubscribedParameter[] = [];
  private fastFetchTimeout: number;
  private slowFetchTimeout: number;
  private waitTimeout: number;
  private topicSubscribers: ROSLIB.Topic[] = [];

  constructor(config: { port: string; fastFetchTimeout: number; slowFetchTimeout: number; waitTimeout: number }) {
    this.port = config.port;
    this.fastFetchTimeout = config.fastFetchTimeout;
    this.slowFetchTimeout = config.slowFetchTimeout;
    this.waitTimeout = config.waitTimeout;
    this.ros = new Ros({
      url: `ws://localhost:${this.port}`,
    });

    this.ros.on('connection', async () => {
      console.log('connected!');
      this.isConnected.value = true;

      this.subscribeTopic(
        '/perse_ui/node_states',
        'perse_msgs/msg/NodeStates',
        (msg) => {
          const states = (msg as { states: NodeStateMsg[] }).states;
          if (!compareListOfObjects(states, this.node_states.value)) {
            this.node_states.value = states;
            console.log(msg);
          }
        },
        true,
      );

      // eslint-disable-next-line prettier/prettier
      const interval_id = window.setInterval(function () { }, Number.MAX_SAFE_INTEGER);
      for (let i = 1; i < interval_id; i++) {
        window.clearInterval(i);
      }

      slowFetchInterval = setInterval(async () => {
        try {
          await withTimeout<void>(
            'services',
            (async () => {
              for (const { listService, valueService, parameters, callback, modified } of this.subscribedParameters) {
                const list_parameter_response = (await RosClient.callService('', listService)) as ListParametersResultMsg;
                const get_values_response = (await RosClient.callService(
                  {
                    names: list_parameter_response.result.names,
                  },
                  valueService,
                )) as { values: ParameterMsg['value'][] };
                const parameter_names = list_parameter_response.result.names;
                const parameter_values = get_values_response.values;

                const new_parameters: Parameter[] = Array.from(
                  zip(parameter_names, parameter_values),
                  ([name, parameter_value]) => ({
                    name: name,
                    type: parameter_value.type,
                    value: valueFromParameterValue(parameter_value),
                  }),
                );

                if (!compareListOfObjects(parameters.value, new_parameters)) {
                  batch(() => {
                    parameters.value = new_parameters;
                    modified.value = false;
                    console.log(parameters.value);
                  });

                  callback?.(parameters.value);
                }
              }
            })(),
            this.waitTimeout,
            () => console.warn("Couldn't call all services in time"),
          );
        } catch (e) {
          const message = (e as Error).toString();
          const unknownServiceRegex = /Service (?<name>\S+) does not exist/;
          const match = unknownServiceRegex.exec(message);

          if (!match?.groups?.name) {
            throw e;
          }
          const errorSub = this.subscribedParameters.find((sub) => sub.nodeName + '/list_parameters');
          if (!errorSub) {
            throw e;
          }

          errorSub.error = true;
          errorSub.parameters.value = [];
          this.subscribedParameters.splice(this.subscribedParameters.indexOf(errorSub), 1);
        }
      }, this.slowFetchTimeout);
      fastFetchInterval = setInterval(async () => {
        const topics =
          (await withTimeout('topics', this.getTopics(), this.waitTimeout, () =>
            console.warn("Couldn't fetch topics in time"),
          )) || this.topics.value;
        if (topics.toString() != this.topics.value.toString()) this.topics.value = topics;

        const nodes =
          (await withTimeout('nodes', this.getNodes(), this.waitTimeout, () => console.warn("Couldn't fetch nodes in time"))) ||
          this.nodes.value;
        if (nodes.toString() != this.nodes.value.toString()) this.nodes.value = nodes;

        const services =
          (await withTimeout('services', this.getServices(), this.waitTimeout, () =>
            console.warn("Couldn't fetch services in time"),
          )) || this.nodes.value;
        if (services.toString() != this.services.value.toString()) this.services.value = services;
      }, this.fastFetchTimeout);
    });

    const clean = () => {
      batch(() => {
        this.isConnected.value = false;
        this.topics.value = [];
        this.nodes.value = [];
        this.node_states.value = [];

        this.services.value = [];

        for (const topic of this.topicSubscribers) {
          topic.unsubscribe();
        }
        this.topicSubscribers = [];

        for (const sub of this.subscribedParameters) {
          sub.parameters.value = [];
          sub.error = true;
          sub?.dispose?.();
        }
        for (const desc of this.reactiveDescriptions) {
          desc.dispose?.();
        }
        this.subscribedParameters = [];
        clearInterval(fastFetchInterval);
        clearInterval(slowFetchInterval);
      });
    };
    this.ros.on('error', clean);
    this.ros.on('close', clean);
  }

  getNodes() {
    return new Promise<string[]>((resolve, reject) => {
      this.ros.getNodes(resolve, reject);
    });
  }

  static callService<T, U>(request: T, service: Service<T, U>) {
    return new Promise<U>((resolve, reject) => {
      service.callService(request, resolve, reject);
    });
  }

  getServices() {
    return new Promise<string[]>((resolve, reject) => {
      this.ros.getServices(resolve, reject);
    });
  }

  async saveVariant(node: string, variant: string, parameters: ParameterMsg[]): Promise<ResultMsg> {
    const serviceSaveVariant = new ROSLIB.Service({
      ros: this.ros,
      name: '/perse_ui/save_variant',
      serviceType: 'perse_msgs/SaveVariant',
    });

    return await RosClient.callService({ node, variant, parameters }, serviceSaveVariant);
  }

  async installVariant(path: string, node: string, variant: string): Promise<ResultMsg> {
    const serviceInstallVariant = new ROSLIB.Service({
      ros: this.ros,
      name: '/perse_ui/install_variant',
      serviceType: 'perse_msgs/InstallVariant',
    });

    return await RosClient.callService({ path, node, variant }, serviceInstallVariant);
  }

  async deleteVariant(node: string, variant: string): Promise<ResultMsg> {
    const serviceDeleteVariant = new ROSLIB.Service({
      ros: this.ros,
      name: '/perse_ui/delete_variant',
      serviceType: 'perse_msgs/DeleteVariant',
    });

    return await RosClient.callService({ node, variant }, serviceDeleteVariant);
  }

  async getVariant(node: string, variant: string): Promise<GetVariantMsg> {
    const service = new ROSLIB.Service({
      ros: this.ros,
      name: '/perse_ui/get_variant',
      serviceType: 'perse_msgs/GetVariant',
    });
    return await RosClient.callService({ node, variant }, service);
  }

  createReactiveDescription(name: string, type: number, value: ParameterValue, autoTrack = true): ReactiveDescription {
    const paramSignal = signal(value);
    const modifiedSignal = signal(false);
    const originalValue = signal(value);

    const d1 = originalValue.subscribe((v) => {
      modifiedSignal.value = paramSignal.value != v;
    });
    const d2 = paramSignal.subscribe((v) => {
      modifiedSignal.value = v != originalValue.value;
    });

    const desc = {
      name,
      type,
      original: originalValue,
      modified: modifiedSignal,
      signal: paramSignal,
      subscribe: function (callback: (value: ParameterValue) => void) {
        const oldDispose = this.dispose;
        const dispose = this.signal.subscribe(callback);
        this.dispose = () => {
          oldDispose?.();
          dispose();
        };
      },
      dispose: () => {
        d1();
        d2();
      },
    };

    if (autoTrack) {
      const oldDispose = desc.dispose;
      const trackDispose = this.trackReactiveDescription(desc);
      desc.dispose = () => {
        oldDispose();
        trackDispose();
      };
    }

    return desc;
  }

  trackReactiveDescription(reactiveDescription: ReactiveDescription) {
    this.reactiveDescriptions.push(reactiveDescription);

    const d3 = reactiveDescription.modified.subscribe(() => {
      this.modified.value = this.reactiveDescriptions.some((desc) => desc.modified.value);
    });

    return () => {
      d3();
      this.reactiveDescriptions = this.reactiveDescriptions.filter((desc) => desc !== reactiveDescription);
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, prettier/prettier
  subscribeParameterService(nodeName: string, callback: (response: Record<string, any>) => void = () => { }) {
    if (!nodeName.length) throw Error(`Invalid node name: ${nodeName}`);
    if (!this.services.value.find((s) => s == `${nodeName}/list_parameters`)) {
      return null;
    }
    const foundSubscription = this.subscribedParameters.find((v) => v.nodeName == nodeName);
    if (foundSubscription) return foundSubscription;

    const subscription: SubscribedParameter = {
      nodeName,
      callback,
      parameters: signal([]),
      listService: new ROSLIB.Service({
        ros: this.ros,
        name: `/${nodeName}/list_parameters`.replace(/^\/+/g, '/'),
        serviceType: 'rcl_interfaces/srv/ListParameters',
      }),
      valueService: new ROSLIB.Service({
        ros: this.ros,
        name: `/${nodeName}/get_parameters`.replace(/^\/+/g, '/'),
        serviceType: 'rcl_interfaces/srv/GetParameters',
      }),
      error: false,
      modified: signal(false),
      asReactive(pattern, inverse = false) {
        return this.parameters.value
          .filter(({ type, name }) => {
            if (type > 4) return false;
            let patternResult = pattern == undefined || pattern.test(name);
            patternResult = inverse ? !patternResult : patternResult;
            return (
              !config.peek().ignoredParameters.some((global_pattern) => {
                if (typeof global_pattern == 'string') {
                  return name == global_pattern;
                }
                return global_pattern.test(name);
              }) && patternResult
            );
          })
          .map(({ name, type, value }) => rosclient.createReactiveDescription(name, type, value, true));
      },
    };

    this.subscribedParameters.push(subscription);
    return subscription;
  }

  getTopics() {
    return new Promise<ROSTopic[]>((resolve, reject) => {
      this.ros.getTopics(({ topics, types }) => {
        resolve(Array.from(zip(topics, types), ([topic, type]) => ({ topic, type })));
      }, reject);
    });
  }

  subscribeTopic<T = ROSLIB.Message>(name: string, messageType: string, callback: (msg: T) => void, preventDuplicate = false) {
    let topic = this.topicSubscribers.find((sub) => sub.name == name && sub.messageType == messageType);

    if (!topic) {
      topic = new ROSLIB.Topic({
        ros: this.ros,
        name,
        messageType,
      });
      this.topicSubscribers.push(topic);
    } else if (preventDuplicate == true) {
      return;
    }
    (topic as ROSLIB.Topic<T>).subscribe(callback);
  }

  unsubscribeTopic(name: string, messageType: string) {
    const index = this.topicSubscribers.findIndex((sub) => sub.name == name && sub.messageType == messageType);
    if (index != -1) {
      const topic = this.topicSubscribers[index];
      topic.unsubscribe();
      this.topicSubscribers.splice(index, 1);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(eventName: string, callback: (event: any) => void) {
    this.ros.on(eventName, callback);
  }

  connect() {
    this.ros.connect(`ws://localhost:${this.port}`);
  }

  close() {
    this.ros.close();
  }
}

const { websocketPort, fastFetchTimeout, waitTimeout, slowFetchTimeout } = config.value;

export const rosclient = new RosClient({ port: websocketPort, fastFetchTimeout, waitTimeout, slowFetchTimeout });
