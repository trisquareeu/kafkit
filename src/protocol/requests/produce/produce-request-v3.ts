import { type Int32, type Int16, type Array, type NullableString } from '../../primitives';
import { ProduceResponseV0Data, ResponseHeaderV0 } from '../../responses';
import { type WriteBuffer } from '../../serialization';
import { type RequestHeaderV1 } from '../headers';
import { type Request } from '../request';
import { type TopicDataV3 } from './topic-data';

/**
 * Produce Request (Version: 3) => transactional_id acks timeout [topic_data]
 *   transactional_id => NULLABLE_STRING
 *   acks => INT16
 *   timeout => INT32
 *   topic_data => topic [data]
 *     topic => STRING
 *     data => partition record_set
 *       partition => INT32
 *       record_set => RECORDS
 */

export class ProduceRequestV3 implements Request<ProduceResponseV0Data> {
  public readonly ExpectedResponseHeaderClass = ResponseHeaderV0;
  public readonly ExpectedResponseDataClass = ProduceResponseV0Data;

  constructor(
    public readonly header: RequestHeaderV1,
    private readonly transactionalId: NullableString,
    private readonly acks: Int16,
    private readonly timeoutMs: Int32,
    private readonly topicData: Array<TopicDataV3>
  ) {}

  public async serialize(buffer: WriteBuffer): Promise<void> {
    this.header.serialize(buffer);
    this.transactionalId.serialize(buffer);
    this.acks.serialize(buffer);
    this.timeoutMs.serialize(buffer);
    await this.topicData.serialize(buffer);
  }
}
