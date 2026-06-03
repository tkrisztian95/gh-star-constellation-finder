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

# INPUT — batch 2/4 (30 repos)

### open-guides/og-aws
description: A Shell-based guide to Amazon Web Services, providing practical information on various AWS services. The guide covers basics, tips, and gotchas for each service, making it an excellent resource for administrators, developers, and anyone looking to learn about AWS.
killerFeature: Run a comprehensive guide to AWS services from the command line
topics: (none)
readme:
The Open Guide to Amazon Web Services
=====================================

[](http://slackhatesthe.cloud) ⇦ Join us!

[Credits](AUTHORS.md) ∙ [Contributing guidelines](CONTRIBUTING.md)

Table of Contents
-----------------

**Purpose**

-	[Why an Open Guide?](#why-an-open-guide)
-	[Scope](#scope)
-	[Legend](#legend)

**AWS in General**

-	[General Information](#general-information)
-	[Learning and Career Development](#learning-and-career-development)
-	[Managing AWS](#managing-aws)
-	[Managing Servers and Applications](#managing-servers-and-applications)

| Specific AWS Services                 | Basics                         | Tips                          | Gotchas                                        |
|---------------------------------------|--------------------------------|-------------------------------|------------------------------------------------|
| [ALB](#alb) | [📗](#alb-basics) | [📘](#alb-tips) | [📙](#alb-gotchas-and-limitations) |
| [AMIs](#amis) | [📗](#ami-basics) | [📘](#ami-tips) | [📙](#ami-gotchas-and-limitations) |
| [API Gateway](#api-gateway) | [📗](#api-gateway-basics) | [📘](#api-gateway-tips) | [📙](#api-gateway-gotchas-and-limitations) |
| [Auto Scaling](#auto-scaling) | [📗](#auto-scaling-basics) | [📘](#auto-scaling-tips) | [📙](#auto-scaling-gotchas-and-limitations) |
| [Batch](#batch) | [📗](#batch-basics) | [📘](#batch-tips) |
| [Certificate Manager](#certificate-manager) | [📗](#certificate-manager-basics) | [📘](#certificate-manager-tips) | [📙](#certi

### freeCodeCamp/freeCodeCamp
description: A TypeScript-based, open-source codebase and curriculum for learning math, programming, and computer science, featuring thousands of interactive coding challenges, certifications, and a community-driven platform for developers
killerFeature: Get certified as a full-stack developer through interactive coding challenges and self-paced curriculum
topics: learn-to-code, nonprofits, programming, nodejs, react, d3, careers, education, teachers, javascript, certification, curriculum, math, community, freecodecamp
readme:
[](https://www.freecodecamp.org/)

[](https://www.firsttimersonly.com/)
[](https://discord.gg/PRyKn3Vbay)
[](https://insights.linuxfoundation.org/project/freecodecamp/repository/freecodecamp-freecodecamp)

## freeCodeCamp.org's open-source codebase and curriculum

[freeCodeCamp.org](https://www.freecodecamp.org) is a friendly community where you can learn to code for free. It is run by a [donor-supported 501(c)(3) charity](https://www.freecodecamp.org/donate) to help millions of busy adults transition into tech. Our community has already helped more than 100,000 people get their first developer job.

Our full-stack web development and machine learning curriculum is completely free and self-paced. We have thousands of interactive coding challenges to help you expand your skills.

## Table of Contents

- [Certifications](#certifications)
- [The Learning Platform](#the-learning-platform)
- [Reporting Bugs and Issues](#reporting-bugs-and-issues)
- [Reporting Security Issues and Responsible Disclosure](#reporting-security-issues-and-responsible-disclosure)
- [Contributing](#contributing)
- [Platform, Build and Deployment Status](#platform-build-and-deployment-status)
- [License](#license)

### Certifications

freeCodeCamp.org offers several free developer certifications that make up the [Full-Stack Developer Curriculum](https://www.freecodecamp.org/learn/full-stack-developer-v9/):

- [Responsive Web Design](https://www.freecodecamp.org/learn/responsive-web-design-v9/)
- [JavaScrip

### keycloak/keycloak
description: A Java-based Open Source Identity and Access Management system providing user federation, strong authentication, user management, fine-grained authorization, and more. Comparable to other identity and access management systems but optimised for speed and ease of use.
killerFeature: Deploy Identity and Access Management for Modern Applications and Services with Minimum Effort
topics: keycloak, oidc, saml
readme:
[](https://bestpractices.coreinfrastructure.org/projects/6818)
[](https://clomonitor.io/projects/cncf/keycloak)
[](https://securityscorecards.dev/viewer/?uri=github.com/keycloak/keycloak)
[](https://artifacthub.io/packages/olm/community-operators/keycloak-operator)

[](docs/translation.md)

# Open Source Identity and Access Management

Add authentication to applications and secure services with minimum effort. No need to deal with storing users or authenticating users.

Keycloak provides user federation, strong authentication, user management, fine-grained authorization, and more.

## Help and Documentation

* [Documentation](https://www.keycloak.org/documentation.html)
* [User Mailing List](https://groups.google.com/d/forum/keycloak-user) - Mailing list for help and general questions about Keycloak
* Join [#keycloak](https://cloud-native.slack.com/archives/C056HC17KK9) for general questions, or [#keycloak-dev](https://cloud-native.slack.com/archives/C056XU905S6) on Slack for design and development discussions, by creating an account at [https://slack.cncf.io/](https://slack.cncf.io/).

## Reporting Security Vulnerabilities

If you have found a security vulnerability, please look at the [instructions on how to properly report it](https://github.com/keycloak/keycloak/security/policy).

## Reporting an issue

If you believe you have discovered a defect in Keycloak, please open [an issue](https://github.com/keycloak/keycloak/issues).
Please remember to provide a good summary, de

### maurobussini/restful-stress
description: A Windows, Mac, and Linux desktop application that simulates HTTP requests to test the performance and stability of RESTful APIs. It can be used to identify bottlenecks, optimize server-side processing, and ensure robustness under heavy loads.
killerFeature: Run load and stress tests against RESTful web services
topics: (none)
readme:
# **RESTful Stress**

## *Load and Stress test against RESTful web service*

This is the [Electron](https://electron.atom.io/) version of **RESTful Stress**, a Chrome Packaged App available on 
[Chrome Store](https://chrome.google.com/webstore/detail/restful-stress/lljgneahfmgjmpglpbhmkangancgdgeb) (as long as it lasts..).

I'm going to figure out which is the best way to distribute Electron App for Windows, Mac and Linux. For now I just have the executable for Windows and Linux; Mac support is coming soon...

## Instructions:
Just download the compressed "zip" file, unpack, launch the executable...et voilà!

## Releases:
- v1.6.4 - 2017-05-13
  - [Windows (installer version)](https://github.com/maurobussini/restful-stress/raw/master/dist/1.6.4/restful-stress.1.6.4.win.exe)
  - [Linux (portable version)](https://github.com/maurobussini/restful-stress/raw/master/dist/1.6.4/restful-stress.1.6.4.linux.zip)
- v1.6.3 - 2017-05-09
  - [Windows (portable version)](https://github.com/maurobussini/restful-stress/raw/master/dist/1.6.3/restful-stress.1.6.3.win.portable.zip)
  - [Linux (portable version)](https://github.com/maurobussini/restful-stress/raw/master/dist/1.6.3/restful-stress.1.6.3.linux.portable.zip)
- v1.6.2 - 2017-05-08
  - [Windows (portable version)](https://github.com/maurobussini/restful-stress/raw/master/dist/1.6.2/restful-stress.1.6.2.win.portable.zip)
  - [Linux (portable version)](https://github.com/maurobussini/restful-stress/raw/master/dist/1.6.2/restful-stress.1

### sindresorhus/awesome
description: A comprehensive list of awesome lists about various domains, serving as a hub for discovering new resources and learning about different subjects. The primary mechanism is human-curated categorization, with contributors adding their own lists to the collection.
killerFeature: Browse curated lists of interesting topics
topics: awesome, awesome-list, unicorns, lists, resources
readme:
<div align="center">
	<img width="500" height="350" src="media/logo.svg" alt="Awesome">
	<br>
	<br>
	<br>
	<br>
	<div>
		<sub>Check out my macOS app</sub>
		<br>
		<h2>
			<a href="https://sindresorhus.com/supercharge">Supercharge</a>
			<br>
			<sup>Elevate your Mac experience</sup>
		</h2>
	</div>
	<br>
	<br>
	<br>
	<br>
	<hr>
	<p>
		<sup>
			<a href="https://github.com/sponsors/sindresorhus">My open source work is supported by the community</a>
		</sup>
	</p>
	<p>
		<sup>Special thanks to:</sup>
		<br>
		<br>
		<br>
		<a href="https://depot.dev?utm_source=github&utm_medium=sindresorhus">
			<div>
				<picture>
					<source width="180" media="(prefers-color-scheme: dark)" srcset="https://sindresorhus.com/assets/thanks/depot-logo-dark.svg">
					<source width="180" media="(prefers-color-scheme: light)" srcset="https://sindresorhus.com/assets/thanks/depot-logo-light.svg">
					<img width="180" src="https://sindresorhus.com/assets/thanks/depot-logo-light.svg" alt="Depot logo">
				</picture>
			</div>
			<b>Fast remote container builds and GitHub Actions runners.</b>
		</a>
		<br>
		<br>
		<br>
		<a href="https://circleback.ai?utm_source=sindresorhus&utm_medium=sponsorship&utm_campaign=awesome-list&utm_id=awesome">
			<div>
				<img width="340" src="https://sindresorhus.com/assets/thanks/circleback-logo.png?x" alt="Circleback logo">
			</div>
			<b>Get the most out of every conversation.</b>
			<div>
				<sup>AI-powered meeting notes, automations, and search. Give AI agents th

### devspace-sh/devspace
description: A Go-based CLI tool for cloud-native development that allows building, testing, and debugging applications directly inside Kubernetes. It enables hot reloading of containers and automates repetitive tasks for image building and deployment.
killerFeature: Develop with hot reloading: updates running containers without rebuilding images or restarting containers
topics: kubernetes, cloud-native, devspace, microservice, cli, golang, helm, kaniko, minikube, docker, container, containerization, devtool, development, development-tools, devops, developer-tools, devops-tools, dev, developer-tool
readme:
<img src="docs/static/media/logos/devspace-logo-primary.svg" width="600">

### **[Website](https://devspace.sh)** • **[Quickstart](#quickstart)** • **[Documentation](https://devspace.sh/cli/docs/introduction)** • **[Blog](https://loft.sh/blog)** • **[Twitter](https://twitter.com/devspace)**

[](https://slack.loft.sh/)

### Client-Only Developer Tool for Cloud-Native Development with Kubernetes
- **Build, test and debug applications directly inside Kubernetes**
- **Develop with hot reloading**: updates your running containers without rebuilding images or restarting containers
- **Unify deployment workflows** within your team and across dev, staging and production
- **Automate repetitive tasks** for image building and deployment

<br>

<br>

<p align="center">
⭐️ <strong>Do you like DevSpace? Support the project with a star</strong> ⭐️
</p>

<br>

DevSpace was created by [Loft Labs](https://loft.sh) and is a [Cloud Native Computing Foundation (CNCF) sandbox project](https://www.cncf.io/sandbox-projects/).

<br>

## Contents
- [Why DevSpace?](#why-devspace)
- [Quickstart Guide](#quickstart)
- [Architecture & Workflow](#architecture--workflow)
- [Contributing](#contributing)
- [FAQ](#faq)

<br>

## Why DevSpace?
Building modern, distributed and highly scalable microservices with Kubernetes is hard - and it is even harder for large teams of developers. DevSpace is the next-generation tool for fast cloud-native software development.

<details>
<summary><b>Standardize & Version Your

### google/go-containerregistry
description: A Go library providing a set of primitives for working with container registries. It defines immutable views of resources like `Image`, `Layer`, and `ImageIndex` that can be backed by various mediums such as registries, tarballs, and daemons.
killerFeature: Create, update, or delete container images programmatically
topics: docker, container, registry, container-registry
readme:
# go-containerregistry

[](https://github.com/google/go-containerregistry/actions?query=workflow%3ABuild)
[](https://godoc.org/github.com/google/go-containerregistry)
[](https://codecov.io/gh/google/go-containerregistry)

## Introduction

This is a golang library for working with container registries.
It's largely based on the [Python library of the same name](https://github.com/google/containerregistry).

The following diagram shows the main types that this library handles.

## Philosophy

The overarching design philosophy of this library is to define interfaces that present an immutable
view of resources (e.g. [`Image`](https://godoc.org/github.com/google/go-containerregistry/pkg/v1#Image),
[`Layer`](https://godoc.org/github.com/google/go-containerregistry/pkg/v1#Layer),
[`ImageIndex`](https://godoc.org/github.com/google/go-containerregistry/pkg/v1#ImageIndex)),
which can be backed by a variety of medium (e.g. [registry](./pkg/v1/remote/README.md),
[tarball](./pkg/v1/tarball/README.md), [daemon](./pkg/v1/daemon/README.md), ...).

To complement these immutable views, we support functional mutations that produce new immutable views
of the resulting resource (e.g. [mutate](./pkg/v1/mutate/README.md)).  The end goal is to provide a
set of versatile primitives that can compose to do extraordinarily powerful things efficiently and easily.

Both the resource views and mutations may be lazy, eager, memoizing, etc, and most are optimized
for common paths based on the tooling we have

### yaml/yamlscript
description: YS (YAMLScript) is a new YAML loader that provides a unified interface for loading YAML files in multiple programming languages, including Clojure. It offers optional functional programming features, such as file imports and string interpolation, making it easy to integrate into existing projects.
killerFeature: Load YAML files across 15+ languages with the same API and features
topics: (none)
readme:
(none)

### Naereen/badges
description: A collection of Markdown code snippets for creating various badges, including shields, icons, and status indicators. Use these templates to decorate your project's README file with information about its maintenance, related repositories, and more.
killerFeature: Generate customizable badges for your project's README.md
topics: forthebadge, badges, markdown, markdown-cheatsheet, meta-badge, forthebadge-cc, restructuredtext, pokemon, python, awesome, markup
readme:
# List of Badges, in Markdown
A list of badges, with their Markdown code, that can be included in a `README.md` file for a GitHub or Bitbucket project.

> The same file for [reStructuredText](http://docutils.sourceforge.net/rst.html) code is available here: [README.rst](README.rst).

<details>
<summary>Table of content</summary>

## Table of content
- [List of Badges, in Markdown](#list-of-badges-in-markdown)
  - [Table of content](#table-of-content)
  - [Generic](#generic)
  - [Useful](#useful)
    - [Maintained?](#maintained)
    - [Related Repos](#related-repos)
    - [Website up/down](#website-updown)
  - [Feedback](#feedback)
    - [*"Ask me anything"* in English](#ask-me-anything-in-english)
    - [*"Demandez moi n'importe quoi"* in French](#demandez-moi-nimporte-quoi-in-french)
  - [Python related](#python-related)
      - [Jupyter Notebook](#jupyter-notebook)
      - [Google Collab](#google-collab)
      - [Binder](#binder)
  - [Go related](#go-related)
  - [Rust related](#rust-related)
  - [Nix related](#nix-related)
  - [Markdown related](#markdown-related)
  - [LaTeX related](#latex-related)
    - [PyPI downloads](#pypi-downloads)
    - [PyPI version](#pypi-version)
    - [PyPI license](#pypi-license)
    - [PyPI format](#pypi-format)
    - [PyPI python versions](#pypi-python-versions)
    - [PyPI implementation](#pypi-implementation)
    - [PyPI status](#pypi-status)
  - [JavaScript related](#javascript-related)
    - [JSDelivr downloads](#jsdelivr--downloads)
  -

### george-haddad/win-cross-dev
description: A PowerShell setup that enhances the command line interface with Scoop, installing and managing Windows applications and ported Linux tools in your user environment. Prerequisites include PowerShell 5 or later and .NET Framework 4.5 or later.
killerFeature: Install and manage windows applications and ported Linux tools like a Linux bash shell
topics: (none)
readme:
# win-cross-dev

[](https://www.gnu.org/licenses/fdl-1.3) [](#contributors) 

Cross Platform Development Setup for Windows

---

## Table of Contents

* [Enhancing PowerShell with Scoop](#powershell)
* [Enabling the Linux Subsystem for Windows](#linux)
* [EOL](#eol)
* [Configure Git](#git)
* [Configure IDE](#ide)
* [Node Modules](#node)

## Enhancing PowerShell with Scoop <a name="powershell"/>

[Scoop](http://scoop.sh) is a command line installer for Windows that runs on top of the PowerShell. You could say it is like [Homebrew](https://brew.sh/) but for Windows. The nice thing is that it installs and manages windows applications and ported Linux tools all in your user environment. It also makes your interaction with PowerShell identical if not very close to a Linux bash shell.

**Prerequisites**

* [PowerShell 5](https://aka.ms/wmf5download) or later
* [.NET Framework 4.5](https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell-core-on-windows?view=powershell-6) or later* 

**Installation**

* Open Windows PowerShell
* Run `Invoke-Expression (New-Object System.Net.WebClient).DownloadString('https://get.scoop.sh')`
* or shorter command `iwr -useb get.scoop.sh | iex`

If you experience some errors running the above command then try changing the execution policy

* Run `Set-ExecutionPolicy RemoteSigned -scope CurrentUser`

If you still encounter errors then try browsing [Scoop.sh](https://github.com/lukesampson/scoop/issues)'s issues page on github,

### moncho/dry
description: A Go command-line tool that provides a dry, minimalistic interface for managing Docker containers, images, networks, and clusters. It offers a range of commands similar to the official Docker CLI, with keybindings for filtering, sorting, and refreshing lists.
killerFeature: Deploy Docker management commands to your terminal
topics: docker, docker-cli, golang, docker-engine, docker-swarm
readme:
# dry

[](https://github.com/moncho/dryblob/master/LICENSE)

[](https://goreportcard.com/report/github.com/moncho/dry)
[](https://godoc.org/github.com/moncho/dry)
[]()
[](https://github.com/moncho/dry/releases/latest)
[](https://snapcraft.io/dry)

**Dry** is a terminal application to manage **Docker** and **Docker Swarm**.

It shows information about Containers, Images and Networks, and, if running a **Swarm** cluster, it shows information about Nodes, Service, Stacks and the rest of **Swarm** constructs. It can be used with both local or remote **Docker** daemons.

Besides showing information, it can be used to manage Docker. Most of the commands that the official **Docker CLI** provides, are available in **dry** with the same behaviour. A list of available commands and their keybindings can be found in **dry**'s help screen or in this README.

Lastly, it can also be used as a monitoring tool for **Docker** containers.

**Dry** is installed as a single binary and does not require external libraries.

The demo below shows a **dry** session.

[](https://asciinema.org/a/35825?autoplay=1&speed=1.5)

## **dry** keybinds

### Global

Keybinding           | Description
---------------------|---------------------------------------
<kbd>%</kbd>         | filter list
<kbd>F1</kbd>        | sort list
<kbd>F5</kbd>        | refresh list
<kbd>F7</kbd>        | toggle showing Docker daemon information
<kbd>F8</kbd>        | show docker disk usage
<kbd>F9</kbd>        | show last 10 docker

### un-ts/changesets-gitlab
description: A TypeScript-based command-line interface for GitLab CI that manages changesets, updating package versions and changelogs, and creating merge requests. Comparable to GitHub Actions, but specifically designed for GitLab.
killerFeature: Create a merge request with updated package versions and changelogs
topics: changeset, changesets, gitlab
readme:
# changesets-gitlab

[](https://github.com/un-ts/changesets-gitlab/actions/workflows/ci.yml?query=branch%3Amain)
[](https://coderabbit.ai)
[](https://www.npmjs.com/package/changesets-gitlab)
[](https://github.com/un-ts/changesets-gitlab/releases)

[](https://conventionalcommits.org)
[](https://renovatebot.com)
[](https://standardjs.com)
[](https://github.com/prettier/prettier)
[](https://github.com/atlassian/changesets)

GitLab CI cli for [changesets](https://github.com/atlassian/changesets) like its [GitHub Action](https://github.com/changesets/action), it creates a merge request with all of the package versions updated and changelogs updated and when there are new changesets on master, the MR will be updated. When you're ready, you can merge the merge request and you can either publish the packages to npm manually or setup the action to do it for you.

## Usage

### Inputs

> Note: environment variables are case-sensitive

- `INPUT_PUBLISH` - The command to use to build and publish packages
- `INPUT_VERSION` - The command to update version, edit CHANGELOG, read and delete changesets. Default to `changeset version` if not provided
- `INPUT_COMMIT` - The commit message to use. Default to `Version Packages`
- `INPUT_TITLE` - The merge request title. Default to `Version Packages`

#### Only available in `changesets-gitlab`

- `INPUT_PUBLISHED` - Command executed after published
- `INPUT_ONLY_CHANGESETS` - Command executed on only changesets detected
- `INPUT_REMOVE_SOURCE_BRANC

### gluster/glusterdocs
description: A repository containing the source code for official Gluster documentation, rendered at https://docs.gluster.org. This documentation can be built using mkdocs or a Docker container.
killerFeature: Render official Gluster documentation from source code
topics: (none)
readme:
# glusterdocs

Source code to gluster documentation: http://docs.gluster.org/

**Important Note:
This repo had its git history re-written on 19 May 2016.
Please create a fresh fork or clone if you have an older local clone.**

# Building the docs

If you are on EPEL 7 or Fedora, the first thing you will need is to install
mkdocs, with the following command :

    # sudo yum install mkdocs

For Fedora 30+ (run the following in root)

    # dnf install python-pip
    # pip install -r requirements.txt

Then you need to run mkdocs from the root of that repository:

    $ mkdocs build

If you see an error about `docs_dir` when using recent versions of mkdocs , try running additional steps mentioned below:

    $ cp ./mkdocs.yml ../
    $ cd ..

Edit below entry in the copied mkdocs.yml file

    docs_dir: ./glusterdocs/

Then you need to run mkdocs

    $ mkdocs build

The result will be in the `site/` subdirectory, in HTML.

# Building the docs in Docker

Included is a Makefile and a Dockerfile, which enables you to easily build the
docs inside Docker without installing any dependencies on your system.

Simply run the following command to compile the docs:

```sh
make
```

This Makefile recipe builds a Docker image containing the dependencies required
and runs `mkdocs` inside the built image, taking care to run the container as
the current `uid` and `gid` so that your user has ownership of the results in
the `./site` directory.

### ovity/octotree
description: A proprietary JavaScript extension for Chrome, Firefox, Opera, and Safari that enhances GitHub code review and exploration by providing instant file navigation and a more efficient reviewing experience.
killerFeature: Run code reviews from the browser with instant file navigation
topics: github, chrome, firefox, opera, safari, browser-extension, code-review, edge, pull-request-review, code-files
readme:
## About

Browser extension that enhances GitHub code review and exploration. You can download Octotree for your browser from [our website](https://www.octotree.io).

[](https://chrome.google.com/webstore/detail/octotree/bkhaagjahfmjljalopjnoealnfndnagc)
[](https://addons.mozilla.org/en-US/firefox/addon/octotree/)
[](https://microsoftedge.microsoft.com/addons/detail/octotree/joagmknfcgpikbadjkaikmnhpjadihjg?hl=en-US)
[](https://itunes.apple.com/us/app/octotree-pro/id1457450145?mt=12)
[](https://brave.com/learn/installing-chrome-extensions/)
[](https://addons.opera.com/en/extensions/details/octotree/)

> Octotree is a __proprietary__ software. This repository contains the old source code of a very limited version of Octotree. The Octotree team owns the complete copyright over this code.

[](https://www.octotree.io/)

### Support

* Check the [troubleshooting guide](https://www.octotree.io/features#troubleshooting) for common issues
* Submit a [ticket](https://github.com/ovity/octotree/issues/new) if you want to report bugs or suggest features
* Follow [@octotree](https://twitter.com/octotree) on Twitter for product updates
* If you need help with payment and billing, email support@octotree.io 

### Learn more

- [Website](https://www.octotree.io)
- [Features](https://www.octotree.io/features)
- [Release notes](https://www.octotree.io/changes)
- [Browser permissions](https://www.octotree.io/features#browser-permissions)

### mastra-ai/mastra
description: A TypeScript framework for building AI-powered applications and agents, integrating model routing, workflow orchestration, and human-in-the-loop capabilities. It includes a modern TypeScript stack and is designed around established AI patterns.
killerFeature: Run autonomous agents that use LLMs to solve open-ended tasks
topics: agents, ai, chatbots, javascript, llm, nextjs, nodejs, reactjs, typescript, workflows, evals, mcp, tts
readme:
# Mastra

[](https://www.npmjs.com/package/@mastra/core)
[](https://github.com/mastra-ai/mastra/actions/workflows/github-code-scanning/codeql)
[](https://github.com/mastra-ai/mastra/stargazers)
[](https://discord.gg/BTYqqHKUrf)
[](https://x.com/mastra)
[](https://www.npmjs.com/package/@mastra/core)
[](https://www.ycombinator.com/companies?batch=W25)

Mastra is a framework for building AI-powered applications and agents with a modern TypeScript stack.

It includes everything you need to go from early prototypes to production-ready applications. Mastra integrates with frontend and backend frameworks like React, Next.js, and Node, or you can deploy it anywhere as a standalone server. It's the easiest way to build, tune, and scale reliable AI products.

## Why Mastra?

Purpose-built for TypeScript and designed around established AI patterns, Mastra gives you everything you need to build great AI applications out-of-the-box.

Some highlights include:

- [**Model routing**](https://mastra.ai/models) - Connect to 40+ providers through one standard interface. Use models from OpenAI, Anthropic, Gemini, and more.

- [**Agents**](https://mastra.ai/docs/agents/overview) - Build autonomous agents that use LLMs and tools to solve open-ended tasks. Agents reason about goals, decide which tools to use, and iterate internally until the model emits a final answer or an optional stopping condition is met.

- [**Workflows**](https://mastra.ai/docs/workflows/overview) - When you need explicit con

### portainer/portainer
description: A lightweight service delivery platform for containerized applications that allows management of orchestrator resources (containers, images, volumes, networks) through a GUI and/or extensive API. Deployable as a Linux or Windows native container.
killerFeature: Manage Docker, Swarm, Kubernetes, and ACI environments from a 'smart' GUI and API
topics: docker, docker-swarm, ui, docker-deployment, docker-compose, docker-container, docker-image, portainer, docker-ui, dockerfile, moby, hacktoberfest, kubernetes
readme:
<p align="center">
  <img title="portainer" src='https://github.com/portainer/portainer/blob/develop/app/assets/images/portainer-github-banner.png?raw=true' />
</p>

**Portainer Community Edition** is a lightweight service delivery platform for containerized applications that can be used to manage Docker, Swarm, Kubernetes and ACI environments. It is designed to be as simple to deploy as it is to use. The application allows you to manage all your orchestrator resources (containers, images, volumes, networks and more) through a ‘smart’ GUI and/or an extensive API.

Portainer consists of a single container that can run on any cluster. It can be deployed as a Linux container or a Windows native container.

**Portainer Business Edition** builds on the open-source base and includes a range of advanced features and functions (like RBAC and Support) that are specific to the needs of business users.

- [Compare Portainer CE and Compare Portainer BE](https://www.portainer.io/features)
- [Take3 – get 3 free nodes of Portainer Business for as long as you want them](https://www.portainer.io/take-3)
- [Portainer BE install guide](https://academy.portainer.io/install/)

## Latest Version

Portainer CE is updated regularly. We aim to do an update release every couple of months.

[](https://github.com/portainer/portainer/releases/latest)

## Getting started

- [Deploy Portainer](https://docs.portainer.io/start/install-ce)
- [Documentation](https://docs.portainer.io)
- [Contribute to the proj

### gnab/remark
description: A simple, in-browser markdown-driven slideshow tool featuring markdown formatting, presenter mode, syntax highlighting, slide scaling, touch support, and customizable templates. Comparable to a lightweight, self-contained presentation software, but with the flexibility of Markdown.
killerFeature: Render Markdown-based slideshow on the fly
topics: markdown, slideshow, html, javascript
readme:
# remark

[](https://travis-ci.org/gnab/remark)
[](https://cdnjs.com/libraries/remark)
[](https://xscode.com/gnab/remark)
[](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=4ADT275DY7JTG)

A simple, in-browser, markdown-driven slideshow tool targeted at people who know their way around HTML and CSS, featuring:

- Markdown formatting, with smart extensions
- Presenter mode with markdown formatted speaker notes and cloned slideshow view
- Syntax highlighting, supporting a range of languages
- Slide scaling, thus similar appearance on all devices / resolutions
- Simple markdown templates for customized slides
- Touch support for smart phones and pads, i.e. swipe to navigate slides

Check out [this remark slideshow](https://remarkjs.com/) for a brief introduction.

To render your Markdown-based slideshow on the fly, checkout [Remarkise](https://gnab.github.io/remark/remarkise).

### Getting Started

It takes only a few, simple steps to get up and running with remark:

1. Create an HTML file to contain your slideshow (see boilerplate below)
2. Open the HTML file in a decent browser
3. Edit the Markdown and/or CSS styles as needed, save and refresh!
4. Press `C` to clone a display; then press `P` to switch to presenter mode. Open help menu with `h`.

See any of the boilerplate-*.html files (the -local one requires building remark first), or just copy the boilerplate HTML below to start:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Title</title>
    <meta

### jenkinsci/stash-pullrequest-builder-plugin
description: A Jenkins plugin that builds and tests pull requests from an Atlassian Stash server, providing test result comments. Requires Jenkins 2.60.3 or higher and the Git Plugin.
killerFeature: Report test results as a comment on Atlassian Stash pull requests
topics: (none)
readme:
Stash Pull Request Builder Plugin
================================

[](https://gitter.im/jenkinsci/stash-pullrequest-builder-plugin?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[](https://ci.jenkins.io/job/Plugins/job/stash-pullrequest-builder-plugin/job/master/)

This Jenkins plugin builds pull requests from a Atlassian Stash server and will report the test results as a comment.
This plugin was inspired by the GitHub & BitBucket pull request builder plugins.

- Official [Jenkins Plugin Page](https://wiki.jenkins-ci.org/display/JENKINS/Stash+pullrequest+builder+plugin)

## Prerequisites

- Jenkins 2.60.3 or higher.
- [Git Plugin](https://wiki.jenkins-ci.org/display/JENKINS/Git+Plugin)

## Build and deploy instructions

Run Maven package from the root directory.
```
mvn package
```
This will generate a `.hpi` file in the `target` directory. To deploy the plugin, go to Jenkins Dashboard > Manage Jenkins > Plugins > Advanced settings, choose the `.hpi` file and click `Deploy`. Open `[Jenkins URL]/restart` to restart jenkins for the changes to take effect.

## Testing instructions

```
mvn clean
mvn compile
mvn test
```

## Environment variables

The plugin provides following environment variables to the build:

- `${pullRequestId}`
- `${pullRequestTitle}`
- `${sourceBranch}`
- `${targetBranch}`
- `${sourceRepositoryOwner}`
- `${sourceRepositoryName}`
- `${destinationRepositoryOwner}`
- `${destinationRepositoryName}`
- `${sourceCommitHash}`
- `${dest

### seraphimalia/docker-openjdk8-alpine-plus-fonts
description: A Dockerfile to create an openjdk:8-alpine image with additional font packages (ttf-dejavu, ttf-droid, ttf-freefont, ttf-liberation, and ttf-ubuntu-font-family) required for proper java.awt.Font functionality
killerFeature: Deploy a functional Java runtime with fonts
topics: (none)
readme:
# docker-openjdk8-alpine-plus-fonts

## Purpose

This image was created so that java.awt.Font would work with openjdk:8-alpine docker image and have a few fonts to use.  Namely: ttf-dejavu, ttf-droid, ttf-freefont, ttf-liberation, ttf-ubuntu-font-family

## Details

### Base Image

* [openjdk:8-alpine](https://hub.docker.com/_/openjdk/) - OpenJDK, JRE 8 Alpine

### kubernetes/client-go
description: A Go library for interacting with a Kubernetes cluster. Provides clients for talking to a Kubernetes cluster, including support for versioning and compatibility.
killerFeature: Run Kubernetes commands from your Go code
topics: k8s-staging
readme:
> ⚠️ **This is an automatically published [staged repository](https://git.k8s.io/kubernetes/staging#external-repository-staging-area) for Kubernetes**.   
> Contributions, including issues and pull requests, should be made to the main Kubernetes repository: [https://github.com/kubernetes/kubernetes](https://github.com/kubernetes/kubernetes).  
> This repository is read-only for importing, and not used for direct contributions.  
> See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

# client-go

Go clients for talking to a [kubernetes](http://kubernetes.io/) cluster.

We recommend using the `v0.x.y` tags for Kubernetes releases >= `v1.17.0` and
`kubernetes-1.x.y` tags for Kubernetes releases < `v1.17.0`.

The fastest way to add this library to a project is to run `go get k8s.io/client-go@latest` with go1.16+.
See [INSTALL.md](/INSTALL.md) for detailed installation instructions and troubleshooting.

[![GoDocWidget]][GoDocReference]

[GoDocWidget]: https://godoc.org/k8s.io/client-go?status.svg
[GoDocReference]:https://godoc.org/k8s.io/client-go 

## Table of Contents

- [What's included](#whats-included)
- [Versioning](#versioning)
  - [Compatibility: your code <-> client-go](#compatibility-your-code---client-go)
  - [Compatibility: client-go <-> Kubernetes clusters](#compatibility-client-go---kubernetes-clusters)
  - [Compatibility matrix](#compatibility-matrix)
  - [Why do the 1.4 and 1.5 branch contain top-level folder named after the version?](#why-do-the-14-and-15-b

### containrrr/shoutrrr
description: A Go library for sending notifications to various messaging platforms, including Slack and Discord. Use the Send function to send messages directly or create a sender to customize notification settings.
killerFeature: Send notifications to multiple platforms with a single command
topics: notifications, golang, go, messaging, integrations, hacktoberfest
readme:
<div align="center">

<a href="https://github.com/containrrr/shoutrrr">
    <img src="https://raw.githubusercontent.com/containrrr/shoutrrr/main/docs/shoutrrr-logotype.png" width="450" />
</a>

# Shoutrrr

Notification library for gophers and their furry friends.
Heavily inspired by <a href="https://github.com/caronc/apprise">caronc/apprise</a>.

[](https://codecov.io/gh/containrrr/shoutrrr)
[](https://www.codacy.com/gh/containrrr/shoutrrr/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=containrrr/shoutrrr&amp;utm_campaign=Badge_Grade)
[](https://goreportcard.com/badge/github.com/containrrr/shoutrrr)
[](https://pkg.go.dev/github.com/containrrr/shoutrrr)
[](https://github.com/containrrr/shoutrrr)
[](https://github.com/containrrr/shoutrrr/blob/main/LICENSE)
[](https://godoc.org/github.com/containrrr/shoutrrr) 
[](#contributors-)

</div>
<br/><br/>

## Installation

### Using the snap

```bash
$ sudo snap install shoutrrr
```

### Using the Go CLI

```bash
$ go install github.com/containrrr/shoutrrr/shoutrrr@latest
```

### From Source

```bash
$ go build -o shoutrrr ./shoutrrr
```

## Quick Start

### As a package

Using shoutrrr is easy! There is currently two ways of using it as a package.

#### Using the direct send command

```go
  url := "slack://token-a/token-b/token-c"
  err := shoutrrr.Send(url, "Hello world (or slack channel) !")

```

#### Using a sender

```go
  url := "slack://token-a/token-b/token-c"
  sender, err := shoutrrr.CreateSender(ur

### diffplug/spotless
description: A Java command-line tool that formats code using Gradle, Maven, and other build systems. Comparable to a linter, but optimised for speed on large codebases.
killerFeature: Run './gradlew spotlessApply' to fix format violations
topics: gradle, java, plugin-gradle, formatter, kotlin, scala, groovy, maven, prettier, javascript, typescript, sql, css, sass
readme:
# <img align="left" src="_images/spotless_logo.png"> Spotless: Keep your code spotless

[](plugin-gradle)
[](plugin-maven)
[](https://github.com/moznion/sbt-spotless)

Spotless can format &lt;antlr | c | c# | c++ | css | flow | graphql | groovy | html | java | javascript | json | jsx | kotlin | less | license headers | markdown | objective-c | protobuf | python | scala | scss | shell | sql | typeScript | vue | yaml | anything> using &lt;gradle | maven | sbt | anything>.

You probably want one of the links below:

## [❇️ Spotless for Gradle](plugin-gradle) (with integrations for [VS Code](https://marketplace.visualstudio.com/items?itemName=richardwillis.vscode-spotless-gradle) and [IntelliJ](https://plugins.jetbrains.com/plugin/18321-spotless-gradle))

```console
user@machine repo % ./gradlew build
:spotlessJavaCheck FAILED
  The following files had format violations:
  src\main\java\com\diffplug\gradle\spotless\FormatExtension.java
    -\t\t····if·(targets.length·==·0)·{
    +\t\tif·(targets.length·==·0)·{
  Run './gradlew spotlessApply' to fix these violations.
user@machine repo % ./gradlew spotlessApply
:spotlessApply
BUILD SUCCESSFUL
user@machine repo % ./gradlew build
BUILD SUCCESSFUL
```

## [❇️ Spotless for Maven](plugin-maven)

```console
user@machine repo % mvn spotless:check
[ERROR]  > The following files had format violations:
[ERROR]  src\main\java\com\diffplug\gradle\spotless\FormatExtension.java
[ERROR]    -\t\t····if·(targets.length·==·0)·{
[ERROR]    +\t\tif·(t

### microsoft/PowerToys
description: Microsoft PowerToys is a collection of C#-based utilities that help you customize Windows and streamline everyday tasks. The suite includes advanced paste functionality, always-on-top window management, color picking, command palette integration, and more.
killerFeature: Streamline everyday tasks on Windows with over 30 customizable utilities
topics: powertoys, desktop, windows, fancyzones, microsoft-powertoys, powerrename, keyboard-manager, color-picker, command-palette, windows-10, windows-11, advanced-paste
readme:
<p align="center">
    <picture>
      <source media="(prefers-color-scheme: light)" srcset="./doc/images/readme/pt-hero.light.png" />
      <img src="./doc/images/readme/pt-hero.dark.png" />
  </picture>
</p>
<h1 align="center">
  <span>Microsoft PowerToys</span>
</h1>
<p align="center">
  <span align="center">Microsoft PowerToys is a collection of utilities that help you customize Windows and streamline everyday tasks.</span>
</p>
<h3 align="center">
  <a href="#-installation">Installation</a>
  <span> · </span>
  <a href="https://aka.ms/powertoys-docs">Documentation</a>
  <span> · </span>
  <a href="https://aka.ms/powertoys-releaseblog">Blog</a>
  <span> · </span>
  <a href="#-whats-new">Release notes</a>
</h3>

## 🔨 Utilities

PowerToys includes over 30 utilities to help you customize and optimize your Windows experience:

|   |   |   |
| --- | --- | --- |
| [<img src="doc/images/icons/AdvancedPaste.png" alt="Advanced Paste icon" height="16"> Advanced Paste](https://aka.ms/PowerToysOverview_AdvancedPaste) | [<img src="doc/images/icons/Always%20On%20Top.png" alt="Always on Top icon" height="16"> Always on Top](https://aka.ms/PowerToysOverview_AoT) | [<img src="doc/images/icons/Awake.png" alt="Awake icon" height="16"> Awake](https://aka.ms/PowerToysOverview_Awake) |
| [<img src="doc/images/icons/Color%20Picker.png" alt="Color Picker icon" height="16"> Color Picker](https://aka.ms/PowerToysOverview_ColorPicker) | [<img src="doc/images/icons/Command%20Not%20Found.png" alt="Co

### podman-container-tools/podman
description: A tool for managing OCI containers and pods. Supports multiple container image formats, including OCI and Docker images. Provides APIs for managing containers, pods, container images, and volumes.
killerFeature: Run containers on Linux, Mac, and Windows systems using a Podman-managed virtual machine
topics: containers, docker, kubernetes, linux, oci
readme:
# Podman: A tool for managing OCI containers and pods

[](https://goreportcard.com/report/github.com/containers/podman/v6)
[](https://www.bestpractices.dev/projects/10499)

[](https://insights.linuxfoundation.org/project/podman-container-tools/repository/containers-podman)
[](https://insights.linuxfoundation.org/project/podman-container-tools/repository/containers-podman)

<br/>

Podman (the POD MANager) is a tool for managing containers and images, volumes mounted into those containers, and pods made from groups of containers.
Podman runs containers on Linux, but can also be used on Mac and Windows systems using a Podman-managed virtual machine.
Podman is based on libpod, a library for container lifecycle management that is also contained in this repository. The libpod library provides APIs for managing containers, pods, container images, and volumes.

Podman releases a new major or minor release 4 times a year, during the second week of February, May, August, and November. Patch releases are more frequent and may occur at any time to get bugfixes out to users. All releases are PGP signed. Public keys of members of the team approved to make releases are located [here](https://github.com/containers/release-keys/tree/main/podman).

* Continuous Integration:
  * [](https://github.com/containers/podman/actions/workflows/ci.yml?query=branch%3Amain)
  * [GoDoc: ](https://godoc.org/github.com/containers/podman/libpod)
  * [Downloads](DOWNLOADS.md)

## Overview and scope

At a high 

### wayou/vscode-todo-highlight
description: A VSCode extension to highlight TODOs, FIXMes, and other annotations within your code. This extension helps you quickly identify notes or tasks that need attention by automatically highlighting them in your code editor.
killerFeature: Highlight TODOs and FIXMes within your code for instant reminders
topics: vscode-extension, todo, annotation-processor
readme:
VSCODE-TODO-HIGHLIGHT
===

[](https://opensource.org/licenses/MIT) [](https://travis-ci.org/wayou/vscode-todo-highlight) [](https://marketplace.visualstudio.com/items?itemName=wayou.vscode-todo-highlight) [](https://marketplace.visualstudio.com/items?itemName=wayou.vscode-todo-highlight) [](https://marketplace.visualstudio.com/items?itemName=wayou.vscode-todo-highlight)

Highlight `TODO`, `FIXME` and other annotations within your code.

Sometimes you forget to review the TODOs you've added while coding before you publish the code to production.
So I've been wanting an extension for a long time that highlights them and reminds me that there are notes or things not done yet.

Hope this extension helps you as well.

*NOTICE*

Many report that the `List highlighted annotations` command is not working, make sure you have the file types included via `todohighlight.include`.

### Preview

- with `material night` color theme:

- with `material night eighties` color theme:

### Config

`TODO:`,`FIXME:` are built-in keywords. You can override the look by customizing the setting.

To customize the keywords and other stuff, <kbd>command</kbd> + <kbd>,</kbd> (Windows / Linux: File -> Preferences -> User Settings) open the vscode file `settings.json`.

| | type | default | description |
|---|---|---|---|
| todohighlight.isEnable | boolean | true | Toggle the highlight, default is true. |
| todohighlight.isCaseSensitive  | boolean | true | Whether the keywords are case sensitive or not. |
|

### alexcasalboni/aws-lambda-power-tuning
description: AWS Lambda Power Tuning is a state machine powered by AWS Step Functions that helps you optimize your Lambda functions for cost and/or performance in a data-driven way. It analyzes execution logs to suggest the best power configuration, providing a visualization of average cost and speed for each option.
killerFeature: Deploy serverless functions with zero config changes to optimize cost and performance
topics: aws, aws-lambda, serverless, stepfunctions, cost, performance, cloud, lambda
readme:
# AWS Lambda Power Tuning

[](https://app.travis-ci.com/github/alexcasalboni/aws-lambda-power-tuning)
[](https://coveralls.io/github/alexcasalboni/aws-lambda-power-tuning)
[](https://GitHub.com/alexcasalboni/aws-lambda-power-tuning/graphs/commit-activity)
[](https://github.com/alexcasalboni/aws-lambda-power-tuning/issues)
[](https://github.com/ellerbrock/open-source-badges/)

AWS Lambda Power Tuning is a state machine powered by AWS Step Functions that helps you optimize your Lambda functions for cost and/or performance in a data-driven way.

The state machine is designed to be easy to deploy and fast to execute. Also, it's language agnostic so you can optimize any Lambda functions in your account.

Basically, you can provide a Lambda function ARN as input and the state machine will invoke that function with multiple power configurations (from 128MB to 10GB, you decide which values). Then it will analyze all the execution logs and suggest you the best power configuration to minimize cost and/or maximize performance.

> [!NOTE]
> Please note that the input function will be executed in your AWS account and perform real HTTP requests, SDK calls, cold starts, etc. The state machine also supports cross-region invocations and you can enable parallel execution to generate results in just a few seconds.

## What does the state machine look like?

It's pretty simple and you can visually inspect each step in the AWS management console.

## What can I expect from AWS Lambda Power Tuning

### OAI/OpenAPI-Specification
description: The OpenAPI Specification (OAS) defines a standard, programming language-agnostic interface description for HTTP APIs. This allows both humans and computers to discover and understand the capabilities of a service without requiring access to source code, additional documentation, or inspection of network traffic.
killerFeature: Define a standard interface description for HTTP APIs
topics: openapi, openapi-specification, apis, rest, oas, webapi
readme:
# The OpenAPI Specification

 [](https://www.codetriage.com/oai/openapi-specification)

The OpenAPI Specification is a community-driven open specification within the [OpenAPI Initiative](https://www.openapis.org/), a Linux Foundation Collaborative Project.

The OpenAPI Specification (OAS) defines a standard, programming language-agnostic interface description for HTTP APIs. This allows both humans and computers to discover and understand the capabilities of a service without requiring access to source code, additional documentation, or inspection of network traffic. When properly defined via OpenAPI, a consumer can understand and interact with the remote service with a minimal amount of implementation logic. Similar to what interface descriptions have done for lower-level programming, the OpenAPI Specification removes guesswork in calling a service.

Use cases for machine-readable API definition documents include, but are not limited to: interactive documentation; code generation for documentation, clients, and servers; and automation of test cases. OpenAPI documents describe API services and are represented in YAML or JSON formats. These documents may be produced and served statically or generated dynamically from an application.

The OpenAPI Specification does not require rewriting existing APIs. It does not require binding any software to a service – the described service may not even be owned by the creator of its description. It does, however, require that the service's 

### json-api-dotnet/JsonApiDotNetCore
description: A framework for building JSON:API compliant REST APIs using ASP.NET Core and Entity Framework Core. Includes support for atomic operations, sorting, filtering, pagination, sparse fieldset selection, and side-loading related resources.
killerFeature: Eliminate boilerplate by offering out-of-the-box features for JSON:API compliant REST APIs
topics: json-api, jsonapi-server, dotnet, aspnet, rest-api, web-api, ef-core
readme:
<a href="https://www.jsonapi.net"><img src="docs/home/assets/img/logo.svg" style="height: 345px; width: 345px"/></a>

# JsonApiDotNetCore

[](https://github.com/json-api-dotnet/JsonApiDotNetCore/actions/workflows/build.yml?query=branch%3Amaster)
[](https://codecov.io/gh/json-api-dotnet/JsonApiDotNetCore)
[](https://www.nuget.org/packages/JsonApiDotNetCore/)
[](LICENSE)
[](https://www.firsttimersonly.com/)

A framework for building [JSON:API](https://jsonapi.org/) compliant REST APIs using ASP.NET Core and Entity Framework
Core. Includes support for the [Atomic Operations](https://jsonapi.org/ext/atomic/) extension.

The ultimate goal of this library is to eliminate as much boilerplate as possible by offering out-of-the-box features,
such as sorting, filtering, pagination, sparse fieldset selection, and side-loading related resources. You just need to
focus on defining the resources and implementing your custom business logic. This library has been designed around
dependency injection, making extensibility incredibly easy.

> [!NOTE]
> OpenAPI support is now [available](https://www.jsonapi.net/usage/openapi.html), currently in preview. Give it a try!

## Getting started

The following steps describe how to create a JSON:API project.

1. Create a new ASP.NET Core Web API project:

   ```shell
   dotnet new webapi --no-openapi --use-controllers --name ExampleJsonApi
   cd ExampleJsonApi
   ```

1. Install the JsonApiDotNetCore package, along with your preferred Entity Framework 

### punkpeye/awesome-mcp-servers
description: A curated list of Model Context Protocol (MCP) servers that enable AI models to securely interact with local and remote resources through standardized server implementations. This repository focuses on extending AI capabilities through file access, database connections, API integrations, and other contextual services.
killerFeature: Discover production-ready and experimental MCP servers for extending AI capabilities
topics: ai, mcp
readme:
[](README-th.md)
[](README.md)
[](README-zh_TW.md)
[](README-zh.md)
[](README-ja.md)
[](README-ko.md)
[](README-pt_BR.md)
[](https://glama.ai/mcp/discord)
[](https://www.reddit.com/r/mcp/)

> [!IMPORTANT]
> [Awesome MCP Servers](https://glama.ai/mcp/servers) web directory.

A curated list of awesome Model Context Protocol (MCP) servers.

* [What is MCP?](#what-is-mcp)
* [Clients](#clients)
* [Tutorials](#tutorials)
* [Community](#community)
* [Legend](#legend)
* [Server Implementations](#server-implementations)
* [Frameworks](#frameworks)
* [Tips & Tricks](#tips-and-tricks)

## What is MCP?

[MCP](https://modelcontextprotocol.io/) is an open protocol that enables AI models to securely interact with local and remote resources through standardized server implementations. This list focuses on production-ready and experimental MCP servers that extend AI capabilities through file access, database connections, API integrations, and other contextual services.

## Clients

Checkout [awesome-mcp-clients](https://github.com/punkpeye/awesome-mcp-clients/) and [glama.ai/mcp/clients](https://glama.ai/mcp/clients).

## Tutorials

* [Model Context Protocol (MCP) Quickstart](https://glama.ai/blog/2024-11-25-model-context-protocol-quickstart)
* [Setup Claude Desktop App to Use a SQLite Database](https://youtu.be/wxCCzo9dGj0)

## Community

* [r/mcp Reddit](https://www.reddit.com/r/mcp)
* [Discord Server](https://glama.ai/mcp/discord)

## Legend

* 🎖️ – official implementation
* programming la

### vega/vega
description: A visualization grammar, a declarative format for creating, saving, and sharing interactive visualization designs. Describe data visualizations in a JSON format, and generate interactive views using HTML5 Canvas or SVG.
killerFeature: Describe data visualizations in a JSON format, generating interactive views using HTML5 Canvas or SVG
topics: visualization-grammar, visualization, canvas, svg, vega, d3
readme:
# Vega: A Visualization Grammar <a href="https://vega.github.io/vega/"><img align="right" src="https://github.com/vega/logos/blob/master/assets/VG_Color@64.png?raw=true" height="38"></img></a>

<a href="https://vega.github.io/vega/examples">
<img src="https://vega.github.io/vega/assets/banner.png" alt="Vega Examples" width="900"></img>
</a>

**Vega** is a *visualization grammar*, a declarative format for creating, saving, and sharing interactive visualization designs. With Vega you can describe data visualizations in a JSON format, and generate interactive views using HTML5 Canvas or SVG.

For [documentation](https://vega.github.io/vega/docs/), [tutorials](https://vega.github.io/vega/tutorials/), and [examples](https://vega.github.io/vega/examples/), see the [Vega website](https://vega.github.io/vega). For a description of changes between Vega 2 and later versions, please refer to the [Vega Porting Guide](https://vega.github.io/vega/docs/porting-guide/).

Try using Vega in the online [Vega Editor](https://vega.github.io/editor/#/examples/vega/bar-chart).

## Contributions, Development, and Support

Interested in contributing to Vega? Please see our [contribution and development guidelines](CONTRIBUTING.md), subject to our [code of conduct](https://github.com/vega/.github/blob/master/CODE_OF_CONDUCT.md).

Looking for support, or interested in sharing examples and tips? Post to the [Vega discussion forum](https://groups.google.com/forum/#!forum/vega-js) or join the [Vega slack 
