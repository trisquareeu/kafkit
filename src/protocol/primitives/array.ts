import { type ReadBuffer, type Serializable, type WriteBuffer } from '../serialization';
import { Int32 } from './int32';

export type ArrayDeserializer<T> = (buffer: ReadBuffer) => T;
export type ArraySerializer<T> = (item: T, buffer: WriteBuffer) => void | Promise<void>;
/**
 * Represents a sequence of objects of a given type T. Type T can be either a primitive type (e.g. STRING) or a structure.
 * First, the length N is given as an INT32. Then N instances of type T follow.
 * A null array is represented with a length of -1.
 * In protocol documentation an array of T instances is referred to as [T].
 *
 * NOTE: Even though the protocol specification explicitly mentions the null-value to be indicated
 * by the length of exactly -1, the standard Java client libraries treats any negative length as a
 * null-value indicator.
 *
 * @see https://kafka.apache.org/protocol.html#protocol_types
 */
export class Array<T> implements Serializable {
  constructor(
    private readonly _value: readonly T[] | null,
    private serializer: ArraySerializer<T> | null = null
  ) {}

  public get value(): readonly T[] | null {
    return this._value;
  }

  public static deserialize<T>(buffer: ReadBuffer, deserializer: ArrayDeserializer<T>): Array<T> {
    const length = Int32.deserialize(buffer);
    if (length.value < 0) {
      return new Array(null);
    }

    return this.deserializeEntries(buffer, length.value, deserializer);
  }

  public static deserializeEntries<T>(
    buffer: ReadBuffer,
    length: number,
    deserializer: ArrayDeserializer<T>
  ): Array<T> {
    const value: T[] = [];
    for (let i = 0; i < length; i++) {
      value.push(deserializer(buffer));
    }

    return new Array(value);
  }

  public setSerializer(serializer: ArraySerializer<T>): void {
    this.serializer = serializer;
  }

  public async serialize(buffer: WriteBuffer): Promise<void> {
    if (!this.serializer) {
      throw new Error('Serializer needed');
    }

    if (this.value === null) {
      new Int32(-1).serialize(buffer);
    } else {
      new Int32(this.value.length).serialize(buffer);
      for (const item of this.value) {
        await this.serializer(item, buffer);
      }
    }
  }
}
