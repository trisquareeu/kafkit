import { buf as crc32c } from 'crc-32/crc32c';
import { ReadBuffer, type Serializable, WriteBuffer } from '../../serialization';
import { type ControlRecord, Record } from './record';
import {
  CompressionType,
  type CompressionTypeValue,
  HasDeleteHorizon,
  type HasDeleteHorizonValue,
  IsControlBatch,
  type IsControlBatchValue,
  IsTransactional,
  type IsTransactionalValue,
  TimestampType,
  type TimestampTypeValue
} from './attributes';
import { CompressedArray } from '../compressed-array';
import { Int64 } from '../int64';
import { Int32 } from '../int32';
import { Int16 } from '../int16';
import { Int8 } from '../int8';
import { type Array } from '../array';
import { CompressorDeterminer } from './attributes/compressor-determiner';
import { IllegalArgumentError, InvalidRecordError } from '../../exceptions';

type RecordBatchParams = {
  baseOffset: Int64;
  partitionLeaderEpoch: Int32;
  attributes: RecordBatchAttributes;
  lastOffsetDelta: Int32;
  baseTimestamp: Int64;
  maxTimestamp: Int64;
  producerId: Int64;
  producerEpoch: Int16;
  baseSequence: Int32;
  records: Array<Record>;
};

type RecordBatchAttributes = {
  compressionType: CompressionTypeValue;
  timestampType: TimestampTypeValue;
  isTransactional: IsTransactionalValue;
  isControlBatch: IsControlBatchValue;
  hasDeleteHorizon: HasDeleteHorizonValue;
};

/**
 * Messages (aka Records) are always written in batches.
 * The technical term for a batch of messages is a record batch, and a record batch contains one or more records.
 * In the degenerate case, we could have a record batch containing a single record.
 *
 *  baseOffset: int64
 *  batchLength: int32
 *  partitionLeaderEpoch: int32
 *  magic: int8 (current magic value is 2)
 *  crc: int32
 *  attributes: int16
 *      bit 0~2:
 *          0: no compression
 *          1: gzip
 *          2: snappy
 *          3: lz4
 *          4: zstd
 *      bit 3: timestampType
 *      bit 4: isTransactional (0 means not transactional)
 *      bit 5: isControlBatch (0 means not a control batch)
 *      bit 6: hasDeleteHorizonMs (0 means baseTimestamp is not set as the delete horizon for compaction)
 *      bit 7~15: unused
 *  lastOffsetDelta: int32
 *  baseTimestamp: int64
 *  maxTimestamp: int64
 *  producerId: int64
 *  producerEpoch: int16
 *  baseSequence: int32
 *  records: [Record]
 *
 * @see https://kafka.apache.org/documentation/#messageformat
 * @see https://kafka.apache.org/documentation/#recordbatch
 */
export class RecordBatch implements Serializable {
  public static readonly CURRENT_MAGIC_VALUE = 2;
  public static readonly NO_TIMESTAMP = -1n;
  public static readonly NO_PRODUCER_ID = -1n;
  public static readonly NO_PRODUCER_EPOCH = -1;
  public static readonly NO_SEQUENCE = -1;

  public readonly baseOffset: Int64;
  public readonly partitionLeaderEpoch: Int32;
  public readonly magic: Int8;
  public readonly attributes: RecordBatchAttributes;
  public readonly lastOffsetDelta: Int32;
  public readonly baseTimestamp: Int64;
  public readonly maxTimestamp: Int64;
  public readonly producerId: Int64;
  public readonly producerEpoch: Int16;
  public readonly baseSequence: Int32;
  public readonly records: Array<Record> | Array<ControlRecord>;

  constructor(params: RecordBatchParams) {
    this.baseOffset = params.baseOffset;
    this.partitionLeaderEpoch = params.partitionLeaderEpoch;
    this.magic = new Int8(RecordBatch.CURRENT_MAGIC_VALUE);
    this.attributes = params.attributes;
    this.lastOffsetDelta = params.lastOffsetDelta;
    this.baseTimestamp = params.baseTimestamp;
    this.maxTimestamp = params.maxTimestamp;
    this.producerId = params.producerId;
    this.producerEpoch = params.producerEpoch;
    this.baseSequence = params.baseSequence;
    this.records = params.records;
  }

