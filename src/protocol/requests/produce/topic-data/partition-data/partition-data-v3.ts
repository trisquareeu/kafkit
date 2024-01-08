import { Int32, type RecordBatch } from '../../../../primitives';
import { WriteBuffer, type Serializable } from '../../../../serialization';

export class PartitionDataV3 implements Serializable {
  constructor(
    public readonly index: Int32,
    public readonly recordBatch: RecordBatch
  ) {}

  public async serialize(buffer: WriteBuffer): Promise<void> {
    this.index.serialize(buffer);

    const recordBatchBuffer = new WriteBuffer();
    await this.recordBatch.serialize(recordBatchBuffer);

    new Int32(recordBatchBuffer.getOffset()).serialize(buffer);
    buffer.writeBuffer(recordBatchBuffer.toBuffer());
  }
}
