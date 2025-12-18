#!/bin/bash
#
# Kafka Consumer Shell Script
# 
# This script consumes messages from a Kafka topic
#

# Configuration
BOOTSTRAP_SERVER="kafka-kafka-bootstrap.kafka.svc:9092"  # Internal access
# BOOTSTRAP_SERVER="<your-loadbalancer-endpoint>:9094"   # External access
TOPIC="demo-topic"
POD_NAME="kafka-kafka-0"
NAMESPACE="kafka"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}📥 Consuming messages from Kafka...${NC}"
echo -e "   Topic: ${TOPIC}"
echo -e "   Press Ctrl+C to exit"
echo ""
echo -e "${YELLOW}${'='*60}${NC}"
echo ""

# Consume messages using kubectl exec
kubectl exec -it ${POD_NAME} -n ${NAMESPACE} -- \\
  bin/kafka-console-consumer.sh \\
  --bootstrap-server ${BOOTSTRAP_SERVER} \\
  --topic ${TOPIC} \\
  --from-beginning \\
  --property print.timestamp=true \\
  --property print.key=true \\
  --property print.offset=true \\
  --property print.partition=true

echo ""
echo -e "${GREEN}✓ Consumer stopped${NC}"
