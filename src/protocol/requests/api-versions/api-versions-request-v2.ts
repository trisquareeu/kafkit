import { ResponseHeaderV0 } from '../../responses';
import { ApiVersionsResponseV2Data } from '../../responses/api-versions';
import { type WriteBuffer } from '../../serialization';
import { type Request } from '../request';
import { type RequestHeaderV1 } from '../headers';

export class ApiVersionsRequestV2 implements Request<ApiVersionsResponseV2Data> {
  public readonly ExpectedResponseHeaderClass = ResponseHeaderV0;
  public readonly ExpectedResponseDataClass = ApiVersionsResponseV2Data;

  constructor(public readonly header: RequestHeaderV1) {}

  public serialize(buffer: WriteBuffer): void {
    this.header.serialize(buffer);
  }
}
