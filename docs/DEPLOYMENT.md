# Deployment Guide - Kafka on EKS

Complete step-by-step guide for deploying Apache Kafka on Amazon EKS using Terraform and Strimzi.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Terraform >= 1.6 installed
- kubectl installed  
- Git for version control

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Infrastructure Deployment](#infrastructure-deployment)
3. [Kafka Deployment](#kafka-deployment)
4. [Verification](#verification)
5. [Post-Deployment](#post-deployment)
6. [GitHub Actions Setup](#github-actions-setup-optional)
7. [Cleanup](#cleanup)

## Initial Setup

### 1. Configure AWS Credentials

```bash
aws configure
```

Or use environment variables:
```bash
export AWS_ACCESS_KEY_ID="YOUR-ACCESS-KEY"
export AWS_SECRET_ACCESS_KEY="YOUR-SECRET-KEY"
export AWS_DEFAULT_REGION="us-east-1"
```

### 2. Prepare Terraform State Backend

Create S3 bucket and DynamoDB table:

```bash
# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"

# Create unique bucket name
BUCKET="kafka-eks-terraform-state-${ACCOUNT_ID}-${REGION}"

# Create S3 bucket
aws s3 mb s3://${BUCKET} --region ${REGION}

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket ${BUCKET} \
  --versioning-configuration Status=Enabled

# Create DynamoDB table
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ${REGION}
```

### 3. Configure Variables

Update `terraform/environments/prod/terraform.tfvars`:

```hcl
aws_region             = "us-east-1"
cluster_name           = "kafka-eks"
terraform_state_bucket = "kafka-eks-terraform-state-123456789012-us-east-1"
dynamodb_table         = "terraform-locks"
github_repo            = "yourusername/kafka-eks-terraform"
aws_account_id         = "123456789012"
```

## Infrastructure Deployment

### 1. Deploy with Terraform

```bash
cd terraform/environments/prod

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Apply infrastructure
terraform apply
```

**Expected output:**
```
Apply complete! Resources: 45 added, 0 changed, 0 destroyed.

Outputs:
cluster_endpoint = "https://XXXXX.gr7.us-east-1.eks.amazonaws.com"
cluster_name = "kafka-eks"
github_actions_role_arn = "arn:aws:iam::123456789012:role/GitHubActionsKafkaDeployRole"
```

### 2. Configure kubectl

```bash
aws eks update-kubeconfig --name kafka-eks --region us-east-1
```

Verify cluster access:
```bash
kubectl get nodes
```

**Expected output:**
```
NAME                         STATUS   ROLES    AGE   VERSION
ip-10-0-1-92.ec2.internal    Ready    <none>   5m    v1.32.0-eks-a371706
ip-10-0-2-157.ec2.internal   Ready    <none>   5m    v1.32.0-eks-a371706
ip-10-0-3-242.ec2.internal   Ready    <none>   5m    v1.32.0-eks-a371706
```

### 3. Grant IAM User Access (If Needed)

If using an IAM user different from the cluster creator:

```bash
# Get your IAM user ARN
IAM_USER=$(aws sts get-caller-identity --query Arn --output text)

# Create access entry
aws eks create-access-entry \
  --cluster-name kafka-eks \
  --principal-arn ${IAM_USER} \
  --type STANDARD \
  --region us-east-1

# Grant admin access
aws eks associate-access-policy \
  --cluster-name kafka-eks \
  --principal-arn ${IAM_USER} \
  --access-scope type=cluster \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy \
  --region us-east-1
```

## Kafka Deployment

### 1. Install Strimzi Operator

```bash
# Create namespace
kubectl create namespace kafka

# Install Strimzi operator
kubectl create -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka

# Wait for operator to be ready
kubectl get pods -n kafka -w
```

Wait until you see:
```
NAME                                        READY   STATUS    RESTARTS   AGE
strimzi-cluster-operator-74f587697c-xxxxx   1/1     Running   0          1m
```

Press `Ctrl+C` to exit watch mode.

### 2. Deploy Kafka Cluster

```bash
kubectl apply -f kubernetes/kafka/strimzi/kafka-cluster.yaml
```

Monitor deployment:
```bash
kubectl get pods -n kafka -w
```

Wait for all pods to be Running (this takes 3-5 minutes):
```
NAME                                        READY   STATUS    RESTARTS   AGE
kafka-entity-operator-xxxxxxxxxx-xxxxx     2/2     Running   0          3m
kafka-kafka-0                              1/1     Running   0          4m
kafka-kafka-1                              1/1     Running   0          4m
kafka-kafka-2                              1/1     Running   0          4m
kafka-zookeeper-0                          1/1     Running   0          5m
kafka-zookeeper-1                          1/1     Running   0          5m
kafka-zookeeper-2                          1/1     Running   0          5m
strimzi-cluster-operator-74f587697c-xxxxx  1/1     Running   0          10m
```

### 3. Deploy Monitoring

```bash
kubectl apply -f kubernetes/monitoring/kafka-exporter.yaml
```

Verify:
```bash
kubectl get pods -n kafka | grep kafka-exporter
```

## Verification

### 1. Check Kafka Cluster Status

```bash
kubectl get kafka -n kafka
```

**Expected:**
```
NAME    DESIRED KAFKA REPLICAS   DESIRED ZK REPLICAS   READY   WARNINGS
kafka   3                        3                     True
```

### 2. Create Test Topic

```bash
kubectl exec -it kafka-kafka-0 -n kafka -- bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --create --topic demo-topic \
  --partitions 3 --replication-factor 3
```

### 3. List Topics

```bash
kubectl exec -it kafka-kafka-0 -n kafka -- bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --list
```

### 4. Describe Topic

```bash
kubectl exec -it kafka-kafka-0 -n kafka -- bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --describe --topic demo-topic
```

**Expected:**
```
Topic: demo-topic       PartitionCount: 3       ReplicationFactor: 3
        Topic: demo-topic       Partition: 0    Leader: 2       Replicas: 2,1,0 Isr: 2,1,0
        Topic: demo-topic       Partition: 1    Leader: 1       Replicas: 1,0,2 Isr: 1,0,2
        Topic: demo-topic       Partition: 2    Leader: 0       Replicas: 0,2,1 Isr: 0,2,1
```

## Post-Deployment

### Get External Endpoints

Retrieve LoadBalancer endpoints:

```bash
kubectl get svc -n kafka | grep LoadBalancer
```

Get bootstrap server:
```bash
kubectl get svc kafka-kafka-external-bootstrap -n kafka \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
echo ":9094"
```

### Access Methods

**Internal (within Kubernetes):**
```
kafka-kafka-bootstrap.kafka.svc:9092
```

**External (from outside):**
```
<loadbalancer-endpoint>:9094
```

### Test with Examples

#### Python Example

```bash
cd examples/python
pip install -r requirements.txt

# Terminal 1: Start consumer
python consumer.py

# Terminal 2: Start producer
python producer.py
```

#### Node.js Example

```bash
cd examples/nodejs
npm install

# Terminal 1: Start consumer
node consumer.js

# Terminal 2: Start producer
node producer.js
```

#### Shell Script Example

```bash
cd examples/shell

# Terminal 1: Start consumer
./consumer.sh

# Terminal 2: Send message
./producer.sh "Hello from Kafka!"
```

### Monitor Metrics

Access Kafka metrics:

```bash
kubectl port-forward svc/kafka-exporter -n kafka 9308:9308
```

Visit http://localhost:9308/metrics

## GitHub Actions Setup (Optional)

### 1. Set Repository Secrets

In your GitHub repository:
- Navigate to Settings → Secrets and variables → Actions
- Add secrets:
  - `TF_STATE_BUCKET`: Your S3 bucket name
  - `TF_STATE_LOCK_TABLE`: terraform-locks

### 2. Verify Workflows

The repository includes workflows for:
- **terraform-apply.yaml**: Deploy infrastructure on push to main
- **kafka-deploy.yaml**: Deploy Kafka resources

### 3. Trigger Deployment

```bash
git add .
git commit -m "Deploy Kafka infrastructure"
git push origin main
```

GitHub Actions will automatically deploy changes.

## Cleanup

### 1. Delete Kafka Resources

```bash
kubectl delete -f kubernetes/monitoring/kafka-exporter.yaml
kubectl delete -f kubernetes/kafka/strimzi/kafka-cluster.yaml
kubectl delete namespace kafka
```

### 2. Destroy Infrastructure

```bash
cd terraform/environments/prod
terraform destroy
```

### 3. Clean Backend Resources (Optional)

```bash
# Delete DynamoDB table
aws dynamodb delete-table --table-name terraform-locks

# Empty and delete S3 bucket
aws s3 rm s3://YOUR-BUCKET-NAME --recursive
aws s3 rb s3://YOUR-BUCKET-NAME
```

## Troubleshooting

### Pods Stuck in ContainerCreating

```bash
kubectl describe pod <pod-name> -n kafka
```

Check events section for errors.

### Kafka Version Mismatch

Strimzi 0.39.0 supports Kafka versions: 3.5.0, 3.5.1, 3.5.2, 3.6.0, 3.6.1

Update `kubernetes/kafka/strimzi/kafka-cluster.yaml` if needed.

### LoadBalancer Pending

```bash
kubectl describe svc kafka-kafka-external-bootstrap -n kafka
```

Check AWS LoadBalancer controller and security groups.

### IAM Access Denied

Ensure IAM user has EKS access entry:

```bash
aws eks list-access-entries --cluster-name kafka-eks --region us-east-1
```

For more issues, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Next Steps

- [Architecture Overview](ARCHITECTURE.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Producer/Consumer Examples](../examples/README.md)
