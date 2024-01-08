import { Array, Int16, Int32, NullableString } from '../../primitives';
import { RequestHeaderV1 } from '../headers';
import { type RequestBuilder } from '../request-builder';
import { ProduceRequestV3 } from './produce-request-v3';
import { type TopicDataV3 } from './topic-data';

export type ProduceRequest = ProduceRequestV3;

export class ProduceRequestBuilder implements RequestBuilder<ProduceRequest> {
  private static readonly apiKey = 0;

  // TODO: We need some proper mapping between domain types and protocol types
  constructor(
    private readonly clientId: string | null,
    private readonly transactionalId: string | null,
    private readonly acks: -1 | 0 | 1,
    private readonly timeoutMs: number
  ) {}

  public getApiKey(): number {
    return ProduceRequestBuilder.apiKey;
  }

  public build(correlationId: number, _minVersion: number, _maxVersion: number): ProduceRequestV3 {
    return new ProduceRequestV3(
      new RequestHeaderV1(
        new Int16(ProduceRequestBuilder.apiKey),
        new Int16(3),
        new Int32(correlationId),
        new NullableString(this.clientId)
      ),
      new NullableString(this.transactionalId),
      new Int16(this.acks),
      new Int32(this.timeoutMs),
      new Array<TopicDataV3>([]) // TODO: We need some proper mapping between protocol types and domain types
    );
  }
}
