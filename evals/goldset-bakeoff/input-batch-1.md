You are extracting technical entities from GitHub repositories.

For EACH repository in the INPUT below, extract the concrete technical entities it is built on or about. Tag each entity with exactly one label:

- LANGUAGE — programming languages (e.g. Python, Rust, TypeScript)
- FRAMEWORK — frameworks or libraries (e.g. React, Django, PyTorch)
- TOOL — tools, platforms, runtimes, dependencies (e.g. Docker, Vite, controller-runtime)
- CONCEPT — techniques or paradigms (e.g. OAuth, HNSW, structured generation)
- ORG — companies, projects, foundations (e.g. Vercel, Apache)
- PERSON — named people
- DOMAIN — problem domains (e.g. observability, machine learning)

RULES:
- Extract only entities supported by the repository's text.
- Use the canonical product name ("TypeScript" not "TS", "Kubernetes" not "k8s").
- Prefer specific entities a developer would search for.
- DO NOT emit licenses (MIT, Apache 2.0), badges, shields, CI/coverage services, generic words ("library", "tool", "API", "web", "data"), URLs, or roles ("developers", "community").
- No duplicates.

OUTPUT FORMAT — respond with ONLY a JSON object, no prose, no markdown fences. Keys are the repo's "owner/name"; values are arrays of {"name","label"}:

{
  "owner/name": [
    {"name": "Python", "label": "LANGUAGE"},
    {"name": "Docker", "label": "TOOL"}
  ],
  "other/repo": [ ... ]
}

Include every repository from the INPUT, even if its entity list is empty ([]).

---

# INPUT — batch 1/4 (30 repos)

