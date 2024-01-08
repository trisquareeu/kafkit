/* eslint-disable @typescript-eslint/no-array-constructor */
import { KafkaContainer, type StartedKafkaContainer } from '@testcontainers/kafka';
import { createConnection, type Socket } from 'net';
import { Connection } from '../../../src/connection/connection';
import {
  Array,
  CompressionType,
  HasDeleteHorizon,
  Int16,
  Int32,
  Int64,
  IsControlBatch,
  IsTransactional,
  NonNullableArray,
  NullableString,
  Record,
  RecordBatch,
  String,
  TimestampType,
  VarInt,
  VarLong
} from '../../../src/protocol/primitives';
import {
  RecordHeader,
  RecordHeaderArray,
  RecordHeaderKey,
  VarIntBytes
} from '../../../src/protocol/primitives/record-batch/record';
import { ProduceRequestV3, RequestHeaderV1 } from '../../../src/protocol/requests';
import { TopicDataV3 } from '../../../src/protocol/requests/produce/topic-data';
import { PartitionDataV3 } from '../../../src/protocol/requests/produce/topic-data/partition-data';
import { KafkaBrokerUtils } from '../../utils';

jest.setTimeout(120_000);

const port = 9092;
const topicName = 'test-topic-ebba68879c6f5081d8c2';

describe('ProduceRequest', () => {
  let socket: Socket;
  let connection: Connection;
  let container: StartedKafkaContainer;

  beforeAll(async () => {
    container = await new KafkaContainer('confluentinc/cp-kafka:7.3.2').withExposedPorts(port).withReuse().start();

    new KafkaBrokerUtils(container).createTopic(topicName);
  });

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    socket = await createConnectedSocket(container.getHost(), container.getMappedPort(port));
    connection = new Connection(socket);
  });

  afterEach(() => {
    socket.destroy();
  });

  describe('v0', () => {
    it('should send the request and properly parse the response', async () => {
      const request = new ProduceRequestV3(
        new RequestHeaderV1(new Int16(0), new Int16(3), new Int32(5), new NullableString('test')),
        new NullableString(null),
        new Int16(-1),
        new Int32(30000),
        new Array(
          [
            new TopicDataV3(
              new String(topicName),
              new Array(
                [
                  new PartitionDataV3(
                    new Int32(0),
                    RecordBatch.from({
                      baseOffset: new Int64(0n),
                      partitionLeaderEpoch: new Int32(0),
                      attributes: {
                        compressionType: CompressionType.None,
                        timestampType: TimestampType.CreateTime,
                        isTransactional: IsTransactional.No,
                        isControlBatch: IsControlBatch.No,
                        hasDeleteHorizon: HasDeleteHorizon.No
                      },
                      lastOffsetDelta: new Int32(2),
                      baseTimestamp: new Int64(BigInt(1509928155660)),
                      maxTimestamp: new Int64(BigInt(1509928155660)),
                      producerId: new Int64(-1n),
                      producerEpoch: new Int16(0),
                      baseSequence: new Int32(10),
                      records: new NonNullableArray(
                        [
                          new Record({
                            timestampDelta: new VarLong(0n),
                            offsetDelta: new VarInt(0),
                            key: new VarIntBytes(Buffer.from('key-9d0f348cb2e730e1edc4')),
                            value: new VarIntBytes(Buffer.from('some-value-a17b4c81f9ecd1e896e3')),
                            headers: new RecordHeaderArray([
                              new RecordHeader(new RecordHeaderKey('a'), new VarIntBytes(Buffer.from('b'))),
                              new RecordHeader(new RecordHeaderKey('c'), new VarIntBytes(Buffer.from('d'))),
                              new RecordHeader(new RecordHeaderKey('c'), new VarIntBytes(Buffer.from('e')))
                            ])
                          }),
                          new Record({
                            timestampDelta: new VarLong(0n),
                            offsetDelta: new VarInt(1),
                            key: new VarIntBytes(Buffer.from('key-c7073e965c34b4cc6442')),
                            value: new VarIntBytes(Buffer.from('some-value-65df422070d7ad73914f')),
                            headers: new RecordHeaderArray([
                              new RecordHeader(new RecordHeaderKey('a'), new VarIntBytes(Buffer.from('b')))
                            ])
                          }),
                          new Record({
                            timestampDelta: new VarLong(0n),
                            offsetDelta: new VarInt(2),
                            key: new VarIntBytes(Buffer.from('key-1693b184a9b52dbe03bc')),
                            value: new VarIntBytes(Buffer.from('some-value-3fcb65ffca087cba20ad')),
                            headers: new RecordHeaderArray([
                              new RecordHeader(new RecordHeaderKey('a'), new VarIntBytes(Buffer.from('b')))
                            ])
                          })
                        ],
                        async (record, buffer) => record.serialize(buffer)
                      )
                    })
                  )
                ],
                async (partitionData, buffer) => partitionData.serialize(buffer)
              )
            )
          ],
          async (topicData, buffer) => topicData.serialize(buffer)
        )
      );
      const response = await connection.send(request);

      expect(response).toBeInstanceOf(request.ExpectedResponseDataClass);
      expect(response.responses.value![0]!.partitionResponses.value![0]!.errorCode.value).toEqual(0);
    });
  });
});

function createConnectedSocket(host: string, port: number): Promise<Socket> {
  const socket = createConnection(port, host);

  return new Promise((resolve, reject) => {
    socket.on('connect', () => {
      resolve(socket);
    });

    socket.on('error', (error) => {
      reject(error);
    });
  });
}
