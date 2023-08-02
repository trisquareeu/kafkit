import { type ReadBuffer, type Serializable, type WriteBuffer } from '../../../serialization';
import { NotImplementedError } from '../../../exceptions';

/**
 * version: int16 (current version is 0)
 * type: int16 (0 indicates an abort marker, 1 indicates a commit)
 *
 * @see https://kafka.apache.org/documentation/#controlbatch
 */
export class ControlRecord implements Serializable {
  public static deserialize(_buffer: ReadBuffer): ControlRecord {
    throw new NotImplementedError('ControlRecord is not implemented');
  }

  public serialize(_buffer: WriteBuffer): void {
    throw new NotImplementedError('ControlRecord is not implemented');
  }
}
