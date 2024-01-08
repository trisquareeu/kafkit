import { TagSection } from '../../commons';
import { type CompactString, Int16, Int32, type NullableString } from '../../primitives';
import { RequestHeaderV1, RequestHeaderV2 } from '../headers';
import { type RequestBuilder } from '../request-builder';
import { ApiVersionsRequestV0 } from './api-versions-request-v0';
import { ApiVersionsRequestV1 } from './api-versions-request-v1';
import { ApiVersionsRequestV2 } from './api-versions-request-v2';
import { ApiVersionsRequestV3 } from './api-versions-request-v3';

export type ApiVersionsRequest =
  | ApiVersionsRequestV0
  | ApiVersionsRequestV1
  | ApiVersionsRequestV2
  | ApiVersionsRequestV3;

export class ApiVersionsRequestBuilder implements RequestBuilder<ApiVersionsRequest> {
  private static readonly apiKey = 18;

  constructor(
    private readonly clientId: NullableString,
    private readonly clientSoftwareName: CompactString,
    private readonly clientSoftwareVersion: CompactString
  ) {}

  public getApiKey(): number {
    return ApiVersionsRequestBuilder.apiKey;
  }

  public build(correlationId: number, minVersion: number, maxVersion: number): ApiVersionsRequest {
    if (minVersion < 0) {
      throw new Error(``); // TODO Add some proper exception
    }

    switch (maxVersion) {
      case 0:
        return new ApiVersionsRequestV0(
          new RequestHeaderV1(
            new Int16(ApiVersionsRequestBuilder.apiKey),
            new Int16(0),
            new Int32(correlationId),
            this.clientId
          )
        );
      case 1:
        return new ApiVersionsRequestV1(
          new RequestHeaderV1(
            new Int16(ApiVersionsRequestBuilder.apiKey),
            new Int16(1),
            new Int32(correlationId),
            this.clientId
          )
        );
      case 2:
        return new ApiVersionsRequestV2(
          new RequestHeaderV1(
            new Int16(ApiVersionsRequestBuilder.apiKey),
            new Int16(2),
            new Int32(correlationId),
            this.clientId
          )
        );
      case 3:
      default:
        return new ApiVersionsRequestV3(
          new RequestHeaderV2(
            new Int16(ApiVersionsRequestBuilder.apiKey),
            new Int16(3),
            new Int32(correlationId),
            this.clientId,
            new TagSection()
          ),
          this.clientSoftwareName,
          this.clientSoftwareVersion,
          new TagSection()
        );
    }
  }
}
