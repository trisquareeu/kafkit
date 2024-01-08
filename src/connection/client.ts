import { BinaryLike, createHmac, randomBytes } from 'crypto';
import { SaslHandshakeRequestBuilder } from '../protocol/requests';
import { type RequestBuilder } from '../protocol/requests/request-builder';
import { SaslAuthenticateRequestBuilder } from '../protocol/requests/sasl-authenticate';
import { Session } from './session';

interface Authenticator {
  authenticate(session: Session): Promise<void>;
}

const URLSAFE_BASE64_PLUS_REGEX = /\+/g;
const URLSAFE_BASE64_SLASH_REGEX = /\//g;
const URLSAFE_BASE64_TRAILING_EQUAL_REGEX = /=+$/;

export class ScramSaslAuthenticator implements Authenticator {
  public async authenticate(session: Session): Promise<void> {
    /**
     * Kafka SaslHandshakeRequest containing the SASL mechanism for authentication is sent by the client. If the requested mechanism is not enabled in the server, the server responds with the list of supported mechanisms and closes the client connection. If the mechanism is enabled in the server, the server sends a successful response and continues with SASL authentication.
     * The actual SASL authentication is now performed. If SaslHandshakeRequest version is v0, a series of SASL client and server tokens corresponding to the mechanism are sent as opaque packets without wrapping the messages with Kafka protocol headers. If SaslHandshakeRequest version is v1, the SaslAuthenticate request/response are used, where the actual SASL tokens are wrapped in the Kafka protocol. The error code in the final message from the broker will indicate if authentication succeeded or failed.
     * If authentication succeeds, subsequent packets are handled as Kafka API requests. Otherwise, the client connection is closed.
     */
    const handshake = await session.send(new SaslHandshakeRequestBuilder('SCRAM-SHA-512', null));
    if (handshake.errorCode !== 0) {
      throw new Error(`SaslHandshakeRequest failed with error code ${handshake.errorCode}`);
    }

    // todo: implement error handling in case of different authentication mechanisms
    const username = 'user';
    const nonce = this.generateNonce();
    const gs2Header = 'n,,';
    const clientId = null;

    const authenticate = await session.send(
      new SaslAuthenticateRequestBuilder(Buffer.from(`${gs2Header}n=${username},r=${nonce}`), clientId)
    );

    if (authenticate.errorCode !== 0) {
      throw new Error(`SaslAuthenticateRequest failed with error code ${authenticate.errorCode}`);
    }
  }

  private generateNonce(): string {
    return randomBytes(16)
      .toString('base64')
      .replace(URLSAFE_BASE64_PLUS_REGEX, '-') // make it url safe
      .replace(URLSAFE_BASE64_SLASH_REGEX, '_')
      .replace(URLSAFE_BASE64_TRAILING_EQUAL_REGEX, '');
  }
}

export class Client {
  private session: Session | null = null;

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly clientId: string | null,
    private readonly clientSoftwareName: string,
    private readonly clientSoftwareVersion: string,
    private readonly authenticator: Authenticator
  ) {}

  public async send<T extends RequestBuilder<any>>(
    requestBuilder: T
  ): Promise<InstanceType<ReturnType<T['build']>['ExpectedResponseDataClass']>> {
    const session = await this.getOrCreateSession();

    return session.send(requestBuilder);
  }

  private async getOrCreateSession(): Promise<Session> {
    //todo: consider changing this condition
    if (this.session === null || !this.session.isHealthy()) {
      this.session = await Session.create(
        this.host,
        this.port,
        this.clientId,
        this.clientSoftwareName,
        this.clientSoftwareVersion
      );
    }

    await this.authenticator.authenticate(this.session);

    return this.session;
  }
}
