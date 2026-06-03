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

# INPUT — batch 4/4 (30 repos)

### jwasham/coding-interview-university
description: A comprehensive computer science study plan to prepare for technical interviews at top software companies, including Amazon, Facebook, Google, and Microsoft. This plan covers data structures, algorithms, and software engineering fundamentals.
killerFeature: Get hired as a Software Development Engineer at Amazon
topics: computer-science, interview, programming-interviews, study-plan, data-structures, algorithms, software-engineering, algorithm, coding-interviews, interview-prep, coding-interview, interview-preparation
readme:
# Coding Interview University

> I originally created this as a short to-do list of study topics for becoming a software engineer,
> but it grew to the large list you see today. After going through this study plan, [I got hired
> as a Software Development Engineer at Amazon](https://startupnextdoor.com/ive-been-acquired-by-amazon/?src=ciu)!
> You probably won't have to study as much as I did. Anyway, everything you need is here.
>
> I studied about 8-12 hours a day, for several months. This is my story: [Why I studied full-time for 8 months for a Google interview](https://medium.freecodecamp.org/why-i-studied-full-time-for-8-months-for-a-google-interview-cc662ce9bb13)
>
> **Please Note:** You won't need to study as much as I did. I wasted a lot of time on things I didn't need to know. More info about that is below. I'll help you get there without wasting your precious time.
>
> The items listed here will prepare you well for a technical interview at just about any software company,
> including the giants: Amazon, Facebook, Google, and Microsoft.
>
> *Best of luck to you!*

<details>
<summary>Translations:</summary>

- [Bahasa Indonesia](translations/README-id.md)
- [Bulgarian](translations/README-bg.md)
- [Español](translations/README-es.md)
- [German](translations/README-de.md)
- [Japanese (日本語)](translations/README-ja.md)
- [Marathi](translations/README-mr.md)
- [Polish](translations/README-pl.md)
- [Português Brasileiro](translations/README-ptbr.md)
- [Russian](translation

### toedter/spring-hateoas-jsonapi
description: A Java library that uses existing Spring HATEOAS representation models to serialize and deserialize them according to the JSON:API specification, allowing for easy integration with Spring-based applications.
killerFeature: Serialise and deserialize Spring HATEOAS representation models according to the JSON:API specification
topics: (none)
readme:
(none)

### moby/moby
description: The Moby Project provides a modular, flexible framework for assembling container-based systems. It includes components like build tools, registries, and runtimes, allowing developers to create powerful tools with functional APIs.
killerFeature: Assemble custom container-based systems from Lego set of toolkit components
topics: docker, containers, go, golang
readme:
The Moby Project
================

[](https://pkg.go.dev/github.com/moby/moby/v2)

[](https://goreportcard.com/report/github.com/moby/moby/v2)
[](https://scorecard.dev/viewer/?uri=github.com/moby/moby)
[](https://www.bestpractices.dev/projects/10989)

Moby is an open-source project created by Docker to enable and accelerate software containerization.

It provides a "Lego set" of toolkit components, the framework for assembling them into custom container-based systems, and a place for all container enthusiasts and professionals to experiment and exchange ideas.
Components include container build tools, a container registry, orchestration tools, a runtime and more, and these can be used as building blocks in conjunction with other tools and projects.

## Principles

Moby is an open project guided by strong principles, aiming to be modular, flexible and without too strong an opinion on user experience.
It is open to the community to help set its direction.

- Modular: the project includes lots of components that have well-defined functions and APIs that work together.
- Batteries included but swappable: Moby includes enough components to build fully featured container systems, but its modular architecture ensures that most of the components can be swapped by different implementations.
- Usable security: Moby provides secure defaults without compromising usability.
- Developer focused: The APIs are intended to be functional and useful to build powerful tools.
They are not necessa

### keycloakify/keycloakify
description: A TypeScript build tool that generates a Keycloak theme, fully compatible with Keycloak versions 11-26. Learn more at https://www.keycloakify.dev.
killerFeature: Generate a Keycloak theme with zero config changes
topics: keycloak, freemarker, ftl, keycloak-theme, keycloak-themes
readme:
<p align="center">
    <img src="https://user-images.githubusercontent.com/6702424/109387840-eba11f80-7903-11eb-9050-db1dad883f78.png">  
</p>
<p align="center">
    <i>🔏 Keycloak Theming for the Modern Web 🔏</i>
    <br>
    <br>
    <a href="https://github.com/garronej/keycloakify/actions">
      <img src="https://github.com/keycloakify/keycloakify/actions/workflows/ci.yaml/badge.svg">
    </a>
    <a href="https://www.npmjs.com/package/keycloakify">
      <img src="https://img.shields.io/npm/dm/keycloakify">
    </a>
    <a href="https://github.com/garronej/keycloakify/blob/main/LICENSE">
      <img src="https://img.shields.io/npm/l/keycloakify">
    </a>
    <a href="https://github.com/thomasdarimont/awesome-keycloak">
        <img src="https://awesome.re/mentioned-badge.svg"/>
    </a>
    <p align="center">
      Check out our discord server!<br/>
      <a href="https://discord.gg/mJdYJSdcm4">
        <img src="https://dcbadge.limes.pink/api/server/kYFZG7fQmn"/>
      </a>
    </p>
    <p align="center">
        <a href="https://www.keycloakify.dev">Home</a>
        -
        <a href="https://docs.keycloakify.dev">Documentation</a>
        -
        <a href="https://storybook.keycloakify.dev">Storybook</a>
        -
        <a href="https://github.com/codegouvfr/keycloakify-starter">Starter project</a>
    </p>
</p>

<p align="center">
    <i>This build tool generates a Keycloak theme <a href="https://www.keycloakify.dev">Learn more</a></i>
    <br/>
    <br/>
    <img 

### operator-framework/operator-sdk
description: The Operator SDK is an open-source toolkit for building Kubernetes native applications, called Operators. It provides high-level APIs, useful abstractions, and project scaffolding to simplify the process of managing complex stateful applications on top of Kubernetes.
killerFeature: Deploy Kubernetes applications with ease through high-level APIs and project scaffolding
topics: operator, kubernetes, sdk
readme:
<img src="website/static/operator_logo_sdk_color.svg" height="125px"></img>

> ⚠️ **IMPORTANT NOTICE:** Images under `gcr.io/kubebuilder/` Will Be Unavailable Soon
>
> **If your project uses `gcr.io/kubebuilder/kube-rbac-proxy`** it will be affected.
> Your project may fail to work if the image cannot be pulled. **You must move as soon as possible**, sometime from early 2025, the GCR will go away.
>
> The usage of the project [kube-rbac-proxy](https://github.com/brancz/kube-rbac-proxy) was discontinued from Kubebuilder and Operator-SDK.
> It was replaced for similar protection using `authn/authz` via Controller-Runtime's feature [WithAuthenticationAndAuthorization](https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.18.4/pkg/metrics/filters#WithAuthenticationAndAuthorization).
>
> For more information and guidance see the discussion https://github.com/kubernetes-sigs/kubebuilder/discussions/3907

[](https://github.com/operator-framework/operator-sdk/actions)
[](http://www.apache.org/licenses/LICENSE-2.0.html)

## Documentation

Docs can be found on the [Operator SDK website][sdk-docs].

## Overview

This project is a component of the [Operator Framework][of-home], an
open source toolkit to manage Kubernetes native applications, called
Operators, in an effective, automated, and scalable way. Read more in
the [introduction blog post][of-blog].

[Operators][operator-link] make it easy to manage complex stateful
applications on top of Kubernetes. However writing an Operator toda

### ahmetb/kubectx
description: A Go tool that provides `kubectx` to switch between Kubernetes contexts (clusters) on kubectl, and `kubens` to switch between namespaces. Utilize read-only shells, context renaming, and namespace activation with ease.
killerFeature: Switch between clusters and namespaces on kubectl faster
topics: kubernetes, kubectl, kubectl-plugins, kubernetes-clusters
readme:
# `kubectx` + `kubens`: Power tools for kubectl

[/badge.svg)](https://github.com/ahmetb/kubectx/actions?query=workflow%3A"Go+implementation+(CI)")

This repository provides both `kubectx` and `kubens` tools.
[Install &rarr;](#installation)

## What are `kubectx` and `kubens`?

**kubectx** is a tool to switch between contexts (clusters) on kubectl
faster, and launch readonly shells for each context.<br/>
**kubens** is a tool to switch between Kubernetes namespaces (and
configure them for kubectl) easily.

Here's a **`kubectx`** demo:

...and here's a **`kubens`** demo:

### Usage

#### kubectx

Switch to another cluster that's in kubeconfig:

```sh
$ kubectx minikube
Switched to context "minikube".
```

Switch back to previous cluster:

```sh
$ kubectx -
Switched to context "oregon".
```

Start an isolated shell that only has a single context:

```sh
$ kubectx -s minikube
```

Start a read-only shell where write operations are blocked:

```sh
$ kubectx -r minikube
```

Rename context:

```sh
$ kubectx dublin=gke_ahmetb_europe-west1-b_dublin
Context "gke_ahmetb_europe-west1-b_dublin" renamed to "dublin".
```

#### kubens

Change the active namespace on kubectl:

```sh
$ kubens kube-system
Context "test" set.
Active namespace is "kube-system".
```

Go back to the previous namespace:

```sh
$ kubens -
Context "test" set.
Active namespace is "default".
```

Change the active namespace even if it doesn't exist:

```sh
$ kubens namespace-404 -f
Context "test" set.
Active namespace 

### oxsecurity/megalinter
description: A Docker-based code linter that analyzes 50 languages, 22 formats, and 21 tooling formats for consistency, formatting, and best practices. Native integrations with CI/CD tools like GitHub Actions, Jenkins, Terraform, Azure Pipelines, and GitLab CI.
killerFeature: Run MegaLinter to ensure all project sources are clean and formatted, detecting excessive copy-pastes, spelling mistakes, security issues, and more in 69 languages and 23 formats.
topics: linter, java, code-quality, jenkins, terraform, python, groovy, kotlin, golang, markdown, linters, formatter, best-practices, security, autofix, apex, azure-pipelines, gitlab-ci, sarif-report, megalinter
readme:
<div align="center">
  <a href="https://megalinter.io" target="blank" title="Visit MegaLinter Web Site">
    <img src="https://github.com/oxsecurity/megalinter/raw/main/docs/assets/images/megalinter-banner.png" alt="MegaLinter" min-height="200px">
  </a>
</div>

# MegaLinter, by [](https://www.ox.security/?ref=megalinter)

[](https://megalinter.io/flavors/)
[](https://npmjs.org/package/mega-linter-runner)
[](https://github.com/oxsecurity/megalinter/stargazers/)
[](https://github.com/oxsecurity/megalinter/actions?query=workflow%3AMegaLinter+branch%3Amain)
[](https://codecov.io/gh/oxsecurity/megalinter)

[](https://github.com/oxsecurity/megalinter/blob/main/./docs/used-by-stats.md)
[](https://github.com/aquasecurity/trivy)
[](https://github.com/oxsecurity/megalinter/graphs/contributors/)
[](https://github.com/sponsors/nvuillam)
[](https://github.com/oxsecurity/megalinter/blob/main/.github/CONTRIBUTING.md)
[](https://twitter.com/intent/tweet?text=Check+MegaLinter+to+say+goodbye+to+dirty+code+in+your+projects+%3A%29+100%25+free+and+open+source+for+all+uses&url=https://megalinter.io/&via=NicolasVuillamy&hashtags=linters,code,quality,ci,python,java,golang,c,dotnet,kotlin,rust,scala,salesforce,terraform)

MegaLinter is an **open-source** tool for **CI/CD workflows** that analyzes the **consistency of your code**, **IaC**, **configuration**, and **scripts** in your repository to **ensure all your project sources are clean and formatted**, no matter which IDE or toolbox is used by you

### ryanmcdermott/clean-code-javascript
description: A guide to producing readable, reusable, and refactorable software in JavaScript, adapted from Robert C. Martin's book Clean Code. These principles aim to improve the overall architecture and design of JavaScript codebases.
killerFeature: Assess the quality of your JavaScript code using codified guidelines
topics: javascript, principles, composition, inheritance, clean-code, clean-architecture, best-practices
readme:
# clean-code-javascript

## Table of Contents

1. [Introduction](#introduction)
2. [Variables](#variables)
3. [Functions](#functions)
4. [Objects and Data Structures](#objects-and-data-structures)
5. [Classes](#classes)
6. [SOLID](#solid)
7. [Testing](#testing)
8. [Concurrency](#concurrency)
9. [Error Handling](#error-handling)
10. [Formatting](#formatting)
11. [Comments](#comments)
12. [Translation](#translation)

## Introduction

Software engineering principles, from Robert C. Martin's book
[_Clean Code_](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882),
adapted for JavaScript. This is not a style guide. It's a guide to producing
[readable, reusable, and refactorable](https://github.com/ryanmcdermott/3rs-of-software-architecture) software in JavaScript.

Not every principle herein has to be strictly followed, and even fewer will be
universally agreed upon. These are guidelines and nothing more, but they are
ones codified over many years of collective experience by the authors of
_Clean Code_.

Our craft of software engineering is just a bit over 50 years old, and we are
still learning a lot. When software architecture is as old as architecture
itself, maybe then we will have harder rules to follow. For now, let these
guidelines serve as a touchstone by which to assess the quality of the
JavaScript code that you and your team produce.

One more thing: knowing these won't immediately make you a better software
developer, and working with them f

### paulbouwer/hello-kubernetes
description: A Docker-based container image that displays a 'Hello world!' message, along with namespace, pod, and node details. This demo app can be deployed to a Kubernetes cluster using Helm 3.
killerFeature: Deploy a demo app to your Kubernetes cluster in minutes
topics: kubernetes, demo-app
readme:
# Hello Kubernetes!

[](https://hub.docker.com/repository/docker/paulbouwer/hello-kubernetes) [](https://hub.docker.com/repository/docker/paulbouwer/hello-kubernetes) [](https://hub.docker.com/repository/docker/paulbouwer/hello-kubernetes)

This container image can be deployed on a Kubernetes cluster. It runs a web app, that displays the following:

- a default **Hello world!** message
- namespace, pod, and node details
- container image details



## Quick start

You can deploy `hello-kubernetes` to your Kubernetes cluster using [Helm 3](https://helm.sh/docs/intro/install/). The Helm chart installation and configuration options can be found in the [Deploy using Helm](docs/deploy-using-helm.md) guide.

When running through the following examples, ensure that you are in the chart directory in the repo, since you are referencing a local helm chart.

```bash
cd deploy/helm
```

### Example 1: Default

Deploy the `hello-kubernetes` app into the `hello-kubernetes` namespace with the default "Hello world!" message. The app is exposed via a public Load Balancer on port 80 by default - note that a LoadBalancer service typically only works in cloud provider based Kubernetes offerings.

```bash
helm install --create-namespace --namespace hello-kubernetes hello-world ./hello-kubernetes

# get the LoadBalancer ip address.
kubectl get svc hello-kubernetes-hello-world -n hello-kubernetes -o 'jsonpath={ .status.loadBalancer.ingress[0].ip }'
```

### Example 

### specmatic/specmatic
description: A Kotlin-based no-code AI-powered API development suite that transforms API specifications into executable contracts, allowing teams to ship APIs quickly and avoiding integration surprises. It supports various API specification formats like OpenAPI, AsyncAPI, GraphQL SDL files, gRPC Proto files, etc.
killerFeature: Ship APIs 10x faster by transforming specifications into executable contracts instantly
topics: contract-testing, microservices, contract-driven-development, cdd, specmatic, asyncapi, backward-compatibility, graphql, jdbc, openapi, redis, service-virtualization, wsdl, grpc, overlay, openapi3
readme:
Specmatic
=========
[](https://mvnrepository.com/artifact/io.specmatic/specmatic-core) [](https://github.com/specmatic/specmatic/releases)  [](https://twitter.com/specmatic) [](https://hub.docker.com/r/specmatic/specmatic)

##### Ship AI-Ready APIs 10x Faster with Zero Integration Headaches
Eliminate API integration headaches with Specmatic's no-code AI-powered API development suite. Teams ship APIs 10x faster by transforming specifications into executable contracts instantly—no coding required, no integration surprises.

### Context

In a complex, interdependent ecosystem, where each service is evolving rapidly, we want to make the dependencies between them explicit in the form of executable contracts. [Contract Driven Development](https://specmatic.io/contract_driven_development.html) leverages API specifications like [OpenAPI](https://spec.openapis.org/#openapi-specification), [AsyncAPI](https://www.asyncapi.com/), [GraphQL](https://graphql.org/) SDL files, [gRPC](https://grpc.io/) Proto files, etc. as executable contracts allowing teams to get instantaneous feedback while making changes to avoid accidental breakage.

With this ability, we can now independently deploy, at will, any service at any time without having to depend on expensive and fragile integration tests.

Learn more at [specmatic.io](https://specmatic.io/#features) 🌐

[Get started now](https://specmatic.io/getting_started.html) 🚀

[](https://www.youtube.com/watch?v=K5BYxoONgXo&list=PL9Z-JgiTsOYRERcsy9o3y6nsi

### raviqqe/muffet
description: A Go command-line tool that scrapes and inspects all pages in a website recursively, with high compatibility with web browsers, different tag support, and multiple output formats. Comparable to other link checkers but optimised for speed on large websites.
killerFeature: Run a fast website link checker in seconds with massive speed
topics: linter, website, golang
readme:
# Muffet

[](https://github.com/raviqqe/muffet/actions)
[](https://codecov.io/gh/raviqqe/muffet)
[](https://hub.docker.com/r/raviqqe/muffet)
[](https://github.com/raviqqe/muffet/blob/main/LICENSE)

Muffet is a website link checker which scrapes and inspects all pages in a website recursively.

## Features

- Massive speed
- High compatibility with web browsers
- Different tag support (`a`, `img`, `link`, `script`, etc)
- Multiple output formats (text, JSON, and JUnit XML)

## Install

```sh
go install github.com/raviqqe/muffet/v2@latest
```

For more information, see [the install page](https://raviqqe.github.io/muffet/install).

## Usage

```sh
muffet https://shady.bakery.hotland
```

For more information including usage on Docker and GitHub Actions, see [the usage page](https://raviqqe.github.io/muffet/usage).

## License

[MIT](https://github.com/raviqqe/muffet/blob/main/LICENSE)

### linkerd/linkerd2
description: A Go-based, ultralight service mesh for Kubernetes that adds critical security, observability, and reliability features with no code change required. This Cloud Native Computing Foundation project is designed to work seamlessly with your existing Kubernetes stack.
killerFeature: Run a security-first service mesh on Kubernetes without code changes
topics: service-mesh, rust, golang, kubernetes, linkerd, cloud-native
readme:
# Linkerd

![Linkerd][logo]

[](https://bestpractices.coreinfrastructure.org/projects/4629)
[![GitHub Actions Status][github-actions-badge]][github-actions]
[](LICENSE)
[![Go Report Card][go-report-card-badge]][go-report-card]
[![Go Reference][go-doc-badge]][go-doc]
[![Slack Status][slack-badge]][slack]

:balloon: Welcome to Linkerd! :wave:

Linkerd is an ultralight, security-first service mesh for Kubernetes. Linkerd
adds critical security, observability, and reliability features to your
Kubernetes stack with no code change required.

Linkerd is a Cloud Native Computing Foundation ([CNCF][cncf]) project.

## Repo layout

This is the primary repo for the Linkerd 2.x line of development.

The complete list of Linkerd repos is:

* [linkerd2][linkerd2]: Main Linkerd 2.x repo, including control plane and CLI
* [linkerd2-proxy][proxy]: Linkerd 2.x data plane proxy
* [linkerd2-proxy-api][proxy-api]: Linkerd 2.x gRPC API bindings
* [linkerd][linkerd1]: Linkerd 1.x
* [website][linkerd-website]: linkerd.io website (including docs for 1.x and
  2.x)

## Quickstart and documentation

You can run Linkerd on any modern Kubernetes cluster in a matter of seconds.
See the [Linkerd Getting Started Guide][getting-started] for how.

For more comprehensive documentation, start with the [Linkerd
docs][linkerd-docs]. (The doc source code is available in the
[website][linkerd-website] repo.)

## Working in this repo

[`BUILD.md`](BUILD.md) includes general information on how to work in this repo.



### johnph/simple-transaction
description: A .NET Core sample application demonstrating a microservices architecture for automated banking features like Balance, Deposit, Withdraw using ASP.NET Core Web API with C#.Net, Entity Framework and SQL Server. The solution includes multiple services, including a gateway client, showcasing database design, security, logging, monitoring, and exception handling.
killerFeature: Run a scalable, service-based .NET Core back-end system
topics: (none)
readme:
(none)

### kubernetes-sigs/krew
description: A Go tool that enables the discovery, installation, and management of kubectl plugins. Comparable to package managers like apt or brew, Krew simplifies the process for both kubectl users and plugin developers.
killerFeature: Deploy kubectl plugins with zero config changes
topics: kubectl, kubectl-plugins, k8s-sig-cli
readme:
<img src="assets/logo/horizontal/color/krew-horizontal-color.png" width="480"
  alt="Krew logo"/>

# Krew

[](https://github.com/kubernetes-sigs/krew/actions)
[](https://goreportcard.com/report/kubernetes-sigs/krew)
[](https://github.com/kubernetes-sigs/krew/blob/master/LICENSE)
[](https://github.com/kubernetes-sigs/krew/releases)

Krew is the package manager for kubectl plugins.

## What does Krew do?

Krew is a tool that makes it easy to use [kubectl
plugins](https://kubernetes.io/docs/tasks/extend-kubectl/kubectl-plugins/). Krew
helps you discover plugins, install and manage them on your machine. It is
similar to tools like apt, dnf or [brew](https://brew.sh). Today, over [200
kubectl plugins][list] are available on Krew.

- **For kubectl users:** Krew helps you find, install and manage kubectl plugins
  in a consistent way.
- **For plugin developers:** Krew helps you package and distribute your plugins
  on multiple platforms and makes them discoverable.

## [Documentation][website]

Visit the [**Krew documentation**][website] to find **Installation**
instructions, **User Guide** and **Developer Guide**.

You can follow the [**Quickstart**][quickstart] to get started with Krew.

[website]: https://krew.sigs.k8s.io/
[quickstart]: https://krew.sigs.k8s.io/docs/user-guide/quickstart/

## Contributor Documentation

- [Releasing Krew](./docs/RELEASING_KREW.md): how to release new version of
  Krew.
- [Plugin Lifecycle](./docs/PLUGIN_LIFECYCLE.md): how Krew installs/upgrades
  

### derailed/k9s
description: A Go-written, open-source command-line tool that provides a terminal user interface to interact with your Kubernetes clusters. It continually watches for changes and offers subsequent commands to manage observed resources.
killerFeature: Run Kubernetes cluster management commands from a terminal UI
topics: k9s, kubernetes, kubernetes-cli, kubernetes-clusters, k8s, k8s-cluster, go, golang
readme:
<img src="assets/k9s.png" alt="k9s">

## K9s - Kubernetes CLI To Manage Your Clusters In Style!

K9s provides a terminal UI to interact with your Kubernetes clusters.
The aim of this project is to make it easier to navigate, observe and manage
your applications in the wild. K9s continually watches Kubernetes
for changes and offers subsequent commands to interact with your observed resources.

---

## Note...

K9s is not pimped out by a big corporation with deep pockets.
It is a complex OSS project that demands a lot of my time to maintain and support.
K9s will always remain OSS and therefore free! That said, if you feel k9s makes your day to day Kubernetes journey a tad brighter, saves you time and makes you more productive, please consider [sponsoring us!](https://github.com/sponsors/derailed)
Your donations will go a long way in keeping our servers lights on and beers in our fridge!

**Thank you!**

---

[](https://goreportcard.com/report/github.com/derailed/k9s)
[](https://golangci.com/r/github.com/derailed/k9s)
[](https://hub.docker.com/r/derailed/k9s/)
[](https://github.com/derailed/k9s/releases)
[](https://github.com/mum4k/termdash/blob/master/LICENSE)
[](https://github.com/derailed/k9s/releases)

---

## Screenshots

1. Pods
      <img src="assets/screen_po.png"/>
2. Logs
      <img src="assets/screen_logs.png"/>
3. Deployments
      <img src="assets/screen_dp.png"/>

---

## Demo Videos/Recordings

* [K9s v0.40.0 -Column Blow- Sneak peek](https://youtu.be/iy6RDozAM4A)

### weibeld/kubectl-ns
description: A kubectl plugin for interactively switching the current namespace, making it easier to work with different namespaces in the same cluster. This plugin uses fzf for namespace selection and is installed by downloading and executing a simple script.
killerFeature: Switch between namespaces interactively using kubectl
topics: kubectl, kubectl-plugins, kubernetes
readme:
# kubectl ns

A [kubectl plugin](https://kubernetes.io/docs/tasks/extend-kubectl/kubectl-plugins/) for interactively switching the current namespace:

This makes it easier to work with different namespaces in the same cluster.

Also see [kubectl-ctx](https://github.com/weibeld/kubectl-ctx) for switching between contexts (e.g. clusters).

## Installation

You can install the plugin by following these simple steps:

1. Download the `kubectl-ns` script:

    ~~~bash
    curl -O https://raw.githubusercontent.com/weibeld/kubectl-ns/master/kubectl-ns
    ~~~

2. Make it executable:

    ~~~bash
    chmod +x kubectl-ns
    ~~~
    
3. Move it to *any* directory in your `PATH` (you might want to create a `~/.kubectl-plugins` folder for all your kubectl plugins):

    ~~~bash
    mv kubectl-ns ~/.kubectl-plugins
    ~~~~

Now, you can verify that the plugin is correctly installed by running the following command and checking that the `kubectl-ns` script is included in the output:

~~~bash
kubectl plugin list
~~~~

To uninstall the plugin, simply delete the `kubectl-ns` script.

## Dependencies

The plugin depends on the [fzf](https://github.com/junegunn/fzf) command being available on your system.

You can install fzf as follows:

- Homebrew (macOS) and Linuxbrew (Linux):
    ~~~bash
    brew install fzf
    ~~~
- From source (macOS and Linux):
    ~~~bash
    git clone https://github.com/junegunn/fzf.git ~/.fzf
    ~/.fzf/install
    ~~~
- For further installation options, see [here]

### dbsystel/trivy-vulnerability-explorer
description: A Vue web application that loads Trivy reports in JSON format, displaying vulnerabilities of a single target in an interactive data table. Use the app to load a report, filter by term or category, and start exploring.
killerFeature: Explore vulnerabilities of a single target in an interactive data table
topics: trivy, vulnerability, scan, report, hacktoberfest
readme:
(none)

### passbolt/passbolt_docker
description: A Ruby command-line tool that provides an open source password manager for teams, allowing team members to store and share credentials securely. Comparable to other password managers but optimized for team collaboration.
killerFeature: Run a free and open source password manager for teams using Docker
topics: passbolt, docker
readme:
```
       ____                  __          ____          .-.
      / __ \____  _____ ____/ /_  ____  / / /_    .--./ /      _.---.,
     / /_/ / __ `/ ___/ ___/ __ \/ __ \/ / __/     '-,  (__..-`       \
    / ____/ /_/ (__  |__  ) /_/ / /_/ / / /_          \                |
   /_/    \__,_/____/____/_,___/\____/_/\__/           `,.__.   ^___.-/
                                                         `-./ .'...--`
  The open source password manager for teams                `'
  (c) 2023 Passbolt SA
  https://www.passbolt.com
```

[](https://hub.docker.com/r/passbolt/passbolt/tags/)
[](https://github.com/passbolt/passbolt_docker/releases)
[](https://github.com/passbolt/passbolt_docker/LICENSE)
[](https://twitter.com/passbolt)

# What is passbolt?

Passbolt is a free and open source password manager that allows team members to
store and share credentials securely.

# Requirements

- mariadb/mysql >= 5.0

# Usage

### docker-compose

Usage:

```
docker-compose -f docker-compose/docker-compose-ce.yaml up
```

Users are encouraged to use [official docker image from the docker hub](https://hub.docker.com/r/passbolt/passbolt/).

## Start passbolt instance

Passbolt requires mysql to be running. The following example use mysql official
docker image with the default passbolt credentials.

```bash
$ docker run -e MYSQL_ROOT_PASSWORD=<root_password> \
             -e MYSQL_DATABASE=<mariadb_database> \
             -e MYSQL_USER=<mariadb_user> \
             -e MYSQL_PASSWORD=<maria

### open-policy-agent/conftest
description: A Go command-line tool that allows you to write tests for your Kubernetes configuration, Tekton pipeline definitions, Terraform code, Serverless configs or any other config files. Conftest uses the Rego language from Open Policy Agent for writing assertions.
killerFeature: Write tests against structured configuration data using Rego query language
topics: kubernetes, testing, rego, openpolicyagent, open-policy-agent
readme:
# Conftest

[](https://goreportcard.com/report/open-policy-agent/conftest) [](https://app.netlify.com/sites/vibrant-villani-65041c/deploys)

Conftest helps you write tests against structured configuration data. Using Conftest you can
write tests for your Kubernetes configuration, Tekton pipeline definitions, Terraform code,
Serverless configs or any other config files.

Conftest uses the Rego language from [Open Policy Agent](https://www.openpolicyagent.org/) for writing
the assertions. You can read more about Rego in the [Policy Language](https://www.openpolicyagent.org/docs/policy-language)
section in the Open Policy Agent documentation.

Here's a quick example. Save the following as `policy/deployment.rego`:

```rego
package main

deny contains msg if {
  input.kind == "Deployment"
  not input.spec.template.spec.securityContext.runAsNonRoot

  msg := "Containers must not run as root"
}

deny contains msg if {
  input.kind == "Deployment"
  not input.spec.selector.matchLabels.app

  msg := "Containers must provide app label for pod selectors"
}
```

Assuming you have a Kubernetes deployment in `deployment.yaml` you can run Conftest like so:

```console
$ conftest test deployment.yaml
FAIL - deployment.yaml - Containers must not run as root
FAIL - deployment.yaml - Containers must provide app label for pod selectors

2 tests, 0 passed, 0 warnings, 2 failures, 0 exceptions
```

Conftest isn't specific to Kubernetes. It will happily let you write tests for any configuration fi

### replicatedhq/troubleshoot
description: Replicated Troubleshoot is a framework for collecting, redacting, and analyzing diagnostic information about Kubernetes clusters. It provides two CLI tools as kubectl plugins: `kubectl preflight` for pre-installation cluster conformance testing and validation, and `kubectl support-bundle` for post-installation troubleshooting and diagnostics.
killerFeature: Run customizable diagnostic checks on Kubernetes clusters for pre-installation conformance testing and validation
topics: kubernetes, preflight, troubleshooting, modern-on-prem, go, golang
readme:
# Replicated Troubleshoot

Replicated Troubleshoot is a framework for collecting, redacting, and analyzing highly customizable diagnostic information about a Kubernetes cluster. Troubleshoot specs are created by 3rd-party application developers/maintainers and run by cluster operators in the initial and ongoing operation of those applications.

Troubleshoot provides two CLI tools as kubectl plugins (using [Krew](https://krew.dev)): `kubectl preflight` and `kubectl support-bundle`. Preflight provides pre-installation cluster conformance testing and validation (preflight checks) and support-bundle provides post-installation troubleshooting and diagnostics (support bundles).

To know more about troubleshoot, please visit: https://troubleshoot.sh/

## Preflight Checks
Preflight checks are an easy-to-run set of conformance tests that can be written to verify that specific requirements in a cluster are met.

To run a sample preflight check from a sample application, install the preflight kubectl plugin:

```
curl https://krew.sh/preflight | bash
```
 and run, where https://preflight.replicated.com provides an **example** preflight spec:

```
kubectl preflight https://preflight.replicated.com
```

**NOTE** this is an example. Do **not** use to validate real scenarios.

For more details on creating the custom resource files that drive preflight checks, visit [creating preflight checks](https://troubleshoot.sh/docs/preflight/introduction/).

## Support Bundle
A support bundle is an ar

### jslicense/spdx-correct.js
description: A JavaScript library that corrects invalid SPDX license identifiers by mapping them to standard IDs, allowing for accurate tracking of software licenses. The package also includes a few hundred pre-processed license strings and ID mappings.
killerFeature: Correct invalid SPDX identifiers using a single command
topics: (none)
readme:
## Usage

```javascript
var correct = require('spdx-correct')
var assert = require('assert')

assert.strictEqual(correct('mit'), 'MIT')

assert.strictEqual(correct('Apache 2'), 'Apache-2.0')

assert(correct('No idea what license') === null)

// disable upgrade option
assert(correct('GPL-3.0'), 'GPL-3.0-or-later')
assert(correct('GPL-3.0', { upgrade: false }), 'GPL-3.0')
```

## Performance Note

This package load and processes the `spdx-license-ids`
package, as well as a few other large arrays of strings,
into global variables.  That can take a few milliseconds.

If you'd prefer to postpone that processing until your
program actually invokes the exported function, consider
using `require()` or dynamic `import()` to load the package
just before you invoke it.

Special thanks to Vinicius Lourenço ([@H4ad](https://github.com/H4ad))
for investigating load times.

## Contributors

spdx-correct has benefited from the work of several contributors.
See [the GitHub repository](https://github.com/jslicense/spdx-correct.js/graphs/contributors)
for more information.

### strapi/strapi
description: Strapi is an open-source, self-hosted headless CMS that generates a full API for any frontend, mobile app, or IoT device. It features visual content structure design, auto-generated REST and GraphQL APIs, granular roles and permissions, and a media library.
killerFeature: Define content models visually with the Content-Type Builder, no code required
topics: strapi, nodejs, api, dashboard, javascript, graphql, rest, cms, headless-cms, jamstack, customizable, hacktoberfest, mysql, content-management, cms-framework, content-management-system, typescript, no-code, posgresql
readme:
<p align="center">
  <a href="https://strapi.io/#gh-light-mode-only">
    <img src="https://strapi.io/assets/strapi-logo-dark.svg" width="318px" alt="Strapi logo" />
  </a>
  <a href="https://strapi.io/#gh-dark-mode-only">
    <img src="https://strapi.io/assets/strapi-logo-light.svg" width="318px" alt="Strapi logo" />
  </a>
</p>

<h3 align="center">Open-source headless CMS, self-hosted or Cloud you're in control.</h3>
<p align="center">The leading open-source headless CMS, 100% JavaScript/TypeScript, flexible and fully customizable.</p>
<p align="center"><a href="https://docs.strapi.io">Docs</a> · <a href="https://strapi.io/cloud">Strapi Cloud</a> · <a href="https://feedback.strapi.io">Roadmap</a> · <a href="https://discord.strapi.io">Discord</a> · <a href="https://github.com/strapi/strapi/discussions">Discussions</a></p>

<p align="center">
  <a href="https://www.npmjs.org/package/@strapi/strapi">
    <img src="https://img.shields.io/npm/v/@strapi/strapi/latest.svg" alt="NPM Version" />
  </a>
  <a href="https://github.com/strapi/strapi/actions/workflows/tests.yml">
    <img src="https://github.com/strapi/strapi/actions/workflows/tests.yml/badge.svg?branch=main" alt="Tests" />
  </a>
  <a href="https://discord.strapi.io">
    <img src="https://img.shields.io/discord/811989166782021633?label=Discord" alt="Strapi on Discord" />
  </a>
  <a href="https://github.com/strapi/strapi/actions/workflows/nightly.yml">
    <img src="https://github.com/strapi/strapi/actions/workflows/ni

### networknt/json-schema-validator
description: A Java implementation of the JSON Schema Core Draft v4, v6, v7, v2019-09 and v2020-12 specification for JSON schema validation. Supports Customizing Dialects, Vocabularies, Keywords and Formats using Jackson parser. Compatible with OpenAPI 3 request/response validation.
killerFeature: Validate OpenAPI requests/responses at runtime
topics: json-schema-validator, json-schema, fast, java8, draft, v4, jackson, java, v6, v7, v2019-09, draftv4, draftv6, draftv7, json, yaml, openapi3, v2020-12
readme:
[Stack Overflow](https://stackoverflow.com/questions/tagged/light-4j) |
[Google Group](https://groups.google.com/forum/#!forum/light-4j) |
[Gitter Chat](https://gitter.im/networknt/json-schema-validator) |
[Subreddit](https://www.reddit.com/r/lightapi/) |
[Youtube](https://www.youtube.com/channel/UCHCRMWJVXw8iB7zKxF55Byw) |
[Documentation](https://doc.networknt.com/library/json-schema-validator/) |
[Contribution Guide](https://doc.networknt.com/contribute/) |

[](https://github.com/networknt/json-schema-validator/actions/workflows/ci.yml)
[](http://search.maven.org/#search%7Cga%7C1%7Cg%3Acom.networknt%20a%3Ajson-schema-validator)
[](https://codecov.io/github/networknt/json-schema-validator?branch=master)
[](https://www.javadoc.io/doc/com.networknt/json-schema-validator)

This is a Java implementation of the [JSON Schema Core Draft v4, v6, v7, v2019-09 and v2020-12](https://json-schema.org/specification) specification for JSON schema validation. This implementation supports [Customizing Dialects, Vocabularies, Keywords and Formats](doc/custom-dialect.md).

The JSON parser used is the [Jackson](https://github.com/FasterXML/jackson) parser.

[OpenAPI](doc/openapi.md) 3 request/response validation is supported with the use of the appropriate dialect.

As it is a key component in our [light-4j](https://github.com/networknt/light-4j) microservices framework to validate request/response against OpenAPI specification for [light-rest-4j](http://www.networknt.com/style/light-rest-4j/) 

### dasniko/testcontainers-keycloak
description: A Testcontainers implementation for Keycloak IAM & SSO, built on top of JUnit 5 and integrating seamlessly with Spring Boot, Quarkus, and other Java frameworks. This library provides a realistic Keycloak OAuth2/OIDC identity provider setup for testing purposes, eliminating the need for manual configuration or mocking.
killerFeature: Spin up a real Keycloak identity provider as a Docker container in your Java integration tests
topics: keycloak, testcontainers, testing, sso, java, iam, oidc, docker, container
readme:
# Keycloak Testcontainer

Spin up a real [Keycloak](https://www.keycloak.org/) OAuth2/OIDC identity provider as a Docker container in your Java integration tests — no mocks, no manual setup.
Built on [Testcontainers](https://www.testcontainers.org/), it works with JUnit 5 and integrates seamlessly with Spring Boot, Quarkus, and any other Java framework.
**New here? → [Quick Start](docs/quickstart.md)**

[](https://github.com/dasniko/testcontainers-keycloak/releases)
[](https://central.sonatype.com/artifact/com.github.dasniko/testcontainers-keycloak)

[](https://www.keycloak.org)

[](https://github.com/dasniko/testcontainers-keycloak/stargazers)
[](https://github.com/dasniko/testcontainers-keycloak/actions/workflows/maven.yml)

## Setup

The release versions of this project are available at [Maven Central](https://central.sonatype.com/artifact/com.github.dasniko/testcontainers-keycloak).

**Maven:**
```xml
<dependency>
  <groupId>com.github.dasniko</groupId>
  <artifactId>testcontainers-keycloak</artifactId>
  <version>VERSION</version>
  <scope>test</scope>
</dependency>
```

**Gradle (Kotlin DSL):**
```kotlin
testImplementation("com.github.dasniko:testcontainers-keycloak:VERSION")
```

> [!TIP]
> There is also a `999.0.0-SNAPSHOT` version available, pointing to the `nightly` Docker image by default and using the `999.0.0-SNAPSHOT` Keycloak libraries as dependencies.

## Version Compatibility

> [!IMPORTANT]
> See [version overview](docs/versions.md) for an overview of which 

### ripienaar/free-for-dev
description: (none)
killerFeature: (none)
topics: free-for-developers, awesome-list
readme:
# free-for.dev

Developers and Open Source authors now have many services offering free tiers, but finding them all takes time to make informed decisions.

This is a list of software (SaaS, PaaS, IaaS, etc.) and other offerings with free developer tiers.

The scope of this particular list is limited to things that infrastructure developers (System Administrator, DevOps Practitioners, etc.) are likely to find useful. We love all the free services out there, but it would be good to keep it on topic. It's a grey line sometimes, so this is opinionated; please don't feel offended if I don't accept your contribution.

This list results from Pull Requests, reviews, ideas, and work done by 1600+ people. You can also help by sending [Pull Requests](https://github.com/ripienaar/free-for-dev) to add more services or remove ones whose offerings have changed or been retired.

[](https://www.trackawesomelist.com/ripienaar/free-for-dev)

**NOTE**: This list is only for as-a-Service offerings, not for self-hosted software. To be eligible, a service must offer a free tier, not just a free trial. The free tier must be for at least a year if it is time-bucketed. We also consider the free tier from a security perspective, so SSO is fine, but I will not accept services that restrict TLS to paid-only tiers.

# Table of Contents

  * [Major Cloud Providers' Always-Free Limits](#major-cloud-providers)
  * [Cloud management solutions](#cloud-management-solutions)
  * [Analytics, Events, and Statistic

### mcguinness/saml-idp
description: A simple Node.js library that provides a SAML 2.0 Identity Provider (IdP) for testing purposes, allowing you to test SAML 2.0 Service Providers (SPs) with the SAML 2.0 Web Browser SSO Profile or Single Logout Profile.
killerFeature: Generate self-signed certificate for SAML IDP testing
topics: saml, idp, identity-provider, saml2
readme:
# Introduction

This app provides a simple SAML Identity Provider (IdP) to test SAML 2.0 Service Providers (SPs) with the [SAML 2.0 Web Browser SSO Profile](http://en.wikipedia.org/wiki/SAML_2.0#Web_Browser_SSO_Profile) or the Single Logout Profile.

> **This sample is not intended for use with production systems!**

## Installation

### Global Command Line Tool

``` shell
npm install --global saml-idp
```

### Manual

From inside a local copy of this repo

``` shell
npm install
# or
npm link
```

### Library

``` shell
npm install saml-idp
```

### Docker

1. docker-compose build
2. docker-compose up

Simply modify Dockerfile to specify your own parameters.

## Generating IdP Signing Certificate

You must generate a self-signed certificate for the IdP.

> The private key should be unique to your test IdP and not shared!

You can generate a keypair using the following command (requires openssl in your path):

``` shell
openssl req -x509 -new -newkey rsa:2048 -nodes -subj '/C=US/ST=California/L=San Francisco/O=JankyCo/CN=Test Identity Provider' -keyout idp-private-key.pem -out idp-public-cert.pem -days 7300
```

## Usage

### Library

An IdP server can be started using the exported `runServer` function. `runServer` accepts a config object which matches the interface of the `saml-idp` command.

``` javascript
const {runServer} = require('saml-idp');

runServer({
  acsUrl: `https://foo.okta.com/auth/saml20/assertion-consumer`,
  audience: `https://foo.okta.com/auth/saml20/metada

### crnk-project/crnk-framework
description: A Java library that implements the JSON API specification, providing features for building RESTful applications, including sorting, filtering, pagination, and more. It integrates well with Spring, JPA, and other Java frameworks.
killerFeature: Deploy RESTful applications with JSON API support
topics: java, jax-rs, jpa, spring-boot, rest-api, restful-api, json-api, spring-data-rest, opentracing, low-code
readme:
# crnk.io - Crank up the development of RESTful applications!

[](https://github.com/crnk-project/crnk-framework/actions)
[](https://gitter.im/crnk-io/Lobby)
[](https://github.com/crnk-project/crnk-framework/blob/master/LICENSE.txt)
[](https://coveralls.io/github/crnk-project/crnk-framework?branch=master)
[](https://search.maven.org/artifact/io.crnk/crnk-core)

## What is Crnk?

Crnk is an implementation of the [JSON API](https://jsonapi.org/) specification and recommendations in Java to
facilitate building RESTful applications. It provides many conventions and building blocks that application can benefit from.
This includes features such as  sorting, filtering, pagination, requesting complex object graphs, sparse
field sets, attaching links to data or atomically execute multiple operations. Further integration
with frameworks and libraries such as Spring, CDI, JPA, Bean Validation, Dropwizard, Servlet API, Zipkin and
and more ensure that JSON API plays well together with the Java ecosystem. Have a look at
[www.crnk.io](http://www.crnk.io) and the  [documentation](http://www.crnk.io/releases/stable/documentation/) for more detailed
information.

Release notes can be found in http://www.crnk.io/releases/.

## Repository

Crnk Maven artifacts are available from jcenter/bintray: <a href="https://bintray.com/crnk-project">https://bintray.com/crnk-project</a>.

Note that due to reliability issues of MavenCentral we only rarely publish there.

## Requirements

Crnk requires Java 1.

### portainer/templates
description: A repository hosting official templates definitions for Portainer, enabling you to deploy custom apps. The primary language is Makefile, with Docker being a key topic.
killerFeature: Deploy your own app templates using Portainer
topics: portainer, docker
readme:
# App Templates

This repository hosts the official templates (**'Apps Templates'**) definitions for Portainer.

For more information about the template definition format and how to deploy your own templates, see the [relevant documentation section](https://documentation.portainer.io/v2.0/templates/deploy_stack/).

## Notice

**This branch (master) is Deprecated.**

Since version 3 of the templates, we've moved to use `v3` branch as the default branch for this repository. If you are using version 2, please use the `master` branch of this repository (or https://raw.githubusercontent.com/portainer/templates/master/templates-2.0.json).

### EbookFoundation/free-programming-books
description: A curated list of free learning resources in many languages, searchable at https://ebookfoundation.github.io/free-programming-books-search/. This page is a collaborative effort to promote the creation, distribution, archiving, and sustainability of free ebooks.
killerFeature: Discover freely available programming books from around the world
topics: education, books, list, resource, hacktoberfest
readme:
# List of Free Learning Resources In Many Languages

<div align="center" markdown="1">

[](https://github.com/sindresorhus/awesome)&#160;
[](https://creativecommons.org/licenses/by/4.0/)&#160;
[](https://github.com/EbookFoundation/free-programming-books/pulls?q=is%3Apr+is%3Amerged+created%3A2025-10-01..2025-10-31)

</div>

Search the list at [https://ebookfoundation.github.io/free-programming-books-search/](https://ebookfoundation.github.io/free-programming-books-search/) [](https://ebookfoundation.github.io/free-programming-books-search/).

This page is available as an easy-to-read website. Access it by clicking on [](https://ebookfoundation.github.io/free-programming-books/).

<div align="center">
  <form action="https://ebookfoundation.github.io/free-programming-books-search">
    <input type="text" id="fpbSearch" name="search" required placeholder="Search Book or Author"/>
    <label for="submit"> </label>
    <input type="submit" id="submit" name="submit" value="Search" />
  </form>
</div>

## Intro

This list was originally a clone of [StackOverflow - List of Freely Available Programming Books](https://web.archive.org/web/20140606191453/http://stackoverflow.com/questions/194812/list-of-freely-available-programming-books/392926) with contributions from Karan Bhangui and George Stocker.

The list was moved to GitHub by Victor Felder for collaborative updating and maintenance. It has grown to become one of [GitHub's most popular repositories](https://octoverse.github.com/)

### dockersamples/example-voting-app
description: (none)
killerFeature: (none)
topics: docker, swarm, kubernetes, docker-compose, example, sample, demo
readme:
# Example Voting App

A simple distributed application running across multiple Docker containers.

## Getting started

Download [Docker Desktop](https://www.docker.com/products/docker-desktop) for Mac or Windows. [Docker Compose](https://docs.docker.com/compose) will be automatically installed. On Linux, make sure you have the latest version of [Compose](https://docs.docker.com/compose/install/).

This solution uses Python, Node.js, .NET, with Redis for messaging and Postgres for storage.

Run in this directory to build and run the app:

```shell
docker compose up
```

The `vote` app will be running at [http://localhost:8080](http://localhost:8080), and the `results` will be at [http://localhost:8081](http://localhost:8081).

Alternately, if you want to run it on a [Docker Swarm](https://docs.docker.com/engine/swarm/), first make sure you have a swarm. If you don't, run:

```shell
docker swarm init
```

Once you have your swarm, in this directory run:

```shell
docker stack deploy --compose-file docker-stack.yml vote
```

## Run the app in Kubernetes

The folder k8s-specifications contains the YAML specifications of the Voting App's services.

Run the following command to create the deployments and services. Note it will create these resources in your current namespace (`default` if you haven't changed it.)

```shell
kubectl create -f k8s-specifications/
```

The `vote` web app is then available on port 31000 on each host of the cluster, the `result` web app is available on p
