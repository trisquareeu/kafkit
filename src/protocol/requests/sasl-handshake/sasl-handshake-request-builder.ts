import { Int16, Int32, NullableString, String } from '../../primitives';
import { RequestHeaderV1 } from '../headers';
import { type RequestBuilder } from '../request-builder';
import { SaslHandshakeRequestV1 } from './sasl-handshake-request-v1';

export type SaslHandshakeRequest = SaslHandshakeRequestV1;

export class SaslHandshakeRequestBuilder implements RequestBuilder<SaslHandshakeRequest> {
  private static readonly apiKey = 17;

  constructor(
    private readonly mechanism: string,
    private readonly clientId: string | null
  ) {}

  public getApiKey(): number {
    return SaslHandshakeRequestBuilder.apiKey;
  }

  public build(correlationId: number, _minVersion: number, _maxVersion: number): SaslHandshakeRequestV1 {
    return new SaslHandshakeRequestV1(
      new RequestHeaderV1(
        new Int16(SaslHandshakeRequestBuilder.apiKey),
        new Int16(1),
        new Int32(correlationId),
        new NullableString(this.clientId)
      ),
      new String(this.mechanism)
    );
  }
}
