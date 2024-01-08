import { type Compressor } from '../../compression';
import { InvalidRecordBatchError } from '../../exceptions';
import { ReadBuffer, WriteBuffer } from '../../serialization';
import { Int32 } from '../int32';
import { NonNullableArray } from '../non-nullable-array';
import { Record } from './record';

export class CompressedRecords {
  constructor(
    private readonly _value: NonNullableArray<Record>,
    private readonly compressor: Compressor
  ) {}

  public get value(): NonNullableArray<Record> {
    return this._value;
  }

  public static async deserialize(buffer: ReadBuffer, compressor: Compressor): Promise<CompressedRecords> {
    const { value: numberOfRecords } = Int32.deserialize(buffer);
    if (numberOfRecords < 0) {
      throw new InvalidRecordBatchError('Length of records cannot be negative');
    }

    const compressed = buffer.toBuffer(buffer.getOffset());
    const decompressed = new ReadBuffer(await compressor.decompress(compressed));

    return new CompressedRecords(
      NonNullableArray.deserializeEntries(decompressed, numberOfRecords, Record.deserialize),
      compressor
    );
  }

  public async serialize(buffer: WriteBuffer): Promise<void> {
    const temporary = new WriteBuffer();

    await this._value.serialize(temporary);

    const temporaryBuffer = temporary.toBuffer();

    const length = temporaryBuffer.subarray(0, 4);
    const compressed = await this.compressor.compress(temporaryBuffer.subarray(4));

    buffer.writeBuffer(length);
    buffer.writeBuffer(compressed);
  }
}
