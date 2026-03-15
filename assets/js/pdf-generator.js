const HTML2PDF_CDN_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";

function print() {
  const printWindow = window.open(new URL("resume-pdf", window.location.href).href, "_blank");
  printWindow.onload = function () {
    printWindow.print();
    // Close the print window after a delay
    setTimeout(() => printWindow.close(), 500);
  };
}

function enableButton(button) {
  if (button) {
    button.disabled = false;
  }
}

function getLocalHtml2PdfUrl() {
  const generatorScript = document.querySelector('script[src*="assets/js/pdf-generator.js"]');
  if (generatorScript && generatorScript.src) {
    return new URL("../vendor/html2pdf.bundle.min.js", generatorScript.src).href;
  }
  return new URL("assets/vendor/html2pdf.bundle.min.js", window.location.href).href;
}

function loadScriptInWindow(targetWindow, src) {
  return new Promise((resolve, reject) => {
    if (targetWindow.html2pdf) {
      resolve(true);
      return;
    }

    const doc = targetWindow.document;
    const existingScript = Array.from(doc.scripts).find((script) => script.src === src);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true }
      );
      return;
    }

    const script = doc.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error(`Failed to load ${src}`));

    const mountTarget = doc.head || doc.documentElement;
    if (!mountTarget) {
      reject(new Error("Unable to locate a script mount target"));
      return;
    }

    mountTarget.appendChild(script);
  });
}

async function ensureHtml2Pdf(targetWindow) {
  if (targetWindow.html2pdf) {
    return true;
  }

  const sources = [getLocalHtml2PdfUrl(), HTML2PDF_CDN_URL];
  for (const src of sources) {
    try {
      await loadScriptInWindow(targetWindow, src);
    } catch (error) {
      console.warn("Unable to load html2pdf script:", src, error);
    }

    if (targetWindow.html2pdf) {
      return true;
    }
  }

  return false;
}

function generatePDF() {
  const templateURL = new URL("resume-pdf", window.location.href).href;
  const pdfButton = document.getElementById("pdfButton");

  if (pdfButton) {
    pdfButton.disabled = true;
  }

  const pdfWindow = window.open(templateURL, "_blank");

  if (!pdfWindow) {
    console.error("Popup blocked. Please allow popups to export PDF.");
    enableButton(pdfButton);
    return;
  }

  pdfWindow.addEventListener(
    "load",
    async () => {
      const resume = pdfWindow.document.querySelector("#pdf-resume");
      const hasHtml2Pdf = await ensureHtml2Pdf(pdfWindow);
      if (!resume || !hasHtml2Pdf) {
        console.error("PDF template did not load correctly.");
        enableButton(pdfButton);
        return;
      }

      // Get name from the DOM (as defined in data.yml)
      const nameNode = document.querySelector(".name");
      const name = nameNode ? nameNode.textContent : "Resume";
      const filename = `${name.replace(/\s+/g, "_")}_Resume.pdf`;

      const opt = {
        margin: [0, 0, 0, 0],
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          backgroundColor: "#ffffff",
          windowWidth: resume.scrollWidth,
          windowHeight: resume.scrollHeight,
          scrollX: 0,
          scrollY: 0,
        },
        pagebreak: { mode: ["css", "legacy"] },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
      };

      try {
        await pdfWindow.html2pdf().set(opt).from(resume).save();
        setTimeout(() => pdfWindow.close(), 800);
      } catch (err) {
        console.error("Error generating PDF:", err);
      } finally {
        enableButton(pdfButton);
      }
    },
    { once: true }
  );
}

