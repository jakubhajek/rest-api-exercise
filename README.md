# Overview

This is a simple API written in NodeJS that uses Express. The API allows you to create, read, update and delete records of Titanic’s passengers. The data is stored in a standalone Mongo database. 
The entire stack can  be deployed on Kubernetes cluster - Minikube - or any other cluster with minor modifications. 

The directory /src contains source code and directory /k8s all necessary Kubernetes code  to deploy the entire stack on Kubernetes. 

 # Prerequisites

Make sure you have installed following tools: 
- docker (20.10.1)
- [skaffold](https://skaffold.dev/) (1.17.2)
- minikube (1.15.1)
- kubectl (1.20.0)

I've installed the mentioned version, however you can use different versions. 

Make sure to have enough CPU (2VCPU, 2GB) to run the stack, otherwise some of the services will not be deployed correctly because of insufficient CPU resources. However, the standard Minikube installation should be good enough to test that stack.  

Complete the following tasks: 

1. Login to your private repository, you can use Docker Hub, Gitlab or configure your own e.g. Harbor. 

`docker login <your-repo>`

2. Configure default repository for skaffold. 

`skaffold config set default-repo <your-repo/project-name>`

3. Make sure Minikube is started.
	
4. Create a secret for docker registry using a command from [Pull an image from a private registry](#pull-an-image-from-a-private-registry) section.  

If those steps are successfully completed you can start with the next step that is Quick Deployment. The remaining documentation includes more detailed description and focuses more on Kubernetes aspects rather than on API development from a developer perspective.

# Quick deployment

If you are in hurry and you are bored with reading documentation, just execute the following commands from the root directory. 

1. `kubectl create -f k8s/mongodb/` - wait a while to stabilize the deployment by watching `kubectl get pods mongo-0 -w` 

2. `skaffold run`

Make sure that you complete the steps from the prerequisites section including tools installation and initial configuration of your local development environment (docker login, skaffold default repo, and secret for Docker registry)

The task `skaffold run` should be correctly completed. Skaffold will (1) download the appropriate Docker images, (2) build your image - the immutable image of your app using your latest Git commit, deploy the image to your private repo and deploy the latest version of Node API with the previously built image. 

# Build and deploy the entire stack

## Namespace

The setup assumes that all components and services are deployed in `default` namespace. If you would like to change it,  make sure to update DB_URI accordingly in `.env` files. 

## Pull an image from a private registry

This is optional and it depends on your local configuration. In my case I published  images on my private registry that's why I had to create a secret (docker-registry type) that is based on existing Docker credentials. Once that secret object is created it is used in deployment as `imagePullSecrets` field. 

If you are going to use a similar approach and store image in your local registry. Execute following command: 

`kubectl create secret docker-registry regcred --docker-server=<YOUR_PRIVATE_DOCKER_REGISTRY> --docker-username=<LOGIN_TO_YOUR_REPO> --docker-password=<YOUR_PASSWORD> --docker-email=<EMAIL_ADDRESS>`

The command will create a `regcred` secret that you can use in your K8S code. Your cluster will be able to successfully authenticate and download images. 

# Initiate MongoDB database 

## 1. Quick start

The first step is to set up the database. All files needed to run standalone Mongodb instance are stored in `k8s/mongodb`. In order to initiate the database just execute following command: 

`kubectl create -f k8s/mongodb/`

The deployment config use `initContainer` feature to download CSV file containing initial data. The file is stored in a temporary dir called `workdir` that is shared with Mongodb database. When the CSV file will be downloaded, the script that is a part of ConfiMap will import the data to the specific collection. 

This is the way I suggest to feed the database with initial data, it is just only for test purposes. In a real production environment, that kind of approach is not recommended.

## 2. Creating database user 

The official image allows you to create a user during starting Mongo instance. The following environment variables can be passed to fresh Mongo instance, with no data created, yet:

- MONGO_INITDB_ROOT_USERNAME
- MONGO_INITDB_ROOT_PASSWORD

However, those variables in that way are visible when you type `env` inside the running container. Considering security reasons we can refer to the sensitive data using a path to files that contains values: username and password. That's why I use in my configuration following environments variables and its values: 

- `MONGO_INITDB_ROOT_USERNAME_FILE`, value: `/run/mongo-secrets/MONGO_INITDB_ROOT_USERNAME`
- `MONGO_INITDB_ROOT_PASSWORD_FILE`, value: `/run/mongo-secrets/MONGO_INITDB_ROOT_PASSWORD`

Thanks to that approach the sensitive data are not directly visible via environment variables. 

Those data are stored in a Secret `mongo-credentials` that is added to the Mongo deployment yaml file.

## 3. Creating initial database

The variable `MONGO_INITDB_DATABASE` can be passed to create a dedicated database. However, if you will not import any data, then no database will be created.

## 4. Downloading the initial CSV data

Kubernetes has a feature `initContainers` that allows you to execute some tasks before the exact container starts.
In my case, it is a separate container running on busybox and executes commands to download CSV files from that repository and stores them in `workdir`. That directory is shared with the Mongodb database and the downloaded file is used by the import script in order to feed the database with the initial data. 

## 5. Feeding database with CSV file

I created a simple bash script that is added as `ConfigMap` called `mongo-import-data`.I take the advantage of other features of the official Mongo Image. There is a directory `/docker-entrypoint-initdb.d/` and if you put there any *.sh or *.js script will be executed when a container is started for the first time. 

The script will use a `mongoimport` tool that allows to import CSV data directly to previously created database. The mongoimport can create fields with their types and I use that feature during the import. I also use previously passed username and password via environment variables and corresponding with them files in order to authenticate to the database. 
See the [script](k8s/mongodb/02-mongo-cm-import-data.yaml) to learn more. 

## 6. Headless service

By setting `.spec.clusterIP: None` we created headless service to disable load balancing. It is because I use statefulset for running Mongodb. Thanks to that feature we can connect directly to the pod and it makes sense when you setup replications for MongoDb. In our example we use a standalone instance, so this is an optional feature. 

## 7. Liveness and readiness probes

I use a simple exec command that uses a built-in feature of Mongo that is called ping to validate whether a database is alive. 

## 8. Volumes

The setup assumes that it is running on Minikube and the default storage class is already created. The name of that storage class is `standard`. Please validate that by executing the `kubectl get sc` command.  

The two K8S objects: PhysicalVolume (PV) and VolumeClaimTemplates in Statefulset will be deployed to manage storage and prevent data loss when the database will be restarted. Those configurations use nodeAffinity features and requires to match the hostname that is `minikube`.  I added the VolumeClaimTemplates because Mongo is deployed as Statefulset and those kinds of volumes are dynamically provisioned. 

Please update the storage class name accordingly if you deploy that in a different environment.

## 9. Production environment 

Please note that for production databases I recommend to use operator to run statefulset databases.g. KubeDB. Beside data storage, the operator allows you to run replica sets and use advantages of distributed no sql databases. It is a more reliable solution. 

However, all those features such as multi node MongDB  can be also managed manually via Statefulsets and creating replica sets manually. 

## 10. Validate the database

You can manually enter the running container and execute following commands to check whether Mongo is up and running and the initial data has been imported successfully. 

Enter to the container: 

`kubectl exec -it mongo-0 bash`

Login to the database:

`mongo -uadmin -p`cat /run/mongo-secrets/MONGO_INITDB_ROOT_PASSWORD``

Select database:

`use people`

and display the data stored in collection:

`db.titanic.find()`

You should be able to see the data. 

# Deploy Node API

## 1. Prerequisites

As previously informed you need to install Skaffold to build and deploy the API. The stack use `skaffold` to build and deploy the API. 

## 2. Build and deploy

Execute following command:

`skaffold build --file-output=build.json `

Skaffold will build and push the immutable image to your private docker registry using your credentials from the previous step. See the section Pull an image from a private registry to learn more why it has been set up in that way. 

Skaffold will generate build.json file that contains the path to the newly created image with: 
- imageName: node-api
- tag: REPO-NAME / Project-name-or-Docker-hub-name / node-api : git_commit_id@sha256

Those data are generated according to skaffold.yaml configuration that uses git commit as tag policy. 

Skaffold will also execute K8S code in order to deploy the previously built image.  The K8S code is created in that location and  `k8s/node-api/**.yaml`. The command below will use that code to deploy the newest image on the cluster. 

`skaffold deploy -a build.json`

Skaffold will automatically replace the image name in deployments to use newly built image. Skaffold will wait to stabilize the deployment.

Skaffold also use Dockerfile and dockerignore files. Dockerfile has been designed as multi stage build to reduce the size of the image. You can consider adding a security scanner to Dockerfile such as Trivy to scan the image, npm packages against any potential vulnerabilities. That step can be also added to image registry or to CI/CD pipeline. 


## 3. Credentials to database 

The secret `api-secrets` is created that keeps the sensitive data. You can see `.env-sample` file to see how the file looks. 

You can create your own `.env` file and create secret using that command:

`kubectl create secret generic node-secrets --from-file=.env --dry-run=client -o yaml > 01-api-secrets.yaml`

The file is mounted at `/run/api` at `.env` file. The node package Dotenv is configured to read the sensitive data from that location, see app.js file.

## 4. Liveness and Readiness probes

Healthcheck is available at `/healthz` endpoint. I created a dedicated endpoint in order to validate whether API is up and running. 

## 5. Rolling update strategy

The strategy allows you to replace old pods by new ones. The default setting is Rolling update. The secondary replica set is created with the new version of the deployed application and slowly a number of existing pods are rolled down. The new pods are going to replace till they reach a total amount of replicas.

## 6. Validate API

Use port forward to test api;

`kubectl port-forward svc/node-api 3000:3000`

API expose following endpoint `/people`, all accepted HTTP methods with example requests is described below.

Here are an example requests, make sure to update ID accordingly in all requests. The ID that is being used is an example id.  

1. Get all data (GET): 
 
```
curl --location --request GET 'localhost:3000/people/' \
--header 'Content-Type: application/json' \
--data-raw ''
```

2. Get the one record using its ID (GET). d
```
curl --location --request GET 'localhost:3000/people/5fd92d23f2498fe415bcc33b' \
--header 'Content-Type: application/json' \
--data-raw ''
```

3. Delete the record using its ID (DELETE):
```
curl --location --request DELETE 'localhost:3000/people/5fd92d23f2498fe415bcc33b' \
--header 'Content-Type: application/json' \
--data-raw ''
```

4. Create a new record (POST):
```
curl --location --request POST 'localhost:3000/people/' \
--header 'Content-Type: application/json' \
--data-raw '{
   "survived": "1",
   "passengerClass": 2,
   "name": "John Doe",
   "sex": "male",
   "age": "40",
   "siblingsOrSpousesAboard": 2,
   "parentsOrChildrenAboard": 1,
   "fare": "10.11"
}'
```
 
5. Update the existing record (PUT):
```
curl --location --request PUT 'localhost:3000/people/5fd92f16ed2482001d6b78b8' \
--header 'Content-Type: application/json' \
--data-raw '{
   "survived": true,
   "passengerClass": 3,
   "name": "John Maria Doe",
   "sex": "male",
   "age": 41,
   "siblingsOrSpousesAboard": 3,
   "parentsOrChildrenAboard": 2,
   "fare": "5.22"
}'

```

6. Update the only one particular field (PATCH): 
```
curl --location --request PATCH 'localhost:3000/people/5fd92f16ed2482001d6b78b8' \
--header 'Content-Type: application/json' \
--data-raw '{
   "name": "John Doe"
}'
```

# What else can be improved?

## Secrets

If you are going to keep the secrets in the repository make sure they are encrypted using e.g. SOPS. A kind of wrapper for PGP. 

## Ingress

Port forwarding has been used as an example to quickly check the api and execute some sample calls. However, there are more robust solutions such as Ingress. I recommend to use Traefik and use its features such as rate limiting, circuit breaker, SSL termination to protect API. 
