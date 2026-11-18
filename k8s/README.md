# ☸️ DevTrack on Kubernetes (Local Demo)

Lightweight manifests to run the DevTrack API on a local cluster (Docker Desktop Kubernetes or Minikube). No cloud cluster is needed.

## Manifests

| File | What it creates |
| :--- | :--- |
| [`devtrack-api.yaml`](./devtrack-api.yaml) | `devtrack-api` Deployment with **2 replicas** of the Node.js API, with liveness and readiness probes on `/api/health`, plus the `devtrack-api-service` NodePort Service on port **30080**. |
| [`postgres.yaml`](./postgres.yaml) | `devtrack-postgres` Deployment running **PostgreSQL 16** (`postgres:16-alpine`), plus a ClusterIP Service on port 5432. |

Credentials are not stored in these files. Both Deployments read them from a Secret named `devtrack-secrets` that you create once (step 2).

## Deploy

```bash
# 1. Build the API image. Docker Desktop's cluster can use local images directly.
#    On Minikube, run `eval $(minikube docker-env)` first.
docker build -t devtrack-api:latest .

# 2. Create the secrets (once per cluster)
kubectl create secret generic devtrack-secrets \
  --from-literal=JWT_SECRET="$(openssl rand -hex 32)" \
  --from-literal=INVITE_SECRET="$(openssl rand -hex 32)" \
  --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 16)"

# 3. Apply all manifests (one command)
kubectl apply -f k8s/
```

## Verify

```bash
kubectl get pods                      # 2 x devtrack-api and 1 x devtrack-postgres should be Running
kubectl get svc devtrack-api-service
curl http://localhost:30080/api/health
```

On Minikube, use `minikube service devtrack-api-service --url` instead of `localhost`.

## Teardown

```bash
kubectl delete -f k8s/
kubectl delete secret devtrack-secrets   # optional
```

## Limits of this demo

- **Postgres has no persistent volume.** Its data is lost when the pod restarts.
- **Each API replica keeps sessions in its own memory.** The Service uses `sessionAffinity: ClientIP` so that a client keeps talking to the same pod.
