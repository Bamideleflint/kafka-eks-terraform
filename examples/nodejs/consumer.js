#!/usr/bin/env node
/**
 * Kafka Consumer Example (Node.js)
 * 
 * This script consumes messages from a Kafka topic using KafkaJS.
 */

const { Kafka } = require('kafkajs');

// Configuration
const BOOTSTRAP_SERVERS = ['kafka-kafka-bootstrap.kafka.svc:9092']; // Internal access
// const BOOTSTRAP_SERVERS = ['<your-loadbalancer-endpoint>:9094']; // External access
const TOPIC = 'demo-topic';
const CLIENT_ID = 'nodejs-consumer';
const GROUP_ID = 'nodejs-consumer-group';

// Create Kafka client
const kafka = new Kafka({
  clientId: CLIENT_ID,
  brokers: BOOTSTRAP_SERVERS,
  retry: {
    retries: 5,
    initialRetryTime: 300,
  },
});

// Create consumer
const consumer = kafka.consumer({
  groupId: GROUP_ID,
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
});

let messageCount = 0;

async function main() {
  try {
    // Connect consumer
    console.log('🔄 Connecting to Kafka...');
    await consumer.connect();
    console.log(`✓ Connected to Kafka at ${BOOTSTRAP_SERVERS.join(', ')}`);

    // Subscribe to topic
    await consumer.subscribe({
      topic: TOPIC,
      fromBeginning: true,
    });
    console.log(`✓ Subscribed to topic '${TOPIC}' with group '${GROUP_ID}'`);
    console.log('\n📥 Waiting for messages... (Press Ctrl+C to exit)\n');

    // Consume messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        messageCount++;

        // Parse message
        const value = JSON.parse(message.value.toString());
        const headers = {};
        if (message.headers) {
          for (const [key, val] of Object.entries(message.headers)) {
            headers[key] = val.toString();
          }
        }

        // Display message
        console.log('='.repeat(60));
        console.log(`Message #${messageCount}`);
        console.log(`  Partition: ${partition}`);
        console.log(`  Offset: ${message.offset}`);
        console.log(`  Timestamp: ${message.timestamp}`);
        console.log(`  Key: ${message.key ? message.key.toString() : 'null'}`);
        console.log(`  Message ID: ${value.message_id || 'N/A'}`);
        console.log(`  Content: ${value.content || 'N/A'}`);
        console.log(`  Sent At: ${value.timestamp || 'N/A'}`);

        if (value.metadata) {
          console.log('  Metadata:');
          for (const [key, val] of Object.entries(value.metadata)) {
            console.log(`    ${key}: ${val}`);
          }
        }

        if (Object.keys(headers).length > 0) {
          console.log('  Headers:');
          for (const [key, val] of Object.entries(headers)) {
            console.log(`    ${key}: ${val}`);
          }
        }

        console.log('='.repeat(60) + '\n');
      },
    });

  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    process.exit(1);
  }
}

// Handle interruption
process.on('SIGINT', async () => {
  console.log('\n⚠ Interrupted by user');
  console.log(`\n📊 Total messages consumed: ${messageCount}`);
  console.log('\n🔄 Disconnecting consumer...');
  await consumer.disconnect();
  console.log('✓ Consumer disconnected');
  process.exit(0);
});

// Run main function
main().catch(console.error);
