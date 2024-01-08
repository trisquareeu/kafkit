import type { ResponseHeader } from '../responses';
import type { ReadBuffer, Serializable } from '../serialization';
import { type RequestHeader } from './headers';

type Deserializable<T> = {
  deserialize: (buffer: ReadBuffer) => T;
  new (...args: any[]): T;
};

/**
 * The server will [...] always respond to the client with exactly the protocol format
 * it expects based on the version it included in its request.
 *
 * The response will always match the paired request (e.g. we will send a MetadataResponse in return to a MetadataRequest).
 *
 * @see https://cwiki.apache.org/confluence/display/KAFKA/A+Guide+To+The+Kafka+Protocol#AGuideToTheKafkaProtocol-TheProtocol
 * @see https://kafka.apache.org/24/protocol.html#protocol_compatibility
 */
export interface Request<T> extends Serializable {
  readonly header: RequestHeader;
  /**
   * Subtype of the ResponseHeader that is expected as a response to this request.
   */
  ExpectedResponseHeaderClass: Deserializable<ResponseHeader>;

  /**
   * Subtype of the ResponseData that is expected as a response to this request.
   */
  ExpectedResponseDataClass: Deserializable<T>;
}

export type RequestResponseType<T extends Request<any>> = InstanceType<T['ExpectedResponseDataClass']>;
