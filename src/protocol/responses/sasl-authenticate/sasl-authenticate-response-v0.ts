import { Bytes, Int16, NullableString } from '../../primitives';
import { type ReadBuffer } from '../../serialization';

export class SaslAuthenticateResponseV0 {
  constructor(
    public readonly errorCode: Int16,
    public readonly errorMessage: NullableString,
    public readonly authBytes: Bytes
  ) {}

  public static deserialize(buffer: ReadBuffer): SaslAuthenticateResponseV0 {
    const errorCode = Int16.deserialize(buffer);
    const errorMessage = NullableString.deserialize(buffer);
    const authBytes = Bytes.deserialize(buffer);

    return new SaslAuthenticateResponseV0(errorCode, errorMessage, authBytes);
  }
}
