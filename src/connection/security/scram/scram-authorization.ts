import { createHash, createHmac, pbkdf2Sync, randomBytes } from 'crypto';
import { ScramCredentials } from './scram-credentials';
import { ScramMechanism } from './scram-mechanism';
import { ServerFirstMessage } from './server-first-message';

export class ScramAuthorization {
  private static readonly GS2_HEADER = 'n,,';
  private readonly clientNonce: string;

  constructor(
    private readonly credentials: ScramCredentials,
    private readonly mechanism: ScramMechanism
  ) {
    this.clientNonce = this.newNonce();
  }

  /**
   * @see https://datatracker.ietf.org/doc/html/rfc5802#section-7
   */
  public getClientFirstMessage(): string {
    return `${ScramAuthorization.GS2_HEADER}${this.getClientFirstMessageBare()}`;
  }

  /**
   * @see https://datatracker.ietf.org/doc/html/rfc5802#section-3
   * @see https://datatracker.ietf.org/doc/html/rfc5802#section-7
   */
  public getClientFinalMessage(serverFirstMessage: ServerFirstMessage): string {
    if (!serverFirstMessage.serverNonce.startsWith(this.clientNonce)) {
      throw new Error('Invalid server nonce: does not start with client nonce');
    }
    //ClientKey = HMAC(SaltedPassword, "Client Key")
    const clientKey = createHmac(this.mechanism.name, this.getSaltedPassword(serverFirstMessage))
      .update('Client Key')
      .digest();

    //StoredKey = H(ClientKey)
    const storedKey = createHash(this.mechanism.name).update(clientKey).digest();

    //AuthMessage = client-first-message-bare + "," server-first-message + "," client-final-message-without-proof
    const clientFirstMessageBare = this.getClientFirstMessageBare();
    const clientFinalMessageWithoutProof = this.getClientFinalMessageWithoutProof(serverFirstMessage);
    const authMessage = `${clientFirstMessageBare},${serverFirstMessage.original},${clientFinalMessageWithoutProof}`;

    //ClientSignature = HMAC(StoredKey, AuthMessage)
    const clientSignature = createHmac(this.mechanism.name, storedKey).update(authMessage).digest();

    //ClientProof = ClientKey XOR ClientSignature
    const clientProof = this.xor(clientKey, clientSignature).toString('base64');
    return `${clientFinalMessageWithoutProof},p=${clientProof}`;
  }

  /**
   * @see https://datatracker.ietf.org/doc/html/rfc5802#section-7
   */
  private getClientFinalMessageWithoutProof(serverFirstMessage: ServerFirstMessage): string {
    const channelBinding = `c=${Buffer.from(ScramAuthorization.GS2_HEADER).toString('base64')}`;
    return `${channelBinding},r=${serverFirstMessage.serverNonce}`;
  }

  private xor(bufferA: Buffer, bufferB: Buffer) {
    if (Buffer.byteLength(bufferB) !== Buffer.byteLength(bufferB)) {
      throw new Error('Argument arrays must be of the same length');
    }

    const result = [];
    for (let i = 0; i < Buffer.byteLength(bufferA); i++) {
      result.push(bufferA[i]! ^ bufferB[i]!);
    }

    return Buffer.from(result);
  }

  /**
   * According to the RFC-5802 2.2. Notation and RFC-5802 3. SCRAM Algorithm Overview,
   * the salted password is a result of PBKDF2 with HMAC as the random function, with
   * the key length equal to length of the used hash.
   *
   * According to the RFC-5802 5.1 SCRAM Attributes, the client MUST verify if the
   * nonce returned by the server starts with the initially specified client nonce.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc5802#section-2.2
   * @see https://datatracker.ietf.org/doc/html/rfc5802#section-5.1
   * @param serverFirstMessage
   */
  private getSaltedPassword(serverFirstMessage: ServerFirstMessage) {
    if (serverFirstMessage.iterations < this.mechanism.minimumIterations) {
      throw new Error(
        `Requested iterations ${serverFirstMessage.iterations} is less than the minimum ${this.mechanism.minimumIterations} for ${this.mechanism.name}`
      );
    }

    return pbkdf2Sync(
      this.credentials.password,
      serverFirstMessage.salt,
      serverFirstMessage.iterations,
      this.mechanism.hashLengthInBytes,
      this.mechanism.name
    );
  }

  /**
   * According to the RFC-5802 5.1. SCRAM Attributes, the nonce is a sequence of
   * random printable ASCII characters, excluding the ',' character. The sequence
   * must be different for each authorization attempt.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc5802#section-5.1
   */
  private newNonce = (): string => {
    return randomBytes(32).toString('base64');
  };

  /**
   * According to the RFC-5802 7. Formal Syntax, the client-first-message-bare has a following format:
   *    client-first-message-bare = `n=${saslname},r=${c-nonce}`
   *
   * @see https://datatracker.ietf.org/doc/html/rfc5802#section-7
   */
  private getClientFirstMessageBare(): string {
    return `n=${this.credentials.username},r=${this.clientNonce}`;
  }
}
