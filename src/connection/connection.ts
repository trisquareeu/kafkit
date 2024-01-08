import { type Socket } from 'net';
import { type ReadBuffer, WriteBuffer } from '../protocol/serialization';
import { ResponseReader } from './response-reader';
import { type RequestResponseType, type Request } from '../protocol/requests';
import { CorrelationIdMismatchError } from '../protocol/exceptions';

type InflightRequest<T> = {
  request: Request<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  correlationId: number;
};

export class Connection {
  private readonly responseReader: ResponseReader;

  private readonly inFlightRequests: InflightRequest<any>[] = [];

  constructor(private readonly socket: Socket) {
    this.responseReader = new ResponseReader(this.handleResponse.bind(this));
    socket.on('data', (stream) => this.responseReader.maybeReadResponse(stream));
  }

  public async send<T extends Request<any>>(request: T): Promise<RequestResponseType<T>> {
    const serializedRequest = new WriteBuffer();
    request.serialize(serializedRequest);

    const header = Buffer.alloc(4);
    header.writeInt32BE(serializedRequest.toBuffer().length);
    this.socket.write(Buffer.concat([header, serializedRequest.toBuffer()]));
    //todo: implement problem handling

    return new Promise<RequestResponseType<T>>((resolve, reject) => {
      this.inFlightRequests.push({ request, resolve, reject, correlationId: request.header.correlationId.value });
    });
  }

  public isHealthy(): boolean {
    return this.socket.writable && this.socket.readable;
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