### microsoft/vscode-dev-containers
description: (none)
killerFeature: (archived repository)
topics: vscode, codespaces, vs, containers, devcontainer, devcontainers, docker, remote, visual-studio-code, remote-development, dev-containers, github, github-codespaces, visual-studio-codespaces
readme:
**IMPORTANT NOTE: Dev containers have a new, expanded home in the [dev containers GitHub org](https://github.com/devcontainers)! We're so excited to connect with you there. To learn more, you can check out our [migration announcement](https://github.com/microsoft/vscode-dev-containers/issues/1762).**

**This repository is no longer active and was archived in November 2023. We've migrated most of the contents of this repo to the [devcontainers GitHub org](https://github.com/devcontainers), as part of the work on the [open Dev Container specification](https://containers.dev).**

- **Features managed by the Dev Container spec maintainers (such as the VS Code team) are now in [devcontainers/features](https://github.com/devcontainers/features).**
- **Definitions/Templates managed by the Dev Container spec maintainers are now in [devcontainers/templates](https://github.com/devcontainers/templates).**
- **`mcr.microsoft.com/devcontainers` and `mcr.microsoft.com/vscode/devcontainers` images are now published from [devcontainers/images](https://github.com/devcontainers/images).**

**For new Templates/Features, you can now self-publish and optionally make them visible in-tool by following the steps one of the quick start repositories: [Templates quick start](https://github.com/devcontainers/template-starter), [Features quick start](https://github.com/devcontainers/feature-starter). No need to submit a PR here anymore.**

**For more details, you can review the [announcement issue](https

### portainer/portainer-compose
description: (none)
killerFeature: (archived repository)
topics: portainer, docker, docker-compose
readme:
# Portainer compose setup

A simple setup to deploy Portainer using `docker-compose` or `docker stack deploy` (Swarm).

## Requirements

1. Install [Docker](http://docker.io).
2. (optional) Install [Docker-compose](http://docs.docker.com/compose/install/).
3. Clone this repository

## Usage

### Compose

See `nginx-proxy/` or `traefik/` for Compose deployments.

### Swarm

Deploy this stack on a manager node inside your Swarm cluster:

```
docker stack deploy --compose-file=docker-stack.yml portainer
```

You can then access Portainer by using the IP address of any node in your Swarm cluster over port 9000 with a web browser.

### containrrr/watchtower
description: (none)
killerFeature: (archived repository)
topics: docker, automation, receive-notifications, watchtower, registry, notifications, update-checker, hacktoberfest, devops, continuous-delivery
readme:
<div align="center">

  ### ⚠️ This project is no longer maintained
  See https://github.com/containrrr/watchtower/discussions/2135 for details.

  ---
  
  <img src="./logo.png" width="450" />
  
  # Watchtower
  
  A process for automating Docker container base image updates.
  <br/><br/>
  
  [](https://circleci.com/gh/containrrr/watchtower)
  [](https://codecov.io/gh/containrrr/watchtower)
  [](https://godoc.org/github.com/containrrr/watchtower)
  [](https://goreportcard.com/report/github.com/containrrr/watchtower)
  [](https://github.com/containrrr/watchtower/releases)
  [](https://www.apache.org/licenses/LICENSE-2.0)
  [](https://www.codacy.com/gh/containrrr/watchtower/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=containrrr/watchtower&amp;utm_campaign=Badge_Grade)
  [](#contributors)
  [](https://hub.docker.com/r/containrrr/watchtower)

</div>

## Quick Start

With watchtower you can update the running version of your containerized app simply by pushing a new image to the Docker Hub or your own image registry. 

Watchtower will pull down your new image, gracefully shut down your existing container and restart it with the same options that were used when it was deployed initially. Run the watchtower container with the following command:

```
$ docker run --detach \
    --name watchtower \
    --volume /var/run/docker.sock:/var/run/docker.sock \
    containrrr/watchtower
```

Watchtower is intended to be used in homelabs, media centers, local de

### onfido/k8s-cleanup
description: (none)
killerFeature: (archived repository)
topics: (none)
readme:
## k8s-cleanup

Here are 3 cleanups you can apply on your kubernetes cluster:
* Cleans up exited containers and dangling images/volumes running as a DaemonSet (`docker-clean.yml`).
* Cleans up old replica sets, finished jobs and unrecycled evicted pods as a CronJob (`k8s-clean.yml`).
* Cleans up empty directory (not used anymore) in etcd as a CronJob (`etcd-empty-dir-cleanup.yml`).

You must have `batch/v2alpha1` enabled on your k8s API server runtime config in order to run the CronJob.

### Env vars
In the DaemonSet (`docker-clean.yml`) you can set `DOCKER_CLEAN_INTERVAL` to modify the interval when it cleans up exited containers and dangling images/volumes; defaults to 30min (1800s).

In the CronJob (`k8s-clean.yml`) you can set `DAYS` to modify the maximum age of replica sets; defaults to 7 days.

### Deployment

```
kubectl --context CONTEXT -n kube-system apply -f rbac.yml
kubectl --context CONTEXT -n kube-system apply -f docker-clean.yml
kubectl --context CONTEXT -n kube-system apply -f k8s-clean.yml
kubectl --context CONTEXT -n kube-system apply -f etcd-empty-dir-cleanup.yml
```

### datreeio/datree
description: (none)
killerFeature: (archived repository)
topics: kubernetes, policy, guardrail, best-practices, cli, static-code-analysis, datree, admission-webhook, devops, policy-management, security
readme:
<p align="center">
 <img src="https://github.com/datreeio/datree/blob/main/images/datree_GitHub_hero.png" alt="datree=github" border="0" />
</p>
 
<p align="center">
 <img src="https://img.shields.io/github/v/release/datreeio/datree" />
 <img src="https://github.com/datreeio/datree/actions/workflows/release.yml/badge.svg" />
 <img src="https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fdatreeio%2Fdatree&count_bg=%2379C83D&title_bg=%23555555&icon=github.svg&icon_color=%23E7E7E7&title=views+%28today+%2F+total%29&edge_flat=false" target="_blank"></a>
 <img src="https://img.shields.io/github/downloads/datreeio/datree/total.svg" target="_blank"></a>
 <img src="https://goreportcard.com/badge/github.com/datreeio/datree" target="_blank"></a>
</p>

<p align="center">
  <a href="https://hub.datree.io/#utm_source=github&utm_medium=organic_oss"><strong>Explore the docs »</strong></a>
  <br />
</p>

# Datree [DEPRECATED]

[Datree](https://www.datree.io/) (pronounced `/da-tree/`) was built to secure Kubernetes workloads by blocking the deployment of misconfigured resources. **Since July 2023, the commercial company that supports and actively maintains this project has been closed.**

## Migrating to the (fully) open-source version of Datree 

For existing users, it is still possible to run Datree as a standalone: https://hub.datree.io/cli/offline-mode

## What will not be available anymore

All the archived open source repositories under datreeio org will n

### keycloak/keycloak-operator
description: (none)
killerFeature: (archived repository)
topics: (none)
readme:
# ARCHIVED Operator for Keycloak WildFly distribution

With Keycloak 20 the WildFly based distribution is no longer supported. For the newer Quarkus distribution of Keycloak,
check out the [new documentation](https://www.keycloak.org/guides#operator), or the
[updated Operator sources](https://github.com/keycloak/keycloak/tree/main/operator).

### GoogleContainerTools/kaniko
description: (none)
killerFeature: (archived repository)
topics: containers, docker, developer-tools, kubernetes
readme:
# 🧊 This project is archived and no longer developed or maintained. 🧊

The code remains available for historic purposes.

The README as of the archival date remains unchanged below for historic purposes.

-----

# kaniko - Build Images In Kubernetes

## 🚨NOTE: kaniko is not an officially supported Google product🚨

[](https://github.com/GoogleContainerTools/kaniko/actions/workflows/unit-tests.yaml)
[](https://github.com/GoogleContainerTools/kaniko/actions/workflows/integration-tests.yaml)
[](https://github.com/GoogleContainerTools/kaniko/actions/workflows/images.yaml)
[](https://goreportcard.com/report/github.com/GoogleContainerTools/kaniko)

kaniko is a tool to build container images from a Dockerfile, inside a container
or Kubernetes cluster.

kaniko doesn't depend on a Docker daemon and executes each command within a
Dockerfile completely in userspace. This enables building container images in
environments that can't easily or securely run a Docker daemon, such as a
standard Kubernetes cluster.

kaniko is meant to be run as an image: `gcr.io/kaniko-project/executor`. We do
**not** recommend running the kaniko executor binary in another image, as it
might not work as you expect - see [Known Issues](#known-issues).

We'd love to hear from you! Join us on
[#kaniko Kubernetes Slack](https://kubernetes.slack.com/messages/CQDCHGX7Y/)

:mega: **Please fill out our
[quick 5-question survey](https://forms.gle/HhZGEM33x4FUz9Qa6)** so that we can
learn how satisfied you are with kanik

### kubernetes/kubernetes
description: Kubernetes (K8s) is an open-source orchestrator written in Go that manages the deployment, scaling, and maintenance of containerized applications across large clusters. It provides production-grade capability for scheduling workloads derived from Google's historical Borg system.
killerFeature: Deploy and scale containerized applications across multiple hosts reliably
topics: kubernetes, go, cncf, containers
readme:
# Kubernetes (K8s)

[](https://bestpractices.coreinfrastructure.org/projects/569) [](https://goreportcard.com/report/github.com/kubernetes/kubernetes) 

<img src="https://github.com/kubernetes/kubernetes/raw/master/logo/logo.png" width="100">

----

Kubernetes, also known as K8s, is an open source system for managing [containerized applications]
across multiple hosts. It provides basic mechanisms for the deployment, maintenance,
and scaling of applications.

Kubernetes builds upon a decade and a half of experience at Google running
production workloads at scale using a system called [Borg],
combined with best-of-breed ideas and practices from the community.

Kubernetes is hosted by the Cloud Native Computing Foundation ([CNCF]).
If your company wants to help shape the evolution of
technologies that are container-packaged, dynamically scheduled,
and microservices-oriented, consider joining the CNCF.
For details about who's involved and how Kubernetes plays a role,
read the CNCF [announcement].

----

## To start using K8s

See our documentation on [kubernetes.io].

Take a free course on [Scalable Microservices with Kubernetes].

To use Kubernetes code as a library in other applications, see the [list of published components](https://git.k8s.io/kubernetes/staging/README.md).
Use of the `k8s.io/kubernetes` module or `k8s.io/kubernetes/...` packages as libraries is not supported.

## To start developing K8s

The [community repository] hosts all information about
building Kubernet

### AykutSarac/jsoncrack-vscode
description: (none)
killerFeature: (archived repository)
topics: jsoncrack, react, vscode, typescript, extension
readme:
> [!IMPORTANT]  
> The repository has been moved to the [jsoncrack.com repository](https://github.com/AykutSarac/jsoncrack.com/tree/main/apps/vscode) and it is no longer maintained here. Please visit the new repository for the latest updates and contributions.

### DanWahlin/DockerAndKubernetesCourseCode
description: A C# project that provides course code for Docker and Kubernetes, covering core concepts and hands-on exercises. It includes examples of deploying and managing containers using Kubernetes, similar to a real-world scenario.
killerFeature: Run containerized applications on multiple clouds with ease
topics: (none)
readme:
## Docker and Kubernetes Course

https://codewithdan.com/products/docker-kubernetes

View the **Kubernetes for Developers: Core Concepts** video course on Pluralsight:

https://app.pluralsight.com/library/courses/kubernetes-developers-core-concepts/table-of-contents

### ohmybash/oh-my-bash
description: Oh My Bash is an open source, community-driven framework for managing your bash configuration. Once installed, it replaces ~/.bashrc with the version provided by Oh My Bash, backed up with the original file. It works best on macOS and Linux, requiring Unix-like operating systems, `curl` or `wget`, and `git`. The installation process is simple, replacing the existing configuration with a more powerful one.
killerFeature: Automatically install hundreds of powerful plugins and beautiful themes to supercharge your terminal shell
topics: shell, bash-configuration, theme, terminal, productivity, oh-my-bash
readme:
Oh My Bash is an open source, community-driven framework for managing your [bash](https://www.gnu.org/software/bash/) configuration.

Sounds boring. Let's try again.

Oh My Bash will not make you a 10x developer...but you might feel like one.

Once installed, your terminal shell will become the talk of the town or your money back! With each keystroke in your command prompt, you'll take advantage of the hundreds of powerful plugins and beautiful themes. Strangers will come up to you in cafés and ask you, "that is amazing! are you some sort of genius?"

Finally, you'll begin to get the sort of attention that you have always felt you deserved. ...or maybe you'll use the time that you're saving to start flossing more often.

## Getting Started

### Prerequisites

__Disclaimer:__ _Oh My Bash works best on macOS and Linux._

* Unix-like operating system (macOS or Linux)
* `curl` or `wget` should be installed
* `git` should be installed

### Basic Installation

Oh My Bash is installed by running one of the following commands in your terminal. You can install this via the command-line with either `curl` or `wget`.

#### via curl

```shell
bash -c "$(curl -fsSL https://raw.githubusercontent.com/ohmybash/oh-my-bash/master/tools/install.sh)"
```

#### via wget

```shell
bash -c "$(wget https://raw.githubusercontent.com/ohmybash/oh-my-bash/master/tools/install.sh -O -)"
```

This replaces `~/.bashrc` with the version provided by Oh My Bash. The original `.bashrc` is backed up with the na

### public-apis/public-apis
description: A Python project that aggregates a list of free public APIs from multiple domains, allowing developers to find and integrate APIs into their products. This comprehensive directory is maintained by the community and provides access to a wide range of APIs.
killerFeature: Explore a treasure trove of public APIs from various domains, curated by the community
topics: api, public-apis, free, apis, list, development, software, public, resources, dataset, open-source, public-api, lists
readme:
# Try Public APIs for free
The Public APIs repository is manually curated by community members like you and folks working at [APILayer](https://apilayer.com/?utm_source=Github&utm_medium=Referral&utm_campaign=Public-apis-repo). It includes an extensive list of public APIs from many domains that you can use for your own products. Consider it a treasure trove of APIs well-managed by the community over the years.

<br >

<p>
    <a href="https://apilayer.com">
        <div>
            <img src=".github/cs1586-APILayerLogoUpdate2022-LJ_v2-HighRes.png" width="100%" alt="APILayer Logo" />
        </div>
    </a>
  </p>

APILayer is the fastest way to integrate APIs into any product. Explore [APILayer APIs](https://apilayer.com/products/?utm_source=Github&utm_medium=Referral&utm_campaign=Public-apis-repo) here for your next project.

Join our [Discord server](https://discord.com/invite/hgjA78638n/?utm_source=Github&utm_medium=Referral&utm_campaign=Public-apis-repo) to get updates, ask questions, get answers, random community calls, and more.

<br >

## APILayer APIs
| API | Description | Call this API |
|:---|:---|:---|
| [IPstack](https://ipstack.com/?utm_source=Github&utm_medium=Referral&utm_campaign=Public-apis-repo-Best-sellers) | Locate and Identify Website Visitors by IP Address | [<img src="https://run.pstmn.io/button.svg" alt="Run In Postman" style="width: 128px; height: 32px;">](https://god.gw.postman.com/run-collection/10131015-55145132-244c-448c-8e6f-8780866e4862?action=

### quarkusio/quarkus
description: Quarkus is a Cloud Native, container-first framework for writing Java applications. It unifies imperative and reactive programming styles, provides fast startup, and supports various standards-based technologies.
killerFeature: Run supersonic Java applications in containers with minimal footprint
topics: kubernetes, java, cloud-native, reactive, hacktoberfest
readme:
[](https://quarkus.io/#gh-light-mode-only)
[](https://quarkus.io/#gh-dark-mode-only)

[](https://search.maven.org/artifact/io.quarkus/quarkus-bom)
[](https://github.com/quarkusio/quarkus/actions?query=workflow%3A%22Quarkus+CI%22)
[](https://testpilot.oracle.com/)
[](https://github.com/quarkusio/quarkus/pulse)
[](https://www.apache.org/licenses/LICENSE-2.0)
[](https://quarkusio.zulipchat.com/)
[](https://gitpod.io/#https://github.com/quarkusio/quarkus/-/tree/main/)
[](https://github.com/quarkusio/quarkus/actions/runs/113853915/)
[](https://ge.quarkus.io/scans)
[](https://github.com/quarkusio/quarkus/stargazers)
[](https://gurubase.io/g/quarkus)

# Quarkus - Supersonic Subatomic Java

Quarkus is a Cloud Native, (Linux) Container First framework for writing Java applications.

* **Container First**:
Minimal footprint Java applications optimal for running in containers.
* **Cloud Native**:
Embraces [12 factor architecture](https://12factor.net) in environments like Kubernetes.
* **Versatile**:
From the smallest microservice to the largest monolith.
* **Fast startup**:
We do more at build time, we start fast.
* **JVM and native**
JVM for high throughput, native for constrained environments.
* **Unify imperative and reactive**:
Brings under one programming model non-blocking and imperative styles of development.
* **Standards-based**:
Based on the standards and frameworks you love and use (RESTEasy and JAX-RS, Hibernate ORM and JPA, Netty, Eclipse Vert.x, Eclipse MicroProfile, Apac

### filebrowser/filebrowser
description: File Browser provides a web-based interface for managing files within a specified directory, allowing uploads, deletions, previews, and edits. It's a self-hosted solution that can be installed on a server and accessed through a Material Design-inspired web interface.
killerFeature: Run your own cloud-based file browser with a single binary
topics: file-browser, file-manager, file-sharing, go, material-design, self-hosted, vue
readme:
<p align="center">
  <img src="https://raw.githubusercontent.com/filebrowser/filebrowser/master/branding/banner.png" width="550"/>
</p>

[](https://github.com/filebrowser/filebrowser/actions/workflows/ci.yaml)
[](https://goreportcard.com/report/github.com/filebrowser/filebrowser/v2)
[](https://github.com/filebrowser/filebrowser/releases/latest)

File Browser provides a file managing interface within a specified directory and it can be used to upload, delete, preview and edit your files. It is a **create-your-own-cloud**-kind of software where you can just install it on your server, direct it to a path and access your files through a nice web interface.

## Documentation

Documentation on how to install, configure, and contribute to this project is hosted at [filebrowser.org](https://filebrowser.org).

## Project Status

This project is a finished product which fulfills its goal: be a single binary web File Browser which can be run by anyone anywhere. That means that File Browser is currently on **maintenance-only** mode. Therefore, please note the following:

- It can take a while until someone gets back to you. Please be patient.
- [Issues](https://github.com/filebrowser/filebrowser/issues) are meant to track bugs. Unrelated issues will be converted into [discussions](https://github.com/filebrowser/filebrowser/discussions).
- The priority is triaging issues, addressing security issues and reviewing pull requests meant to solve bugs.
- No new features are planned. Pull reques

### k3s-io/k3s
description: K3s is a lightweight, production-ready Kubernetes distribution packaged as a single binary. It adds support for sqlite3 as the default storage backend and provides a secure and minimal OS dependency setup. K3s bundles Containerd, Flannel, CoreDNS, Metrics Server, Traefik, and Klipper-lb to provide a comprehensive Kubernetes solution.
killerFeature: Run production-ready Kubernetes distributions with a single binary less than 100 MB
topics: kubernetes, k8s
readme:
K3s - Lightweight Kubernetes
===============================================
[](https://app.fossa.com/projects/custom%2B25850%2Fgithub.com%2Fk3s-io%2Fk3s?ref=badge_shield)
[](https://github.com/k3s-io/k3s/actions/workflows/nightly-install.yaml)
[](https://drone-publish.k3s.io/k3s-io/k3s)
[](https://github.com/k3s-io/k3s/actions/workflows/integration.yaml)
[](https://github.com/k3s-io/k3s/actions/workflows/unitcoverage.yaml)
[](https://www.bestpractices.dev/projects/6835)
[](https://scorecard.dev/viewer/?uri=github.com/k3s-io/k3s)
[](https://github.com/k3s-io/k3s/tags?label=Downloads)
[](https://clomonitor.io/projects/cncf/k3s)

Lightweight Kubernetes.  Production ready, easy to install, half the memory, all in a binary less than 100 MB.

Great for:

* Edge
* IoT
* CI
* Development
* ARM
* Embedding k8s
* Situations where a PhD in k8s clusterology is infeasible

What is this?
---

K3s is a [fully conformant](https://github.com/cncf/k8s-conformance/pulls?q=is%3Apr+k3s) production-ready Kubernetes distribution with the following changes:

1. It is packaged as a single binary.
1. It adds support for sqlite3 as the default storage backend. Etcd3, MariaDB, MySQL, and Postgres are also supported.
1. It wraps Kubernetes and other components in a single, simple launcher.
1. It is secure by default with reasonable defaults for lightweight environments.
1. It has minimal to no OS dependencies (just a sane kernel and cgroup mounts needed).
1. It eliminates the need to expose a port on Ku

### ptdropper/CVE-Scanner-for-your-SW-BOM
description: A Python-based NIST-CVE library search engine that scans custom Software Bill of Materials (SBOM) input files and outputs all potential risk CVE identifiers. Ideal for projects requiring intelligent Software Composition Analysis to identify and reduce risk.
killerFeature: Run a comprehensive CVE scan on your software bill of materials with zero manual configuration
topics: cve, scan, nist, vulnerability, bom, nvd3, cve-scanning, python, sbom, cve-search, vulnerability-scanners, vulnerabilities, vulnerability-scanner, vulnerability-scanning, vulnerability-detection, vulnerability-identification, cve-databases, cve-entries
readme:
Welcome to the [CVE Scanner](https://github.com/ptdropper/CVE-Scanner-for-your-SW-BOM) wiki! 

What is CVE-scanner?
====================
This project provides a way that you can manage the risk inherited by using open source and third party source projects. This provides you with intelligent Software Composition Analysis to identify and reduce risk.

Inputs from your project
========================
The project is a python based NIST-CVE library search engine for use with your own custom Software Bill of Materials (SBOM) input file. This is ideal for projects where you can create a text file of your SBOM as input to the tool. The output will be all CVE identifiers of potential risks. The library from NIST is tens of thousands of entries, and this tool does the work of searching for your specific packages of interest. 

HOW TO:
=======
- Create an ascii text input file holding package names and versions of interest.
- Input data file contains the triplet "vendor-product-version" with dashes.
- Must match on all 3 to decide to report the CVE.
- Lines with a leading hash/pound symbol are ignored.

Example for typical open source packages where there is no vendor so set the vendor value to match the product name.
```sh
libssh-libssh-1.0
linux_kernel-linux_kernel-4.9
microsoft-home_server-2003
php-php-5.4.3
```
Whitelist to ignore specific CVEs
=================================
Next is an optional whitelist file you can create. The whitelist is referred to as the "ignore list" in 

### longhorn/longhorn
description: A CNCF Incubating Project, Longhorn is a cloud-native distributed block storage system for Kubernetes. It provides persistent volume support to the cluster and implements distributed block storage using containers and microservices.
killerFeature: Deploy enterprise-grade distributed storage with no single point of failure
topics: kubernetes, longhorn, k8s-sig-storage, distributed-systems, high-availability, storage, cncf
readme:
<h1 align="center" style="border-bottom: none">
    <a href="https://longhorn.io/" target="_blank"><img alt="Longhorn" width="300px" src="https://github.com/longhorn/website/blob/master/static/img/logos/longhorn-stacked-color.png""></a>
</h1>

<p align="center">A CNCF Incubating Project. Visit <a href="https://longhorn.io/" target="_blank">longhorn.io</a> for the full documentation.</p>

<div align="center">

[](https://scorecard.dev/viewer/?uri=github.com/longhorn/longhorn)
[](https://github.com/longhorn/longhorn/releases)
[](https://github.com/longhorn/longhorn/blob/master/LICENSE)
[](https://longhorn.io/docs/latest/)

</div>

Longhorn is a distributed block storage system for Kubernetes. Longhorn is cloud-native storage built using Kubernetes and container primitives.

Longhorn is lightweight, reliable, and powerful. You can install Longhorn on an existing Kubernetes cluster with one `kubectl apply` command or by using Helm charts. Once Longhorn is installed, it adds persistent volume support to the Kubernetes cluster.

Longhorn implements distributed block storage using containers and microservices. Longhorn creates a dedicated storage controller for each block device volume and synchronously replicates the volume across multiple replicas stored on multiple nodes. The storage controller and replicas are themselves orchestrated using Kubernetes. Here are some notable features of Longhorn:

1. Enterprise-grade distributed storage with no single point of failure
2. Increment

### jenkinsci/jenkinsfile-runner
description: A Java command-line tool that packages the Jenkins pipeline execution engine, enabling use cases such as Function-as-a-Service integration testing and local editing of pipeline definitions.
killerFeature: Run Jenkins Pipelines as a function with zero config changes
topics: jenkins, jenkins-pipeline, cli, faas, docker-image, jenkinsfile, jenkinsfile-runner, hacktoberfest, tool
readme:
(none)

### opencontainers/runc
description: A CLI tool for spawning and running containers on Linux, supporting the Open Container Initiative (OCI) specification. It only runs on Linux and requires multiple utilities and libraries to be installed.
killerFeature: Run Linux containers according to the OCI specification
topics: containers, docker, oci
readme:
# runc

[](https://goreportcard.com/report/github.com/opencontainers/runc)
[](https://pkg.go.dev/github.com/opencontainers/runc)
[](https://bestpractices.coreinfrastructure.org/projects/588)
[](https://github.com/opencontainers/runc/actions?query=workflow%3Avalidate)
[](https://github.com/opencontainers/runc/actions?query=workflow%3Aci)

## Introduction

`runc` is a CLI tool for spawning and running containers on Linux according to the OCI specification.

## Releases

You can find official releases of `runc` on the [release](https://github.com/opencontainers/runc/releases) page.

All releases are signed by one of the keys listed in the [`runc.keyring` file in the root of this repository](runc.keyring).

## Security

The reporting process and disclosure communications are outlined [here](https://github.com/opencontainers/org/blob/master/SECURITY.md).

### Security Audit
A third party security audit was performed by Cure53, you can see the full report [here](https://github.com/opencontainers/runc/blob/master/docs/Security-Audit.pdf).

## Building

`runc` only supports Linux. See the header of [`go.mod`](./go.mod) for the minimally required Go version.

### Pre-Requisites

#### Utilities and Libraries

In addition to Go, building `runc` requires multiple utilities and libraries to be installed on your system.

On Ubuntu/Debian, you can install the required dependencies with:

```bash
apt update && apt install -y make gcc linux-libc-dev libseccomp-dev pkg-config git
```

On CentO

### dbeaver/dbeaver
description: A free, universal database tool and SQL client for developers, programmers, administrators, and analysts. It includes schema editor, SQL editor, data editor, AI integration, ER diagrams, data export/import/migration, SQL execution plans, and more. Supports any database with a JDBC or ODBC driver.
killerFeature: Query over 100 databases with a single tool, using JDBC or ODBC drivers
topics: sql, database, dbeaver, gui, mysql, postgresql, db2, sqlite, erd, java, oracle, nosql, sqlserver, redshift, jdbc, ai, databricks, snowflake
readme:
[](https://twitter.com/dbeaver_news)
[](https://app.codacy.com/gh/dbeaver/dbeaver/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[](http://www.apache.org/licenses/LICENSE-2.0)
[](https://github.com/dbeaver/dbeaver/issues?q=is%3Aissue+is%3Aopen+label%3A"wait%20for%20review")
<img src="https://github.com/dbeaver/dbeaver/wiki/images/dbeaver-icon-64x64.png" align="right"/>

# DBeaver

Free multi-platform database tool for developers, SQL programmers, database administrators and analysts.  

* Has a lot of <a href="https://github.com/dbeaver/dbeaver/wiki">features</a> including schema editor, SQL editor, data editor, AI integration, ER diagrams, data export/import/migration, SQL execution plans, database administration tools, database dashboards, Spatial data viewer, proxy and SSH tunnelling, custom database drivers editor, etc.
* Out of the box supports more than <a href="#supported-databases">100 database drivers</a>.
* Supports any database which has JDBC or ODBC driver (basically - almost all existing databases).
* Supports smart AI completion and code generation with OpenAI or Copilot

<a href="https://dbeaver.io/product/dbeaver-sql-editor.png"><img src="https://dbeaver.io/product/dbeaver-sql-editor.png" width="400"/></a>
<a href="https://dbeaver.io/product/dbeaver-gis-viewer.png"><img src="https://dbeaver.io/product/dbeaver-gis-viewer.png" width="400"/></a>
<a href="https://dbeaver.io/product/dbeaver-data-editor.png"><img src="https://dbea

### artifacthub/hub
description: A TypeScript-based application that enables finding, installing, and publishing Cloud Native packages for various projects, including Argo templates, Backstage plugins, Bootable containers, Containers images, CoreDNS plugins, Falco configurations, Gatekeeper policies, Headlamp plugins, Helm charts, Helm plugins, Inspektor Gadgets, Kagent agents, KCL modules, KEDA scalers, Keptn integrations, Knative client plugins, and KubeArmor policies.
killerFeature: Discover and install CNCF packages from a single source
topics: kubernetes, cncf, cloud-native, packages
readme:
# Artifact Hub

[](https://goreportcard.com/report/github.com/artifacthub/hub)
[](https://bestpractices.coreinfrastructure.org/projects/4106)
[](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub)
[](https://clomonitor.io/projects/cncf/artifact-hub)
[](https://securityscorecards.dev/viewer/?uri=github.com/artifacthub/hub)
[](https://gitpod.io/#https://github.com/artifacthub/hub)
[](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fartifacthub%2Fhub?ref=badge_shield)

[Artifact Hub](https://artifacthub.io) is a web-based application that enables finding, installing, and publishing packages and configurations for Cloud Native packages.

Discovering artifacts to use with CNCF projects can be difficult. If every CNCF project that needs to share artifacts creates its own Hub this creates a fair amount of repeat work for each project and a fractured experience for those trying to find the artifacts to consume. The Artifact Hub attempts to solve that by providing a single experience for consumers that any CNCF project can leverage.

At the moment, the following artifacts kinds are supported *(with plans to support more projects to follow)*:

- [Argo templates](https://argoproj.github.io/argo-workflows/)
- [Backstage plugins](https://backstage.io)
- [Bootable containers](https://containers.github.io/bootc/)
- [Containers images](https://opencontainers.org)
- [CoreDNS plugins](https://coredns.io/)
- [Falco configurations](https://falco.org/)
- [Gatekeeper poli

### junegunn/fzf
description: A command-line fuzzy finder that provides the building blocks to turn shell scripts into rich terminal applications, featuring portable, fast, programmable, and batteries-included architecture with integrations for various shells and editors.
killerFeature: Query millions of items in milliseconds with fuzzy matching
topics: fzf, go, bash, zsh, fish, vim, neovim, cli, unix, tmux
readme:
<div align="center">
  <img src="https://raw.githubusercontent.com/junegunn/i/master/fzf-color.png" alt="fzf - a command-line fuzzy finder">
  <a href="https://github.com/junegunn/fzf/actions"><img src="https://github.com/junegunn/fzf/actions/workflows/linux.yml/badge.svg?branch=master" alt="Build Status"></a>
  <a href="http://github.com/junegunn/fzf/releases"><img src="https://img.shields.io/github/v/tag/junegunn/fzf" alt="Version"></a>
  <a href="https://github.com/junegunn/fzf?tab=MIT-1-ov-file#readme"><img src="https://img.shields.io/github/license/junegunn/fzf" alt="License"></a>
  <a href="https://github.com/junegunn/fzf/graphs/contributors"><img src="https://img.shields.io/github/contributors/junegunn/fzf" alt="Contributors"></a>
  <a href="https://github.com/sponsors/junegunn"><img src="https://img.shields.io/github/sponsors/junegunn" alt="Sponsors"></a>
  <a href="https://github.com/junegunn/fzf/stargazers"><img src="https://img.shields.io/github/stars/junegunn/fzf?style=flat" alt="Stars"></a>
</div>

---

<kbd align="center">
  <br/>
  <a href="https://commitgoods.com/collections/fzf"><img src="https://junegunn.github.io/fzf/images/fzf-mugs.jpg" width="80%" alt="fzf merch"></a>
  <br/>
  <br/>
  Show your love for fzf -- T-shirts, mugs, and stickers now available!
  <br/>
  <br/>
  <a href="https://commitgoods.com/collections/fzf">commitgoods.com/collections/fzf</a>
  <br/>
  <br/>
</kbd>

---

fzf is a general-purpose command-line fuzzy finder and an interactive t

### stagewise-io/stagewise
description: An Open Source Agentic IDE for developers that allows you to browse and build in the same tool, work with a coding agent that has full access to your tab's console and debugger, make temporary test changes or connect a codebase for permanent edits, and bring your own API key for all AI providers. The platform supports seamless integration with your favorite editor and allows you to define custom models and providers.
killerFeature: Reverse-engineer any website's components, style systems, and color palettes with full access to your tab's console and debugger
topics: agent, agent-orchestration, ide
readme:
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/stagewise-io/stagewise/refs/heads/main/logo-combo-dark.svg">
  <img src="https://raw.githubusercontent.com/stagewise-io/stagewise/refs/heads/main/logo-combo.svg" alt="stagewise" height="60" />
</picture>

### The Open Source Agentic IDE for Developers

English | [简体中文](./README.zh-CN.md) | [Deutsch](./README.de.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [한국어](./README.ko.md)

  [](https://github.com/stagewise-io/stagewise)

[](https://discord.gg/gkdGsDYaKA) [](https://x.com/stagewise_io)

/_components/feature-images/full-demo-dark.png)

## About the project

**stagewise** is an open source agentic IDE for developers with a coding agent built right in.

- **Browse and build** in the same tool — no context switching
- **Work with a coding agent** that has **full access to your tab's console and debugger**
- **Make temporary test changes** or **connect a codebase** for permanent edits
- **Reverse-engineer** any website's components, style systems, and color palettes
- **IDE integration** to view and apply code changes in your favorite editor
- **Bring your own API key** — fully supported for all AI providers

## Getting Started

Download stagewise from [stagewise.io](https://stagewise.io) and follow the short onboarding guide to set up your account.

## Use your coding subscription

Bring Your Own Key for all popular model providers — you can also register completely

### kelseyhightower/kubernetes-the-hard-way
description: A step-by-step tutorial that guides you through bootstrapping a Kubernetes cluster from the ground up, covering core components and fundamental concepts. This hands-on approach focuses on learning the intricacies of Kubernetes by setting up control plane and worker nodes manually.
killerFeature: Run a basic Kubernetes cluster from scratch without scripts
topics: (none)
readme:
# Kubernetes The Hard Way

This tutorial walks you through setting up Kubernetes the hard way. This guide is not for someone looking for a fully automated tool to bring up a Kubernetes cluster. Kubernetes The Hard Way is optimized for learning, which means taking the long route to ensure you understand each task required to bootstrap a Kubernetes cluster.

> The results of this tutorial should not be viewed as production ready, and may receive limited support from the community, but don't let that stop you from learning!

## Copyright

<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License</a>.

## Target Audience

The target audience for this tutorial is someone who wants to understand the fundamentals of Kubernetes and how the core components fit together.

## Cluster Details

Kubernetes The Hard Way guides you through bootstrapping a basic Kubernetes cluster with all control plane components running on a single node, and two worker nodes, which is enough to learn the core concepts.

Component versions:

* [kubernetes](https://github.com/kubernetes/kubernetes) v1.32.x
* [containerd](https://github.com/containerd/containerd) v2.1.x
* [cni](https:

### nginx/docker-nginx-unprivileged
description: A Docker image that creates an NGINX environment running as an unprivileged user, with customised configuration settings. This allows for improved security and isolation in containerized environments.
killerFeature: Run NGINX as a non-root, unprivileged user
topics: docker, nginx, alpine, debian
readme:
[](https://securityscorecards.dev/viewer/?uri=github.com/nginx/docker-nginx-unprivileged)
[](https://www.repostatus.org/#active)
[](/SUPPORT.md)
[](https://community.nginx.org)
[](https://opensource.org/license/apache-2-0)
[](/CODE_OF_CONDUCT.md)

# NGINX Unprivileged Docker Image

This repo contains a series of Dockerfiles to create an NGINX Docker image that runs NGINX as a non root, unprivileged user. Notable differences with respect to the official [NGINX Docker](https://github.com/nginx/docker-nginx) image include:

- The default NGINX listen port is now `8080` instead of `80` (this is no longer necessary as of Docker `20.03` but it's still required in other container runtimes)
- The default NGINX user directive in `/etc/nginx/nginx.conf` has been removed
- The default NGINX PID has been moved from `/var/run/nginx.pid` (prior to NGINX 1.27.5) and `/run/nginx.pid` (NGINX 1.27.5 and later) to `/tmp/nginx.pid`
- Change `*_temp_path` variables to `/tmp/*`

Check out the [docs](https://hub.docker.com/_/nginx) for the upstream Docker NGINX image for a detailed explanation on how to use this image.

## Supported Image Registries and Platforms

### Image Registries

You can find pre-built images in each of the following registries:

- Amazon ECR - <https://gallery.ecr.aws/nginx/nginx-unprivileged>
- Docker Hub - <https://hub.docker.com/r/nginxinc/nginx-unprivileged>
- GitHub Container Registry - <https://github.com/nginx/docker-nginx-unprivileged/pkgs/container/nginx-unprivilege

### json-path/JsonPath
description: A Java DSL for reading JSON documents, providing a JsonPath implementation. This allows you to query JSON structures in the same way as XPath is used with XML documents. The 'root member object' is always referred to as '$', and you can use dot-notation (e.g., `$.store.book[0].title`) or bracket-notation (e.g., `$['store']['book'][0]['title']`).
killerFeature: Query any JSON document using dot-notation or bracket-notation expressions
topics: (none)
readme:
Jayway JsonPath
=====================

**A Java DSL for reading JSON documents.**

[](https://travis-ci.org/json-path/JsonPath)
[](https://maven-badges.herokuapp.com/maven-central/com.jayway.jsonpath/json-path)
[](http://www.javadoc.io/doc/com.jayway.jsonpath/json-path)

Jayway JsonPath is a Java port of [Stefan Goessner JsonPath implementation](http://goessner.net/articles/JsonPath/).

Getting Started
---------------

JsonPath is available at the Central Maven Repository. Maven users add this to your POM.

> [!NOTE]  
> Version 3.0.0 Uses Java 17 baseline to support Jackson 3

```xml

<dependency>
    <groupId>com.jayway.jsonpath</groupId>
    <artifactId>json-path</artifactId>
    <version>3.0.0</version>
</dependency>
```

If you need help ask questions at [Stack Overflow](http://stackoverflow.com/questions/tagged/jsonpath). Tag the
question 'jsonpath' and 'java'.

JsonPath expressions always refer to a JSON structure in the same way as XPath expression are used in combination
with an XML document. The "root member object" in JsonPath is always referred to as `$` regardless if it is an
object or array.

JsonPath expressions can use the dot–notation

`$.store.book[0].title`

or the bracket–notation

`$['store']['book'][0]['title']`

Operators
---------

| Operator                  | Description                                                     |
|:--------------------------|:----------------------------------------------------------------|
| `$`                       | Th

### usrbinsam/jwt-key-server
description: A Go-based web application providing a RESTful API for desktop and other applications' licensing needs. It allows for key generation, application management, and database storage using PostgreSQL.
killerFeature: Generate and manage software licenses from a single RESTful API
topics: keyserver, license-management, license-keys, software-licensing, license-generator, go, gin
readme:
# mini-key-server

> :star: This repo has not been maintained since 2019 but will being receiving updates again soon. :star:

This web application provides a restful API for your desktop and other applications licensing needs.

### TODO

- [ ] Backend re-write in Go
- [ ] Frontend re-write with VueJS

### Key View

### Application View

### API Example

## Requirements

Aside from the python module requirements listed in [requirements.txt](requirements.txt), the following is required:
* Python 3.6 or later.
* PostgreSQL (or other SQLAlchemy supported backend)

## Installation

This software should be used from a [viritualenv](https://virtualenv.pypa.io/en/stable/)
environment.

```sh
virtualenv venv
source venv/bin/activate
pip3 install -U -r requirements.txt
```

Then edit the config:

```sh
mv keyserv/config.example.py keyserv/config.py
```

Make sure you set `SECRET_KEY` to a randomly generated value, then change `SQLALCHEMY_DATABASE_URI`
to the URI for the database you create below.

## Database Setup

The following commands will create a suitable database for the keyserver to use.

```sh
su - postgres
createuser keyserver
createdb -O keyserver keyserver
```

## User Setup

This creates a user and password on the command line. Currently there's no user creation available
in the user interface.

```sh
export FLASK_APP=keyserver.py
flask create-user username password
```

## Key Creation & Usage

1. Create an Application at the `/add/app` URL.
2. Create a Key at the `/add/k

### wagoodman/dive
description: A Go command-line tool that analyzes a Docker image, layer contents, and discovers ways to shrink the size of your Docker/OCI image. It shows Docker image contents broken down by layer, indicates what's changed in each layer, and allows for file tree exploration with arrow keys.
killerFeature: Explore Docker image contents broken down by layer with automatic recursive directory traversal and gitignore-aware filtering
topics: docker, docker-image, inspector, explorer, cli, tui
readme:
# dive
[](https://github.com/wagoodman/dive/releases/latest)
[](https://github.com/wagoodman/dive/actions/workflows/validations.yaml)
[](https://goreportcard.com/report/github.com/wagoodman/dive)
[](https://github.com/wagoodman/dive/blob/main/LICENSE)
[](https://www.paypal.me/wagoodman)

**A tool for exploring a Docker image, layer contents, and discovering ways to shrink the size of your Docker/OCI image.**

To analyze a Docker image simply run dive with an image tag/id/digest:
```bash
dive <your-image-tag>
```

or you can dive with Docker directly:
```
alias dive="docker run -ti --rm  -v /var/run/docker.sock:/var/run/docker.sock docker.io/wagoodman/dive"
dive <your-image-tag>

# for example
dive nginx:latest
```

or if you want to build your image then jump straight into analyzing it:
```bash
dive build -t <some-tag> .
```

Building on macOS (supporting only the Docker container engine):

```bash
docker run --rm -it \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v  "$(pwd)":"$(pwd)" \
      -w "$(pwd)" \
      -v "$HOME/.dive.yaml":"$HOME/.dive.yaml" \
      docker.io/wagoodman/dive:latest build -t <some-tag> .
```

Additionally you can run this in your CI pipeline to ensure you're keeping wasted space to a minimum (this skips the UI):
```
CI=true dive <your-image>
```

**This is beta quality!** *Feel free to submit an issue if you want a new feature or find a bug :)*

## Basic Features

**Show Docker image contents broken down by layer**

As you select a lay

### fabriciorby/maven-surefire-junit5-tree-reporter
description: A Maven Surefire plugin extension for JUnit5 that generates a tree-view report of unit tests, replacing plain logs. This Java library is designed to work with Maven projects and can be configured to display detailed information about executed tests.
killerFeature: Visualise JUnit5 test results as a tree view in the console
topics: java, junit5, maven-plugin
readme:
# Maven Surefire JUnit5 TreeView Extension

If you are a Maven Surefire user and ever wanted a fancy tree output for your tests instead of a bunch of logs, you absolutely should try this.

This is a dependency for [maven-surefire-plugin](https://maven.apache.org/surefire/maven-surefire-plugin/), it adds a tree view for the unit tests executed using JUnit5.

[](https://search.maven.org/artifact/me.fabriciorby/maven-surefire-junit5-tree-reporter)
[](http://www.apache.org/licenses/LICENSE-2.0)

## Installation

The Maven Repository can be found [here](https://mvnrepository.com/artifact/me.fabriciorby/maven-surefire-junit5-tree-reporter).

Configure your POM like the following

```xml
<plugin>
    <artifactId>maven-surefire-plugin</artifactId>
    <version>3.5.3</version>
    <dependencies>
        <dependency>
            <groupId>me.fabriciorby</groupId>
            <artifactId>maven-surefire-junit5-tree-reporter</artifactId>
            <version>1.5.1</version>
        </dependency>
    </dependencies>
    <configuration>
        <reportFormat>plain</reportFormat>
        <consoleOutputReporter>
            <disable>true</disable>
        </consoleOutputReporter>
        <statelessTestsetInfoReporter
                implementation="org.apache.maven.plugin.surefire.extensions.junit5.JUnit5StatelessTestsetInfoTreeReporter">
        </statelessTestsetInfoReporter>
    </configuration>
</plugin>
```

### Important
Until `maven-surefire-plugin:3.5.3` you should use `maven-surefire-

### matthiasn/talk-transcripts
description: A collection of transcripts from Clojure-related talks, compiled for easier consumption by those who prefer reading over listening. Includes links to original sources where possible.
killerFeature: Read transcripts of Clojure-related talks with ease
topics: (none)
readme:
talk-transcripts
================

This is a compilation of transcripts of talks that I find interesting. I learn better when I read something rather than hearing it, and I have a hunch that I'm not the only one who feels that way. So I thought I'd make the talks more accessible to anyone for whom listening to the talks might not be the most viable or simply not the most preferred option.

**Please**, if you read any of the transcripts and find that a URL is mentioned in the talk and you go look it up, can you submit a pull request turning that into an actual link in the transcript? It is really simple, just click on the pencil button above the document and turn the mention in the text into a markdown-style link like this: ````**[blah.com or whatever was in the transcript](http://blah.com)**````. Thanks, you're making the transcripts more useful.

For more information on this project, please read this **[blog post](http://matthiasnehlsen.com/blog/2014/10/15/talk-transcripts/)**.
