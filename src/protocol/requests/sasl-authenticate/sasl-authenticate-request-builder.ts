import { Bytes, Int16, Int32, NullableString } from '../../primitives';
import { RequestHeaderV1 } from '../headers';
import { type RequestBuilder } from '../request-builder';
import { SaslAuthenticateRequestV0 } from './sasl-authenticate-request-v0';

export type SaslAuthenticateRequest = SaslAuthenticateRequestV0;

export class SaslAuthenticateRequestBuilder implements RequestBuilder<SaslAuthenticateRequest> {
  private static readonly apiKey = 36;

  constructor(
    private readonly authBytes: Buffer,
    private readonly clientId: string | null
  ) {}

  public getApiKey(): number {
    return SaslAuthenticateRequestBuilder.apiKey;
  }

  public build(correlationId: number, _minVersion: number, _maxVersion: number): SaslAuthenticateRequestV0 {
    return new SaslAuthenticateRequestV0(
      new RequestHeaderV1(
        new Int16(SaslAuthenticateRequestBuilder.apiKey),
        new Int16(0),
        new Int32(correlationId),
        new NullableString(this.clientId)
      ),
      new Bytes(this.authBytes)
    );
  }
}
