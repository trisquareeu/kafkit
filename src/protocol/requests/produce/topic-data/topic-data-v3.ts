import { type Array, type String } from '../../../primitives';
import { type Serializable, type WriteBuffer } from '../../../serialization';
import { type PartitionDataV3 } from './partition-data';

export class TopicDataV3 implements Serializable {
  constructor(
    private readonly name: String,
    private readonly partitionData: Array<PartitionDataV3>
  ) {}

  public async serialize(buffer: WriteBuffer): Promise<void> {
    this.name.serialize(buffer);
    await this.partitionData.serialize(buffer);
  }
}
