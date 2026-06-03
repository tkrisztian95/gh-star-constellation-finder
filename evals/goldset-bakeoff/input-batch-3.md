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

# INPUT — batch 3/4 (30 repos)

### ibmmaximorestjsonapis/maximorestclient
description: A Java-based driver API that establishes an authenticated HTTP session with a Maximo instance, allowing creation, update, delete, and query of Maximo business objects. It provides a set of APIs to consume the Maximo NextGen REST/JSON APIs.
killerFeature: Invoke action with properties for Resource
topics: (none)
readme:
# Updated

1. Added support to group by for ResourceSet
2. Added support to sync for ResourceSet
3. Added support to bulk for ResourceSet
4. Added new examples about new API in TestOSLCAPI.java.
5. Fixed bugs
6. Removed references to `javax.xml.bind.DatatypeConverter.printBase64Binary` because that API is not available on Android. It now uses commons-codec to get base64 support.

# Maximo Rest Client 1.0 Released!

1. Added support to arbitrary parameters for Resource/ResourceSet
2. Added support to arbitrary headers for get/post/patch/merge/delete
3. Added support to order by for ResourceSet
4. Added support to invoke action with properties for Resource
5. Added new examples about new API in TestOSLCAPI.java.
6. Fixed bugs

# I. Introduction
-----

The Maximo REST client library provides a set of driver APIs that can be consumed by a Java-based web component that wants to interface with a Maximo instance. The client APIs use the Maximo NextGen REST/JSON APIS, which were originally inspired by Linked Data principles. By using this API, you are able to create, update, delete, and query Maximo business objects by using Maximo integration framework object structures.

The following main components are included in this client library:
	
* [MaximoConnector (com.ibm.maximo.oslc.MaximoConnector)] - The driver API that establishes the authenticated HTTP session with the Maximo server. It is used by the other APIs to create, update, delete, and query Maximo data. The authentication an

### aws-samples/aws-service-catalog-terraform-reference-architecture
description: A Java-based solution that applies Terraform configurations using CloudFormation as a proxy Lambda function, enabling management of infrastructure-as-code deployments in AWS Service Catalog. Comparable to traditional Terraform workflows but optimized for use with Service Catalog.
killerFeature: Run Terraform configurations using CloudFormation through a proxy Lambda function
topics: management-tools, devops, servicecatalog
readme:
# Service Catalog Terraform Reference Architecture

## Solution Update

