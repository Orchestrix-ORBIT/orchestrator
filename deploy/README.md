# EC2 continuous deployment

`.github/workflows/deploy-ec2.yml` builds four commit-SHA-tagged images, pushes them to four ECR repositories, and deploys `compose.ec2.yml` and `Caddyfile` to `ubuntu@13.50.236.34`. Caddy serves `orchestrix.mrt.lk` over HTTPS and routes requests to the four application containers. The workflow runs on pushes to `main` and by manual dispatch. Deployment is disabled until the GitHub repository variable `DEPLOY_ENABLED` is set to `true`.

## Set up once

1. Create these private ECR repositories in the same AWS Region as the instance: `orchestrix-core-api`, `orchestrix-realtime`, `orchestrix-context-engine`, and `orchestrix-frontend`.
2. Create a GitHub OIDC IAM role that trusts this repository's `main` branch and can push to those four repositories. The reviewed trust and ECR policies are in `deploy/iam/`. Add its ARN as the GitHub repository variable `AWS_ROLE_TO_ASSUME`. For this EC2 instance, set `AWS_ACCOUNT_ID=349476472955` and `AWS_REGION=eu-north-1`. GitHub's [AWS OIDC guide](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws) describes the trust setup. Confirm the exact OIDC `sub` claim if this repository has opted into GitHub's newer subject format.
3. Attach an EC2 instance profile that can pull the four ECR images. Install Docker Engine, the Docker Compose plugin, AWS CLI, and `curl` on the instance. The `ubuntu` user must be able to run `docker compose` and `aws ecr get-login-password` without interactive prompts.
4. Put the complete contents of `shehara.pem` in the GitHub secret `EC2_SSH_PRIVATE_KEY`. Put the instance's **verified** SSH host-key entry for `13.50.236.34` in `EC2_KNOWN_HOSTS`. The workflow checks that key before connecting. If the instance's public IP changes, update the `EC2_HOST` value in the workflow and its known-hosts entry. An Elastic IP or DNS name is preferable for a lasting deployment target.
5. On EC2, create `/home/ubuntu/orchestrix/shared.env`, `core.env`, and `context.env`, owned by `ubuntu` with mode `600`. Their contents are runtime secrets and must stay off GitHub:

   ```text
   # shared.env — read by Core API and Realtime
   SPRING_DATASOURCE_URL=jdbc:postgresql://<existing-db-host>:5432/postgres?sslmode=require
   SPRING_DATASOURCE_USERNAME=<database-user>
   SPRING_DATASOURCE_PASSWORD=<database-password>
   JWT_SECRET=<same-secret-for-both-services>

   # core.env — read only by Core API
   ENCRYPTION_SECRET_KEY=<exactly-32-byte-key>
   TENANT_BOOTSTRAP_KEY=<bootstrap-key>

   # context.env — read only by Context Engine
   GOOGLE_API_KEY=<gemini-api-key>
   ```

6. Set GitHub repository variables `NEXT_PUBLIC_API_URL=https://orchestrix.mrt.lk`, `NEXT_PUBLIC_CHAT_API_URL=https://orchestrix.mrt.lk`, and `NEXT_PUBLIC_CHAT_WS_URL=https://orchestrix.mrt.lk/ws`, along with the existing Supabase public variables. These values are embedded in the frontend image at build time.
7. Point the DNS A record for `orchestrix.mrt.lk` to the instance and allow inbound TCP ports `80` and `443` in its security group. Caddy obtains and renews a public TLS certificate automatically. Application ports `3000`, `8080`, and `8082` bind only to loopback; port `8083` stays on the private Compose network. Keep the instance address stable, preferably with an Elastic IP.
8. Back up the existing PostgreSQL database, review pending Core API Flyway migrations, and verify both Java services can reach that host over TLS. Then set `DEPLOY_ENABLED=true`. Core API applies migrations when it starts; this workflow does not create a database backup.

The workflow deploys one Realtime container because its current message broker is in memory. It does not launch the PostgreSQL service from `backend/docker-compose.yml`.
