# Kafka Producer and Consumer Examples

This directory contains example code for producing and consuming messages from the Kafka cluster.

## Prerequisites

- Kafka cluster deployed and running
- Bootstrap server endpoint (internal or external)
- Python 3.8+ or Node.js 14+ installed

## Internal vs External Access

**Internal Access (within Kubernetes):**
```
Bootstrap Server: kafka-kafka-bootstrap.kafka.svc:9092
```

**External Access (from your local machine):**
```
Bootstrap Server: <your-loadbalancer-endpoint>:9094
```

Get your LoadBalancer endpoint:
```bash
kubectl get svc kafka-kafka-external-bootstrap -n kafka -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

## Examples Available

- [Python Producer/Consumer](python/) - Using kafka-python library
- [Node.js Producer/Consumer](nodejs/) - Using kafkajs library
- [Shell Scripts](shell/) - Using Kafka command-line tools

## Quick Start

### Using Python

```bash
cd examples/python
pip install -r requirements.txt
python producer.py
python consumer.py
```

### Using Node.js

```bash
cd examples/nodejs
npm install
node producer.js
node consumer.js
```

### Using Shell Scripts

```bash
cd examples/shell
./producer.sh "Hello Kafka"
./consumer.sh
```

## Testing

1. Start the consumer first (in one terminal):
   ```bash
   python examples/python/consumer.py
   ```

2. Run the producer (in another terminal):
   ```bash
   python examples/python/producer.py
   ```

3. You should see messages flowing from producer to consumer

## Troubleshooting

- If you get connection errors, verify your bootstrap server endpoint
- For external access, ensure your security group allows traffic on port 9094
- Check that the Kafka cluster is running: `kubectl get pods -n kafka`
