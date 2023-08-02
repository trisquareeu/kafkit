import { BufferUnderflowError } from '../../../exceptions';
import { ReadBuffer, WriteBuffer } from '../../../serialization';
import { CompactArray, CompactString, Int8, VarInt, VarLong } from '../../';
import { Record, RecordHeader, RecordHeaderKey, VarIntBytes } from './record';

describe('Record', () => {
  const attributes = new Int8(0);
  const timestampDelta = new VarLong(353n);
  const offsetDelta = new VarInt(1);

  const headers = new CompactArray([
    new RecordHeader(new RecordHeaderKey('foo'), new VarIntBytes(Buffer.from('value'))),
    new RecordHeader(new RecordHeaderKey('🥸🇵🇱🫶🏻'), new VarIntBytes(Buffer.from('value'))),
    new RecordHeader(new RecordHeaderKey('bar'), new VarIntBytes(null)),
    new RecordHeader(new RecordHeaderKey(''), new VarIntBytes(Buffer.from('')))
  ]);

  const records = [
    new Record({
      attributes,
      timestampDelta,
      offsetDelta,
      key: new VarIntBytes(Buffer.from('key')),
      value: new VarIntBytes(Buffer.from('value')),
      headers: headers
    }),
    new Record({
      attributes,
      timestampDelta,
      offsetDelta,
      key: new VarIntBytes(Buffer.from('key')),
      value: new VarIntBytes(Buffer.from('value')),
      headers: new CompactArray([])
    }),
    new Record({
      attributes,
      timestampDelta,
      offsetDelta,
      key: new VarIntBytes(Buffer.from('key')),
      value: new VarIntBytes(Buffer.from('value')),
      headers: new CompactArray(null)
    }),
    new Record({
      attributes,
      timestampDelta,
      offsetDelta,
      key: new VarIntBytes(Buffer.from('')),
      value: new VarIntBytes(Buffer.from('')),
      headers: new CompactArray([])
    }),
    new Record({
      attributes,
      timestampDelta,
      offsetDelta,
      key: new VarIntBytes(null),
      value: new VarIntBytes(null),
      headers: new CompactArray([])
    }),
    new Record({
      attributes,
      timestampDelta,
      offsetDelta,
      key: new VarIntBytes(Buffer.from('key')),
      value: new VarIntBytes(null),
      headers: new CompactArray([])
    }),
    new Record({
      attributes,
      timestampDelta,
      offsetDelta,
      key: new VarIntBytes(null),
      value: new VarIntBytes(Buffer.from('value')),
      headers: new CompactArray([])
    }),
    new Record({
      attributes,
      timestampDelta: new VarLong(0n),
      offsetDelta: new VarInt(0),
      key: new VarIntBytes(Buffer.from('key')),
      value: new VarIntBytes(Buffer.from('value')),
      headers: new CompactArray([])
    })
  ];

  it.each(records)('should serialize and deserialize into the same value', (record) => {
    const writeBuffer = new WriteBuffer();
    record.serialize(writeBuffer);

    const readBuffer = new ReadBuffer(writeBuffer.toBuffer());
    expect(Record.deserialize(readBuffer)).toEqual(record);
  });

  it('should throw if message size is too small', () => {
    const readBuffer = new ReadBuffer(Buffer.from([0x00, 0x00, 0x00, 0x0a, 0x00, 0x01]));

    expect(() => Record.deserialize(readBuffer)).toThrowError(BufferUnderflowError);
  });

  it('should throw if there is no enough headers', () => {
    const header = new RecordHeader(new CompactString('foo'), new VarIntBytes(Buffer.from('bar')));
    const record = new Record({
      attributes,
      timestampDelta: new VarLong(0n),
      offsetDelta: new VarInt(0),
      key: new VarIntBytes(null),
      value: new VarIntBytes(null),
      headers: new CompactArray([header])
    });

    const writeBuffer = new WriteBuffer();
    record.serialize(writeBuffer);

    const headerBuffer = new WriteBuffer();
    header.serialize(headerBuffer);

    const buffer = writeBuffer.toBuffer();
    const readBuffer = new ReadBuffer(buffer.subarray(0, buffer.length - headerBuffer.toBuffer().length));

    expect(() => Record.deserialize(readBuffer)).toThrowError(BufferUnderflowError);
  });
});
