import { Int16, Int32, Int64 } from '../../../../primitives';
import { type ReadBuffer } from '../../../../serialization';

export class PartititonResponseV0 {
  constructor(
    public readonly index: Int32,
    public readonly errorCode: Int16,
    public readonly baseOffset: Int64
  ) {}

  public static deserialize(buffer: ReadBuffer): PartititonResponseV0 {
    return new PartititonResponseV0(Int32.deserialize(buffer), Int16.deserialize(buffer), Int64.deserialize(buffer));
  }
}
