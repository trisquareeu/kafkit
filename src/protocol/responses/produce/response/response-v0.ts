import { Array, String } from '../../../primitives';
import { type ReadBuffer } from '../../../serialization';
import { PartititonResponseV0 } from './partition-response';

export class ResponseV0 {
  constructor(
    public readonly name: String,
    public readonly partitionResponses: Array<PartititonResponseV0>
  ) {}

  public static deserialize(buffer: ReadBuffer): ResponseV0 {
    return new ResponseV0(String.deserialize(buffer), Array.deserialize(buffer, PartititonResponseV0.deserialize));
  }
}
