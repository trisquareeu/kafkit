import { createConnection } from 'net';
import { ApiVersionsRequestBuilder } from '../protocol/requests/api-versions/api-versions-request-builder';
import { type RequestBuilder } from '../protocol/requests/request-builder';
import { Connection } from './connection';

type SupportedApiVersions = {
  [apiKey: number]: {
    min: number;
    max: number;
  };
};

export class Session {
  private constructor(
    private correlationId: number,
    private readonly connection: Connection,
    private readonly apiVersions: SupportedApiVersions
  ) {}

  public static async create(
    host: string,
    port: number,
    clientId: string | null,
    clientSoftwareName: string,
    clientSoftwareVersion: string
  ): Promise<Session> {
    const connection = new Connection(createConnection({ host, port }));
    let correlationId = 0;

    const request = new ApiVersionsRequestBuilder(clientId, clientSoftwareName, clientSoftwareVersion).build(
      correlationId++,
      0,
      3
    );
    const { apiVersions } = await connection.send(request);
    if (apiVersions.value === null) {
      throw new Error('Received null response');
    }

    const supportedApiVersions = apiVersions.value.reduce<SupportedApiVersions>(
      (acc, { apiKey, minVersion, maxVersion }) => {
        acc[apiKey.value] = { min: minVersion.value, max: maxVersion.value };

        return acc;
      },
      {}
    );

    //todo #1: if ApiVersionsRequest version is not supported, fallback to v0

    return new Session(correlationId, connection, supportedApiVersions);
  }

  public async send<T extends RequestBuilder<any>>(
    requestBuilder: T
  ): Promise<InstanceType<ReturnType<T['build']>['request']['ExpectedResponseDataClass']>> {
    const apiVersions = this.apiVersions[requestBuilder.getApiKey()];
    if (apiVersions === undefined) {
      throw new Error(`API version not supported: ${requestBuilder.getApiKey()}`);
    }

    const request = requestBuilder.build(this.nextCorrelationId(), apiVersions.min, apiVersions.max);

    return this.connection.send(request);
  }

  public isHealthy(): boolean {
    return this.connection.isHealthy();
  }

  private nextCorrelationId(): number {
    return this.correlationId++;
  }
}
