const MINIMUM_ITERATIONS = 4096;

/**
 * According to the Apache Kafka documentation 7.4.5.4 Security Considerations for SASL/SCRAM,
 * Kafka supports only the strong hash functions SHA-256 and SHA-512 with a minimum iteration
 * count of 4096.
 *
 * @see https://kafka.apache.org/documentation/#security_sasl_scram_security
 */
export interface ScramMechanism {
  readonly name: string;
  readonly hashLengthInBytes: number;
  readonly minimumIterations: number;
}

export const ScramSha256: ScramMechanism = {
  hashLengthInBytes: 256 / 8,
  minimumIterations: MINIMUM_ITERATIONS,
  name: 'sha256'
};

export const ScramSha512: ScramMechanism = {
  hashLengthInBytes: 512 / 8,
  minimumIterations: MINIMUM_ITERATIONS,
  name: 'sha512'
};
