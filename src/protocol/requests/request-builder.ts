import { type RequestResponseType, type Request } from './request';

export interface RequestBuilder<T extends Request<any>> {
  getApiKey(): number;

  build(correlationId: number, minVersion: number, maxVersion: number): T;
}

export type RequestBuilderResponseType<T extends RequestBuilder<any>> = RequestResponseType<ReturnType<T['build']>>;
