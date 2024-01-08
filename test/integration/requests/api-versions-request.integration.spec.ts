import { KafkaContainer, type StartedKafkaContainer } from '@testcontainers/kafka';
import { type Socket } from 'net';
import { Connection } from '../../../src/connection/connection';
import { TagSection } from '../../../src/protocol/commons';
import { CompactString, Int16, Int32, NullableString } from '../../../src/protocol/primitives';
import {
  ApiVersionsRequestV0,
  ApiVersionsRequestV1,
  ApiVersionsRequestV2,
  ApiVersionsRequestV3,
  RequestHeaderV1,
  RequestHeaderV2
} from '../../../src/protocol/requests';
import { KafkaBrokerUtils } from '../../utils';

jest.setTimeout(120_000);

const port = 9092;

describe('ApiVersionsRequest', () => {
  let socket: Socket;
  let connection: Connection;
  let container: StartedKafkaContainer;
  let brokerUtils: KafkaBrokerUtils;

  beforeAll(async () => {
    container = await new KafkaContainer('confluentinc/cp-kafka:7.3.2').withExposedPorts(port).withReuse().start();
    brokerUtils = new KafkaBrokerUtils(container);
  });

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    socket = await brokerUtils.getConnectedSocket();
    connection = new Connection(socket);
  });

  afterEach(() => {
    socket.destroy();
  });

  describe('v0', () => {
    it('should send the request and properly parse the response', async () => {
      const request = new ApiVersionsRequestV0(
        new RequestHeaderV1(new Int16(18), new Int16(0), new Int32(5), new NullableString('test'))
      );
      const response = await connection.send(request);

      expect(response).toBeInstanceOf(request.ExpectedResponseDataClass);
    });
  });

  describe('v1', () => {
    it('should send the request and properly parse the response', async () => {
      const request = new ApiVersionsRequestV1(
        new RequestHeaderV1(new Int16(18), new Int16(1), new Int32(5), new NullableString('test'))
      );
      const response = await connection.send(request);

      expect(response).toBeInstanceOf(request.ExpectedResponseDataClass);
    });
  });

  describe('v2', () => {
    it('should send the request and properly parse the response', async () => {
      const request = new ApiVersionsRequestV2(
        new RequestHeaderV1(new Int16(18), new Int16(2), new Int32(5), new NullableString('test'))
      );
      const response = await connection.send(request);

      expect(response).toBeInstanceOf(request.ExpectedResponseDataClass);
    });
  });

  describe('v3', () => {
    it('should send the request and properly parse the response', async () => {
      const request = new ApiVersionsRequestV3(
        new RequestHeaderV2(new Int16(18), new Int16(3), new Int32(5), new NullableString('test'), new TagSection([])),
        new CompactString('the-best-kafka-client'),
        new CompactString('1.0.0')
      );
      const response = await connection.send(request);

      expect(response).toBeInstanceOf(request.ExpectedResponseDataClass);
    });
  });
});
