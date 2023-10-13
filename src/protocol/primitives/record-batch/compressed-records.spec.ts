import {
  GzipCompressor,
  Lz4Compressor,
  NoopCompressor,
  SnappyCompressor,
  ZstdCompressor,
  type Compressor
} from '../../compression';
import { ReadBuffer, WriteBuffer } from '../../serialization';
import { Array } from '../array';
import { CompactArray } from '../compact-array';
import { Int8 } from '../int8';
import { VarInt } from '../varint';
import { VarLong } from '../varlong';
import { CompressedRecords } from './compressed-records';
import { Record, RecordHeader, RecordHeaderKey, VarIntBytes } from './record';

describe('CompressedRecords', () => {
  const compressors: Compressor[] = [
    new NoopCompressor(),
    new Lz4Compressor(),
    new SnappyCompressor(),
    new GzipCompressor(),
    new ZstdCompressor()
  ];

  it.each(compressors)('should compress and decompress into the same value', async (compressor) => {
    const array = new Array<Record>(
      [
        new Record({
          attributes: new Int8(0),
          offsetDelta: new VarInt(0),
          timestampDelta: new VarLong(0n),
          key: new VarIntBytes(Buffer.from('key')),
          value: new VarIntBytes(Buffer.from('value')),
          headers: new CompactArray(
            [new RecordHeader(new RecordHeaderKey('headerKey'), new VarIntBytes(Buffer.from('headerValue')))],
            (header, buffer) => header.serialize(buffer)
          )
        })
      ],
      (record, buffer) => {
        record.serialize(buffer);
      }
    );

    const compressed = new CompressedRecords(array, compressor);

    const buffer = new WriteBuffer();
    await compressed.serialize(buffer);

    const decompressed = await CompressedRecords.deserialize(new ReadBuffer(buffer.toBuffer()), compressor);
    decompressed.value.value!.forEach((record, index) => {
      expect(record.attributes.value).toEqual(array.value![index]!.attributes.value);
      expect(record.offsetDelta.value).toEqual(array.value![index]!.offsetDelta.value);
      expect(record.timestampDelta.value).toEqual(array.value![index]!.timestampDelta.value);
      expect(record.key.value).toEqual(array.value![index]!.key.value);
      expect(record.value.value).toEqual(array.value![index]!.value.value);
      expect(record.headers.value).toEqual(array.value![index]!.headers.value);
    });
  });
});
