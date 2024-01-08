import { UVarInt } from '../primitives';
import type { ReadBuffer, Serializable } from '../serialization';
import { WriteBuffer } from '../serialization';

/**
 * Note that KIP-482 tagged fields can be added to a request without incrementing the version number. This offers
 * an additional way of evolving the message schema without breaking compatibility. Tagged fields do not take up
 * any space when the field is not set. Therefore, if a field is rarely used, it is more efficient to make it a
 * tagged field than to put it in the mandatory schema. However, tagged fields are ignored by recipients that don't
 * know about them, which could pose a challenge if this is not the behavior that the sender wants.
 * In such cases, a version bump may be more appropriate.
 *
 * Each tagged field begins with a tag header.
 *
 * The tag header contains two unsigned variable-length integers.
 *    The first one contains the field's tag.
 *    The second one is the length of the field.
 *
 * @see https://kafka.apache.org/24/protocol.html#protocol_compatibility
 * @see https://cwiki.apache.org/confluence/display/KAFKA/KIP-482%3A+The+Kafka+Protocol+should+Support+Optional+Tagged+Fields
 */
export class TaggedField implements Serializable {
  constructor(
    public readonly tag: UVarInt,
    public readonly data: Buffer
  ) {}

  public static async from(tag: number, data: Serializable): Promise<TaggedField> {
    const writeBuffer = new WriteBuffer();
    await data.serialize(writeBuffer);

    return new TaggedField(new UVarInt(tag), writeBuffer.toBuffer());
  }

  public static deserialize(buffer: ReadBuffer): TaggedField {
    const tag = UVarInt.deserialize(buffer);
    const length = UVarInt.deserialize(buffer);
    const data = buffer.readBuffer(length.value);

    return new TaggedField(tag, data);
  }

  public serialize(buffer: WriteBuffer): void {
    this.tag.serialize(buffer);
    new UVarInt(this.data.length).serialize(buffer);
    buffer.writeBuffer(this.data);
  }
}
