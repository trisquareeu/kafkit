import { NullInNonNullableFieldError } from '../../exceptions';
import { ReadBuffer, WriteBuffer, type Serializable } from '../../serialization';
import { Int8 } from '../int8';
import { VarInt } from '../varint';
import { VarLong } from '../varlong';

/**
 *  headerKeyLength: varint
 *  headerKey: String
 *  headerValueLength: varint
 *  Value: byte[]
 *
 *  @see https://kafka.apache.org/documentation/#recordheader
 */
export class RecordHeader implements Serializable {
  constructor(
    public readonly key: RecordHeaderKey,
    public readonly value: VarIntBytes
  ) {}

  public static deserialize(buffer: ReadBuffer): RecordHeader {
    const key = RecordHeaderKey.deserialize(buffer);
    const value = VarIntBytes.deserialize(buffer);

    return new RecordHeader(key, value);
  }

  public serialize(buffer: WriteBuffer): void {
    this.key.serialize(buffer);
    this.value.serialize(buffer);
  }
}

export class RecordHeaderArray implements Serializable {
  constructor(private readonly _value: RecordHeader[]) {}

  public get value(): readonly RecordHeader[] {
    return this._value;
  }

  public static deserialize(buffer: ReadBuffer): RecordHeaderArray {
    const length = VarInt.deserialize(buffer);

    const value: RecordHeader[] = [];
    for (let i = 0; i < length.value; i++) {
      value.push(RecordHeader.deserialize(buffer));
    }

    return new RecordHeaderArray(value);
  }

  public async serialize(buffer: WriteBuffer): Promise<void> {
    new VarInt(this.value.length).serialize(buffer);
    for (const item of this.value) {
      item.serialize(buffer);
    }
  }
}

type RecordParams = {
  attributes?: Int8;
  timestampDelta: VarLong;
  offsetDelta: VarInt;
  key: VarIntBytes;
  value: VarIntBytes;
  headers: RecordHeaderArray;
};

/**
 * Record is a single message in a RecordBatch.
 *
 *  length: varint
 *  attributes: int8
 *      bit 0~7: unused
 *  timestampDelta: varlong
 *  offsetDelta: varint
 *  keyLength: varint
 *  key: byte[]
 *  valueLen: varint
 *  value: byte[]
 *  Headers => [Header]
 *
 * @see https://kafka.apache.org/documentation/#record
 */
export class Record implements Serializable {
  public readonly attributes: Int8;
  public readonly timestampDelta: VarLong;
  public readonly offsetDelta: VarInt;
  public readonly key: VarIntBytes;
  public readonly value: VarIntBytes;
  public readonly headers: RecordHeaderArray;

  constructor(params: RecordParams) {
    this.attributes = params.attributes ?? new Int8(0);
    this.timestampDelta = params.timestampDelta;
    this.offsetDelta = params.offsetDelta;
    this.key = params.key;
    this.value = params.value;
    this.headers = params.headers;
  }

  public static deserialize(buffer: ReadBuffer): Record {
    const length = VarInt.deserialize(buffer).value;
    const temporary = new ReadBuffer(buffer.readBuffer(length));

    const attributes = Int8.deserialize(temporary);
    const timestampDelta = VarLong.deserialize(temporary);
    const offsetDelta = VarInt.deserialize(temporary);
    const key = VarIntBytes.deserialize(temporary);
    const value = VarIntBytes.deserialize(temporary);
    const headers = RecordHeaderArray.deserialize(temporary);

    return new Record({
      attributes,
      timestampDelta,
      offsetDelta,
      key,
      value,
      headers
    });
  }

  public async serialize(buffer: WriteBuffer): Promise<void> {
    const temporary = new WriteBuffer();

    this.attributes.serialize(temporary);
    this.timestampDelta.serialize(temporary);
    this.offsetDelta.serialize(temporary);
    this.key.serialize(temporary);
    this.value.serialize(temporary);
    await this.headers.serialize(temporary);

    const tempBuf = temporary.toBuffer();
    new VarInt(tempBuf.length).serialize(buffer);

    buffer.writeBuffer(tempBuf);
  }
}

export class VarIntBytes implements Serializable {
  constructor(private readonly _value: Buffer | null) {}

  public get value(): Buffer | null {
    return this._value;
  }

  public static deserialize(buffer: ReadBuffer): VarIntBytes {
    const length = VarInt.deserialize(buffer);
    if (length.value < 0) {
      return new VarIntBytes(null);
    }

    const bytes = buffer.readBuffer(length.value);

    return new VarIntBytes(bytes);
  }

  public serialize(buffer: WriteBuffer): void {
    if (this.value === null) {
      new VarInt(-1).serialize(buffer);
    } else {
      new VarInt(this.value.length).serialize(buffer);
      buffer.writeBuffer(this.value);
    }
  }
}

export class RecordHeaderKey implements Serializable {
  constructor(private readonly _value: string) {}

  public get value(): string {
    return this._value;
  }

  public static deserialize(buffer: ReadBuffer): RecordHeaderKey {
    const varIntBytes = VarIntBytes.deserialize(buffer);
    if (varIntBytes.value === null) {
      throw new NullInNonNullableFieldError('RecordHeaderKey cannot be null');
    }

    return new RecordHeaderKey(varIntBytes.value.toString('utf-8'));
  }

  public serialize(buffer: WriteBuffer): void {
    new VarIntBytes(Buffer.from(this.value, 'utf-8')).serialize(buffer);
  }
}
