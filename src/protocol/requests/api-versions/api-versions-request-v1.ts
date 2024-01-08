import { ResponseHeaderV0 } from '../../responses';
import { ApiVersionsResponseV1Data } from '../../responses/api-versions';
import { type WriteBuffer } from '../../serialization';
import { type Request } from '../request';
import { type RequestHeaderV1 } from '../headers';

export class ApiVersionsRequestV1 implements Request<ApiVersionsResponseV1Data> {
  public readonly ExpectedResponseHeaderClass = ResponseHeaderV0;
  public readonly ExpectedResponseDataClass = ApiVersionsResponseV1Data;

  constructor(public readonly header: RequestHeaderV1) {}

  public serialize(buffer: WriteBuffer): void {
    this.header.serialize(buffer);
  }
}
