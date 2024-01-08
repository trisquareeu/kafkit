export class ServerFirstMessage {
  public readonly serverNonce: string;
  public readonly salt: Buffer;
  public readonly iterations: number;

  constructor(public readonly original: string) {
    const pattern =
      /.*?r=(?<nonce>.*),s=(?<salt>(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?),i=(?<iterations>[0-9]+).*?/;

    const matches = pattern.exec(original);
    if (matches === null) {
      throw new Error(`Invalid SCRAM server first message format: ${original}`);
    }
    this.serverNonce = matches.groups!.nonce!;
    this.salt = Buffer.from(matches.groups!.salt!, 'base64');
    this.iterations = parseInt(matches.groups!.iterations!, 10);
  }
}
