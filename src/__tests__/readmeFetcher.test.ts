import { preprocessReadme } from "../github/readmeFetcher.js";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log("preprocessReadme tests\n");

  // 3.1 HTML comments removed
  test("strips HTML comments", () => {
    const result = preprocessReadme("before\n<!-- hidden -->\nafter");
    assert(!result.includes("<!-- hidden -->"), "should not contain HTML comment");
    assert(result.includes("before"), "should keep content before comment");
    assert(result.includes("after"), "should keep content after comment");
  });

  test("strips multi-line HTML comments", () => {
    const result = preprocessReadme("start\n<!--\nline1\nline2\n-->\nend");
    assert(!result.includes("line1"), "should remove content inside comment");
    assert(result.includes("start"), "should keep content before comment");
    assert(result.includes("end"), "should keep content after comment");
  });

  // 3.2 Markdown badges removed
  test("strips markdown badges", () => {
    const badge =
      "[![Build Status](https://travis-ci.org/foo/bar.svg)](https://travis-ci.org/foo/bar)";
    const result = preprocessReadme(`# My Repo\n${badge}\nDescription here.`);
    assert(!result.includes("travis-ci.org"), "should not contain badge URL");
    assert(result.includes("My Repo"), "should keep heading");
    assert(result.includes("Description here"), "should keep description");
  });

  // 3.3 HTML badge anchor elements removed
  test("strips HTML badge anchors", () => {
    const badge = `<a href="https://example.com"><img src="https://img.shields.io/badge/foo-bar.svg" /></a>`;
    const result = preprocessReadme(`# Repo\n${badge}\nSome description.`);
    assert(!result.includes("shields.io"), "should not contain shields.io URL");
    assert(result.includes("Repo"), "should keep heading");
  });

  // 3.4 Inline markdown images removed
  test("strips inline markdown images", () => {
    const result = preprocessReadme("# Repo\n![screenshot](docs/screenshot.png)\nDescription.");
    assert(!result.includes("docs/screenshot.png"), "should not contain image URL");
    assert(result.includes("Description"), "should keep description");
  });

  // <details> blocks removed
  test("strips <details> blocks", () => {
    const result = preprocessReadme(
      "# Repo\n<details><summary>Translations</summary>\n- French\n- German\n</details>\nDescription.",
    );
    assert(!result.includes("Translations"), "should remove details content");
    assert(!result.includes("French"), "should remove nested list");
    assert(result.includes("Description"), "should keep content after details");
  });

  // <picture> tags removed
  test("strips <picture> blocks", () => {
    const result = preprocessReadme(
      '# Repo\n<picture><source srcset="logo-dark.png" /><img src="logo.png" /></picture>\nDescription.',
    );
    assert(!result.includes("logo-dark.png"), "should remove picture content");
    assert(!result.includes("<source"), "should remove source element");
    assert(result.includes("Description"), "should keep content after picture");
  });

  // <div align="center"> removed
  test("strips centered intro divs", () => {
    const result = preprocessReadme(
      '<div align="center">\n<img src="logo.png" />\n<h3>Sponsor us</h3>\n</div>\n\n# My Tool\n\nA CLI utility.',
    );
    assert(!result.includes("Sponsor us"), "should remove centered div content");
    assert(!result.includes("logo.png"), "should remove img inside div");
    assert(result.includes("My Tool"), "should keep content after div");
  });

  // Back-to-top links removed
  test("strips back-to-top boilerplate", () => {
    const result = preprocessReadme(
      "## Section A\nContent.\n**[⬆ back to top](#table-of-contents)**\n\n## Section B\nMore content.",
    );
    assert(!result.includes("back to top"), "should remove back-to-top link");
    assert(result.includes("Content"), "should keep section content");
    assert(result.includes("Section B"), "should keep subsequent sections");
  });

  // 3.5 TOC section removed, subsequent sections preserved
  test("strips TOC section and preserves following sections", () => {
    const readme = [
      "# My Project",
      "",
      "## Table of Contents",
      "- [Installation](#installation)",
      "- [Usage](#usage)",
      "",
      "## Installation",
      "Run npm install.",
    ].join("\n");
    const result = preprocessReadme(readme);
    assert(!result.includes("Table of Contents"), "should remove TOC heading");
    assert(!result.includes("[Installation](#installation)"), "should remove TOC list items");
    assert(result.includes("## Installation"), "should keep Installation section heading");
    assert(result.includes("Run npm install"), "should keep Installation content");
  });

  // 3.6 Leading description content (first 1500 chars) always included
  test("includes leading description content", () => {
    const description = "This is a great project. ".repeat(30); // ~750 chars
    const result = preprocessReadme(description);
    assert(result.includes("This is a great project"), "should include leading content");
  });

  test("includes first 1500 chars when README is long", () => {
    const prefix = "A".repeat(1500);
    const rest = "B".repeat(3000);
    const result = preprocessReadme(prefix + rest);
    assert(result.startsWith("A".repeat(1500)), "should include first 1500 chars");
  });

  // 3.7 Features section beyond the 1500-char prefix is appended
  test("appends Features section when beyond 1500-char prefix", () => {
    const description = "Description line.\n".repeat(90); // >1500 chars
    const features = "## Features\n- Fast\n- Reliable\n- Secure\n";
    const result = preprocessReadme(description + features);
    assert(result.includes("Fast"), "should include Features section content");
    assert(result.includes("Reliable"), "should include all feature items");
  });

  test("appends About section when present", () => {
    const description = "Description line.\n".repeat(90);
    const about = "## About\nThis tool does amazing things.\n";
    const result = preprocessReadme(description + about);
    assert(
      result.includes("This tool does amazing things"),
      "should include About section content",
    );
  });

  test("does not duplicate content when Features section is within prefix", () => {
    const readme = "# Repo\n\n## Features\n- Cool\n";
    const result = preprocessReadme(readme);
    const count = (result.match(/- Cool/g) || []).length;
    assert(count === 1, "Features section content should not be duplicated");
  });

  test("does not append section content already captured in prefix", () => {
    // Section heading within first 1500 chars — content should NOT be duplicated
    const withinPrefix = "Some intro text.\n\n## What is it?\n\nA great tool.\n";
    const result = preprocessReadme(withinPrefix);
    const count = (result.match(/A great tool/g) || []).length;
    assert(count === 1, "section content within prefix should appear exactly once");
  });

  // 3.8 Output capped at README_MAX_LENGTH with [truncated] marker
  // With PREFIX_LENGTH=1500 and SECTION_LENGTH=1500, assembled is at most ~3002 chars,
  // so the cap is a safety net. Verify that output never exceeds the cap.
  test("output is bounded at README_MAX_LENGTH", () => {
    const huge = "word ".repeat(5000); // way over 4000 chars
    const result = preprocessReadme(huge);
    assert(result.length <= 4000 + "... [truncated]".length, "should not exceed cap + marker");
  });

  test("no truncation marker when content is within cap", () => {
    const short = "This is a short README.";
    const result = preprocessReadme(short);
    assert(!result.includes("[truncated]"), "should not contain truncated marker");
  });

  // 3.9 README with no noise passes through unchanged (modulo trimming)
  test("passes through clean README unchanged", () => {
    const clean =
      "# My Tool\n\nA simple CLI utility for managing files.\n\nInstall with `npm install my-tool`.";
    const result = preprocessReadme(clean);
    assert(result.includes("My Tool"), "should keep title");
    assert(result.includes("simple CLI utility"), "should keep description");
    assert(result.includes("npm install my-tool"), "should keep install instructions");
    assert(!result.includes("[truncated]"), "should not truncate short clean README");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