> **Note**
>
> AWS Service Catalog recently introduced support for [Terraform open source](https://aws.amazon.com/about-aws/whats-new/2023/04/aws-service-catalog-terraform-open-source/) so we recommend  users to use that instead. This sample will be deprecated in the future. More details on Service Catalog and Terraform open source can be found in the [documentation](https://docs.aws.amazon.com/servicecatalog/latest/adminguide/getstarted-Terraform.html).
>

Please see [README_OLD](https://github.com/aws-samples/aws-service-catalog-terraform-reference-architecture/blob/master/README_OLD.md) for the legacy README details.

### yahoo/elide
description: A Java library that lets you stand up a CRUD (Create, Read, Update, Delete) API for reading and manipulating models, as well as an analytic API for aggregating measures over zero or more model attributes. Supports features such as security controls, mobile-friendly APIs, atomicity for complex writes, filtering, sorting, pagination, and text search.
killerFeature: Setup model-driven GraphQL or JSON API with minimal effort
topics: json-api, java-library, java, jpa, hibernate-jpa, graphql, web, mobile, api-framework, elide, hacktoberfest, orm, hibernate, analytics, api, api-rest
readme:
# Elide

> _Opinionated APIs for web & mobile applications._

[](https://discord.com/widget?id=869678398241398854&theme=dark)
[](https://cd.screwdriver.cd/pipelines/6103)
[](https://maven-badges.herokuapp.com/maven-central/com.yahoo.elide/elide-core)
[](https://coveralls.io/github/yahoo/elide?branch=master)
[](https://github.com/akullpp/awesome-java)
[](https://github.com/chentsulin/awesome-graphql)

*Read this in other languages: [中文](translations/zh/README.md).*

## Table of Contents

- [Background](#background)
- [Documentation](#documentation)
- [Install](#install)
- [Usage](#usage)
- [Security](#security)
- [Contribute](#contribute)
- [License](#license)

## Background

[Elide](https://elide.io/) is a Java library that lets you setup model driven [GraphQL](http://graphql.org) or [JSON API](http://jsonapi.org) web service with minimal effort.  Elide supports two variants of APIs:

1. A CRUD (Create, Read, Update, Delete) API for reading and manipulating models.
2. An analytic API for aggregating measures over zero or more model attributes.

Elide supports a number of features:

### Security Comes Standard
Control access to fields and entities through a declarative, intuitive permission syntax.

### Mobile Friendly APIs
JSON-API & GraphQL lets developers fetch entire object graphs in a single round trip. Only requested elements of the data model are returned.
Our opinionated approach for mutations addresses common application scenarios:
* Create a new object and add it to 

### mui/mui-x
description: MUI X is a suite of advanced React UI components for building complex and data-rich applications. It includes the Data Grid, Date and Time Pickers, Charts, and Tree View. MUI X extends the core functionality of Material UI but can be fully customized to meet the needs of any design system.
killerFeature: Deploy data-rich applications with advanced React UI components for complex use cases
topics: react, data-grid, date-picker, date-range-picker, time-picker, charts, material-ui, datatable
readme:
<p align="center">
  <a href="https://mui.com/x/" rel="noopener" target="_blank"><img width="150" height="133" src="https://mui.com/static/logo.svg" alt="MUI X logo"></a>
</p>

<h1 align="center">MUI X</h1>

<div align="center">

[](https://github.com/mui/mui-x/blob/HEAD/LICENSE)
[](https://www.npmjs.com/package/@mui/x-data-grid)
[](https://www.npmjs.com/package/@mui/x-data-grid)
[](https://github.com/mui/mui-x/commits/HEAD/)
[](https://codecov.io/gh/mui/mui-x/)
[](https://x.com/MUI_X_)
[](https://github.com/mui/mui-x/issues/2081)
[](https://isitmaintained.com/project/mui/mui-x 'Average time to resolve an issue')
[](https://opencollective.com/mui-org)
[](https://www.bestpractices.dev/projects/6293)

</div>

[MUI X](https://mui.com/x/) is a suite of advanced React UI components for a wide range of complex use cases.
Each component provides best-in-class UX and DX, with sophisticated UX workflows for data-rich applications.
Components include the Data Grid, Date and Time Pickers, Charts, and Tree View.

MUI X extends the core functionality of [Material UI](https://github.com/mui/material-ui/), but the advanced components also stand on their own and can be fully customized to meet the needs of any design system.

MUI X is **open-core**: [Community](#community-plan) components are MIT-licensed and free forever, while more advanced features and components require a [Pro](#pro-plan) or [Premium](#premium-plan) commercial license.
See [Licensing](#licensing) for more information.

#

### rook/rook
description: Rook is an open source cloud-native storage orchestrator for Kubernetes that automates deployment and management of Ceph storage. It provides a platform, framework, and support for Ceph storage to natively integrate with Kubernetes, offering features like self-managing, self-scaling, and self-healing storage services.
killerFeature: Deploy self-managing, self-scaling, and self-healing Ceph storage services to Kubernetes
topics: storage, kubernetes, ceph, storage-cluster, docker, cloud-native, etcd, cncf
readme:
<img alt="Rook" src="Documentation/media/logo.svg" width="50%" height="50%">

[](https://www.cncf.io/projects)
[](https://github.com/rook/rook/releases)
[](https://hub.docker.com/u/rook)
[](https://goreportcard.com/report/github.com/rook/rook)
[](https://scorecard.dev/viewer/?uri=github.com/rook/rook)
[](https://bestpractices.coreinfrastructure.org/projects/1599)
[](https://github.com/rook/rook/actions/workflows/snyk.yaml)
[](https://slack.rook.io)
[](https://twitter.com/intent/follow?screen_name=rook_io&user_id=788180534543339520)

# What is Rook?

Rook is an open source **cloud-native storage orchestrator** for Kubernetes, providing the platform, framework, and support for Ceph storage to natively integrate with Kubernetes.

[Ceph](https://ceph.com/) is a distributed storage system that provides file, block and object storage and is deployed in large scale production clusters.

Rook automates deployment and management of Ceph to provide self-managing, self-scaling, and self-healing storage services.
The Rook operator does this by building on Kubernetes resources to deploy, configure, provision, scale, upgrade, and monitor Ceph.

The status of the Ceph storage provider is **Stable**. Features and improvements will be planned for many future versions. Upgrades between versions are provided to ensure backward compatibility between releases.

Rook is hosted by the [Cloud Native Computing Foundation](https://cncf.io) (CNCF) as a [graduated](https://www.cncf.io/announcements/2020

### jamstack/jamstack.org
description: (none)
killerFeature: (none)
topics: jamstack, serverless, static-site
readme:
# Jamstack

This is the repo for https://jamstack.org

An entry-point for learning about this architectural model. A place to learn what Jamstack is, for sharing tools, tips, examples and articles. This is also a place to find a local community meetup, or to seek support in starting one of your own.

## Contributing resources

We've collected a set of videos, presentations, articles and other learning resources about Jamstack. You can contribute content to that pool of resources!

We accept contributions submitted as [pull requests](https://github.com/jamstack/jamstack.org/pulls).

### Contribute links to resources

To contribute a link to a resource:

1. Create a new md file in the [`src/site/resources`](src/site/resources) folder with a unique and descriptive name. Populate that file according to the structure shown below.
1. For presentations and video, add an optional thumbnail image to the [`src/site/img/cms`](src/site/img/cms) folder. (Image should be a jpeg 600px wide and 400px tall)
1. Submit a pull request

_resource md reference:_
```yaml
---
title: Resource title
date: Publish date (YYYY-MM-DD)
link: the URL of this resource
thumbnailurl: /img/cms/resources/resource-thumbnail.jpg
type:
  - article (Help us group and sort the resources by type article|video|presentation)
---
```

Before submitting a pull request, or if you are suggesting/contributing code or content changes, it is wise to preview your change in a local build. We've tried to make the process of runni

### testcontainers/testcontainers-java
description: A Java library that supports JUnit tests, providing lightweight, throwaway instances of common databases, Selenium web browsers, or anything else that can run in a Docker container. Optimised for speed and ease of use, Testcontainers helps you write more effective integration tests.
killerFeature: Deploy complex test setups with a single JUnit test annotation
topics: java, docker, docker-compose, junit, test-automation, jvm, testing, hacktoberfest, integration-testing
readme:
# Testcontainers

[](https://app.netlify.com/sites/testcontainers/deploys)

[](https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=33816473&machine=standardLinux32gb&devcontainer_path=.devcontainer%2Fdevcontainer.json&location=EastUs)

[](https://ge.testcontainers.org/scans)

> Testcontainers is a Java library that supports JUnit tests, providing lightweight, throwaway instances of common databases, Selenium web browsers, or anything else that can run in a Docker container.

# [Read the documentation here](https://java.testcontainers.org)

## License

See [LICENSE](LICENSE).

## Copyright

Copyright (c) 2015 - 2021 Richard North and other authors.

MS SQL Server module is (c) 2017 - 2021 G DATA Software AG and other authors.

Hashicorp Vault module is (c) 2017 - 2021 Capital One Services, LLC and other authors.

See [contributors](https://github.com/testcontainers/testcontainers-java/graphs/contributors) for all contributors.

### grafana/loki
description: A Go-based, horizontally-scalable log aggregation system inspired by Prometheus. Loki stores compressed logs and indexes metadata using the same labels as Prometheus, making it a cost-effective alternative for storing Kubernetes Pod logs and querying them in Grafana.
killerFeature: Deploy log aggregation with zero indexing costs
topics: loki, grafana, prometheus, logging, cloudnative, hacktoberfest
readme:
<p align="center"><img src="docs/sources/logo_and_name.png" alt="Loki Logo"></p>

<a href="https://github.com/grafana/loki/actions/workflows/check.yml"><img src="https://github.com/grafana/loki/actions/workflows/check.yml/badge.svg" alt="Check" /></a>
<a href="https://goreportcard.com/report/github.com/grafana/loki"><img src="https://goreportcard.com/badge/github.com/grafana/loki" alt="Go Report Card" /></a>
<a href="https://slack.grafana.com/"><img src="https://img.shields.io/badge/join%20slack-%23loki-brightgreen.svg" alt="Slack" /></a>
[](https://bugs.chromium.org/p/oss-fuzz/issues/list?sort=-opened&can=1&q=proj:loki)

# Loki: like Prometheus, but for logs.

Loki is a horizontally-scalable, highly-available, multi-tenant log aggregation system inspired by [Prometheus](https://prometheus.io/).
It is designed to be very cost effective and easy to operate.
It does not index the contents of the logs, but rather a set of labels for each log stream.

Compared to other log aggregation systems, Loki:

- does not do full text indexing on logs. By storing compressed, unstructured logs and only indexing metadata, Loki is simpler to operate and cheaper to run.
- indexes and groups log streams using the same labels you’re already using with Prometheus, enabling you to seamlessly switch between metrics and logs using the same labels that you’re already using with Prometheus.
- is an especially good fit for storing [Kubernetes](https://kubernetes.io/) Pod logs. Metadata such as Pod label

### passbolt/passbolt_api
description: The open source Passbolt Community Edition (CE) API is a security-first, JSON API for the open source password manager for teams. It helps organizations centralize, organize and share passwords and secrets securely using user-owned secret keys and end-to-end encryption.
killerFeature: Run secure password manager for teams with zero config changes
topics: password-manager, passbolt, security, cakephp, productivity, php, credentials, password, cakephp5
readme:
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/passbolt/passbolt_styleguide/blob/master/src/img/logo/logo_white.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://github.com/passbolt/passbolt_styleguide/blob/master/src/img/logo/logo.svg">
  <img alt="passbolt-logo" src="https://github.com/passbolt/passbolt_styleguide/blob/master/src/img/logo/logo.svg">
</picture>
<br>
<br>

The open source password manager for teams.

[](LICENSE.txt)
[](https://github.com/phpstan/phpstan)
[](https://psalm.dev/)

<details open="open">
<summary>Table of Contents</summary>

- [Introducing Passbolt](#introducing-passbolt)
- [Get Started](#get-started)
  - [Run it on your own server, natively](#run-it-on-your-own-server-natively)
- [Available Clients & Apps](#available-clients-and-apps)
  - [Browser Extensions](#browser-extensions)
  - [Mobile Apps](#mobile-apps)
  - [CLI](#cli)
  - [Desktop App](#desktop-app)
- [Contributing](#contributing)
- [Reporting a security issue](#reporting-a-security-issue)
- [License](#license)

</details>

---
<br>

# Introducing Passbolt

Passbolt is a security-first, open source password manager for teams. It helps organizations centralize, organize and share passwords and secrets securely.

What makes passbolt different?
- **Security:** Passbolt security model features user-owned secret keys and end-to-end encryption. It is audited multiple times annually, and [findings](https://help.passbolt.com/faq/security/c

### abstractinfrastructure/k8s-intro-tutorials
description: A set of interactive tutorials that introduce the basics of Kubernetes, including cluster management, application workloads, storage, configuration, and more. Utilizing kind, a tool for running a single instance of Kubernetes locally using Docker. Validated against kind v0.14.0 and kubectl 1.24.0.
killerFeature: Deploy scalable and resilient applications on local Kubernetes clusters
topics: kubernetes, minikube, tutorial
readme:
# Kubernetes Tutorials

## Before you begin

These tutorials accompany the presentation [Introduction to Kubernetes][intro-slides]  and make use of
[kind][kind]. A tool that allows users to quickly spin up and run a single instance of Kubernetes locally using
Docker. To install it and the other tutorial dependencies, see the
[Installation Guides](#installation-guides) section.

Each section assumes an instance of kind is up and running. To start kind for the first time, use the command:
```
kind create cluster
```

Tutorials have been validated against kind v0.14.0 running Kubernetes v1.24.x and kubectl 1.24.0

---

## Tutorial Index
* [cli](/cli/README.md) - Covers the basics of using `kubectl` to interact with a Kubernetes cluster.
* [core](/core/README.md) - Tutorial of the core concepts, or building blocks of Kubernetes.
* [workloads](/workloads/README.md) - Walkthrough of the different types of application workloads.
* [storage](/storage/README.md) - Explores the relationship between Persistent Volumes, Persistent Volume Claims,
and Volumes themselves.
* [configuration](/configuration/README.md) - Tutorials going over how to use the two Configuration objects
ConfigMaps and Secrets.
* [Examples](/examples/README.md) - Examples of full blown applications to explore after the tutorials have been
completed.

---

## Installation Guides

The Installation guides are centered around using Docker. Please ensure you have Docker installed by following
their [installation guide](ht

### podman-container-tools/skopeo
description: A command-line utility that performs various operations on container images and image repositories, including copying, inspecting, deleting, syncing, and authenticating. Supports OCI images, Docker v2 images, and various registries and storage mechanisms.
killerFeature: Copy images from one registry to another without requiring privilege
topics: (none)
readme:
<p align="center">
   <img src="https://cdn.rawgit.com/containers/skopeo/main/docs/skopeo.svg" width="250" alt="Skopeo">
</p>

----

[](https://www.bestpractices.dev/projects/10516)

`skopeo` is a command line utility that performs various operations on container images and image repositories.

`skopeo` does not require the user to be running as root to do most of its operations.

`skopeo` does not require a daemon to be running to perform its operations.

`skopeo` can work with [OCI images](https://github.com/opencontainers/image-spec) as well as the original Docker v2 images.

Skopeo works with API V2 container image registries such as [docker.io](https://docker.io) and [quay.io](https://quay.io) registries, private registries, local directories and local OCI-layout directories. Skopeo can perform operations which consist of:

 * Copying an image from and to various storage mechanisms.
   For example you can copy images from one registry to another, without requiring privilege.
 * Inspecting a remote image showing its properties including its layers, without requiring you to pull the image to the host.
 * Deleting an image from an image repository.
 * Syncing an external image repository to an internal registry for air-gapped deployments.
 * When required by the repository, skopeo can pass the appropriate credentials and certificates for authentication.

 Skopeo operates on the following image and repository types:

 * containers-storage:docker-reference
         An image l

### googleworkspace/google-docs-hast
description: A TypeScript library that converts the JSON representation of a Google Docs document into an HTML abstract syntax tree (HAST), which can be serialized to HTML or converted to Markdown. This allows developers to work with Google Docs content programmatically and integrate it with other tools and services.
killerFeature: Convert Google Docs documents to HAST for further processing or rendering
topics: google-docs, google-workspace, hast, rehype, unist
readme:
[](https://www.npmjs.com/package/@googleworkspace/google-docs-hast)
[](https://github.com/googleworkspace/google-docs-hast/actions/workflows/test.yml)

[](https://googleworkspace.github.io/google-docs-hast/)

## Description

Converts the JSON representation of a Google Docs document into an [HTML abstract syntax tree (HAST)](https://github.com/syntax-tree/hast) which can be serialized to HTML or converted to Markdown.

> **Note:** This library does **not** intend to match the rendering by Google Docs.

## Install

Install using NPM or similar.

```sh
npm i @googleworkspace/google-docs-hast
```

## Usage

```js
import { toHast } from "@googleworkspace/google-docs-hast";

// Retrieve document from API, https://developers.google.com/docs/api
const doc = ...;

// Convert the document to an HTML AST.
const tree = toHast(doc);
```

To get the serialized representation of the HTML AST, use the [rehype-stringify](https://www.npmjs.com/package/rehype-stringify) package.

```js
import { unified } from "unified";
import rehypeStringify from "rehype-stringify";

// Convert the document to an HTML string.
const html = unified()
  .use(rehypeStringify, { collapseEmptyAttributes: true })
  .stringify(tree);
```

### Images

All `<img>` elements should be post-processed as the `src` attribute is only valid for a short time and is of the pattern `https://lh6.googleusercontent.com/...`.

```js
import { visit } from "unist-util-visit";

visit(tree, (node) => {
  if (node.type === "element" && n

### mswjs/msw
description: A TypeScript library that allows you to intercept requests using Express-like routing syntax, providing seamless API mocking for JavaScript applications.
killerFeature: Request the same production resources and test the actual behavior of your app.
topics: msw, mock, mocking-framework, service-worker, mock-service-worker, mocking, mocking-library, api-mocking, devtools, api, mswjs
readme:
<br />

<p align="center">
  <img src="media/msw-logo.svg" width="100" alt="The Mock Service Worker logo" />
</p>

<h1 align="center">Mock Service Worker</h1>
<p align="center">Industry standard API mocking for JavaScript.</p>

<p align="center">
   <a href="https://kettanaito.com/discord" target="_blank">Join our Discord server</a>
</p>

<br />
<br />

## Features

- **Seamless**. A dedicated layer of requests interception at your disposal. Keep your application's code and tests unaware of whether something is mocked or not.
- **Deviation-free**. Request the same production resources and test the actual behavior of your app. Augment an existing API, or design it as you go when there is none.
- **Familiar & Powerful**. Use [Express](https://github.com/expressjs/express)-like routing syntax to intercept requests. Use parameters, wildcards, and regular expressions to match requests, and respond with necessary status codes, headers, cookies, delays, or completely custom resolvers.

---

> "_I found MSW and was thrilled that not only could I still see the mocked responses in my DevTools, but that the mocks didn't have to be written in a Service Worker and could instead live alongside the rest of my app. This made it silly easy to adopt. The fact that I can use it for testing as well makes MSW a huge productivity booster._"
>
> — [Kent C. Dodds](https://twitter.com/kentcdodds)

## Documentation

This README will give you a brief overview of the library, but there's no better place

### kevinswiber/siren
description: Siren is a structured interface for representing entities, allowing clients to navigate and manipulate data using hyperlinks. It defines a JSON-based media type (`application/vnd.siren+json`) for serializing entity representations.
killerFeature: Represent entities as hypermedia resources
topics: (none)
readme:
# Siren: a hypermedia specification for representing entities

[](https://zenodo.org/badge/latestdoi/4917422)

Your input is appreciated.  Feel free to file a GitHub Issue, a Pull Request, or contact us.  Thank you!

- [Official Siren Google Group](https://groups.google.com/forum/#!forum/siren-hypermedia)
- Kevin on Twitter [@kevinswiber](https://twitter.com/kevinswiber)

## Example

Below is a JSON Siren example of an order, including sub-entities.  The first sub-entity, a collection of items associated with the order, is an embedded link.  Clients may choose to automatically resolve linked sub-entities.  The second sub-entity is an embedded representation of customer information associated with the order.  The example also includes an action to add items to the order and a set of links to navigate through a list of orders.

The media type for JSON Siren is `application/vnd.siren+json`.

```json
{
  "class": [ "order" ],
  "properties": { 
      "orderNumber": 42, 
      "itemCount": 3,
      "status": "pending"
  },
  "entities": [
    { 
      "class": [ "items", "collection" ], 
      "rel": [ "http://x.io/rels/order-items" ], 
      "href": "http://api.x.io/orders/42/items"
    },
    {
      "class": [ "info", "customer" ],
      "rel": [ "http://x.io/rels/customer" ], 
      "properties": { 
        "customerId": "pj123",
        "name": "Peter Joseph"
      },
      "links": [
        { "rel": [ "self" ], "href": "http://api.x.io/customers/pj123" }
      ]
    }
  ],


### stoplightio/spectral
description: A TypeScript-based JSON/YAML linter for creating automated style guides, with built-in support for OpenAPI (v3.1, v3.0, and v2.0), Arazzo v1.0, and AsyncAPI v2.x. Create custom rulesets or use ready-to-use functions to improve consistency across all your APIs.
killerFeature: Validate OpenAPI v2 & v3.x, AsyncAPI, and Arazzo v1 Documents with Custom Rulesets
topics: json-schema, jsonpath, openapi, openapi3, oasv3, oas, openapi-specification, json-lint, json, linting, swagger, hacktoberfest, arazzo, stoplight-oss, stoplight-spectral, swagger-oss
readme:
[](https://stoplight.io/api-governance?utm_source=github&utm_medium=spectral&utm_campaign=readme)
[](https://circleci.com/gh/stoplightio/spectral) [](https://www.npmjs.com/package/@stoplight/spectral-core) [][stoplight_forest]

- **Custom Rulesets**: Create custom rules to lint JSON or YAML objects
- **Ready-to-use Rulesets**: Validate and lint **OpenAPI v2 & v3.x**, **AsyncAPI**, and **Arazzo v1** Documents
- **API Style Guides**: Automated [API Style Guides](https://stoplight.io/api-style-guides-guidelines-and-best-practices?utm_source=github.com&utm_medium=referral&utm_campaign=github_repo_spectral) using rulesets improve consistency across all your APIs
- **Ready-to-use Functions**: Built-in set of functions to help [create custom rules](https://meta.stoplight.io/docs/spectral/e5b9616d6d50c-custom-rulesets#adding-rules). Functions include pattern checks, parameter checks, alphabetical ordering, a specified number of characters, provided keys are present in an object, etc.
- **Custom Functions**: Create custom functions for advanced use cases

# Overview

- [🧰 Installation](#-installation)
- [💻 Usage](#-usage)
- [📖 Documentation](#-documentation)
- [ℹ️ Support](#ℹ️-support)
- [🌎 Real-World Rulesets](#-real-world-rulesets)
- [⚙️ Integrations](#️-integrations)
- [👏 Contributing](#-contributing)
- [🌲 Sponsor Spectral by Planting a Tree](#-sponsor-spectral-by-planting-a-tree)

## 🧰 Installation

The easiest way to install spectral is to use either [npm](https://www.npmjs.com/)

### dependency-check/DependencyCheck
description: A Java-based Software Composition Analysis (SCA) tool that determines if there is a Common Platform Enumeration (CPE) identifier for a given dependency, generating a report linking to associated CVE entries.
killerFeature: Detect publicly disclosed vulnerabilities in application dependencies
topics: security-audit, build-tool, maven-plugin, jenkins-plugin, gradle-plugin, vulnerability-detection, security, ant-task, software-composition-analysis
readme:
[](https://mvnrepository.com/artifact/org.owasp/dependency-check-maven) [](https://github.com/dependency-check/DependencyCheck/actions/workflows/build.yml) [](https://bestpractices.coreinfrastructure.org/projects/843) [](https://www.apache.org/licenses/LICENSE-2.0.txt)

[](https://www.blackhat.com/us-18/arsenal.html#jeremy-long) [](https://www.blackhat.com/us-15/arsenal.html#jeremy-long) [](https://www.blackhat.com/us-14/arsenal.html#Long) [](https://www.blackhat.com/us-13/arsenal.html#Long)

# Dependency-Check

Dependency-Check is a Software Composition Analysis (SCA) tool that attempts to detect publicly disclosed vulnerabilities contained within a project's dependencies. It does this by determining if there is a Common Platform Enumeration (CPE) identifier for a given dependency. If found, it will generate a report linking to the associated CVE entries.

Documentation and links to production binary releases can be found on the [github pages](https://dependency-check.github.io/DependencyCheck). Additionally, more information about the architecture and ways to extend dependency-check can be found on the [wiki].

## Notice

This product uses the NVD API but is not endorsed or certified by the NVD.

## Mandatory Upgrade to 12.1.0+

Due to NVD API compatibility changes, an upgrade is mandatory. See [#7463](https://github.com/dependency-check/DependencyCheck/issues/7463) for more information.

## Breaking Changes in 11.0.0

- Java 11 is now required to run dependency-check `11.0

### d-x90/asp-dotnet-core-api
description: A template project for Asp.Net Core REST APIs, providing environment setup and PostgreSQL database management through Docker-Compose. Includes tools for entity framework database updates and user-secret configuration.
killerFeature: Create a new Asp.Net Core API project with environment setup
topics: (none)
readme:
# Asp-Dotnet-Core-Api

Template project for Asp.Net core REST api

Environment setup:

> docker-compose up

Connect to the postgres DB and create new user

sql> create user db_user with encrypted password 'password' createdb;

> dotnet ef database update (If ef not installed: dotnet tool install --global dotnet-ef)

User secrets:

> dotnet user-secrets set "DB_UserID" "username"
> dotnet user-secrets set "DB_Password" "password"
> dotnet user-secrets set "JWT_Key" "long secure jwt key"

### PacktPublishing/Keycloak-Identity-and-Access-Management-for-Modern-Applications
description: Keycloak: Identity and Access Management for Modern Applications, published by Packt, covers implementing authentication and authorization using Keycloak, OpenID Connect, and OAuth 2.0 protocols. The book provides instructions on installing, configuring, and managing Keycloak, securing applications, and understanding the basics of OAuth 2.0 and OpenID Connect.
killerFeature: Secure applications with Keycloak's open-source identity management solution
topics: (none)
readme:
# Keycloak - Identity and Access Management for Modern Applications

<a href="https://www.packtpub.com/product/keycloak-identity-and-access-management-for-modern-applications/9781800562493?utm_source=github&utm_medium=repository&utm_campaign=9781800562493"><img src="https://static.packt-cdn.com/products/9781800562493/cover/smaller" alt="Keycloak - Identity and Access Management for Modern Applications" height="256px" align="right"></a>

This is the code repository for [Keycloak - Identity and Access Management for Modern Applications](https://www.packtpub.com/product/keycloak-identity-and-access-management-for-modern-applications/9781800562493?utm_source=github&utm_medium=repository&utm_campaign=9781800562493), published by Packt.

**Harness the power of Keycloak, OpenID Connect, and OAuth 2.0 protocols to secure applications**

## What is this book about?
Implementing authentication and authorization for applications can be a daunting experience, often leaving them exposed to security vulnerabilities. Keycloak is an open-source solution for identity management and access management for modern applications.

This book covers the following exciting features: 
* Understand how to install, configure, and manage Keycloak
* Secure your new and existing applications with Keycloak
* Gain a basic understanding of OAuth 2.0 and OpenID Connect
* Understand how to configure Keycloak to make it ready for production use
* Discover how to leverage additional features and how to customize K

### pytest-dev/pytest-testinfra
description: A Python plugin for Pytest that allows you to write unit tests to test the actual state of servers configured by management tools like Salt, Ansible, Puppet, and Chef. Written as a Serverspec equivalent in Python.
killerFeature: Run unit tests to verify actual server state
topics: python, testing, infrastructure-as-code, devops, tdd, nagios, docker, tdd-utilities, testing-tools, devops-tools, infrastructure-testing, saltstack, chef, puppet, ansible, kubernetes, pytest-plugin
readme:
##################################
Testinfra test your infrastructure
##################################

Latest documentation: https://testinfra.readthedocs.io/en/latest

.. important::

   **Maintenance Notice**

   This project is currently **not actively maintained**, and responses
   to issues or pull requests may be delayed for **several months**.
   Please consider this when using the project and feel free to
   contribute via pull requests, which will be reviewed as time permits.
   Thank you for your understanding!

About
=====

With Testinfra you can write unit tests in Python to test *actual state* of
your servers configured by management tools like Salt_, Ansible_, Puppet_,
Chef_ and so on.

Testinfra aims to be a Serverspec_ equivalent in python and is written as
a plugin to the powerful Pytest_ test engine

License
=======

`Apache License 2.0 <https://github.com/pytest-dev/pytest-testinfra/blob/main/LICENSE>`_

The logo is licensed under the `Creative Commons NoDerivatives 4.0 License <https://creativecommons.org/licenses/by-nd/4.0/>`_
If you have some other use in mind, contact us.

Quick start
===========

Install testinfra using pip::

    $ pip install pytest-testinfra

    # or install the devel version
    $ pip install 'git+https://github.com/pytest-dev/pytest-testinfra@main#egg=pytest-testinfra'

Write your first tests file to `test_myinfra.py`:

.. code-block:: python

    def test_passwd_file(host):
        passwd = host.file("/etc/passwd")
        as

### google/gvisor
description: gVisor provides a Linux-like interface written in Go, implementing an Open Container Initiative (OCI) runtime called `runsc` that integrates with Docker and Kubernetes. It offers a distinct third approach to isolation, providing security benefits similar to VMs while maintaining the efficiency and flexibility of regular userspace applications.
killerFeature: Run sandboxed containers with strong isolation from host OS
topics: sandbox, containers, oci, docker, kubernetes, linux, kernel
readme:
[](https://buildkite.com/gvisor/pipeline)
[](https://github.com/google/gvisor/actions/workflows/issue_reviver.yml)
[](https://github.com/google/gvisor/actions/workflows/codeql.yml)
[](https://gitter.im/gvisor/community)
[](https://cs.opensource.google/gvisor/gvisor)

## What is gVisor?

**gVisor** provides a strong layer of isolation between running applications and
the host operating system. It is an application kernel that implements a
[Linux-like interface][linux]. Unlike Linux, it is written in a memory-safe
language (Go) and runs in userspace.

gVisor includes an [Open Container Initiative (OCI)][oci] runtime called `runsc`
that makes it easy to work with existing container tooling. The `runsc` runtime
integrates with Docker and Kubernetes, making it simple to run sandboxed
containers.

## What **isn't** gVisor?

*   gVisor is **not a syscall filter** (e.g. `seccomp-bpf`), nor a wrapper over
    Linux isolation primitives (e.g. `firejail`, AppArmor, etc.).
*   gVisor is also **not a VM** in the everyday sense of the term (e.g.
    VirtualBox, QEMU).

**gVisor takes a distinct third approach**, providing many security benefits of
VMs while maintaining the lower resource footprint, fast startup, and
flexibility of regular userspace applications.

## Why does gVisor exist?

Containers are not a [**sandbox**][sandbox]. While containers have
revolutionized how we develop, package, and deploy applications, using them to
run untrusted or potentially malicious code without addit

### orbitbot/chrome-extensions-examples
description: A repository containing all Chrome Extension examples, scraped from the official samples page. Primary language is JavaScript, with topics focusing on browser extensions and extension development. The repository aims to provide a convenient way to browse and potentially edit the examples, with resources available for understanding browser support and incompatibilities.
killerFeature: Access Chrome Extension examples for easier browsing and editing
topics: chrome-extension, browser-extension, extension, extensions, javascript
readme:
**This is not an official mirror of the Chrome extension examples. Report any issues with the examples themselves to Google's issue trackers/forums.**

**There is an ongoing effort to standardize the Extensions on different browsers, as [discussed on MDN](https://developer.mozilla.org/en-US/Add-ons/WebExtensions) and defined in the [WebExtensions Spec Draft](https://browserext.github.io/browserext/). The resources on [browser support](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Browser_support_for_JavaScript_APIs) and [incompatibilities](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Chrome_incompatibilities) may be of interest.**

chrome-extensions-examples
==========================

The [Chrome Extensions examples](http://developer.chrome.com/extensions/samples) did not
exist as a Git repository, and browsing both the samples page and the VCViewer did not seem particularly
handy. So, I decided to scrape the content into this repository for easier browsing and (possible)
editing.

**UPDATE:** Google have posted their own repository for Chrome extensions here: https://github.com/GoogleChrome/chrome-extensions-samples

If you would like to clone a part of this repository, use git
[sparse checkouts](http://jasonkarns.com/blog/subdirectory-checkouts-with-git-sparse-checkout/).

You can find the scraper used to generate this repository (except for a `git init` and push)
on [github](https://github.com/orbitbot/chrome-extension-scraper).

Content is licens

### kudobuilder/kudo
description: A Go-based framework, KUDO provides a declarative approach to building production-grade Kubernetes Operators covering the entire application lifecycle. It allows you to manage and maintain complex stateful applications running in Kubernetes clusters.
killerFeature: Run your custom Kubernetes Operators with a declarative approach to building production-grade solutions
topics: kubernetes, cncf, kubernetes-operator, kubernetes-controller, kafka, mysql, zookeeper, operator, sdk, crd, kudo, kubernetes-community, maestro, cluster, hacktoberfest
readme:
# KUDO

<img src="https://kudo.dev/images/kudo_horizontal_color@2x.png" srcset="https://kudo.dev/images/kudo_horizontal_color@2x.png 2x" width="256">

[](https://circleci.com/gh/kudobuilder/kudo)

Kubernetes Universal Declarative Operator (KUDO) provides a declarative approach to building production-grade Kubernetes Operators covering the entire application lifecycle.

## Getting Started

Please refer to the [getting started guide](https://kudo.dev/docs/) documentation.

## Resources

* Slack Channel: [#kudo](https://kubernetes.slack.com/archives/CG3HTFCMV)
* Google Group: [kudobuilder@googlegroups.com](https://groups.google.com/forum/#!forum/kudobuilder)
* Planned Work: [Sprint Dashboard](https://github.com/orgs/kudobuilder/projects/1)

## Community Meetings

We have open community meetings every 2 weeks on Thursday at 9:00 a.m. PT. (17:00 UTC)

* [Agenda and Notes](https://docs.google.com/document/d/1UqgtCMUHSsOohZYF8K7zX8WcErttuMSx7NbvksIbZgg)
* [Zoom Meeting](https://d2iq.zoom.us/j/443128842)

## Community, Events, Discussion, Contribution, and Support

Learn more on how to engage with the KUDO community on the [community page](https://kudo.dev/community/).

## Getting Involved

* Read the [code of conduct](code-of-conduct.md)
* Read the [contribution guide](CONTRIBUTING.md)
* Details on running and debugging locally read [development guide](development.md)

### anliksim/maven-template-bom
description: A Maven multi-module project template that uses a BOM to manage project dependencies, allowing for easy version management and parent-child relationships between modules. This template provides a simple structure with an aggregator pom.xml file and multiple module folders, each with its own pom.xml file.
killerFeature: Manage project dependencies using a bill of materials
topics: (none)
readme:
# Maven BOM Template

Template/example for multi-module maven projects that use and provide a bill of materials to manage project dependencies.

## Structure

    maven-template-bom
    ├── bom
    │   └── pom.xml (no parent)
    ├── module1
    │   ├── pom.xml
    │   └── src
    ├── module2
    │   ├── pom.xml
    │   └── src
    ├── pom.xml (aggregator)

The structure is simple. Every submodule is part of the aggregator, however, the `bom` module does (and must not) use a parent.

The project's own versions are handled by importing the BOM on the parent/top level. As a result `module2` does not have to set a version for it's declared dependency on `module1`. All internal versions will be taken from the BOM and resolve to `${project.version}`.

### Why bother

Why to use a BOM should be obvious. The approach described on the [Introduction to dependency mechanism](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html) is fine if you (or your organization) don't use a "super" parent pom. 

The setup I use is meant to provide a solution that works with plugins used for version manipulation and allows the use of a parent on the top-level pom.

#### Versions plugin

When using the versions plugin it's important to process all modules, as the `bom` module would be skipped otherwise as there is no parent-child relation. Please note this option is only available from version 2.5.

    mvn versions:set -DnewVersion=1.1-SNAPSHOT -DprocessAllModules=tr

### jenkinsci/warnings-ng-plugin
description: A Java plugin for Jenkins that collects and visualizes compiler warnings, static analysis issues, and other code quality metrics. Supports over a hundred report formats and provides detailed reports on issue distribution, severity, and trends.
killerFeature: Visualize compiler warnings and static analysis issues for Jenkins builds
topics: static-analysis, jenkins-plugin, static-code-analysis, error-prone, spotbugs, findbugs, checkstyle, pmd, jenkins-warnings, jenkins, hacktoberfest
readme:
# Jenkins Warnings Next Generation Plugin

[](https://gitter.im/jenkinsci/warnings-plugin?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[](https://plugins.jenkins.io/warnings-ng)
[](https://github.com/jenkinsci/warnings-ng-plugin/actions)

The Jenkins Next Generation Warnings plugin collects compiler warnings or issues reported by static analysis tools and visualizes the results. It has built-in support for more than a hundred [report formats](SUPPORTED-FORMATS.md). 
Among the problems it can detect:
- errors from your compiler (C, C#, Java, etc.)
- warnings from a static analysis tool (CheckStyle, StyleCop, SpotBugs, etc.)
- duplications from a copy-and-paste detector (CPD, Simian, etc.)
- vulnerabilities
- open tasks in comments of your source files

The plugin publishes a report of the issues found in your build, so you can navigate to a summary report from the main build page. From there you can also dive into the details: 
- distribution of new, fixed and outstanding issues
- distribution of the issues by severity, category, type, module, or package
- list of all issues including helpful comments from the reporting tool
- annotated source code of the affected files
- trend charts of the issues over time

This code of this plugin is also available as a standalone GitHub or GitLab action that runs without Jenkins now:
- [Quality Monitor GitHub Action](https://github.com/uhafner/quality-monitor): action that monitors the quality of projects base

### fossology/fossology
description: A PHP-based open source toolkit for license compliance. Run scans from the command line, deduplicate results, and generate SPDX files or READMEs with copyrights notices. Supports PostgreSQL as the database server and Apache HTTP Server 2.4+ as the web server.
killerFeature: Run license, copyright, and export control scans from the command line
topics: fossology, spdx, license-management, license, compliance, oss, license-checking, license-scan, compliance-check, compliance-automation, spdx-licenses
readme:
# FOSSology

[](https://gitpod.io/#https://github.com/fossology/fossology)
[](LICENSE)
[](https://bestpractices.coreinfrastructure.org/projects/2395)
[](https://coveralls.io/github/fossology/fossology?branch=master)
[](https://join.slack.com/t/fossology/shared_invite/enQtNzI0OTEzMTk0MjYzLTYyZWQxNDc0N2JiZGU2YmI3YmI1NjE4NDVjOGYxMTVjNGY3Y2MzZmM1OGZmMWI5NTRjMzJlNjExZGU2N2I5NGY)
[](https://github.com/fossology/fossology/releases/latest)
[](https://www.youtube.com/channel/UCZGPJnQZVnEPQWxOuNamLpw)
[](https://api.reuse.software/info/github.com/fossology/fossology)

## About

FOSSology is an open source license compliance software system and toolkit. As a toolkit, you can run license, copyright, and export control scans from the command line. As a system, a database and web UI are provided to give you a compliance workflow. In one click you can generate an SPDX file or a ReadMe with all the copyrights notices from your software. FOSSology deduplication means that you can scan an entire distro, rescan a new version, and only the changed files will get rescanned. This is a big time saver for large projects.

[Check out Who Uses FOSSology!](https://www.fossology.org)

FOSSology does not give legal advice.
https://fossology.org/

## Requirements

The PHP versions 7.3 and later are supported to work for FOSSology. FOSSology requires PostgreSQL as the database server and Apache HTTP Server 2.4+ as the web server. These and more dependencies are installed by `utils/fo-installdeps`.

To inst

### kudobuilder/kuttl
description: A Go library providing a declarative approach to test Kubernetes Operators, with the ability to extend to testing any Kubernetes objects. Comparable to traditional unit testing but optimized for complex operator workflows and scalability.
killerFeature: Run declarative tests for Kubernetes Operators without writing code
topics: kubernetes, testing, operators, kudo, operator-sdk, hacktoberfest
readme:
# KUTTL

<img src="docs/images/kuttl-horizontal-logo.png" width="256">

[](https://github.com/kudobuilder/kuttl/actions)
[](https://github.com/kudobuilder/kuttl/actions)
[](https://github.com/kudobuilder/kuttl/actions)
[](https://goreportcard.com/report/github.com/kudobuilder/kuttl)  

KUbernetes Test TooL (KUTTL) provides a declarative approach to test Kubernetes Operators.

KUTTL is designed for testing operators, however it can declaratively test any kubernetes objects.

## Getting Started

Please refer to the [getting started guide](docs/README.md) documentation.

## Resources

Initially Built under the KUDO project, we continue to use that channel for KUTTL.

* Slack Channel: [#kudo](https://kubernetes.slack.com/archives/CG3HTFCMV)
* Google Group: [kudobuilder@googlegroups.com](https://groups.google.com/forum/#!forum/kudobuilder)

## Contributions

Please read the [contributing guide](CONTRIBUTING.md) for details around:

1. Code of Conduct
1. Code Culture
1. Details on how to contribute

### ohmyzsh/ohmyzsh
description: A community-driven framework for managing zsh configuration, including 300+ optional plugins, 140+ themes, and an auto-update tool. Optimized for speed on large codebases.
killerFeature: Deploy oh-my-zsh plugins with zero config changes
topics: shell, zsh-configuration, theme, terminal, productivity, zsh, cli, cli-app, themes, plugins, plugin-framework, oh-my-zsh, ohmyzsh, oh-my-zsh-theme, oh-my-zsh-plugin
readme:
<p align="center"><img src="https://ohmyzsh.s3.amazonaws.com/omz-ansi-github.png" alt="Oh My Zsh"></p>

Oh My Zsh is an open source, community-driven framework for managing your [zsh](https://www.zsh.org/)
configuration.

Sounds boring. Let's try again.

**Oh My Zsh will not make you a 10x developer...but you may feel like one.**

Once installed, your terminal shell will become the talk of the town _or your money back!_ With each keystroke
in your command prompt, you'll take advantage of the hundreds of powerful plugins and beautiful themes.
Strangers will come up to you in cafés and ask you, _"that is amazing! are you some sort of genius?"_

Finally, you'll begin to get the sort of attention that you have always felt you deserved. ...or maybe you'll
use the time that you're saving to start flossing more often. 😬

To learn more, visit [ohmyz.sh](https://ohmyz.sh), follow [@ohmyzsh](https://x.com/ohmyzsh) on X (formerly
Twitter), and join us on [Discord](https://discord.gg/ohmyzsh).

[](https://github.com/ohmyzsh/ohmyzsh/actions?query=workflow%3ACI)
[](https://www.bestpractices.dev/projects/10713)
[](https://twitter.com/intent/follow?screen_name=ohmyzsh)
[](https://mstdn.social/@ohmyzsh)
[](https://discord.gg/ohmyzsh)

<details>
<summary>Table of Contents</summary>

- [Getting Started](#getting-started)
  - [Operating System Compatibility](#operating-system-compatibility)
  - [Prerequisites](#prerequisites)
  - [Basic Installation](#basic-installation)
    - [Manual Inspection

### gardener/gardener
description: Gardener implements the automated management and operation of Kubernetes clusters as a service, providing a fully validated extensibility framework for creating homogeneous clusters on all supported infrastructures. It exposes its own Cluster API to create clusters with exactly the same bill of material, configuration, and behavior on all supported infrastructures.
killerFeature: Create homogeneous clusters on any infrastructure using hosted control planes
topics: kubernetes, gardener, golang, cluster, extensibility, controller, k8s, hcp, kubernetes-cluster, kubernetes-in-kubernetes, hosted-control-planes, k8s-in-k8s, hosted-controlplanes
readme:
# [Gardener](https://gardener.cloud)

[](https://api.reuse.software/info/github.com/gardener/gardener)
[](https://github.com/gardener/gardener/actions/workflows/non-release.yaml)
[](https://gardener-cloud.slack.com/)
[](https://goreportcard.com/report/github.com/gardener/gardener)
[](https://godoc.org/github.com/gardener/gardener)
[](https://bestpractices.coreinfrastructure.org/projects/1822)

Gardener implements the automated management and operation of [Kubernetes](https://kubernetes.io/) clusters as a service and provides a fully validated extensibility framework that can be adjusted to any programmatic cloud or infrastructure provider.

Gardener is 100% Kubernetes-native and exposes its own Cluster API to create homogeneous clusters on all supported infrastructures. This API differs from [SIG Cluster Lifecycle](https://github.com/kubernetes/community/tree/master/sig-cluster-lifecycle)'s [Cluster API](https://github.com/kubernetes-sigs/cluster-api#cluster-api) that only harmonizes how to get to clusters, while [Gardener's Cluster API](./docs/api-reference/core.md#shoot) goes one step further and also harmonizes the make-up of the clusters themselves. That means, Gardener gives you homogeneous clusters with exactly the same bill of material, configuration and behavior on all supported infrastructures, which you can see further down below in the section on our K8s Conformance Test Coverage.

In 2020, SIG Cluster Lifecycle's Cluster API made a huge step forward with [`v1alpha

### badges/shields
description: A JavaScript library that generates concise, consistent, and legible SVG and raster format badges. Supports dozens of continuous integration services, package registries, distributions, app stores, social networks, code coverage services, and code analysis services.
killerFeature: Deploy customizable, legible badges for GitHub readmes or any web page
topics: badge, github, svg, status, metadata, badge-maker, hacktoberfest
readme:
<p align="center">
    <img src="https://raw.githubusercontent.com/badges/shields/master/readme-logo.svg?sanitize=true"
        height="130">
</p>
<p align="center">
    <a href="https://shields.io/community#backers" alt="Backers on Open Collective">
        <img src="https://img.shields.io/opencollective/backers/shields" /></a>
    <a href="https://shields.io/community#sponsors" alt="Sponsors on Open Collective">
        <img src="https://img.shields.io/opencollective/sponsors/shields" /></a>
    <a href="https://github.com/badges/shields/pulse" alt="Activity">
        <img src="https://img.shields.io/github/commit-activity/m/badges/shields" /></a>
    <a href="https://github.com/badges/shields/discussions" alt="Discussions">
        <img src="https://img.shields.io/github/discussions/badges/shields" /></a>
    <a href="https://github.com/badges/shields/actions/workflows/daily-tests.yml">
        <img src="https://img.shields.io/github/actions/workflow/status/badges/shields/daily-tests.yml?label=daily%20tests"
            alt="Daily Tests Status"></a>
    <a href="https://coveralls.io/github/badges/shields">
        <img src="https://img.shields.io/coveralls/github/badges/shields"
            alt="Code Coverage"></a>
    <a href="https://discord.gg/HjJCwm5">
        <img src="https://img.shields.io/discord/308323056592486420?logo=discord&logoColor=white"
            alt="Chat on Discord"></a>
</p>

This is home to [Shields.io][shields.io], a service for concise, consistent, 

### ajv-validator/ajv
description: (none)
killerFeature: (none)
topics: json-schema, validator, ajv
readme:
<img align="right" alt="Ajv logo" width="160" src="https://ajv.js.org/img/ajv.svg">

&nbsp;

# Ajv JSON schema validator

The fastest JSON validator for Node.js and browser.

Supports JSON Schema draft-04/06/07/2019-09/2020-12 ([draft-04 support](https://ajv.js.org/json-schema.html#draft-04) requires ajv-draft-04 package) and JSON Type Definition [RFC8927](https://datatracker.ietf.org/doc/rfc8927/).

[](https://github.com/ajv-validator/ajv/actions?query=workflow%3Abuild)
[](https://www.npmjs.com/package/ajv)
[](https://www.npmjs.com/package/ajv)
[](https://coveralls.io/github/ajv-validator/ajv?branch=master)
[](https://simplex.chat/contact#/?v=1-2&smp=smp%3A%2F%2Fu2dS9sG8nMNURyZwqASV4yROM28Er0luVTx5X1CsMrU%3D%40smp4.simplex.im%2F8KvvURM6J38Gdq9dCuPswMOkMny0xCOJ%23%2F%3Fv%3D1-2%26dh%3DMCowBQYDK2VuAyEAr8rPVRuMOXv6kwF2yUAap-eoVg-9ssOFCi1fIrxTUw0%253D%26srv%3Do5vmywmrnaxalvz6wi3zicyftgio6psuvyniis6gco6bp6ekl4cqj4id.onion&data=%7B%22type%22%3A%22group%22%2C%22groupLinkId%22%3A%224pwLRgWHU9tlroMWHz0uOg%3D%3D%22%7D)
[](https://gitter.im/ajv-validator/ajv)
[](https://github.com/sponsors/epoberezkin)

## Ajv sponsors

[<img src="https://ajv.js.org/img/mozilla.svg" width="45%" alt="Mozilla">](https://www.mozilla.org)<img src="https://ajv.js.org/img/gap.svg" width="9%">[<img src="https://ajv.js.org/img/reserved.svg" width="45%">](https://opencollective.com/ajv)

[<img src="https://ajv.js.org/img/microsoft.png" width="31%" alt="Microsoft">](https://opensource.microsoft.com)<img src="http
