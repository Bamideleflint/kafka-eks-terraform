#!/bin/bash
#
# Kafka Producer Shell Script
# 
# Usage: ./producer.sh "Your message here"
#

# Configuration
BOOTSTRAP_SERVER="kafka-kafka-bootstrap.kafka.svc:9092"  # Internal access
# BOOTSTRAP_SERVER="<your-loadbalancer-endpoint>:9094"   # External access
TOPIC="demo-topic"
POD_NAME="kafka-kafka-0"
NAMESPACE="kafka"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if message is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 \"Your message here\"${NC}"
    exit 1
fi

MESSAGE="$1"

echo -e "${GREEN}📤 Sending message to Kafka...${NC}"
echo -e "   Topic: ${TOPIC}"
echo -e "   Message: ${MESSAGE}"
echo ""

# Send message using kubectl exec
kubectl exec -it ${POD_NAME} -n ${NAMESPACE} -- bash -c "
echo '${MESSAGE}' | bin/kafka-console-producer.sh \\
  --bootstrap-server ${BOOTSTRAP_SERVER} \\
  --topic ${TOPIC}
"

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ Message sent successfully!${NC}"
else
    echo -e "\n${RED}✗ Failed to send message${NC}"
    exit 1
fi
