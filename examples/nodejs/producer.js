#!/usr/bin/env node
/**
 * Kafka Producer Example (Node.js)
 * 
 * This script sends messages to a Kafka topic using KafkaJS.
 */

const { Kafka } = require('kafkajs');

// Configuration
const BOOTSTRAP_SERVERS = ['kafka-kafka-bootstrap.kafka.svc:9092']; // Internal access
// const BOOTSTRAP_SERVERS = ['<your-loadbalancer-endpoint>:9094']; // External access
const TOPIC = 'demo-topic';
const CLIENT_ID = 'nodejs-producer';

// Create Kafka client
const kafka = new Kafka({
  clientId: CLIENT_ID,
  brokers: BOOTSTRAP_SERVERS,
  retry: {
    retries: 5,
    initialRetryTime: 300,
  },
});

// Create producer
const producer = kafka.producer({
  allowAutoTopicCreation: false,
  transactionalId: undefined,
  maxInFlightRequests: 5,
  idempotent: true,
  acks: -1, // Wait for all replicas
});

async function sendMessage(message) {
  try {
    const result = await producer.send({
      topic: TOPIC,
      messages: [
        {
          key: message.message_id.toString(),
          value: JSON.stringify(message),
          headers: {
            'content-type': 'application/json',
          },
        },
      ],
    });

    console.log(`✓ Message sent to partition ${result[0].partition} at offset ${result[0].baseOffset}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to send message: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    // Connect producer
    console.log('🔄 Connecting to Kafka...');
    await producer.connect();
    console.log(`✓ Connected to Kafka at ${BOOTSTRAP_SERVERS.join(', ')}`);

    // Send 10 messages
    for (let i = 0; i < 10; i++) {
      const message = {
        message_id: i,
        timestamp: new Date().toISOString(),
        content: `Hello Kafka! Message #${i}`,
        metadata: {
          source: 'nodejs-producer',
          version: '1.0',
        },
      };

      console.log(`\n📤 Sending message ${i}...`);
      if (await sendMessage(message)) {
        console.log(`   Data: ${message.content}`);
      }

      // Wait 1 second between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n✓ Successfully sent 10 messages to topic '${TOPIC}'`);

  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    process.exit(1);
  } finally {
    // Disconnect producer
    console.log('\n🔄 Disconnecting producer...');
    await producer.disconnect();
    console.log('✓ Producer disconnected');
  }
}

// Handle interruption
process.on('SIGINT', async () => {
  console.log('\n⚠ Interrupted by user');
  await producer.disconnect();
  process.exit(0);
});

// Run main function
main().catch(console.error);
