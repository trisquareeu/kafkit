import { KafkaContainer, type StartedKafkaContainer } from '@testcontainers/kafka';
import { type Socket } from 'net';
import { Connection } from '../../../src/connection/connection';
import { Array, Int16, Int32, NullableString, String } from '../../../src/protocol/primitives';
import { MetadataRequestV0, RequestHeaderV1 } from '../../../src/protocol/requests';
import { KafkaBrokerUtils } from '../../utils';

jest.setTimeout(120_000);

const port = 9092;
const topicName = 'test-topic';

describe('MetadataRequest', () => {
  let socket: Socket;
  let connection: Connection;
  let container: StartedKafkaContainer;
  let brokerUtils: KafkaBrokerUtils;

  beforeAll(async () => {
    container = await new KafkaContainer('confluentinc/cp-kafka:7.3.2').withExposedPorts(port).withReuse().start();

    brokerUtils = new KafkaBrokerUtils(container);
    brokerUtils.createTopic(topicName);
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
      const request = new MetadataRequestV0(
        new RequestHeaderV1(new Int16(3), new Int16(0), new Int32(5), new NullableString('test')),
        // eslint-disable-next-line @typescript-eslint/no-array-constructor
        new Array([new String(topicName)], (topic, buffer) => topic.serialize(buffer))
      );
      const response = await connection.send(request);

      expect(response).toBeInstanceOf(request.ExpectedResponseDataClass);
      expect(response.brokers.value?.length).toBe(1);
      expect(response.topics.value?.length).toBe(1);
      expect(response.topics.value?.[0]!.name.value).toBe(topicName);
      expect(response.topics.value?.[0]!.errorCode.value).toBe(0);
      expect(response.topics.value?.[0]!.partitions.value?.length).toBe(1);
    });
  });
});
