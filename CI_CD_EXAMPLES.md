# CI/CD Pipeline Deployment Examples

This document provides example code snippets for deploying code using the `ipb` CLI in various CI/CD pipelines.

## Overview

The `ipb deploy` command deploys JavaScript code to programmable cards. In CI/CD environments, you'll need to:

1. **Provide credentials** via environment variables or command-line options
2. **Use the `--yes` flag** to skip confirmation prompts (required in non-interactive environments)
3. **Specify the card key** and code file to deploy

## Basic Deployment Command

```bash
ipb deploy --filename main.js --card-key card-123 --yes
```

## GitHub Actions Example

```yaml
name: Deploy to Card

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install ipb CLI
        run: npm install -g investec-ipb
      
      - name: Deploy code
        env:
          INVESTEC_CLIENT_ID: ${{ secrets.INVESTEC_CLIENT_ID }}
          INVESTEC_CLIENT_SECRET: ${{ secrets.INVESTEC_CLIENT_SECRET }}
          INVESTEC_API_KEY: ${{ secrets.INVESTEC_API_KEY }}
          INVESTEC_CARD_KEY: ${{ secrets.INVESTEC_CARD_KEY }}
        run: |
          ipb deploy \
            --filename src/main.js \
            --card-key ${{ secrets.INVESTEC_CARD_KEY }} \
            --env production \
            --yes \
            --verbose
```

## GitLab CI Example

```yaml
stages:
  - deploy

deploy_to_card:
  stage: deploy
  image: node:20
  
  before_script:
    - npm install -g investec-ipb
  
  script:
    - |
      ipb deploy \
        --filename src/main.js \
        --card-key $INVESTEC_CARD_KEY \
        --env production \
        --yes \
        --verbose
  
  variables:
    INVESTEC_HOST: "https://openapi.investec.com"
  
  only:
    - main
```

## Jenkins Pipeline Example

```groovy
pipeline {
    agent any
    
    environment {
        INVESTEC_CLIENT_ID = credentials('investec-client-id')
        INVESTEC_CLIENT_SECRET = credentials('investec-client-secret')
        INVESTEC_API_KEY = credentials('investec-api-key')
        INVESTEC_CARD_KEY = credentials('investec-card-key')
    }
    
    stages {
        stage('Deploy') {
            steps {
                sh '''
                    npm install -g investec-ipb
                    ipb deploy \
                        --filename src/main.js \
                        --card-key ${INVESTEC_CARD_KEY} \
                        --env production \
                        --yes \
                        --verbose
                '''
            }
        }
    }
}
```

## Using Profiles (Alternative Approach)

Instead of environment variables, you can pre-configure profiles and use them in your pipeline:

```bash
# Pre-configure profile (run once on CI server or in setup step)
ipb config \
  --profile production \
  --client-id $INVESTEC_CLIENT_ID \
  --client-secret $INVESTEC_CLIENT_SECRET \
  --api-key $INVESTEC_API_KEY

# Deploy using profile
ipb deploy \
  --profile production \
  --filename src/main.js \
  --card-key card-123 \
  --yes
```

## Using Command-Line Options

You can also pass credentials directly via command-line options (less secure for CI/CD):

```bash
ipb deploy \
  --filename src/main.js \
  --card-key card-123 \
  --client-id $INVESTEC_CLIENT_ID \
  --client-secret $INVESTEC_CLIENT_SECRET \
  --api-key $INVESTEC_API_KEY \
  --env production \
  --yes
```

## Environment Variables

The CLI supports the following environment variables for credentials:

- `INVESTEC_HOST` - API host URL (default: `https://openapi.investec.com`)
- `INVESTEC_CLIENT_ID` - OAuth client ID
- `INVESTEC_CLIENT_SECRET` - OAuth client secret
- `INVESTEC_API_KEY` - API key
- `INVESTEC_CARD_KEY` - Card identifier (can also be passed via `--card-key`)

## Deployment with Environment Variables

The `--env` option loads environment variables from a `.env.<env>` file:

```bash
# Deploy with environment variables from .env.production
ipb deploy \
  --filename src/main.js \
  --card-key card-123 \
  --env production \
  --yes
```

This will:
1. Read variables from `.env.production`
2. Upload them to the card
3. Upload and publish the code

## Complete Example: GitHub Actions with Multiple Environments

```yaml
name: Deploy

on:
  push:
    branches:
      - main
      - staging

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install ipb CLI
        run: npm install -g investec-ipb
      
      - name: Determine environment
        id: env
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "env=production" >> $GITHUB_OUTPUT
            echo "card_key=${{ secrets.PROD_CARD_KEY }}" >> $GITHUB_OUTPUT
          else
            echo "env=staging" >> $GITHUB_OUTPUT
            echo "card_key=${{ secrets.STAGING_CARD_KEY }}" >> $GITHUB_OUTPUT
          fi
      
      - name: Deploy to environment
        env:
          INVESTEC_CLIENT_ID: ${{ secrets.INVESTEC_CLIENT_ID }}
          INVESTEC_CLIENT_SECRET: ${{ secrets.INVESTEC_CLIENT_SECRET }}
          INVESTEC_API_KEY: ${{ secrets.INVESTEC_API_KEY }}
        run: |
          ipb deploy \
            --filename src/main.js \
            --card-key ${{ steps.env.outputs.card_key }} \
            --env ${{ steps.env.outputs.env }} \
            --yes \
            --verbose
```

## Security Best Practices

1. **Use Secrets Management**: Store credentials in your CI/CD platform's secrets management system (GitHub Secrets, GitLab CI Variables, etc.)

2. **Avoid Hardcoding**: Never commit credentials to your repository

3. **Use Profiles**: Consider using profiles for better organization (though they require file system access)

4. **Environment Variables**: The CLI automatically detects CI/CD environments and will warn about secrets in environment variables, but they're still supported for pipelines

5. **Least Privilege**: Use separate credentials for different environments (staging, production)

## Troubleshooting

### Deployment fails with "Deployment cancelled"
- **Solution**: Add the `--yes` flag to skip confirmation prompts in non-interactive environments

### Missing credentials error
- **Solution**: Ensure all required environment variables are set:
  - `INVESTEC_CLIENT_ID`
  - `INVESTEC_CLIENT_SECRET`
  - `INVESTEC_API_KEY`
  - `INVESTEC_CARD_KEY` (or pass via `--card-key`)

### Verbose output for debugging
- **Solution**: Add `--verbose` flag or set `DEBUG=1` environment variable

### Rate limiting
- **Solution**: The CLI automatically retries on rate limit errors with exponential backoff. Use `--verbose` to see retry attempts.

## Example: Deploy Script

You can also create a deploy script for easier reuse:

```bash
#!/bin/bash
# deploy.sh

set -e

# Load environment variables
source .env.production

# Deploy code
ipb deploy \
  --filename src/main.js \
  --card-key "${INVESTEC_CARD_KEY}" \
  --env production \
  --yes \
  --verbose

echo "Deployment successful!"
```

Make it executable and run:
```bash
chmod +x deploy.sh
./deploy.sh
```

