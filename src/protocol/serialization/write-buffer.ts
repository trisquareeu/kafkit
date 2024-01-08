export class WriteBuffer {
  private buffer: Buffer;
  private offset = 0;

  constructor(size = 512) {
    this.buffer = Buffer.alloc(size);
  }

  public static nextPowerOfTwo(n: number): number {
    return 1 << (31 - Math.clz32(n) + 1);
  }

  public getOffset(): number {
    return this.offset;
  }

  public writeInt8(value: number): WriteBuffer {
    return this.writeInt(value, 1);
  }

  public writeInt16(value: number): WriteBuffer {
    return this.writeInt(value, 2);
  }

  public writeInt32(value: number): WriteBuffer {
    return this.writeInt(value, 4);
  }

  public writeInt64(value: bigint): WriteBuffer {
    this.scaleIfNeeded(8).buffer.writeBigInt64BE(value, this.offset);
    this.offset += 8;

    return this;
  }

  public writeUInt8(value: number): WriteBuffer {
    return this.writeUInt(value, 1);
  }

  public writeUInt16(value: number): WriteBuffer {
    return this.writeUInt(value, 2);
  }

  public writeUInt32(value: number): WriteBuffer {
    return this.writeUInt(value, 4);
  }

  public writeUInt64(value: bigint): WriteBuffer {
    this.scaleIfNeeded(8).buffer.writeBigUInt64BE(value, this.offset);
    this.offset += 8;

    return this;
  }

  public writeFloat(value: number): WriteBuffer {
    this.scaleIfNeeded(4).buffer.writeFloatBE(value, this.offset);
    this.offset += 4;

    return this;
  }

  public writeDouble(value: number): WriteBuffer {
    this.scaleIfNeeded(8).buffer.writeDoubleBE(value, this.offset);
    this.offset += 8;

    return this;
  }

  public writeString(value: string): WriteBuffer {
    const byteLength = Buffer.byteLength(value);
    this.scaleIfNeeded(byteLength).buffer.write(value, this.offset, byteLength);
    this.offset += byteLength;

    return this;
  }

  public writeBuffer(value: Buffer): WriteBuffer {
    const byteLength = value.length;
    this.scaleIfNeeded(byteLength).buffer.fill(value, this.offset, this.offset + byteLength);
    this.offset += byteLength;

    return this;
  }

  public toBuffer(): Buffer {
    return this.buffer.subarray(0, this.offset);
  }

  private writeInt(value: number, byteLength: number): WriteBuffer {
    this.scaleIfNeeded(byteLength).buffer.writeIntBE(value, this.offset, byteLength);
    this.offset += byteLength;

    return this;
  }

  private writeUInt(value: number, byteLength: number): WriteBuffer {
    this.scaleIfNeeded(byteLength).buffer.writeUIntBE(value, this.offset, byteLength);
    this.offset += byteLength;

    return this;
  }

  private scaleIfNeeded(byteLength: number): WriteBuffer {
    const requiredSize = this.offset + byteLength;
    if (requiredSize > this.buffer.length) {
      const newSize = WriteBuffer.nextPowerOfTwo(requiredSize);
      const newBuffer = Buffer.alloc(newSize);
      this.buffer.copy(newBuffer, 0, 0, this.offset);
      this.buffer = newBuffer;
    }

    return this;
  }
}
