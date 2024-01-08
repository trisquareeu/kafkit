import { MetadataRequestBuilder } from '../protocol/requests/metadata';
import { Client } from './client';

export type ConnectionInfo = {
  host: string;
  port: number;
};

export type PartitionMetadata = {
  readonly leaderId: number;
  readonly replicaNodes: number[];
  readonly isrNodes: number[];
};

export type TopicMetadata = {
  partitions: Record<number, PartitionMetadata>;
};

export class Cluster {
  private brokerClients: Map<number, Client> = new Map();
  private topicsMetadata: Map<string, TopicMetadata> = new Map();
  private brokersConnectionInfo: Map<number, ConnectionInfo> = new Map();

  constructor(
    private readonly bootstrapServers: ConnectionInfo[],
    private readonly clientId: string | null,
    private readonly clientSoftwareName: string,
    private readonly clientSoftwareVersion: string
  ) {}

  public async getTopicMetadata(topic: string): Promise<TopicMetadata> {
    const topicMetadata = this.topicsMetadata.get(topic);
    if (topicMetadata) {
      return topicMetadata;
    }

    await this.refreshMetadata([topic]);

    return this.topicsMetadata.get(topic)!;
  }

  public async refreshMetadata(topics?: string[]): Promise<void> {
    const response = await this.getClientForBootstrapServer().send(
      new MetadataRequestBuilder(this.clientId, topics ?? [])
    );
    const brokersConnectionInfo = new Map<number, ConnectionInfo>();
    const topicsMetadata = new Map<string, TopicMetadata>();

    response.brokers.value?.forEach((broker) => {
      brokersConnectionInfo.set(broker.nodeId.value, {
        host: broker.host.value,
        port: broker.port.value
      });
    });

    response.topics.value?.forEach((topic) => {
      const partitions: Record<number, PartitionMetadata> = {};

      topic.partitions.value?.forEach((partition) => {
        partitions[partition.partitionIndex.value] = {
          leaderId: partition.leaderId.value,
          replicaNodes: partition.replicaNodes.value!.map((node) => node.value),
          isrNodes: partition.isrNodes.value!.map((node) => node.value)
        };
      });

      topicsMetadata.set(topic.name.value, { partitions });
    });

    this.brokersConnectionInfo = brokersConnectionInfo;
    this.topicsMetadata = topicsMetadata;
  }

  public async getClientForBroker(id: number): Promise<Client> {
    const client = this.brokerClients.get(id);
    if (client === undefined) {
      return this.createClientForBroker(id);
    }

    return client;
  }

  public getClientForBootstrapServer(): Client {
    // todo figure out better implementation
    const { host, port } = this.bootstrapServers[0]!;

    return new Client(host, port, this.clientId, this.clientSoftwareName, this.clientSoftwareVersion);
  }

  private async createClientForBroker(id: number): Promise<Client> {
    const connectionInfo = this.getBrokerConnectionInfo(id);
    if (connectionInfo === undefined) {
      throw new Error(`No connection info for broker ${id}`);
    }

    await this.refreshMetadata();

    const client = new Client(
      connectionInfo.host,
      connectionInfo.port,
      this.clientId,
      this.clientSoftwareName,
      this.clientSoftwareVersion
    );
    this.brokerClients.set(id, client);

    return client;
  }

  private getBrokerConnectionInfo(id: number): ConnectionInfo {
    const connectionInfo = this.brokersConnectionInfo.get(id);
    if (connectionInfo === undefined) {
      throw new Error(`No connection info for broker ${id}`);
    }

    return connectionInfo;
  }
}
