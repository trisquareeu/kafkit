import { ReadBuffer } from './read-buffer';
import { BufferUnderflowError } from '../exceptions';

describe('ReadBuffer', () => {
  const cases = [
    { method: (rb: ReadBuffer) => rb.readInt8(), expectedValue: 65, bytesToRead: 1 },
    { method: (rb: ReadBuffer) => rb.readInt16(), expectedValue: 16706, bytesToRead: 2 },
    { method: (rb: ReadBuffer) => rb.readInt32(), expectedValue: 1094861636, bytesToRead: 4 },
    { method: (rb: ReadBuffer) => rb.readInt64(), expectedValue: BigInt('4702394921427289928'), bytesToRead: 8 },
    { method: (rb: ReadBuffer) => rb.readUInt8(), expectedValue: 65, bytesToRead: 1 },
    { method: (rb: ReadBuffer) => rb.readUInt16(), expectedValue: 16706, bytesToRead: 2 },
    { method: (rb: ReadBuffer) => rb.readUInt32(), expectedValue: 1094861636, bytesToRead: 4 },
    { method: (rb: ReadBuffer) => rb.readUInt64(), expectedValue: BigInt('4702394921427289928'), bytesToRead: 8 },
    { method: (rb: ReadBuffer) => rb.readFloat(), expectedValue: 12.141422271728516, bytesToRead: 4 },
    { method: (rb: ReadBuffer) => rb.readDouble(), expectedValue: 2393736.541207228, bytesToRead: 8 },
    { method: (rb: ReadBuffer) => rb.readBuffer(3), expectedValue: Buffer.from([0x41, 0x42, 0x43]), bytesToRead: 3 },
    { method: (rb: ReadBuffer) => rb.readString(3), expectedValue: 'ABC', bytesToRead: 3 }
  ];

  it.each(cases)('Should read bytes in the right order', ({ method, expectedValue }) => {
    const readBuffer = new ReadBuffer(Buffer.from([0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49]));
    expect(method(readBuffer)).toEqual(expectedValue);
  });

  it.each(cases)('should throw when byteLength is not in allowed range', ({ method, bytesToRead }) => {
    const readBuffer = new ReadBuffer(Buffer.from([]));
    expect(() => method(readBuffer)).toThrow(
      new BufferUnderflowError(
        `Tried to read ${bytesToRead} bytes starting from 0 but the read buffer contains only 0 bytes in total.`
      )
    );
  });
});
