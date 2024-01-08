import { Int16, Int32, NullableString, Array, String } from '../../primitives';
import { RequestHeaderV1 } from '../headers';
import { type RequestBuilder } from '../request-builder';
import { MetadataRequestV0 } from './metadata-request-v0';

export type MetadataRequest = MetadataRequestV0;

export class MetadataRequestBuilder implements RequestBuilder<MetadataRequest> {
  private static readonly apiKey = 3;

  constructor(
    private readonly clientId: string | null,
    private readonly topics: string[]
  ) {}

  public getApiKey(): number {
    return MetadataRequestBuilder.apiKey;
  }

  public build(correlationId: number, _maxVersion: number): MetadataRequest {
    return new MetadataRequestV0(
      new RequestHeaderV1(
        new Int16(MetadataRequestBuilder.apiKey),
        new Int16(1),
        new Int32(correlationId),
        new NullableString(this.clientId)
      ),
      new Array(
        this.topics.map((topic) => new String(topic)),
        (topic, buffer) => topic.serialize(buffer)
      )
    );
  }
}
