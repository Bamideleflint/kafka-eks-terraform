# Kafka Cluster Quick Reference

## Cluster Information

**EKS Cluster:** kafka-eks  
**Region:** us-east-1  
**Kafka Version:** 3.6.1  
**Strimzi Version:** 0.39.0  
**Replicas:** 3 Kafka brokers, 3 ZooKeeper nodes

## Connection Endpoints

### Internal Access (within Kubernetes)
```
kafka-kafka-bootstrap.kafka.svc:9092
```

### External Access (via LoadBalancer)
```bash
# Get the bootstrap endpoint
kubectl get svc kafka-kafka-external-bootstrap -n kafka \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'; echo ":9094"
```

**Current LoadBalancers:**
- Bootstrap: `a9ddef2a479e44ceb82af592f804395b-77059609.us-east-1.elb.amazonaws.com:9094`
- Broker 0: `ae4b630fe59584eeb9d9a7ff468a7318-1279740386.us-east-1.elb.amazonaws.com:9094`
- Broker 1: `a72ac88081ccb4449b41a1c38282b3fc-1111741370.us-east-1.elb.amazonaws.com:9094`
- Broker 2: `ab7d1a2e412604929831ee0ba317e675-1769824911.us-east-1.elb.amazonaws.com:9094`

## Common Commands

### Check Cluster Status
```bash
# Get all pods
kubectl get pods -n kafka

# Check Kafka resource status
kubectl get kafka -n kafka

# Check services
kubectl get svc -n kafka
```

### Topic Management
```bash
# List topics
kubectl exec -it kafka-kafka-0 -n kafka -- bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --list

# Create topic
kubectl exec -it kafka-kafka-0 -n kafka -- bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --create --topic <topic-name> \
  --partitions 3 --replication-factor 3

# Describe topic
kubectl exec -it kafka-kafka-0 -n kafka -- bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --describe --topic <topic-name>

# Delete topic
kubectl exec -it kafka-kafka-0 -n kafka -- bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --delete --topic <topic-name>
```

### Consumer Groups
```bash
# List consumer groups
kubectl exec -it kafka-kafka-0 -n kafka -- bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --list

# Describe consumer group
kubectl exec -it kafka-kafka-0 -n kafka -- bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe --group <group-name>

# Reset offsets
kubectl exec -it kafka-kafka-0 -n kafka -- bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group <group-name> \
  --topic <topic-name> \
  --reset-offsets --to-earliest --execute
```

### Monitoring
```bash
# Port-forward Kafka Exporter
kubectl port-forward svc/kafka-exporter -n kafka 9308:9308

# Access metrics at http://localhost:9308/metrics

# Check broker metrics
kubectl exec -it kafka-kafka-0 -n kafka -- bin/kafka-broker-api-versions.sh \
  --bootstrap-server localhost:9092
```

### Logs
```bash
# Kafka broker logs
kubectl logs kafka-kafka-0 -n kafka

# ZooKeeper logs
kubectl logs kafka-zookeeper-0 -n kafka

# Strimzi operator logs
kubectl logs -n kafka deployment/strimzi-cluster-operator

# Kafka exporter logs
kubectl logs -n kafka deployment/kafka-exporter
```

## Quick Tests

### Console Producer
```bash
kubectl exec -it kafka-kafka-0 -n kafka -- bin/kafka-console-producer.sh \
  --bootstrap-server localhost:9092 \
  --topic test-topic
```
Type messages and press Enter. Press Ctrl+C to exit.

### Console Consumer
```bash
kubectl exec -it kafka-kafka-0 -n kafka -- bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic test-topic \
  --from-beginning
```
Press Ctrl+C to exit.

## Configuration Files

- Kafka Cluster: `kubernetes/kafka/strimzi/kafka-cluster.yaml`
- Monitoring: `kubernetes/monitoring/kafka-exporter.yaml`
- Terraform: `terraform/environments/prod/`
- Examples: `examples/`

## Useful kubectl Commands

```bash
# Get cluster info
kubectl cluster-info

# Update kubeconfig
aws eks update-kubeconfig --name kafka-eks --region us-east-1

# Switch context
kubectl config use-context arn:aws:eks:us-east-1:ACCOUNT_ID:cluster/kafka-eks

# Get all resources in kafka namespace
kubectl get all -n kafka

# Describe kafka resource
kubectl describe kafka kafka -n kafka

# Exec into broker
kubectl exec -it kafka-kafka-0 -n kafka -- bash
```

## Troubleshooting Quick Checks

```bash
# Check if all pods are running
kubectl get pods -n kafka

# Check pod events
kubectl describe pod kafka-kafka-0 -n kafka

# Check service endpoints
kubectl get endpoints -n kafka

# Check LoadBalancer status
kubectl get svc -n kafka | grep LoadBalancer

# Check persistent volumes
kubectl get pvc -n kafka

# Check Kafka cluster status
kubectl get kafka kafka -n kafka -o yaml
```

## Production Checklist

- [ ] Kafka cluster status is Ready
- [ ] All 9 pods are Running (3 Kafka, 3 ZooKeeper, 2 Entity Operator, 1 Strimzi)
- [ ] External LoadBalancers have endpoints assigned
- [ ] Test topic created and verified
- [ ] Monitoring exporter running
- [ ] Metrics accessible
- [ ] Producer/consumer examples tested
- [ ] Documentation reviewed
- [ ] Backup/DR plan in place
- [ ] Security groups configured
- [ ] Resource limits set
- [ ] Alerts configured

## Support

- [Full Deployment Guide](docs/DEPLOYMENT.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- [Strimzi Documentation](https://strimzi.io/documentation/)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
