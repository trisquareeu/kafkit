import Mitm from 'mitm';
import Net from 'net';
import { TagSection } from '../protocol/commons';
import { CorrelationIdMismatchError } from '../protocol/exceptions';
import { Int16, Int32, NullableString, String } from '../protocol/primitives';
import { RequestHeaderV2, type Request } from '../protocol/requests';
import { ResponseHeaderV0 } from '../protocol/responses';
import { WriteBuffer, type ReadBuffer, type Serializable } from '../protocol/serialization';
import { Connection } from './connection';

describe('connection', () => {
  let mitm: ReturnType<typeof Mitm>;
  let serverSocket: Net.Socket;
  let connection: Connection;

  beforeEach(async () => {
    mitm = Mitm();

    const serverSocketPromise = new Promise<Net.Socket>((resolve) => {
      mitm.on('connection', (socket: Net.Socket) => {
        resolve(socket);
      });
    });

    const clientSocket = Net.connect(22, 'example.org');
    connection = new Connection(clientSocket);
    serverSocket = await serverSocketPromise;
  });

  it('should resolve promises in correct order', async () => {
    const expectedString1 = new String('String 1');
    const expectedString2 = new String('String 2');
    const sentData1 = connection.send(
      new TestRequestV1337(
        new RequestHeaderV2(
          new Int16(99),
          new Int16(1337),
          new Int32(0),
          new NullableString('client'),
          new TagSection()
        ),
        expectedString1
      )
    );
    const sentData2 = connection.send(
      new TestRequestV1337(
        new RequestHeaderV2(
          new Int16(99),
          new Int16(1337),
          new Int32(1),
          new NullableString('client'),
          new TagSection()
        ),
        expectedString2
      )
    );

    serverSocket.write(createResponseMessage(expectedString1, 0));
    serverSocket.write(createResponseMessage(expectedString2, 1));

    const receivedData1 = await sentData1;
    const receivedData2 = await sentData2;

    expect(receivedData1).toBeInstanceOf(TestResponseData);
    expect(receivedData1.test.value).toEqual(expectedString1.value);
    expect(receivedData2).toBeInstanceOf(TestResponseData);
    expect(receivedData2.test.value).toEqual(expectedString2.value);
  });

  it('should throw if there is correlationId mismatch', async () => {
    const expectedString = new String('String 1');
    const sentData = connection.send(
      new TestRequestV1337(
        new RequestHeaderV2(
          new Int16(99),
          new Int16(1337),
          new Int32(5),
          new NullableString('client'),
          new TagSection()
        ),
        expectedString
      )
    );

    serverSocket.write(createResponseMessage(expectedString, 1));

    await expect(sentData).rejects.toThrowError(CorrelationIdMismatchError);
  });

  it('should receive full response', async () => {
    const expectedString = new String("I'll be blazingly fast!");
    const sentData = connection.send(
      new TestRequestV1337(
        new RequestHeaderV2(
          new Int16(99),
          new Int16(1337),
          new Int32(1),
          new NullableString('client'),
          new TagSection()
        ),
        expectedString
      )
    );

    serverSocket.write(createResponseMessage(expectedString, 1));

    const receivedData = await sentData;

    expect(receivedData).toBeInstanceOf(TestResponseData);
    expect(receivedData.test.value).toEqual(expectedString.value);
  });
});

function createResponseMessage(data: Serializable, id: number): Buffer {
  const wb = new WriteBuffer();
  data.serialize(wb);
  const dataBuffer = wb.toBuffer();

  const length = new Int32(dataBuffer.length + 4);
  const correlationId = new Int32(id);

  const buffer = new WriteBuffer();

  length.serialize(buffer);
  correlationId.serialize(buffer);
  buffer.writeBuffer(dataBuffer);

  return buffer.toBuffer();
}

class TestResponseData {
  constructor(public readonly test: String) {}

  public static deserialize(buffer: ReadBuffer): TestResponseData {
    return new TestResponseData(String.deserialize(buffer));
  }
}

class TestRequestV1337 implements Request<TestResponseData> {
  public readonly ExpectedResponseDataClass = TestResponseData;
  public readonly ExpectedResponseHeaderClass = ResponseHeaderV0;

  constructor(
    public readonly header: RequestHeaderV2,
    public readonly test: String
  ) {}

  serialize(buffer: WriteBuffer): void {
    this.header.serialize(buffer);
    this.test.serialize(buffer);
  }
}
