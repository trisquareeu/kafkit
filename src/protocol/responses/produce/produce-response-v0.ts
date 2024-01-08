/**
 * Produce Response (Version: 0) => [responses] 
  responses => name [partition_responses] 
    name => STRING
    partition_responses => index error_code base_offset 
      index => INT32
      error_code => INT16
      base_offset => INT64
 */

import { Array } from '../../primitives';
import { type ReadBuffer } from '../../serialization';
import { ResponseV0 } from './response';

export class ProduceResponseV0Data {
  constructor(public responses: Array<ResponseV0>) {}

  public static deserialize(buffer: ReadBuffer): ProduceResponseV0Data {
    return new ProduceResponseV0Data(Array.deserialize(buffer, ResponseV0.deserialize));
  }
}
