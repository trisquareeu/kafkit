import { Int32, String } from '../../../primitives';
import { type ReadBuffer } from '../../../serialization';

export class BrokerV0 {
  constructor(
    public readonly nodeId: Int32,
    public readonly host: String,
    public readonly port: Int32
  ) {}

  public static deserialize(buffer: ReadBuffer): BrokerV0 {
    return new BrokerV0(Int32.deserialize(buffer), String.deserialize(buffer), Int32.deserialize(buffer));
  }
}
