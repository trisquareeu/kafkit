import { type CompactString, type NullableString } from '../protocol/primitives';
import { type RequestBuilderResponseType, type RequestBuilder } from '../protocol/requests/request-builder';
import { Session } from './session';

export class Client {
  private session: Session | null = null;

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly clientId: NullableString,
    private readonly clientSoftwareName: CompactString,
    private readonly clientSoftwareVersion: CompactString
  ) {}

  public async send<T extends RequestBuilder<any>>(requestBuilder: T): Promise<RequestBuilderResponseType<T>> {
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

    return this.session;
  }
}
