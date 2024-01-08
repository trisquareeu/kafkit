import type { ReadBuffer, Serializable, WriteBuffer } from '../serialization';
import { type ArraySerializer, type ArrayDeserializer } from './array';
import { UVarInt } from './uvarint';

/**
 * Represents a sequence of objects of a given type T. Type T can be either a primitive type (e.g. STRING) or a structure.
 * First, the length N + 1 is given as an UNSIGNED_VARINT. Then N instances of type T follow.
 * A null array is represented with a length of 0. In protocol documentation an array of T instances is referred to as [T].
 *
 * @see https://kafka.apache.org/protocol.html#protocol_types
 */
export class CompactArray<T> implements Serializable {
  constructor(
    private readonly _value: T[] | null,
    private serializer: ArraySerializer<T> | null = null
  ) {}

  public get value(): readonly T[] | null {
    return this._value;
  }

  public static deserialize<T>(buffer: ReadBuffer, deserialize: ArrayDeserializer<T>): CompactArray<T> {
    const length = UVarInt.deserialize(buffer);
    if (length.value === 0) {
      return new CompactArray(null);
    }

    const value: T[] = [];
    for (let i = 0; i < length.value - 1; i++) {
      value.push(deserialize(buffer));
    }

    return new CompactArray(value);
  }

  public setSerializer(serializer: ArraySerializer<T>): void {
    this.serializer = serializer;
  }

  public async serialize(buffer: WriteBuffer): Promise<void> {
    if (!this.serializer) {
      throw new Error('Serializer needed');
    }

    if (this.value === null) {
      new UVarInt(0).serialize(buffer);
    } else {
      new UVarInt(this.value.length + 1).serialize(buffer);
      for (const item of this.value) {
        await this.serializer(item, buffer);
      }
    }
  }
}
