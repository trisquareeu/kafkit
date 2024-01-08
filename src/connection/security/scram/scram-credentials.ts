import { isUtf8 } from 'node:buffer';
import { Buffer } from 'buffer';

/**
 * This class implements the recommendations from the RFC5802 3. SCRAM Algorithm Overview
 * applicable to the username and password treatment. Please note that Apache Kafka appears
 * to not follow the document in a strict way.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc5802
 * @see https://github.com/apache/kafka/blob/3.2/clients/src/main/java/org/apache/kafka/common/security/scram/internals/ScramFormatter
 */
export class ScramCredentials {
  public readonly username: string;
  public readonly password: string;

  constructor(username: Buffer, password: Buffer) {
    this.username = this.prepareUsername(username);
    this.password = this.preparePassword(password);
  }

  /**
   * According to the RFC5802 3. SCRAM Algorithm Overview, the password
   * must be encoded in the UTF-8.
   *
   * According to the RFC5802 5.1. SCRAM Attributes, the characters ',' or '='
   * in usernames are respectively replaced by the '=2C' and '=3D'. The server
   * must reject the username that contains '=' not followed by the '2C' or '3D'.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc5802#section-3
   * @see https://datatracker.ietf.org/doc/html/rfc5802#section-5.1
   * @param username to prepare
   */
  private prepareUsername(username: Buffer): string {
    let result = this.normalize(username);

    //the '=' replacement must be the very first replacement applied
    result = result.replaceAll('=', '=3D');

    //otherwise the replacement '=2C' would be also affected
    return result.replace(',', '=2C');
  }

  /**
   * According to the RFC5802 3. SCRAM Algorithm Overview, the password
   * must be encoded in the UTF-8.
   * @see https://datatracker.ietf.org/doc/html/rfc5802#section-3
   * @param password
   */
  private preparePassword(password: Buffer): string {
    return this.normalize(password);
  }

  /**
   * According to the RFC5802 3. SCRAM Algorithm Overview, both the
   * username and password must be encoded in the UTF-8.
   *
   * Although the RFC5802 mentions the "stringprep" algorithm as the
   * suggested way to normalize the username and password values, the
   * ScramFormatter appears to not apply such logic.
   *
   * This method simply ensures that the username is the UTF-8 string.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc5802#section-3
   * @see https://issues.apache.org/jira/browse/KAFKA-6272
   * @see https://github.com/apache/kafka/blob/3.2/clients/src/main/java/org/apache/kafka/common/security/scram/internals/ScramFormatter.java#L89
   *
   * @param input the input to normalize
   */
  private normalize(input: Buffer): string {
    if (isUtf8(input)) {
      return input.toString('utf-8');
    }
    throw new Error();
  }
}
