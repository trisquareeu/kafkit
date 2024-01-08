import { type StartedKafkaContainer } from '@testcontainers/kafka';
import { spawnSync, type SpawnSyncReturns } from 'child_process';
import { createConnection, type Socket } from 'net';
import { connect } from 'tls';

export class KafkaBrokerUtils {
  constructor(private readonly kafkaContainer: StartedKafkaContainer) {}

  public createTopic(topic: string, partitions = 1, replicationFactor = 1): SpawnSyncReturns<string> {
    //TODO: use this.kafkaContainer.exec
    const result = spawnSync(
      'docker',
      [
        'exec',
        '-i',
        this.kafkaContainer.getName(),
        '/bin/bash',
        '-c',
        `kafka-topics --create --bootstrap-server localhost:9092 --replication-factor ${replicationFactor} --partitions ${partitions} --topic ${topic}`
      ],
      { encoding: 'utf8' }
    );

    if (result.error || result.status !== 0) {
      throw new Error(`Failed to create topic: ${result.error || result.stderr}`);
    }

    return result;
  }

  public async getConnectedSocket(port: number = 9092): Promise<Socket> {
    const socket = createConnection(this.kafkaContainer.getMappedPort(port), this.kafkaContainer.getHost());

    return new Promise((resolve, reject) => {
      socket.on('connect', () => {
        resolve(socket);
      });

      socket.on('error', (error) => {
        reject(error);
      });
    });
  }

  public async getTlsConnectedSocket(port: number = 9095): Promise<Socket> {
    const socket = connect({
      port: this.kafkaContainer.getMappedPort(port),
      host: this.kafkaContainer.getHost(),
      rejectUnauthorized: false
    });

    return new Promise((resolve) => {
      socket.on('secureConnect', () => {
        resolve(socket);
      });
    });
  }
}
