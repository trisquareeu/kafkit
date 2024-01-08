import { type Array, type String } from '../../primitives';
import { MetadataResponseV0Data, ResponseHeaderV0 } from '../../responses';
import { type WriteBuffer } from '../../serialization';
import { type RequestHeaderV1 } from '../headers';
import { type Request } from '../request';

export class MetadataRequestV0 implements Request<MetadataResponseV0Data> {
  public readonly ExpectedResponseHeaderClass = ResponseHeaderV0;
  public readonly ExpectedResponseDataClass = MetadataResponseV0Data;

  constructor(
    public readonly header: RequestHeaderV1,
    public readonly topics: Array<String>
  ) {}

  public async serialize(buffer: WriteBuffer): Promise<void> {
    this.header.serialize(buffer);
    await this.topics.serialize(buffer);
  }
}
