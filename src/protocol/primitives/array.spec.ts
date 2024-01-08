import { ReadBuffer, type Serializable, WriteBuffer } from '../serialization';
import { Array, type ArraySerializer, type ArrayDeserializer } from './array';
import { Bytes } from './bytes';
import { CompactBytes } from './compact-bytes';
import { CompactNullableBytes } from './compact-nullable-bytes';
import { CompactNullableString } from './compact-nullable-string';
import { CompactString } from './compact-string';
import { Int16 } from './int16';
import { Int32 } from './int32';
import { Int8 } from './int8';
import { NullableString } from './nullable-string';
import { String } from './string';
import { UInt32 } from './uint32';

describe('Array', () => {
  const cases: { value: Serializable[]; deserializer: ArrayDeserializer<any>; serializer: ArraySerializer<any> }[] = [
    {
      value: [],
      deserializer: Int32.deserialize,
      serializer: (item: Int32, buffer) => item.serialize(buffer)
    },
    {
      value: [new Int32(1), new Int32(-3123122), new Int32(0), new Int32(Int32.MAX_VALUE), new Int32(Int32.MIN_VALUE)],
      deserializer: Int32.deserialize,
      serializer: (item: Int32, buffer) => item.serialize(buffer)
    },
    {
      value: [new Int8(1), new Int8(-128), new Int8(0), new Int8(Int8.MAX_VALUE), new Int8(Int8.MIN_VALUE)],
      deserializer: Int8.deserialize,
      serializer: (item: Int8, buffer) => item.serialize(buffer)
    },
    {
      value: [new Int16(1), new Int16(-526), new Int16(0), new Int16(Int16.MAX_VALUE), new Int16(Int16.MIN_VALUE)],
      deserializer: Int16.deserialize,
      serializer: (item: Int16, buffer) => item.serialize(buffer)
    },
    {
      value: [new String('abc'), new String('abc'.repeat(100)), new String('abc'.repeat(1000))],
      deserializer: String.deserialize,
      serializer: (item: String, buffer) => item.serialize(buffer)
    },
    {
      value: [
        new NullableString('abc'),
        new NullableString(null),
        new NullableString('abc'.repeat(100)),
        new NullableString('abc'.repeat(1000))
      ],
      deserializer: NullableString.deserialize,
      serializer: (item: NullableString, buffer) => item.serialize(buffer)
    },
    {
      value: [
        new CompactString(''),
        new CompactString('abc'),
        new CompactString('abc'.repeat(100)),
        new CompactString('abc'.repeat(1000))
      ],
      deserializer: CompactString.deserialize,
      serializer: (item: CompactString, buffer) => item.serialize(buffer)
    },
    {
      value: [
        new CompactNullableString(null),
        new CompactNullableString('abc'),
        new CompactNullableString('abc'.repeat(100)),
        new CompactNullableString('abc'.repeat(1000))
      ],
      deserializer: CompactNullableString.deserialize,
      serializer: (item: CompactNullableString, buffer) => item.serialize(buffer)
    },
    {
      value: [new UInt32(0), new UInt32(1), new UInt32(2), new UInt32(UInt32.MAX_VALUE)],
      deserializer: UInt32.deserialize,
      serializer: (item: UInt32, buffer) => item.serialize(buffer)
    },
    {
      value: [new Bytes(Buffer.from([])), new Bytes(Buffer.from([0])), new Bytes(Buffer.from([1, 2, 3]))],
      deserializer: Bytes.deserialize,
      serializer: (item: Bytes, buffer) => item.serialize(buffer)
    },
    {
      value: [
        new CompactBytes(Buffer.from([])),
        new CompactBytes(Buffer.from([0])),
        new CompactBytes(Buffer.from([1, 2, 3]))
      ],
      deserializer: CompactBytes.deserialize,
      serializer: (item: CompactBytes, buffer) => item.serialize(buffer)
    },
    {
      value: [
        new CompactNullableBytes(null),
        new CompactNullableBytes(Buffer.from([1])),
        new CompactNullableBytes(Buffer.from([1, 2, 3]))
      ],
      deserializer: CompactNullableBytes.deserialize,
      serializer: (item: CompactNullableBytes, buffer) => item.serialize(buffer)
    },
    {
      value: [
        new CompactNullableBytes(null),
        new CompactNullableBytes(Buffer.from([1])),
        new CompactNullableBytes(Buffer.from([1, 2, 3]))
      ],
      deserializer: CompactNullableBytes.deserialize,
      serializer: async (item: CompactNullableBytes, buffer) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            item.serialize(buffer);
            resolve();
          }, 1000);
        });
      }
    }
  ];

  it.each(cases)(
    'should serialize and deserialize into the same value',
    async ({ value, deserializer, serializer }) => {
      // eslint-disable-next-line @typescript-eslint/no-array-constructor
      const array = new Array(value, serializer);

      const writeBuffer = new WriteBuffer();
      await array.serialize(writeBuffer);

      const readBuffer = new ReadBuffer(writeBuffer.toBuffer());
      const deserialized = Array.deserialize(readBuffer, deserializer);

      expect(deserialized.value).toEqual(array.value);
    }
  );
});