function decodeHtmlEntities(value) {
  if (!value) {
    return "";
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function normalizeText(value) {
  return decodeHtmlEntities(String(value || "")).trim();
}

function splitNonEmptyLines(value) {
  return normalizeText(value)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeUrl(value) {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    return "";
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getCvData() {
  const dataNode = document.getElementById("cv-data");
  if (!dataNode) {
    return null;
  }

  try {
    return JSON.parse(dataNode.textContent);
  } catch (error) {
    console.error("Error parsing CV data:", error);
    return null;
  }
}

function getContactUrls(sidebar) {
  const urls = [];

  if (sidebar.website) {
    urls.push(normalizeUrl(sidebar.website));
  }
  if (sidebar.linkedin) {
    urls.push(`https://linkedin.com/in/${normalizeText(sidebar.linkedin)}`);
  }
  if (sidebar.xing) {
    urls.push(`https://www.xing.com/profile/${normalizeText(sidebar.xing)}`);
  }
  if (sidebar.github) {
    urls.push(`https://github.com/${normalizeText(sidebar.github)}`);
  }
  if (sidebar.telegram) {
    urls.push(`https://t.me/${normalizeText(sidebar.telegram)}`);
  }
  if (sidebar.gitlab) {
    urls.push(`https://gitlab.com/${normalizeText(sidebar.gitlab)}`);
  }
  if (sidebar.bitbucket) {
    urls.push(`https://bitbucket.com/${normalizeText(sidebar.bitbucket)}`);
  }
  if (sidebar.twitter) {
    urls.push(`https://twitter.com/${normalizeText(sidebar.twitter)}`);
  }
  if (sidebar.bluesky) {
    urls.push(
      `https://bsky.app/profile/${normalizeText(sidebar.bluesky).replace(/^@/, "")}`
    );
  }
  if (sidebar.mastodon) {
    urls.push(normalizeUrl(sidebar.mastodon));
  }
  if (sidebar["stack-overflow"]) {
    urls.push(
      `https://stackoverflow.com/users/${normalizeText(
        sidebar["stack-overflow"]
      )}`
    );
  }
  if (sidebar.codewars) {
    urls.push(
      `https://www.codewars.com/users/${normalizeText(
        sidebar.codewars
      )}/completed_solutions`
    );
  }
  if (sidebar.hackerrank) {
    urls.push(
      `https://www.hackerrank.com/profile/${normalizeText(sidebar.hackerrank)}`
    );
  }
  if (sidebar.leetcode) {
    urls.push(`https://leetcode.com/u/${normalizeText(sidebar.leetcode)}`);
  }
  if (sidebar.goodreads) {
    urls.push(
      `https://www.goodreads.com/user/show/${normalizeText(sidebar.goodreads)}`
    );
  }
  if (sidebar.pdf) {
    urls.push(normalizeUrl(sidebar.pdf));
  }

  return Array.from(new Set(urls.filter(Boolean)));
}

function appendDetails(lines, details) {
  splitNonEmptyLines(details).forEach((line) => {
    lines.push(`  - ${line.replace(/^-+\s*/, "")}`);
  });
}

function appendSectionTitle(lines, title, fallback) {
  lines.push(`## ${normalizeText(title) || fallback}`);
}

function buildMarkdownResume(data) {
  const lines = [];
  const sidebar = data.sidebar || {};
  const profileName = normalizeText(sidebar.name) || "Resume";
  const tagline = normalizeText(sidebar.tagline);

  lines.push(`# ${profileName}`);
  if (tagline) {
    lines.push(tagline);
  }
  lines.push("");

  const contactItems = [];
  if (sidebar.email) {
    contactItems.push(normalizeText(sidebar.email));
  }
  if (sidebar.phone) {
    contactItems.push(normalizeText(sidebar.phone));
  }
  if (sidebar.timezone) {
    contactItems.push(normalizeText(sidebar.timezone));
  }
  if (sidebar.citizenship) {
    contactItems.push(normalizeText(sidebar.citizenship));
  }

  const contactUrls = getContactUrls(sidebar);
  if (contactItems.length || contactUrls.length) {
    appendSectionTitle(lines, "Contact", "Contact");
    contactItems.filter(Boolean).forEach((item) => lines.push(`- ${item}`));
    contactUrls.forEach((url) => lines.push(`- ${url}`));
    lines.push("");
  }

  const careerProfile = data["career-profile"];
  if (careerProfile && (careerProfile.title || careerProfile.summary)) {
    appendSectionTitle(lines, careerProfile.title, "Career Profile");
    splitNonEmptyLines(careerProfile.summary).forEach((line) => lines.push(line));
    lines.push("");
  }

  const experiences = data.experiences;
  if (experiences && Array.isArray(experiences.info) && experiences.info.length) {
    appendSectionTitle(lines, experiences.title, "Experiences");
    experiences.info.forEach((experience) => {
      const headline = [
        normalizeText(experience.role),
        normalizeText(experience.company),
        normalizeText(experience.time),
      ]
        .filter(Boolean)
        .join(" | ");

      if (headline) {
        lines.push(`- ${headline}`);
      }
      if (experience.details) {
        appendDetails(lines, experience.details);
      }
    });
    lines.push("");
  }

  const education = data.education;
  if (education && Array.isArray(education.info) && education.info.length) {
    appendSectionTitle(lines, education.title, "Education");
    education.info.forEach((graduation) => {
      const headline = [
        normalizeText(graduation.degree),
        normalizeText(graduation.university),
        normalizeText(graduation.time),
      ]
        .filter(Boolean)
        .join(" | ");

      if (headline) {
        lines.push(`- ${headline}`);
      }
      if (graduation.details) {
        appendDetails(lines, graduation.details);
      }
    });
    lines.push("");
  }

  const certifications = data.certifications;
  if (
    certifications &&
    Array.isArray(certifications.list) &&
    certifications.list.length
  ) {
    appendSectionTitle(lines, certifications.title, "Certifications");
    certifications.list.forEach((certification) => {
      const headline = [
        normalizeText(certification.name),
        normalizeText(certification.organization),
        normalizeText(certification.start),
        normalizeText(certification.end),
      ]
        .filter(Boolean)
        .join(" | ");

      if (headline) {
        lines.push(`- ${headline}`);
      }

      const certUrl = normalizeUrl(certification.credentialurl);
      if (certUrl) {
        lines.push(`  - ${certUrl}`);
      }
    });
    lines.push("");
  }

  const projects = data.projects;
  if (projects && Array.isArray(projects.assignments) && projects.assignments.length) {
    appendSectionTitle(lines, projects.title, "Projects");
    projects.assignments.forEach((project) => {
      const headline = [normalizeText(project.title), normalizeText(project.tagline)]
        .filter(Boolean)
        .join(" | ");

      if (headline) {
        lines.push(`- ${headline}`);
      }

      const projectUrl = normalizeUrl(project.link);
      if (projectUrl) {
        lines.push(`  - ${projectUrl}`);
      }
    });
    lines.push("");
  }

  const oss = data.oss;
  if (oss && Array.isArray(oss.contributions) && oss.contributions.length) {
    appendSectionTitle(lines, oss.title, "OSS Contributions");
    oss.contributions.forEach((contribution) => {
      const headline = [
        normalizeText(contribution.title),
        normalizeText(contribution.tagline),
      ]
        .filter(Boolean)
        .join(" | ");

      if (headline) {
        lines.push(`- ${headline}`);
      }

      const contributionUrl = normalizeUrl(contribution.link);
      if (contributionUrl) {
        lines.push(`  - ${contributionUrl}`);
      }
    });
    lines.push("");
  }

  const publications = data.publications;
  if (publications && Array.isArray(publications.papers) && publications.papers.length) {
    appendSectionTitle(lines, publications.title, "Publications");
    publications.papers.forEach((paper) => {
      const headline = [
        normalizeText(paper.title),
        normalizeText(paper.authors),
        normalizeText(paper.conference),
      ]
        .filter(Boolean)
        .join(" | ");

      if (headline) {
        lines.push(`- ${headline}`);
      }

      const paperUrl = normalizeUrl(paper.link);
      if (paperUrl) {
        lines.push(`  - ${paperUrl}`);
      }
    });
    lines.push("");
  }

  const patents = data.patents;
  if (patents && Array.isArray(patents.items) && patents.items.length) {
    appendSectionTitle(lines, patents.title, "Patents");
    patents.items.forEach((patent) => {
      const headline = [
        normalizeText(patent.title),
        normalizeText(patent.status),
        normalizeText(patent["Patent Number"]),
        normalizeText(patent["Registration Date"]),
      ]
        .filter(Boolean)
        .join(" | ");

      if (headline) {
        lines.push(`- ${headline}`);
      }

      const patentUrl = normalizeUrl(patent.link);
      if (patentUrl) {
        lines.push(`  - ${patentUrl}`);
      }
    });
    lines.push("");
  }

  const skills = data.skills;
  if (skills && Array.isArray(skills.toolset) && skills.toolset.length) {
    appendSectionTitle(lines, skills.title, "Skills");
    skills.toolset.forEach((skill) => {
      const skillLine = [normalizeText(skill.name), normalizeText(skill.level)]
        .filter(Boolean)
        .join(" | ");
      if (skillLine) {
        lines.push(`- ${skillLine}`);
      }
    });
    lines.push("");
  }

  const languages =
    sidebar.languages && Array.isArray(sidebar.languages.info)
      ? sidebar.languages.info
      : [];
  if (languages.length) {
    appendSectionTitle(lines, sidebar.languages.title, "Languages");
    languages.forEach((language) => {
      const languageLine = [
        normalizeText(language.idiom),
        normalizeText(language.level),
      ]
        .filter(Boolean)
        .join(" | ");
      if (languageLine) {
        lines.push(`- ${languageLine}`);
      }
    });
    lines.push("");
  }

  const interests =
    sidebar.interests && Array.isArray(sidebar.interests.info)
      ? sidebar.interests.info
      : [];
  if (interests.length) {
    appendSectionTitle(lines, sidebar.interests.title, "Interests");
    interests.forEach((interest) => {
      const interestItem = normalizeText(interest.item);
      if (interestItem) {
        lines.push(`- ${interestItem}`);
      }

      const interestUrl = normalizeUrl(interest.link);
      if (interestUrl) {
        lines.push(`  - ${interestUrl}`);
      }
    });
    lines.push("");
  }

  while (lines.length && !lines[lines.length - 1]) {
    lines.pop();
  }

  return `${lines.join("\n")}\n`;
}

function buildMarkdownFilename(name) {
  const safeName = normalizeText(name)
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "_");

  if (!safeName) {
    return "resume.md";
  }

  return `${safeName}_Resume.md`;
}

function downloadMarkdownResume() {
  const cvData = getCvData();
  if (!cvData) {
    console.error("No CV data available for Markdown export.");
    return;
  }

  const markdownContent = buildMarkdownResume(cvData);
  const filename = buildMarkdownFilename(cvData.sidebar && cvData.sidebar.name);
  const blob = new Blob([markdownContent], {
    type: "text/markdown;charset=utf-8",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
