#!/usr/bin/env python3
"""
Kafka Consumer Example

This script consumes messages from a Kafka topic.
"""

import json
from kafka import KafkaConsumer
from kafka.errors import KafkaError

# Configuration
BOOTSTRAP_SERVERS = ['kafka-kafka-bootstrap.kafka.svc:9092']  # Internal access
# BOOTSTRAP_SERVERS = ['<your-loadbalancer-endpoint>:9094']   # External access
TOPIC = 'demo-topic'
GROUP_ID = 'python-consumer-group'

def create_consumer():
    """Create and return a Kafka consumer."""
    try:
        consumer = KafkaConsumer(
            TOPIC,
            bootstrap_servers=BOOTSTRAP_SERVERS,
            group_id=GROUP_ID,
            # Deserialize messages
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            # Start from earliest message if no offset exists
            auto_offset_reset='earliest',
            # Commit offsets automatically
            enable_auto_commit=True,
            auto_commit_interval_ms=1000,
            # Consumer session timeout
            session_timeout_ms=30000,
        )
        print(f"✓ Connected to Kafka at {BOOTSTRAP_SERVERS}")
        print(f"✓ Subscribed to topic '{TOPIC}' with group '{GROUP_ID}'")
        print("\n📥 Waiting for messages... (Press Ctrl+C to exit)\n")
        return consumer
    except KafkaError as e:
        print(f"✗ Failed to create consumer: {e}")
        raise

def consume_messages(consumer):
    """Consume and process messages from Kafka."""
    message_count = 0
    
    try:
        for message in consumer:
            message_count += 1
            
            # Extract message details
            partition = message.partition
            offset = message.offset
            timestamp = message.timestamp
            value = message.value
            
            # Display message
            print(f"{'='*60}")
            print(f"Message #{message_count}")
            print(f"  Partition: {partition}")
            print(f"  Offset: {offset}")
            print(f"  Timestamp: {timestamp}")
            print(f"  Message ID: {value.get('message_id', 'N/A')}")
            print(f"  Content: {value.get('content', 'N/A')}")
            print(f"  Sent At: {value.get('timestamp', 'N/A')}")
            
            if 'metadata' in value:
                print(f"  Metadata:")
                for key, val in value['metadata'].items():
                    print(f"    {key}: {val}")
            
            print(f"{'='*60}\n")
            
    except KeyboardInterrupt:
        print("\n⚠ Interrupted by user")
    finally:
        print(f"\n📊 Total messages consumed: {message_count}")

def main():
    """Main function to consume messages."""
    consumer = create_consumer()
    
    try:
        consume_messages(consumer)
    finally:
        # Close consumer
        print("\n🔄 Closing consumer...")
        consumer.close()
        print("✓ Consumer closed")

if __name__ == '__main__':
    main()
