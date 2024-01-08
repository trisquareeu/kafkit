import { ResponseHeaderV0 } from '../../responses';
import { ApiVersionsResponseV0Data } from '../../responses/api-versions/api-versions-response-v0';
import { type WriteBuffer } from '../../serialization';
import { type Request } from '../request';
import { type RequestHeaderV1 } from '../headers';

export class ApiVersionsRequestV0 implements Request<ApiVersionsResponseV0Data> {
  public readonly ExpectedResponseHeaderClass = ResponseHeaderV0;
  public readonly ExpectedResponseDataClass = ApiVersionsResponseV0Data;

  constructor(public readonly header: RequestHeaderV1) {}

  public serialize(buffer: WriteBuffer): void {
    this.header.serialize(buffer);
  }
}
