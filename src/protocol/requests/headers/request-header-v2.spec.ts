import { CompactNullableString, Int16, Int32, NullableString } from '../../primitives';
import { WriteBuffer } from '../../serialization';
import { RequestHeaderV2 } from './request-header-v2';
import { TaggedField, TagSection } from '../../commons';

describe('RequestHeaderV2', () => {
  it('should properly serialize with all fields set', () => {
    const header = new RequestHeaderV2(
      new Int16(99),
      new Int16(88),
      new Int32(123456789),
      new NullableString('someClientId'),
      new TagSection()
    );
    const buffer = new WriteBuffer();
    header.serialize(buffer);

    expect(buffer.toBuffer()).toEqual(
      Buffer.from([
        0x00, 0x63, 0x00, 0x58, 0x07, 0x5b, 0xcd, 0x15, 0x00, 0x0c, 0x73, 0x6f, 0x6d, 0x65, 0x43, 0x6c, 0x69, 0x65,
        0x6e, 0x74, 0x49, 0x64, 0x00
      ])
    );
  });

  it('should properly serialize when ClientId is set to empty string', () => {
    const header = new RequestHeaderV2(
      new Int16(99),
      new Int16(88),
      new Int32(123456789),
      new NullableString(''),
      new TagSection()
    );

    const buffer = new WriteBuffer();
    header.serialize(buffer);

    expect(buffer.toBuffer()).toEqual(Buffer.from([0x00, 0x63, 0x00, 0x58, 0x07, 0x5b, 0xcd, 0x15, 0x00, 0x00, 0x00]));
  });

  it('should properly serialize when ClientId is set to null', () => {
    const header = new RequestHeaderV2(
      new Int16(99),
      new Int16(88),
      new Int32(123456789),
      new NullableString(null),
      new TagSection()
    );

    const buffer = new WriteBuffer();
    header.serialize(buffer);

    expect(buffer.toBuffer()).toEqual(Buffer.from([0x00, 0x63, 0x00, 0x58, 0x07, 0x5b, 0xcd, 0x15, 0xff, 0xff, 0x00]));
  });

  it('should properly serialize when using tagged fields', async () => {
    const header = new RequestHeaderV2(
      new Int16(99),
      new Int16(88),
      new Int32(123456789),
      new NullableString('someClientId'),
      new TagSection([await TaggedField.from(0, new CompactNullableString('someClusterId'))])
    );

    const buffer = new WriteBuffer();
    header.serialize(buffer);

    expect(buffer.toBuffer()).toEqual(
      Buffer.from([
        0x00, 0x63, 0x00, 0x58, 0x07, 0x5b, 0xcd, 0x15, 0x00, 0x0c, 0x73, 0x6f, 0x6d, 0x65, 0x43, 0x6c, 0x69, 0x65,
        0x6e, 0x74, 0x49, 0x64, 0x01, 0x00, 0x0e, 0x0e, 0x73, 0x6f, 0x6d, 0x65, 0x43, 0x6c, 0x75, 0x73, 0x74, 0x65,
        0x72, 0x49, 0x64
      ])
    );
  });
});
