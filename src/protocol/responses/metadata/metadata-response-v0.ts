import { Array } from '../../primitives';
import { type ReadBuffer } from '../../serialization';
import { BrokerV0 } from './broker';
import { TopicV0 } from './topic';

export class MetadataResponseV0Data {
  constructor(
    public readonly brokers: Array<BrokerV0>,
    public readonly topics: Array<TopicV0>
  ) {}

  public static deserialize(buffer: ReadBuffer): MetadataResponseV0Data {
    return new MetadataResponseV0Data(
      Array.deserialize(buffer, BrokerV0.deserialize),
      Array.deserialize(buffer, TopicV0.deserialize)
    );
  }
}
