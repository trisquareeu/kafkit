import { Array, Int16, String } from '../../../primitives';
import { type ReadBuffer } from '../../../serialization';
import { PartitionV0 } from './partition';

export class TopicV0 {
  constructor(
    public readonly errorCode: Int16,
    public readonly name: String,
    public readonly partitions: Array<PartitionV0>
  ) {}

  public static deserialize(buffer: ReadBuffer): TopicV0 {
    return new TopicV0(
      Int16.deserialize(buffer),
      String.deserialize(buffer),
      Array.deserialize(buffer, PartitionV0.deserialize)
    );
  }
}
