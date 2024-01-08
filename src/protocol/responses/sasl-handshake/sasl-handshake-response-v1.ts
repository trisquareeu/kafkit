import { Array, Int16, String } from '../../primitives';
import { type ReadBuffer } from '../../serialization';

export class SaslHandshakeResponseV1 {
  constructor(
    public readonly errorCode: Int16,
    public readonly mechanisms: Array<String>
  ) {}

  public static deserialize(buffer: ReadBuffer): SaslHandshakeResponseV1 {
    const errorCode = Int16.deserialize(buffer);
    const mechanisms = Array.deserialize(buffer, String.deserialize);

    return new SaslHandshakeResponseV1(errorCode, mechanisms);
  }
}
