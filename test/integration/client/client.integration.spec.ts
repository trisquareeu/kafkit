/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { KafkaContainer, type StartedKafkaContainer } from '@testcontainers/kafka';
import { readFileSync } from 'fs';
import { Connection } from '../../../src/connection/connection';
import { Int16, Int32, NullableString, String } from '../../../src/protocol/primitives';
import {
  ApiVersionsRequestV0,
  MetadataRequestBuilder,
  RequestHeaderV1,
  SaslAuthenticateRequestBuilder,
  SaslHandshakeRequestV1
} from '../../../src/protocol/requests';
import { KafkaBrokerUtils } from '../../utils';
import {
  ScramAuthorization,
  ScramCredentials,
  ScramSha512,
  ServerFirstMessage
} from '../../../src/connection/security';

jest.setTimeout(60000);

describe('Client', () => {
  let container: StartedKafkaContainer;
  let kafkaUtils: KafkaBrokerUtils;

  beforeAll(async () => {
    container = await new KafkaContainer('confluentinc/cp-kafka:7.3.2')
      .withExposedPorts(9092, 9095)
      .withSaslSslListener({
        keystore: {
          content: readFileSync('./test/certs/keystore/kafka.keystore.jks'),
          passphrase: 'changeit'
        },
        sasl: {
          mechanism: 'SCRAM-SHA-512',
          user: {
            name: 'user',
            password: 'password'
          }
        },
        port: 9095
      })
      .withReuse()
      .start();

    kafkaUtils = new KafkaBrokerUtils(container);
  });

  afterAll(async () => {
    await container.stop();
  });

  it('should send a SaslAuthenticateRequest with the correct gs2Header', async () => {
    const connectedSocket = await kafkaUtils.getTlsConnectedSocket(9095);
    expect(connectedSocket).toBeDefined();
    expect(connectedSocket.writable).toBeTruthy();
    const connection = new Connection(connectedSocket);
    const clientId = 'TchKafka';
    const request = new ApiVersionsRequestV0(
      new RequestHeaderV1(new Int16(18), new Int16(0), new Int32(5), new NullableString(clientId))
    );

    const response = await connection.send(request);
    expect(response).toBeInstanceOf(request.ExpectedResponseDataClass);
    expect(response.errorCode.value).toBe(0);
    expect(response.apiVersions.value).toBeDefined();

    const handshakeRequest = new SaslHandshakeRequestV1(
      new RequestHeaderV1(new Int16(17), new Int16(1), new Int32(5), new NullableString(clientId)),
      new String('SCRAM-SHA-512')
    );

    const handshakeResponse = await connection.send(handshakeRequest);
    expect(handshakeResponse).toBeInstanceOf(handshakeRequest.ExpectedResponseDataClass);

    const authorization = new ScramAuthorization(
      new ScramCredentials(Buffer.from('user'), Buffer.from('password')),
      ScramSha512
    );

    const authenticate = await connection.send(
      new SaslAuthenticateRequestBuilder(Buffer.from(authorization.getClientFirstMessage()), clientId).build(5, 1, 1)
    );
    expect(authenticate).toBeDefined();

    const serverFirstMessage = new ServerFirstMessage(authenticate.authBytes.value.toString());
    const clientFinalMessage = authorization.getClientFinalMessage(serverFirstMessage);

    const finalClientMessageResponse = await connection.send(
      new SaslAuthenticateRequestBuilder(Buffer.from(clientFinalMessage), clientId).build(6, 1, 1)
    );
    expect(finalClientMessageResponse).toBeDefined();

    const metadataResponse = await connection.send(new MetadataRequestBuilder(clientId, []).build(7, 0));
    expect(metadataResponse).toBeDefined();
  });
});
