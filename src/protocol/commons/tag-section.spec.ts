import { TaggedField } from './tagged-field';
import { CompactNullableString, UVarInt } from '../primitives';
import { ReadBuffer, WriteBuffer } from '../serialization';
import { TagSection } from './tag-section';

describe('TagSection', () => {
  it('should correctly serialize non-empty TagSection', () => {
    const tagSection = new TagSection([
      new TaggedField(new UVarInt(2), Buffer.from([0x01, 0x02, 0x03])),
      new TaggedField(new UVarInt(5), Buffer.from([0x04, 0x05]))
    ]);
    const buffer = new WriteBuffer();
    tagSection.serialize(buffer);

    expect(buffer.toBuffer()).toEqual(Buffer.from([0x02, 0x02, 0x03, 0x01, 0x02, 0x03, 0x05, 0x02, 0x04, 0x05]));
  });

  it('should correctly deserialize non-empty TagSection', () => {
    const readBuffer = new ReadBuffer(Buffer.from([0x02, 0x02, 0x03, 0x01, 0x02, 0x03, 0x05, 0x02, 0x04, 0x05]));
    const tagSection = TagSection.deserialize(readBuffer);

    expect(tagSection.fields.length).toEqual(2);
    expect(tagSection.fields[0]).toEqual(new TaggedField(new UVarInt(2), Buffer.from([0x01, 0x02, 0x03])));
    expect(tagSection.fields[1]).toEqual(new TaggedField(new UVarInt(5), Buffer.from([0x04, 0x05])));
  });

  it('should correctly serialize empty TagSection', () => {
    const tagSection = new TagSection([]);
    const buffer = new WriteBuffer();
    tagSection.serialize(buffer);

    expect(buffer.toBuffer()).toEqual(Buffer.from([0x00]));
  });

  it('should throw error when trying to use unordered fields', async () => {
    const fields = [
      await TaggedField.from(0, new CompactNullableString('field 0')),
      await TaggedField.from(2, new CompactNullableString('field 2')),
      await TaggedField.from(1, new CompactNullableString('field 1'))
    ];

    expect(() => new TagSection(fields)).toThrow('Invalid or out-of-order tag 1');
  });

  it('should have an immutable content to ensure ordering', async () => {
    const fields: TaggedField[] = [];
    const tagSection = new TagSection(fields);

    fields.push(await TaggedField.from(0, new CompactNullableString(null)));

    expect(tagSection.fields.length).toEqual(0);
  });

  it('should throw error when trying to deserialize unordered fields', () => {
    const buffer = new ReadBuffer(Buffer.from([0x03, 0x00, 0x00, 0x02, 0x00, 0x01, 0x00]));

    expect(() => TagSection.deserialize(buffer)).toThrow('Invalid or out-of-order tag 1');
  });
});
