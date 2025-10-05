// Utility: event payload augmented with its event name
type WithEventName<N extends string, P> = P & { eventName?: N };

// A map from event name -> payload type
export type EventMapBase = Record<string, unknown>;

export type EmittedEventName<M extends EventMapBase> = keyof M & string;

export type GenericEventCallback<
  M extends EventMapBase,
  N extends EmittedEventName<M>
> = (event: CustomEvent<WithEventName<N, M[N]>>) => void;

export interface GenericEventListener<
  M extends EventMapBase,
  N extends EmittedEventName<M>
> {
  name: N;
  namespace?: string;
  callback?: GenericEventCallback<M, N>;
}

export interface GenericEventDispatcher<
  M extends EventMapBase,
  N extends EmittedEventName<M>
> {
  name: N;
  payload?: M[N];
}

export type EventsListener<M extends EventMapBase> = Omit<
  GenericEventListener<M, EmittedEventName<M>>,
  "name"
> & {
  names: EmittedEventName<M>[];
  namespace?: string;
  callback?: GenericEventCallback<M, EmittedEventName<M>>;
};

export type EventListener<
  M extends EventMapBase,
  N extends EmittedEventName<M> = EmittedEventName<M>
> = GenericEventListener<M, N>;

export type EventDispatcher<
  M extends EventMapBase,
  N extends EmittedEventName<M> = EmittedEventName<M>
> = GenericEventDispatcher<M, N>;

const GLOBAL = "global";

export interface IEventEmitter<M extends EventMapBase> {
  addEventListener<N extends EmittedEventName<M>>(
    listener: EventListener<M, N>
  ): EventListener<M, N>;
  addEventsListener(listener: EventsListener<M>): EventListener<M>[];
  dispatchEvent<N extends EmittedEventName<M>>(
    dispatcher: EventDispatcher<M, N>
  ): void;
  removeEventListener<N extends EmittedEventName<M>>(
    listener: EventListener<M, N>
  ): void;
  removeAllListeners(namespace?: string): void;
  removeEventListeners(listeners: EventListener<M>[]): void;
}

export class EventEmitterNamespace<M extends EventMapBase>
  implements IEventEmitter<M>
{
  private namespace: string;
  private eventEmitter: EventEmitter<M>;
  private subscriber?: (event: EventDispatcher<M>) => void;

  constructor(
    namespace: string,
    eventEmitter: EventEmitter<M>,
    subscriber?: (event: EventDispatcher<M>) => void
  ) {
    this.namespace = namespace;
    this.eventEmitter = eventEmitter;
    this.subscriber = subscriber;
  }

  dispatchEvent<N extends EmittedEventName<M>>(
    dispatcher: EventDispatcher<M, N>
  ) {
    this.eventEmitter.dispatchEvent(dispatcher);
    if (this.subscriber) {
      this.subscriber(dispatcher);
    }
  }

  addEventListener<N extends EmittedEventName<M>>(
    listener: EventListener<M, N>
  ): EventListener<M, N> {
    return this.eventEmitter.addEventListener({
      ...listener,
      namespace: this.namespace,
    });
  }

  addEventsListener(listener: EventsListener<M>): EventListener<M>[] {
    return this.eventEmitter.addEventsListener({
      ...listener,
      namespace: this.namespace,
    });
  }

  removeEventListener<N extends EmittedEventName<M>>(
    listener: EventListener<M, N>
  ) {
    this.eventEmitter.removeEventListener(listener);
  }

  removeEventListeners(listeners: EventListener<M>[]) {
    this.eventEmitter.removeEventListeners(listeners);
  }

  removeAllListeners() {
    this.eventEmitter.removeAllListeners(this.namespace);
  }
}

export class EventEmitter<M extends EventMapBase> implements IEventEmitter<M> {
  private eventTarget: EventTarget;
  private controllers: Map<string, AbortController>;

  constructor() {
    this.eventTarget = new EventTarget();
    this.controllers = new Map([[GLOBAL, new AbortController()]]);
  }

  private setNamespace(namespace: string) {
    if (!namespace) throw new Error("namespace should be valid");
    if (!this.controllers.has(namespace)) {
      this.controllers.set(namespace, new AbortController());
    }
  }

  addEventListener<N extends EmittedEventName<M>>({
    name,
    callback,
    namespace = GLOBAL,
  }: EventListener<M, N>): EventListener<M, N> {
    this.setNamespace(namespace);
    // `EventTarget` is untyped for our payload; cast the callback safely.
    this.eventTarget.addEventListener(
      name,
      callback as unknown as EventListenerOrEventListenerObject,
      { signal: this.controllers.get(namespace)?.signal }
    );
    return { name, callback, namespace };
  }

  addEventsListener({
    names,
    namespace,
    callback,
  }: EventsListener<M>): EventListener<M>[] {
    return names.map((name) =>
      this.addEventListener({ name, namespace, callback })
    );
  }

  removeEventListeners(listeners: EventListener<M>[]) {
    listeners.forEach((listener) => this.removeEventListener(listener));
  }

  removeEventListener<N extends EmittedEventName<M>>({
    name,
    callback,
  }: EventListener<M, N>) {
    this.eventTarget.removeEventListener(
      name,
      callback as unknown as EventListenerOrEventListenerObject
    );
  }

  dispatchEvent<N extends EmittedEventName<M>>({
    name,
    payload,
  }: EventDispatcher<M, N>) {
    const detail = {
      ...(payload as object | undefined),
      eventName: name,
    } as WithEventName<N, M[N]>;
    this.eventTarget.dispatchEvent(new CustomEvent(name, { detail }));
  }

  removeAllListeners(namespace = GLOBAL) {
    this.controllers.get(namespace)?.abort();
  }

  /**
   * Optional helper to get a namespaced emitter sharing the same underlying target.
   */
  namespace(
    namespace: string,
    subscriber?: (event: EventDispatcher<M>) => void
  ) {
    return new EventEmitterNamespace<M>(namespace, this, subscriber);
  }
}
