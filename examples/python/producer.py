#!/usr/bin/env python3
"""
Kafka Producer Example

This script sends messages to a Kafka topic.
"""

import json
import time
from datetime import datetime
from kafka import KafkaProducer
from kafka.errors import KafkaError

# Configuration
BOOTSTRAP_SERVERS = ['kafka-kafka-bootstrap.kafka.svc:9092']  # Internal access
# BOOTSTRAP_SERVERS = ['<your-loadbalancer-endpoint>:9094']   # External access
TOPIC = 'demo-topic'

def create_producer():
    """Create and return a Kafka producer."""
    try:
        producer = KafkaProducer(
            bootstrap_servers=BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            # Retry configuration
            retries=5,
            max_in_flight_requests_per_connection=1,
            # Acknowledgment configuration
            acks='all',  # Wait for all replicas to acknowledge
        )
        print(f"✓ Connected to Kafka at {BOOTSTRAP_SERVERS}")
        return producer
    except KafkaError as e:
        print(f"✗ Failed to create producer: {e}")
        raise

def send_message(producer, topic, message):
    """Send a message to Kafka topic."""
    try:
        # Send message asynchronously
        future = producer.send(topic, value=message)
        
        # Block until message is sent (or timeout)
        record_metadata = future.get(timeout=10)
        
        print(f"✓ Message sent to partition {record_metadata.partition} "
              f"at offset {record_metadata.offset}")
        return True
    except KafkaError as e:
        print(f"✗ Failed to send message: {e}")
        return False

def main():
    """Main function to send messages."""
    producer = create_producer()
    
    try:
        # Send 10 messages
        for i in range(10):
            message = {
                'message_id': i,
                'timestamp': datetime.now().isoformat(),
                'content': f'Hello Kafka! Message #{i}',
                'metadata': {
                    'source': 'python-producer',
                    'version': '1.0'
                }
            }
            
            print(f"\n📤 Sending message {i}...")
            if send_message(producer, TOPIC, message):
                print(f"   Data: {message['content']}")
            
            # Wait 1 second between messages
            time.sleep(1)
        
        print(f"\n✓ Successfully sent 10 messages to topic '{TOPIC}'")
        
    except KeyboardInterrupt:
        print("\n⚠ Interrupted by user")
    finally:
        # Flush and close producer
        print("\n🔄 Flushing remaining messages...")
        producer.flush()
        producer.close()
        print("✓ Producer closed")

if __name__ == '__main__':
    main()
