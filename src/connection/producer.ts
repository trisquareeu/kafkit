import EventEmitter from 'events';
import { ProduceRequestBuilder } from '../protocol/requests';
import { Cluster, type ConnectionInfo, type PartitionMetadata } from './cluster';

export type ProducerRecord<K, V> = {
  topic: string;
  partition?: number;
  headers: Record<any, any>; // FIXME: Narrow the type;
  key: K;
  value: V;
  timestamp?: number;
};

export type RecordMetadata = object;

interface Partitioner<K> {
  partition(key: K, partitions: PartitionMetadata[]): number;
}

class RoundRobinPartitioner<K> implements Partitioner<K> {
  private index = 0;

  public partition(_key: K, partitions: PartitionMetadata[]): number {
    const partition = this.index % partitions.length;
    this.index += 1;

    return partition;
  }
}

type InflightRecord<K, V> = {
  record: ProducerRecord<K, V>;
  resolve: (metadata: RecordMetadata) => void;
  reject: (error: Error) => void;
};

class Accumulator<K, V> {
  private readonly data: Map<{ topic: string; partition: number }, InflightRecord<K, V>[]> = new Map();

  constructor(private readonly eventEmitter: EventEmitter) {}

  /**
   * Note: This is a very naive implementation of the accumulator logic just to showcase the flow.
   */
  public accumulate(topic: string, partition: number, record: InflightRecord<K, V>): void {
    const key = { topic, partition };
    const records = this.data.get(key);
    if (records === undefined) {
      this.data.set(key, [record]);
    } else {
      if (records.length > 5) {
        this.eventEmitter.emit('flush', topic, partition, records);
        this.data.set(key, [record]);
      }

      records.push(record);
    }
  }
}

export class Producer<K, V> {
  private readonly accumulator: Accumulator<K, V>;
  private readonly eventEmitter: EventEmitter = new EventEmitter();
  private readonly cluster: Cluster;

  constructor(
    bootstrapServers: ConnectionInfo[],
    clientId: string | null,
    clientSoftwareName: string,
    clientSoftwareVersion: string,
    private readonly partitioner: Partitioner<K> = new RoundRobinPartitioner()
  ) {
    this.accumulator = new Accumulator(this.eventEmitter);
    this.cluster = new Cluster(bootstrapServers, clientId, clientSoftwareName, clientSoftwareVersion);

    /**
     * This is a very naive implementation of the flush logic just to showcase the flow.
     */
    this.eventEmitter.on('flush', async (topic: string, partition: number, records: InflightRecord<K, V>[]) => {
      const topicMetadata = await this.cluster.getTopicMetadata(topic);

      // get client for topic partition leader
      const leaderId = topicMetadata.partitions[partition]?.leaderId;
      if (leaderId === undefined) {
        throw new Error('No leader for partition');
      }
      const client = await this.cluster.getClientForBroker(leaderId);

      // send record to leader
      // serialize key and value
      const requestBuilder = new ProduceRequestBuilder(clientId, null, 0, 1000); // TODO: Figure out how to map from ProducerRecord to protocol respective data
      const metadata = await client.send(requestBuilder);

      records.forEach(({ resolve }) => {
        resolve(metadata);
      });
    });
  }

  public async send(record: ProducerRecord<K, V>): Promise<RecordMetadata> {
    const topicMetadata = await this.cluster.getTopicMetadata(record.topic);

    // if partition is not present, get number of partitions for topic and pass it to partitioner
    if (record.partition === undefined) {
      // pass number of partitions to partitioner
      record.partition = this.partitioner.partition(record.key, Object.values(topicMetadata.partitions));
    }

    return new Promise((resolve, reject) => {
      this.accumulator.accumulate(record.topic, record.partition!, { record, resolve, reject });
    });
  }
}