  public static async deserialize(buffer: ReadBuffer): Promise<RecordBatch> {
    const baseOffset = Int64.deserialize(buffer);
    const length = Int32.deserialize(buffer).value;
    const temporary = new ReadBuffer(buffer.readBuffer(length));

    const partitionLeaderEpoch = Int32.deserialize(temporary);
    Int8.deserialize(temporary); // magic

    const expectedCrc32 = Int32.deserialize(temporary);
    const calculatedCrc32c = crc32c(temporary.toBuffer(temporary.getOffset()));
    if (calculatedCrc32c !== expectedCrc32.value) {
      throw new InvalidRecordError(
        `Record is corrupt (stored crc = ${expectedCrc32.value}, computed crc = ${calculatedCrc32c})`
      );
    }

    const attributes = Int16.deserialize(temporary);
    const lastOffsetDelta = Int32.deserialize(temporary);
    const baseTimestamp = Int64.deserialize(temporary);
    const maxTimestamp = Int64.deserialize(temporary);
    const producerId = Int64.deserialize(temporary);
    const producerEpoch = Int16.deserialize(temporary);
    const baseSequence = Int32.deserialize(temporary);

    const compressionType = CompressionType.fromInt16(attributes);
    const compressor = CompressorDeterminer.fromValue(compressionType);

    const records = await CompressedArray.deserialize(temporary, Record.deserialize, compressor);

    return new RecordBatch({
      baseOffset,
      partitionLeaderEpoch,
      attributes: {
        compressionType,
        timestampType: TimestampType.fromInt16(attributes),
        isTransactional: IsTransactional.fromInt16(attributes),
        isControlBatch: IsControlBatch.fromInt16(attributes),
        hasDeleteHorizon: HasDeleteHorizon.fromInt16(attributes)
      },
      lastOffsetDelta,
      baseTimestamp,
      maxTimestamp,
      producerId,
      producerEpoch,
      baseSequence,
      records: records.value
    });
  }

  public async serialize(buffer: WriteBuffer): Promise<void> {
    if (this.attributes.isControlBatch !== IsControlBatch.No) {
      throw new IllegalArgumentError('Sending control batches is not supported');
    }

    if (this.baseTimestamp.value < 0n && this.baseTimestamp.value !== RecordBatch.NO_TIMESTAMP) {
      throw new IllegalArgumentError(`Invalid message timestamp ${this.baseTimestamp.value}`);
    }

    if (
      this.attributes.isTransactional === IsTransactional.Yes &&
      this.producerId.value === RecordBatch.NO_PRODUCER_ID
    ) {
      throw new IllegalArgumentError('Cannot write transactional messages without a valid producer ID');
    }

    if (this.producerId.value !== RecordBatch.NO_PRODUCER_ID) {
      if (this.producerEpoch.value === RecordBatch.NO_PRODUCER_EPOCH) {
        throw new IllegalArgumentError('Invalid negative producer epoch');
      }

      if (this.baseSequence.value < 0) {
        throw new IllegalArgumentError('Invalid negative sequence number used');
      }
    }

    const attributes = new Int16(
      this.attributes.compressionType |
        this.attributes.timestampType |
        this.attributes.isTransactional |
        this.attributes.isControlBatch |
        this.attributes.hasDeleteHorizon
    );

    const body = new WriteBuffer();

    attributes.serialize(body);
    this.lastOffsetDelta.serialize(body);
    this.baseTimestamp.serialize(body);
    this.maxTimestamp.serialize(body);
    this.producerId.serialize(body);
    this.producerEpoch.serialize(body);
    this.baseSequence.serialize(body);

    const compressor = CompressorDeterminer.fromValue(this.attributes.compressionType);
    await new CompressedArray(this.records, compressor).serialize(body);

    const batch = new WriteBuffer();
    this.partitionLeaderEpoch.serialize(batch);
    this.magic.serialize(batch);
    new Int32(crc32c(body.toBuffer())).serialize(batch);
    batch.writeBuffer(body.toBuffer());

    const batchBuffer = batch.toBuffer();

    this.baseOffset.serialize(buffer);
    new Int32(batchBuffer.length).serialize(buffer);
    buffer.writeBuffer(batchBuffer);
  }
}
