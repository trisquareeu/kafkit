import { type Socket } from 'net';
import { type ReadBuffer, WriteBuffer } from '../protocol/serialization';
import { ResponseReader } from './response-reader';
import { type Request } from '../protocol/requests';
import { CorrelationIdMismatchError } from '../protocol/exceptions';

type InflightRequest<T> = {
  request: Request<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  correlationId: number;
};

export class Connection {
  private correlationId = 0;

  private readonly responseReader: ResponseReader;

  private readonly inFlightRequests: InflightRequest<any>[] = [];

  constructor(private readonly socket: Socket) {
    this.responseReader = new ResponseReader(this.handleResponse.bind(this));
    socket.on('data', (stream) => this.responseReader.maybeReadResponse(stream));
  }

  public async send<T>(request: Request<T>): Promise<T> {
    const correlationId = this.nextCorrelationId();
    const serializedRequest = new WriteBuffer();
    request.buildHeader(correlationId).serialize(serializedRequest);
    request.serialize(serializedRequest);

    const header = Buffer.alloc(4);
    header.writeInt32BE(serializedRequest.toBuffer().length);
    this.socket.write(Buffer.concat([header, serializedRequest.toBuffer()]));

    return new Promise<T>((resolve, reject) => {
      this.inFlightRequests.push({ request, resolve, reject, correlationId });
    });
  }

  private nextCorrelationId(): number {
    return this.correlationId++;
  }

  private handleResponse(buffer: ReadBuffer): void {
    const oldestRequest = this.inFlightRequests.shift();
    if (oldestRequest === undefined) {
      throw new Error('Received response without a matching request');
    }

    try {
      const { correlationId } = oldestRequest.request.ExpectedResponseHeaderClass.deserialize(buffer);
      if (correlationId.value !== oldestRequest.correlationId) {
        throw new CorrelationIdMismatchError('Received response with unexpected correlation ID');
      }

      const data = oldestRequest.request.ExpectedResponseDataClass.deserialize(buffer);
      oldestRequest.resolve(data);
    } catch (error) {
      oldestRequest.reject(error);
    }
  }
}
